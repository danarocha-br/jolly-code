/**
 * WARNING: This file is parsed by scripts/validate-plan-limits.js
 * 
 * Maintainers: Be careful when reordering or reformatting plan definitions,
 * as the validation script uses regex extraction. Changes to the structure
 * or formatting may break the extractor.
 */
export type PlanId = 'free' | 'starter' | 'pro';
export type BillingInterval = 'monthly' | 'yearly';

/**
 * Plan order from lowest to highest tier
 * Used for comparing plan tiers and determining upgrade/downgrade paths
 */
export const planOrder: PlanId[] = ['free', 'starter', 'pro'];

/**
 * Validates and returns a Stripe price ID from environment variables.
 * Throws a clear error if the environment variable is missing or empty.
 * This ensures configuration errors are caught at startup rather than causing
 * silent failures during checkout.
 */
function getStripePriceIdFromEnv(envVarName: string, plan: string, interval: string): string {
  const value = process.env[envVarName];

  if (!value || value.trim() === '') {
    // Return empty string instead of throwing error to prevent app crash
    // Validation will happen at checkout time in API routes
    console.warn(
      `Warning: Missing Stripe price ID configuration: ${envVarName}. ` +
      `Checkout for ${plan} plan (${interval}) will not work.`
    );
    return '';
  }

  return value;
}

export type PlanConfig = {
  id: PlanId;
  name: string;
  description: string;
  maxSnippets: number;
  maxAnimations: number;
  maxSlidesPerAnimation: number;
  maxSnippetsFolder: number;
  maxVideoExportCount: number;
  shareAsPublicURL: number;
  removeWatermark: boolean;
  features: string[];
  pricing: {
    monthly: {
      amount: number; // in cents
      displayAmount: string;
      stripePriceId: string; // from Stripe dashboard
    };
    yearly: {
      amount: number; // in cents
      displayAmount: string;
      stripePriceId: string;
    };
  } | null;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out features',
    maxSnippets: 0,
    maxAnimations: 0,
    maxSlidesPerAnimation: 3,
    maxSnippetsFolder: 0,
    maxVideoExportCount: 0,
    shareAsPublicURL: 50,
    removeWatermark: false,
    features: [
      'Create & edit snippets',
      'Up to 3 slides per animation',
      'Export as images (PNG/JPG/SVG)',
      '50 public views/month',
    ],
    pricing: null, // Free has no pricing
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals and small teams',
    maxSnippets: 50,
    maxAnimations: 50,
    maxSlidesPerAnimation: 10,
    maxSnippetsFolder: 10,
    maxVideoExportCount: 50,
    shareAsPublicURL: 1000,
    removeWatermark: false,
    features: [
      'Save up to 50 snippets',
      'Save up to 50 animations',
      'Up to 10 slides per animation',
      '10 folders/collections',
      '50 video exports',
      '1,000 public views/month',
    ],
    pricing: {
      monthly: {
        amount: 500, // $5.00
        displayAmount: '$5',
        stripePriceId: getStripePriceIdFromEnv(
          'NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID',
          'starter',
          'monthly'
        ),
      },
      yearly: {
        amount: 3600, // $36/year ($3/month)
        displayAmount: '$3',
        stripePriceId: getStripePriceIdFromEnv(
          'NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID',
          'starter',
          'yearly'
        ),
      },
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For power users and professionals',
    maxSnippets: Infinity,
    maxAnimations: Infinity,
    maxSlidesPerAnimation: Infinity,
    maxSnippetsFolder: Infinity,
    maxVideoExportCount: Infinity,
    shareAsPublicURL: Infinity,
    removeWatermark: true,
    features: [
      'Unlimited snippets',
      'Unlimited animations',
      'Unlimited slides',
      'Unlimited folders',
      'Unlimited video exports',
      'Unlimited public shares',
      'Remove watermarks',
      'Priority support',
    ],
    pricing: {
      monthly: {
        amount: 900, // $9.00
        displayAmount: '$9',
        stripePriceId: getStripePriceIdFromEnv(
          'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID',
          'pro',
          'monthly'
        ),
      },
      yearly: {
        amount: 8400, // $84/year ($7/month)
        displayAmount: '$7',
        stripePriceId: getStripePriceIdFromEnv(
          'NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID',
          'pro',
          'yearly'
        ),
      },
    },
  },
};

// Helper to get plan config by ID
export function getPlanConfig(planId: PlanId | string): PlanConfig {
  if (planId === 'started') {
    return PLANS['starter'];
  }
  return PLANS[planId as PlanId] || PLANS['free'];
}

// Helper to check if a feature is available for a plan
export function canUsePlanFeature(
  planId: PlanId,
  feature: keyof Omit<PlanConfig, 'id' | 'name' | 'description' | 'features' | 'pricing'>
): boolean {
  const plan = PLANS[planId];
  const value = plan[feature];
  return typeof value === 'number' ? value === Infinity || value > 0 : Boolean(value);
}

// Helper to get upgrade target (next plan tier)
// Helper to get upgrade target (next plan tier)
export function getUpgradeTarget(currentPlan: PlanId): PlanId | null {
  if (currentPlan === 'free') return 'starter';
  if (currentPlan === 'starter') return 'pro';
  return null; // Pro has no upgrade target
}

// Helper to check if a limit is reached
export function isLimitReached(current: number, max: number): boolean {
  if (max === Infinity) return false;
  return current >= max;
}

// Helper to get usage percentage
export function getUsagePercentage(current: number, max: number | null): number {
  if (max === null || max === Infinity) return 0;
  if (max === 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / max) * 100));
}

// Helper to get usage color based on percentage
export function getUsageColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage >= 91) return 'red';
  if (percentage >= 71) return 'yellow';
  return 'green';
}
