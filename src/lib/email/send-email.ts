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
			console.error('[sendEmail] Resend API error:', {
				error,
				message: error.message,
				name: error.name,
			});
			throw new Error(`Resend API error: ${error.message}${error.name ? ` (${error.name})` : ''}`);
		}

		return data;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';

		console.error('[sendEmail] Failed to send email:', {
			to: Array.isArray(to) ? to.join(', ') : to,
			subject,
			error: errorMessage,
		});

		Sentry.captureException(error, {
			level: 'error',
			tags: {
				operation: 'send_email',
			},
			extra: {
				to: Array.isArray(to) ? to.join(', ') : to,
				subject,
			},
		});

		throw error;
	}
}
