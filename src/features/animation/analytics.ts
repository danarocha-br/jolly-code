import type { User } from "@supabase/supabase-js";

import { analytics } from "@/lib/services/tracking";

type EventPayload = Record<string, any> | undefined;

export const trackAnimationEvent = (
  eventName: string,
  user: User | null,
  properties: EventPayload = {}
) => {
  analytics.track(eventName, {
    ...properties,
    is_guest_user: !user,
  });
};
