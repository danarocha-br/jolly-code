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
      animation: {
        Row: {
          created_at: string
          id: string
          settings: Json
          slides: Json
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings: Json
          slides: Json
          title: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          slides?: Json
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      animation_collection: {
        Row: {
          animations: Json[] | null
          created_at: string
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          animations?: Json[] | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          animations?: Json[] | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animation_collection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      collection_snippets: {
        Row: {
          collection_id: string
          created_at: string
          snippet_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          snippet_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          snippet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_snippets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_snippets_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "snippet"
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
          animation_count: number
          avatar_url: string | null
          billing_interval: string | null
          created_at: string
          email: string | null
          folder_count: number
          id: string
          name: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          plan_updated_at: string
          public_share_count: number
          snippet_count: number
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_id: string | null
          subscription_period_end: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
          video_export_count: number
        }
        Insert: {
          animation_count?: number
          avatar_url?: string | null
          billing_interval?: string | null
          created_at?: string
          email?: string | null
          folder_count?: number
          id: string
          name?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_updated_at?: string
          public_share_count?: number
          snippet_count?: number
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          video_export_count?: number
        }
        Update: {
          animation_count?: number
          avatar_url?: string | null
          billing_interval?: string | null
          created_at?: string
          email?: string | null
          folder_count?: number
          id?: string
          name?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_updated_at?: string
          public_share_count?: number
          snippet_count?: number
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          video_export_count?: number
        }
        Relationships: []
      }
      share_view_events: {
        Row: {
          created_at: string | null
          id: string
          link_id: string | null
          owner_id: string | null
          viewed_on: string
          viewer_token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_id?: string | null
          owner_id?: string | null
          viewed_on?: string
          viewer_token: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_id?: string | null
          owner_id?: string | null
          viewed_on?: string
          viewer_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_view_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_view_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snippet: {
        Row: {
          code: string
          created_at: string
          id: string
          language: string
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          language: string
          title: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          language?: string
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snippet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_audit: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          status: string
          stripe_customer_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          status?: string
          stripe_customer_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          status?: string
          stripe_customer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_drift_alerts: {
        Row: {
          created_at: string
          id: string
          metric: string
          new_count: number
          percent_drift: number
          previous_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          new_count: number
          percent_drift: number
          previous_count: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          new_count?: number
          percent_drift?: number
          previous_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_drift_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          animation_count: number
          folder_count: number
          last_reset_at: string
          public_share_count: number
          snippet_count: number
          user_id: string
          video_export_count: number
        }
        Insert: {
          animation_count?: number
          folder_count?: number
          last_reset_at?: string
          public_share_count?: number
          snippet_count?: number
          user_id: string
          video_export_count?: number
        }
        Update: {
          animation_count?: number
          folder_count?: number
          last_reset_at?: string
          public_share_count?: number
          snippet_count?: number
          user_id?: string
          video_export_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          email: string
          feature_key: string
          granted_at: string | null
          id: string
          metadata: Json
          notified_at: string | null
          referer: string | null
          requested_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          email: string
          feature_key: string
          granted_at?: string | null
          id?: string
          metadata?: Json
          notified_at?: string | null
          referer?: string | null
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          feature_key?: string
          granted_at?: string | null
          id?: string
          metadata?: Json
          notified_at?: string | null
          referer?: string | null
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_user_id_fkey"
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
      calculate_usage_counts: {
        Args: {
          p_user_id: string
        }
        Returns: {
          animation_count: number
          folder_count: number
          public_share_count: number
          snippet_count: number
          video_export_count: number
        }[]
      }
      check_animation_limit: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      check_public_share_limit: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      check_snippet_limit: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      decrement_animation_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      decrement_public_share_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      decrement_snippet_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      decrement_video_export_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      ensure_usage_limits_row: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      force_sync_user_usage: {
        Args: {
          target_user_id: string
        }
        Returns: Json
      }
      get_plan_limits: {
        Args: {
          plan_type: Database["public"]["Enums"]["plan_type"]
        }
        Returns: Json
      }
      get_user_usage: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_user_usage_v2: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      increment_animation_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      increment_link_visits: {
        Args: {
          link_id: string
        }
        Returns: undefined
      }
      increment_public_share_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      increment_snippet_count: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      record_public_share_view: {
        Args: {
          p_link_id: string
          p_owner_id: string
          p_viewer_token: string
        }
        Returns: {
          allowed: boolean | null
          counted: boolean | null
          current: number | null
          max: number | null
          plan: Database["public"]["Enums"]["plan_type"] | null
        }
      }
      reset_public_share_usage: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      sync_all_user_usage_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_stripe_subscription: {
        Args: {
          p_plan: Database["public"]["Enums"]["plan_type"]
          p_stripe_customer_id: string
          p_stripe_price_id: string
          p_stripe_subscription_id: string
          p_stripe_subscription_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      sync_user_usage_counts: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      plan_type: "free" | "starter" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      plan_type: ["free", "started", "pro"],
    },
  },
} as const
