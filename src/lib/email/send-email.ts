import * as Sentry from '@sentry/nextjs';
import type { ReactElement } from 'react';

import { resend } from './client';

export interface SendEmailOptions {
	to: string | string[];
	subject: string;
	react: ReactElement;
	from?: string;
	idempotencyKey?: string;
}

const DEFAULT_FROM = 'Jolly Code <noreply@jollycode.dev>';

/**
 * Send an email using Resend with React Email components
 * 
 * @param options - Email sending options
 * @returns Promise resolving to Resend email response data
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ id: string } | null> {
	const { to, subject, react, from = DEFAULT_FROM, idempotencyKey } = options;

	try {
		const emailPayload = {
			from,
			to: Array.isArray(to) ? to : [to],
			subject,
			react,
			...(idempotencyKey && { idempotencyKey }),
		} as Parameters<typeof resend.emails.send>[0];

		const { data, error } = await resend.emails.send(emailPayload);

		if (error) {
			// Rethrow the original error if it's an Error instance to preserve stack trace
			if (error instanceof Error) {
				throw error;
			}
			// Otherwise, create a new Error with the Resend error details
			throw new Error(`Resend API error: ${error.message}${error.name ? ` (${error.name})` : ''}`);
		}

		return data;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';
		const recipientsCount = Array.isArray(to) ? to.length : 1;

		console.error('[sendEmail] Failed to send email:', {
			recipients_count: recipientsCount,
			subject,
			error: errorMessage,
		});

		Sentry.captureException(error, {
			level: 'error',
			tags: {
				operation: 'send_email',
			},
			extra: {
				recipients_count: recipientsCount,
				subject,
			},
		});

		throw error;
	}
}
