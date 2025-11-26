import { wrapRouteHandlerWithSentry } from "@sentry/nextjs"
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { applyRequestContextToSentry, applyResponseContextToSentry } from '@/lib/sentry-context'

export const GET = wrapRouteHandlerWithSentry(
    async function GET(request: NextRequest) {
        applyRequestContextToSentry({ request })

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

            if (!supabaseUrl || !supabaseServiceKey) {
                console.error('Missing environment variables for keepalive')
                applyResponseContextToSentry(500)
                return NextResponse.json(
                    { error: 'Server configuration error' },
                    { status: 500 }
                )
            }

            // Initialize Supabase admin client
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            })

            // Perform a lightweight update
            const { data, error } = await supabase
                .from('_keepalive')
                .upsert({ id: 1, last_ping: new Date().toISOString() })
                .select()

            if (error) {
                console.error('Keepalive Supabase error:', error)
                applyResponseContextToSentry(500)
                return NextResponse.json(
                    { error: 'Failed to ping database', details: error.message },
                    { status: 500 }
                )
            }

            applyResponseContextToSentry(200)
            return NextResponse.json(
                {
                    status: 'ok',
                    message: 'Database pinged successfully',
                    timestamp: new Date().toISOString(),
                    data,
                },
                { status: 200 }
            )
        } catch (err) {
            console.error('Unexpected keepalive error:', err)
            applyResponseContextToSentry(500)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    },
    {
        method: "GET",
        parameterizedRoute: "/api/keepalive",
    },
)
