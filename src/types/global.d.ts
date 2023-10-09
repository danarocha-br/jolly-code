declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      NEXT_PUBLIC_CANNY_API_KEY: string;
      LIVEBLOCKS_SECRET_KEY: string;
      LIVEBLOCKS_PUBLIC_API_KEY: string;
    }
  }
}

export {

}