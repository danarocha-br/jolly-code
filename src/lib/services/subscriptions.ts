// Placeholder subscription service for future payment integration
export type SubscriptionStatus = "active" | "past_due" | "canceled" | null;

export const subscriptions = {
  getStatus: async () => {
    return { status: null as SubscriptionStatus, subscriptionId: null as string | null };
  },
  startCheckout: async () => {
    throw new Error("Subscription checkout not implemented yet.");
  },
};

