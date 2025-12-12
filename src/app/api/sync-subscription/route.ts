"use server";

import { NextRequest, NextResponse } from 'next/server';
import { syncSubscriptionById } from '@/lib/services/subscription-sync';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    const result = await syncSubscriptionById(subscriptionId);

    if (!result) {
      return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
