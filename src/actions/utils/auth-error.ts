/**
 * Custom error class for authentication failures
 * Allows robust error detection via instanceof checks
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AuthError'
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AuthError)
		}
	}
}

