import { toast } from "sonner";

import { Animation, AnimationCollection } from "./dtos";
import {
  createAnimation as createAnimationAction,
  updateAnimation as updateAnimationAction,
  deleteAnimation as deleteAnimationAction,
  getAnimations,
  getAnimationById,
  getAnimationCollections,
  getAnimationCollectionById,
  createAnimationCollection as createAnimationCollectionAction,
  updateAnimationCollection as updateAnimationCollectionAction,
  deleteAnimationCollection as deleteAnimationCollectionAction,
} from "@/actions";
import { AnimationSettings, AnimationSlide } from "@/types/animation";
import type { UsageLimitCheck } from "@/lib/services/usage-limits";

export type CreateAnimationProps = {
  id: string;
  user_id: string | undefined;
  currentUrl?: string | null;
  title?: string;
  slides: AnimationSlide[];
  settings: AnimationSettings;
};

export type CreateAnimationResponse = {
  data: Animation;
  usage?: UsageLimitCheck;
};

export type UpdateAnimationProps = {
  id: string;
  user_id: string | undefined;
  title?: string;
  slides?: AnimationSlide[];
  settings?: AnimationSettings;
  url?: string | null;
};

export type UpdateAnimationCollectionProps = {
  id: string;
  user_id: string | undefined;
  title?: string;
  animations?: Animation[];
};

export type RemoveAnimationProps = {
  user_id: string | undefined;
  animation_id: string | undefined;
};

/**
 * Creates a new animation collection.
 */
