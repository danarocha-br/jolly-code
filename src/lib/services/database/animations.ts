import { SupabaseClient } from "@supabase/supabase-js";

import { Animation, AnimationCollection } from "./types";
import { Database } from "@/types/database";

const normalizeIds = (items: (string | number | Record<string, any> | null)[] | null) =>
  (items ?? [])
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);
      if (item && typeof item === "object" && "id" in item && typeof (item as any).id === "string") {
        return (item as any).id as string;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

export async function insertAnimation({
  id,
  user_id,
  title,
  slides,
  settings,
  url,
  supabase,
}: Animation): Promise<Animation[]> {
  const sanitizedTitle = title?.trim() || "Untitled";

  try {
    const { data: animation, error } = await supabase
      .from("animation")
      .insert([
        {
          id,
          user_id,
          title: sanitizedTitle,
          slides,
          settings,
          url,
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    if (animation && animation.length > 0) {
      const { data: collections } = await supabase
        .from("animation_collection")
        .select("id, animations")
        .eq("user_id", user_id)
        .eq("title", "Home");

      let collectionId: string | undefined = collections?.[0]?.id;

      if (!collections || collections.length === 0) {
        const { data: newCollection, error: collectionError } = await supabase
          .from("animation_collection")
          .insert([
            {
              user_id,
              title: "Home",
              animations: [animation[0].id],
              updated_at: new Date().toISOString(),
            },
          ])
          .select();

        if (collectionError) {
          throw collectionError;
        }

        // @ts-ignore
        if (newCollection && newCollection.length > 0) {
          // @ts-ignore
          collectionId = newCollection[0].id;
        }
      } else if (collectionId) {
        const currentAnimations = normalizeIds(collections[0].animations as any);

        if (!currentAnimations.includes(animation[0].id)) {
          const updatedAnimations = [...currentAnimations, animation[0].id];
          const { error: updateError } = await supabase
            .from("animation_collection")
            .update({
              animations: updatedAnimations,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user_id)
            .eq("id", collectionId);

          if (updateError) {
            throw updateError;
          }
        }
      }
    }

    return animation || [];
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function deleteAnimation({
  animation_id,
  user_id,
  supabase,
}: {
  animation_id: string;
  user_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<{ deletedCount: number }> {
  try {
    const { data: collections, error: collectionError } = await supabase
      .from("animation_collection")
      .select("id, animations")
      .eq("user_id", user_id);

    if (collectionError) {
      throw collectionError;
    }

    if (collections) {
      for (const collection of collections) {
        const updatedAnimations = normalizeIds(collection.animations as any).filter(
          (id) => id !== animation_id
        );

        const { error: updateError } = await supabase
          .from("animation_collection")
          .update({
            animations: updatedAnimations,
            updated_at: new Date().toISOString(),
          })
          .eq("id", collection.id)
          .eq("user_id", user_id);

        if (updateError) {
          throw updateError;
        }
      }
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from("animation")
      .delete()
      .eq("id", animation_id)
      .eq("user_id", user_id)
      .select("id");

    if (deleteError) {
      throw deleteError;
    }

    const deletedCount = deletedRows?.length ?? 0;
    if (deletedCount === 0) {
      throw new Error("Animation not found or already deleted.");
    }

    return { deletedCount };
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function getAnimationById({
  user_id,
  animation_id,
  supabase,
}: {
  user_id: string;
  animation_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<Animation[]> {
  try {
    const { data, error } = await supabase
      .from("animation")
      .select()
      .eq("id", animation_id)
      .eq("user_id", user_id);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      return data as Animation[];
    }

    throw new Error("Animation not found.");
  } catch (err) {
    console.error(err);
    return Promise.reject(new Error("An error occurred. Please try again later."));
  }
}

export async function getUsersAnimationsList({
  user_id,
  supabase,
}: {
  user_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<Animation[]> {
  try {
    const { data, error } = await supabase
      .from("animation")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      throw error;
    }

    if (data) {
      return data as Animation[];
    }

    throw new Error("No animations found.");
  } catch (err) {
    console.error(err);
    return Promise.reject(new Error("An error occurred. Please try again later."));
  }
}

export async function updateAnimation({
  id,
  user_id,
  title,
  slides,
  settings,
  url,
  supabase,
}: Animation): Promise<Animation[]> {
  const sanitizedTitle = title?.trim() || "Untitled";

  try {
    const { data, error } = await supabase
      .from("animation")
      .update([
        {
          user_id,
          title: sanitizedTitle,
          slides,
          settings,
          url,
          updated_at: new Date().toISOString(),
        },
      ])
      .eq("id", id)
      .eq("user_id", user_id)
      .select();

    if (error) {
      throw error;
    }

    return data as Animation[];
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function getAnimationCollections({
  user_id,
  supabase,
}: {
  user_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<AnimationCollection[]> {
  try {
    const [{ data: collections, error: collectionError }, { data: animations, error: animationError }] =
      await Promise.all([
        supabase.from("animation_collection").select("*").eq("user_id", user_id),
        supabase.from("animation").select("*").eq("user_id", user_id),
      ]);

    if (collectionError) throw collectionError;
    if (animationError) throw animationError;

    const mappedAnimations = animations || [];

    return (collections || []).map((collection) => {
      const animationIds = normalizeIds(collection.animations as any);
      return {
        ...collection,
        animations: animationIds
          .map((animationId) => mappedAnimations.find((a) => a.id === animationId))
          .filter(Boolean) as Animation[],
      };
    });
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function getAnimationCollectionById({
  id,
  user_id,
  supabase,
}: {
  id: string;
  user_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<AnimationCollection> {
  try {
    const { data: collection, error: collectionError } = await supabase
      .from("animation_collection")
      .select("*")
      .eq("user_id", user_id)
      .eq("id", id)
      .single();

    if (collectionError) {
      throw collectionError;
    }

    const animationIds = normalizeIds(collection.animations as any);
    let animations: Animation[] = [];

    if (animationIds.length > 0) {
      const { data, error } = await supabase
        .from("animation")
        .select("*")
        .eq("user_id", user_id)
        .in("id", animationIds);

      if (error) {
        throw error;
      }

      animations = (data || []) as Animation[];
    }

    return {
      ...collection,
      animations,
    } as AnimationCollection;
  } catch (err) {
    console.error(err);
    return Promise.reject(new Error("An error occurred. Please try again later."));
  }
}

export async function createAnimationCollection({
  user_id,
  title,
  animations,
  supabase,
}: AnimationCollection): Promise<AnimationCollection[]> {
  const sanitizedTitle = title?.trim() || "Untitled";

  try {
    const { data, error } = await supabase
      .from("animation_collection")
      .insert([
        {
          user_id,
          title: sanitizedTitle,
          animations,
          updated_at: new Date().toISOString(),
        },
      ])
      .eq("user_id", user_id)
      .select();

    if (error) {
      throw error;
    }

    return data as AnimationCollection[];
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function updateAnimationCollection({
  id,
  user_id,
  title,
  animations,
  supabase,
}: AnimationCollection): Promise<AnimationCollection[]> {
  const sanitizedTitle = title?.trim() || "Untitled";

  try {
    const { data, error } = await supabase
      .from("animation_collection")
      .update([
        {
          user_id,
          title: sanitizedTitle,
          animations,
          updated_at: new Date().toISOString(),
        },
      ])
      .eq("id", id)
      .eq("user_id", user_id)
      .select();

    if (error) {
      throw error;
    }

    return data as AnimationCollection[];
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}

export async function deleteAnimationCollection({
  collection_id,
  user_id,
  supabase,
}: {
  collection_id: string;
  user_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from("animation_collection")
      .delete()
      .eq("id", collection_id)
      .eq("user_id", user_id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error(err);
    throw new Error("An error occurred. Please try again later.");
  }
}
