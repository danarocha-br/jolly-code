'use server';

import type { PlanId } from '@/lib/config/plans';

type CheckoutResponse = {
  url?: string;
  error?: string;
};

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  plan,
  interval,
}: {
  plan: PlanId;
  interval: 'monthly' | 'yearly';
}): Promise<CheckoutResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(`${appUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan, interval }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to create checkout session' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Checkout action error:', error);
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(): Promise<CheckoutResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(`${appUrl}/api/customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to create portal session' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Portal action error:', error);
    return { error: 'Failed to create portal session' };
  }
}
