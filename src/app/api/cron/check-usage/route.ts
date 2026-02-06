import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { timingSafeEqual } from 'crypto';

import { createServiceRoleClient } from '@/utils/supabase/admin';
import { getUserUsage } from '@/lib/services/usage-limits';
import { getMaxUsagePercentage } from '@/lib/utils/usage-helpers';
import { sendEmail } from '@/lib/email/send-email';
import UsageLimitWarningEmail from '@emails/usage-limit-email';
import { env } from '@/env.mjs';

export const dynamic = 'force-dynamic';

const USAGE_WARNING_THRESHOLD = 90; // Send warning at 90% usage

interface UserWithUsage {
	id: string;
	email: string; // Non-null after validation
	username: string | null;
	usagePercentage: number;
}

/**
 * GET /api/cron/check-usage
 * 
 * Protected cron endpoint that checks all users' usage and sends warning emails
 * to users exceeding 90% of their limits.
 * 
 * Secured with CRON_SECRET via Authorization header.
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authentication via Authorization header only
		const authHeader = request.headers.get('authorization');
		const providedSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

		// Fast-return if secret is missing
		if (!providedSecret) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		// Use timing-safe comparison to prevent timing attacks
		const expectedSecret = env.CRON_SECRET ?? '';
		const providedBuffer = Buffer.from(providedSecret, 'utf8');
		const expectedBuffer = Buffer.from(expectedSecret, 'utf8');

		// Pad buffers to equal length for timing-safe comparison
		const maxLength = Math.max(providedBuffer.length, expectedBuffer.length);
		const paddedProvided = Buffer.alloc(maxLength);
		const paddedExpected = Buffer.alloc(maxLength);
		providedBuffer.copy(paddedProvided);
		expectedBuffer.copy(paddedExpected);

		if (!timingSafeEqual(paddedProvided, paddedExpected)) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const supabase = createServiceRoleClient();
		const usersToNotify: UserWithUsage[] = [];

		// Fetch all users with emails (paginate if needed)
		// For now, we'll fetch in batches to handle large user bases
		const BATCH_SIZE = 100;
		let offset = 0;
		let totalProcessed = 0;
		let hasMore = true;

		while (hasMore) {
			const { data: profiles, error: profilesError } = await supabase
				.from('profiles')
				.select('id, email, username')
				.not('email', 'is', null)
				.range(offset, offset + BATCH_SIZE - 1);

			if (profilesError) {
				console.error('[check-usage] Error fetching profiles:', profilesError);
				Sentry.captureException(profilesError, {
					tags: { operation: 'check_usage_fetch_profiles' },
				});
				break;
			}

			if (!profiles || profiles.length === 0) {
				hasMore = false;
				break;
			}

			// Check usage for each user
			for (const profile of profiles) {
				if (!profile.email || !profile.id) {
					continue;
				}

				try {
					const usage = await getUserUsage(supabase, profile.id);
					const maxUsagePercentage = getMaxUsagePercentage(usage);

					// If user is at or above threshold, add to notification list
					// profile.email is guaranteed non-null due to the filter above
					if (maxUsagePercentage >= USAGE_WARNING_THRESHOLD && profile.email) {
						usersToNotify.push({
							id: profile.id,
							email: profile.email,
							username: profile.username ?? null,
							usagePercentage: Math.round(maxUsagePercentage),
						});
					}
				} catch (usageError) {
					// Log but continue processing other users
					console.error(`[check-usage] Error getting usage for user ${profile.id}:`, usageError);
					Sentry.captureException(usageError, {
						level: 'warning',
						tags: { operation: 'check_usage_get_user_usage' },
						extra: { userId: profile.id },
					});
				}
			}

			// Track actual number of users processed
			totalProcessed += profiles.length;

			// Check if we have more users to process
			hasMore = profiles.length === BATCH_SIZE;
			offset += BATCH_SIZE;

			// Safety limit to prevent infinite loops
			if (totalProcessed > 10000) {
				console.warn('[check-usage] Reached safety limit of 10,000 users');
				break;
			}
		}

		// Send warning emails to users exceeding threshold
		const emailResults = {
			success: 0,
			failed: 0,
		};

		for (const user of usersToNotify) {
			try {
				await sendEmail({
					to: user.email,
					subject: `Usage Alert: You've reached ${user.usagePercentage}% of your limit`,
					react: React.createElement(UsageLimitWarningEmail, {
						usagePercent: user.usagePercentage,
						userName: user.username ?? undefined,
					}),
					// Use idempotency key to prevent duplicate emails if cron runs multiple times
					idempotencyKey: `usage-warning-${user.id}-${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`, // Daily idempotency
				});
				emailResults.success++;
				console.log(`[check-usage] Sent usage warning email to user ${user.id}`);
			} catch (emailError) {
				emailResults.failed++;
				console.error(`[check-usage] Failed to send email to user ${user.id}:`, emailError);
				Sentry.captureException(emailError, {
					level: 'error',
					tags: { operation: 'check_usage_send_email' },
					extra: { userId: user.id },
				});
			}
		}

		return NextResponse.json({
			success: true,
			usersChecked: totalProcessed,
			usersNotified: usersToNotify.length,
			emailsSent: emailResults.success,
			emailsFailed: emailResults.failed,
		});
} catch (error) {
	console.error('[check-usage] Unexpected error:', error);
	Sentry.captureException(error, {
		tags: { operation: 'check_usage' },
	});

	return NextResponse.json(
		{ error: 'Internal server error' },
		{ status: 500 }
	);
	}
}

