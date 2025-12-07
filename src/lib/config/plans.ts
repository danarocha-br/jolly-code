export type PlanId = 'free' | 'started' | 'pro';
export type BillingInterval = 'monthly' | 'yearly';

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
    shareAsPublicURL: 3,
    removeWatermark: false,
    features: [
      'Create & edit snippets',
      'Up to 3 slides per animation',
      'Export as images (PNG/JPG/SVG)',
      '3 public shares',
    ],
    pricing: null, // Free has no pricing
  },
  started: {
    id: 'started',
    name: 'Started',
    description: 'For individuals and small teams',
    maxSnippets: 50,
    maxAnimations: 50,
    maxSlidesPerAnimation: 10,
    maxSnippetsFolder: 10,
    maxVideoExportCount: 50,
    shareAsPublicURL: 50,
    removeWatermark: false,
    features: [
      'Save up to 50 snippets',
      'Save up to 50 animations',
      'Up to 10 slides per animation',
      '10 folders/collections',
      '50 video exports',
      '50 public shares',
    ],
    pricing: {
      monthly: {
        amount: 500, // $5.00
        displayAmount: '$5',
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTED_MONTHLY_PRICE_ID || '',
      },
      yearly: {
        amount: 3600, // $36/year ($3/month)
        displayAmount: '$3',
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTED_YEARLY_PRICE_ID || '',
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
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
      },
      yearly: {
        amount: 8400, // $84/year ($7/month)
        displayAmount: '$7',
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
      },
    },
  },
};

// Helper to get plan config by ID
export function getPlanConfig(planId: PlanId): PlanConfig {
  return PLANS[planId];
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
export function getUpgradeTarget(currentPlan: PlanId): PlanId | null {
  if (currentPlan === 'free') return 'started';
  if (currentPlan === 'started') return 'pro';
  return null; // Pro has no upgrade target
}

// Helper to check if a limit is reached
export function isLimitReached(current: number, max: number): boolean {
  if (max === Infinity) return false;
  return current >= max;
}

// Helper to get usage percentage
export function getUsagePercentage(current: number, max: number | null): number {
  if (max === null || max === Infinity || max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

// Helper to get usage color based on percentage
export function getUsageColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage >= 91) return 'red';
  if (percentage >= 71) return 'yellow';
  return 'green';
}

