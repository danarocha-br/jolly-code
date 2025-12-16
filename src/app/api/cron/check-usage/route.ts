import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import React from 'react';

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
 * Secured with CRON_SECRET query parameter or Authorization header.
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authentication via query param or header
		const secretParam = request.nextUrl.searchParams.get('secret');
		const authHeader = request.headers.get('authorization');
		const providedSecret = secretParam || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

		if (!providedSecret || providedSecret !== env.CRON_SECRET) {
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

			// Check if we have more users to process
			hasMore = profiles.length === BATCH_SIZE;
			offset += BATCH_SIZE;

			// Safety limit to prevent infinite loops
			if (offset > 10000) {
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
				console.log(`[check-usage] Sent usage warning email to user ${user.id} (${user.email})`);
			} catch (emailError) {
				emailResults.failed++;
				console.error(`[check-usage] Failed to send email to user ${user.id}:`, emailError);
				Sentry.captureException(emailError, {
					level: 'error',
					tags: { operation: 'check_usage_send_email' },
					extra: { userId: user.id, email: user.email },
				});
			}
		}

		return NextResponse.json({
			success: true,
			usersChecked: offset,
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