export async function createAnimationCollection({
  title,
  user_id,
  animations,
}: Omit<AnimationCollection, "id">): Promise<{ data: AnimationCollection } | undefined> {
  try {
    const sanitizedTitle = title === "" || title === undefined ? "Untitled" : title;

    if (!user_id) {
      toast.error(`You must be authenticated to create a collection.`);
      return undefined;
    }

    const result = await createAnimationCollectionAction({
      title: sanitizedTitle,
      animations: animations as any,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error(`Failed to save the collection.`);
    return undefined;
  }
}

/**
 * Fetches animation collections.
 */
export async function fetchAnimationCollections(): Promise<AnimationCollection[]> {
  try {
    const result = await getAnimationCollections();

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("No collections found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch collections. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Fetches animation collection by id.
 */
export async function fetchAnimationCollectionById(
  id: string
): Promise<AnimationCollection[]> {
  if (!id) {
    throw new Error("Invalid id");
  }

  try {
    const result = await getAnimationCollectionById(id);

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("Collection not found");
    }

    return [result.data];
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch collections. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Deletes an animation collection.
 */
export const removeAnimationCollection = async ({
  collection_id,
  user_id,
}: {
  collection_id: string;
  user_id: string | undefined;
}): Promise<void> => {
  try {
    const result = await deleteAnimationCollectionAction(collection_id);

    if (result.error) {
      toast.error(result.error);
      return;
    }
  } catch (error) {
    toast.error(`Failed to delete collection.`);
  }
};

/**
 * Updates the title of an animation collection.
 */
export const updateAnimationCollectionTitle = async ({
  id,
  user_id,
  title,
}: Omit<UpdateAnimationCollectionProps, "animations">): Promise<
  { data: AnimationCollection } | undefined
> => {
  try {
    const result = await updateAnimationCollectionAction({
      id,
      title,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error("Something went wrong, please try again.");
    return undefined;
  }
};

export const removeAnimationFromPreviousCollection = async (
  user_id: string | undefined,
  animation_id: string,
  previous_collection_id: string
): Promise<void> => {
  try {
    const collectionResult = await getAnimationCollectionById(previous_collection_id);

    if (collectionResult.error || !collectionResult.data) {
      return;
    }

    const currentCollection = collectionResult.data;
    const currentAnimations =
      currentCollection?.animations !== null && Array.isArray(currentCollection?.animations)
        ? currentCollection.animations
        : [];

    if (currentAnimations.some((a) => a.id === animation_id)) {
      const updatedAnimations = currentAnimations.filter((a) => a.id !== animation_id);

      const result = await updateAnimationCollectionAction({
        id: previous_collection_id,
        title: currentCollection.title,
        animations: updatedAnimations.map((a) => a.id) as any,
      });

      if (result.error) {
        toast.error("Something went wrong, please try again.");
      }
    } else {
    }
  } catch (error) {
    toast.error("Something went wrong, please try again.");
  }
};

/**
 * Updates a collection with a new animation.
 */
export const updateAnimationCollection = async ({
  id,
  previous_collection_id,
  user_id,
  title,
  animation_id,
}: Omit<UpdateAnimationCollectionProps, "animations"> & {
  animation_id: string;
  previous_collection_id: string;
}): Promise<AnimationCollection | undefined> => {
  try {
    await removeAnimationFromPreviousCollection(user_id, animation_id, previous_collection_id);

    const collectionResult = await getAnimationCollectionById(id);

    if (collectionResult.error || !collectionResult.data) {
      toast.error("Failed to fetch collection");
      return undefined;
    }

    const currentCollection = collectionResult.data;
    const currentAnimations =
      currentCollection?.animations !== null && Array.isArray(currentCollection?.animations)
        ? currentCollection.animations
        : [];

    if (!currentAnimations.some((a) => a.id === animation_id)) {
      const animationResult = await getAnimationById(animation_id);
      if (animationResult.error || !animationResult.data) {
        toast.error("Failed to fetch animation details");
        return undefined;
      }
      const animation = animationResult.data;

      const updatedAnimations = [...currentAnimations, animation];

      const result = await updateAnimationCollectionAction({
        id,
        title,
        animations: updatedAnimations.map((a) => a.id) as any,
      });

      if (result.error) {
        toast.error(result.error);
        return undefined;
      }

      const serverTitle = result.data!.title?.trim();
      const preservedTitle =
        serverTitle && serverTitle !== "" ? serverTitle : currentCollection.title;

      return { ...result.data!, title: preservedTitle, animations: updatedAnimations };
    } else {
      toast.error("This animation already belongs to this collection.");
      return undefined;
    }
  } catch (error) {
    toast.error("Something went wrong, please try again.");
    return undefined;
  }
};

export function createAnimationUrl(
  currentUrl: string | null | undefined,
  slides: AnimationSlide[],
  settings: AnimationSettings,
  user_id: string | undefined
) {
  const queryParams = new URLSearchParams();
  const stringifiedState = transformAnimationState({ slides, settings });

  Object.entries(stringifiedState).forEach(([key, value]) => {
    queryParams.append(key, value);
  });

  queryParams.append("user_id", user_id ?? "");
  queryParams.delete("shared");

  return currentUrl ? `${currentUrl}?${queryParams.toString()}` : `?${queryParams.toString()}`;
}

export function transformAnimationState(state: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        return [key, JSON.stringify(value)];
      }
      return [key, String(value)];
    })
  );
}

/**
 * Create a new animation.
 */
export async function createAnimation({
  id,
  currentUrl,
  user_id,
  title,
  slides,
  settings,
}: CreateAnimationProps): Promise<CreateAnimationResponse | undefined> {
  try {
    const sanitizedTitle = title && title.trim() !== "" ? title : "Untitled animation";
    const url = createAnimationUrl(currentUrl, slides, settings, user_id);

    const result = await createAnimationAction({
      id,
      title: sanitizedTitle,
      slides,
      settings,
      url,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    const animation = result.data;

    toast.success("Your animation was saved.");

    return animation ? { data: animation } : undefined;
  } catch (error) {
    console.log(error);
    toast.error(`Failed to save the animation.`);
    return undefined;
  }
}

/**
 * Fetch all animations.
 */
export async function fetchAnimations(): Promise<Animation[]> {
  try {
    const result = await getAnimations();

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("No animations found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch animations. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Fetch a single animation.
 */
export async function fetchAnimationById(
  id: string
): Promise<Animation> {
  try {
    const result = await getAnimationById(id);

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("Animation not found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Remove an animation.
 */
export async function removeAnimation({
  animation_id,
  user_id,
}: RemoveAnimationProps): Promise<void> {
  try {
    if (!animation_id) {
      toast.error("Animation ID is missing.");
      return;
    }

    const result = await deleteAnimationAction(animation_id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Animation was removed.");
  } catch (error) {
    toast.error(`Failed to remove the animation.`);
  }
}

/**
 * Update an animation.
 */
export async function updateAnimation({
  id,
  user_id,
  title,
  slides,
  settings,
  url,
}: UpdateAnimationProps): Promise<{ data: Animation } | undefined> {
  try {
    const result = await updateAnimationAction({
      id,
      title,
      slides,
      settings,
      url,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error(`Failed to update the ${title}.`);
    return undefined;
  }
}
