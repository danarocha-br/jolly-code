export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

export const onRequestError = async (
    err: unknown,
    request: {
        path: string;
        method: string;
        headers: Headers;
    },
    context: {
        routeType: 'pages' | 'app' | 'route' | 'middleware';
    }
) => {
    await import('@sentry/nextjs').then(({ captureException }) => {
        captureException(err, {
            contexts: {
                nextjs: {
                    request,
                    context
                }
            }
        });
    });
};
