export type PlanId = "free" | "pro";

export type PlanConfig = {
  name: string;
  maxSnippets: number | null;
  maxAnimations: number | null;
  maxSlidesPerAnimation: number | null;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    name: "Free",
    maxSnippets: 10,
    maxAnimations: 10,
    maxSlidesPerAnimation: 5,
    features: ["Basic code snippets", "Up to 5 slides per animation"],
  },
  pro: {
    name: "Pro",
    maxSnippets: null,
    maxAnimations: null,
    maxSlidesPerAnimation: null,
    features: ["Unlimited snippets", "Unlimited animations", "Unlimited slides"],
  },
};

export type PlanLimitKey = "maxSnippets" | "maxAnimations" | "maxSlidesPerAnimation";

export const getPlanLimitValue = (plan: PlanId, key: PlanLimitKey): number | null => {
  return PLANS[plan][key];
};

