import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export type Snippet = {
    id: string;
    user_id: string;
    code: string;
    language: string;
    title: string;
    url?: string | null;
    created_at?: string;
    updated_at?: string;
    supabase: SupabaseClient<Database, "public", any>;
};

export type Collection = {
    id?: string;
    user_id: string;
    title: string;
    snippets?: Snippet[];
    created_at?: string;
    updated_at?: string;
    supabase: SupabaseClient<Database, "public", any>;
};
