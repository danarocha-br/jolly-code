type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      collection: {
        Row: {
          created_at: string;
          id: string;
          snippets: Json[] | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          snippets?: Json[] | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          snippets?: Json[] | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      links: {
        Row: {
          created_at: string;
          id: string;
          short_url: string;
          snippet_id: string | null;
          url: string | null;
          user_id: string | null;
          visits: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          short_url: string;
          snippet_id?: string | null;
          url?: string | null;
          user_id?: string | null;
          visits?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          short_url?: string;
          snippet_id?: string | null;
          url?: string | null;
          user_id?: string | null;
          visits?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "links_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id: string;
          name: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      snippet: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          language: string;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          language: string;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          language?: string;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "snippet_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
