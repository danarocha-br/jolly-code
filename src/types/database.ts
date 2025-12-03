export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            _keepalive: {
                Row: {
                    id: number
                    last_ping: string
                }
                Insert: {
                    id: number
                    last_ping?: string
                }
                Update: {
                    id?: number
                    last_ping?: string
                }
                Relationships: []
            }
            collection: {
                Row: {
                    created_at: string
                    id: string
                    snippets: Json[] | null
                    title: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    snippets?: Json[] | null
                    title?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    snippets?: Json[] | null
                    title?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "collection_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            links: {
                Row: {
                    created_at: string
                    description: string | null
                    id: string
                    short_url: string
                    snippet_id: string | null
                    title: string | null
                    url: string | null
                    user_id: string | null
                    visits: number | null
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    short_url: string
                    snippet_id?: string | null
                    title?: string | null
                    url?: string | null
                    user_id?: string | null
                    visits?: number | null
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    short_url?: string
                    snippet_id?: string | null
                    title?: string | null
                    url?: string | null
                    user_id?: string | null
                    visits?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "links_snippet_id_fkey"
                        columns: ["snippet_id"]
                        isOneToOne: false
                        referencedRelation: "snippet"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "links_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    id: string
                    username: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    id: string
                    username?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    id?: string
                    username?: string | null
                }
                Relationships: []
            }
            snippet: {
                Row: {
                    code: string | null
                    created_at: string
                    favorite: boolean | null
                    folder_id: string | null
                    id: string
                    language: string | null
                    tags: string[] | null
                    title: string | null
                    trash: boolean | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    code?: string | null
                    created_at?: string
                    favorite?: boolean | null
                    folder_id?: string | null
                    id?: string
                    language?: string | null
                    tags?: string[] | null
                    title?: string | null
                    trash?: boolean | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    code?: string | null
                    created_at?: string
                    favorite?: boolean | null
                    folder_id?: string | null
                    id?: string
                    language?: string | null
                    tags?: string[] | null
                    title?: string | null
                    trash?: boolean | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "snippet_folder_id_fkey"
                        columns: ["folder_id"]
                        isOneToOne: false
                        referencedRelation: "collection"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "snippet_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            increment_link_visits: {
                Args: {
                    link_id: string
                }
                Returns: undefined
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
