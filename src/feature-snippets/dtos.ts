export interface Snippet {
  id: string;
  user_id: string;
  code: string;
  language: string;
  title: string;
  url?: string | null | undefined;
  created_at?: string | undefined;
}

export interface Collection {
  id: string;
  user_id: string;
  title: string;
  snippets?: string[];
  created_at?: string;
  updated_at?: string;
}

