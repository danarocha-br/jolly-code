import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing environment variables for keepalive')
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
            return NextResponse.json(
                { error: 'Failed to ping database', details: error.message },
                { status: 500 }
            )
        }

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
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
