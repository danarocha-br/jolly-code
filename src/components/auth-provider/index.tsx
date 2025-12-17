'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useUserStore } from '@/app/store'

/**
 * AuthProvider sets up a Supabase auth state listener to automatically
 * update the app when the user signs in or out, eliminating the need
 * for manual page refreshes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Update user store with new session data
      if (session?.user) {
        useUserStore.setState({ user: session.user })
      } else {
        useUserStore.setState({ user: null })
      }

      // Invalidate and refetch user query to update UI
      await queryClient.invalidateQueries({ queryKey: ['user'] })

      // Handle different auth events
      if (event === 'SIGNED_IN') {
        // Refresh server components to get latest data
        router.refresh()
        
        // Refetch collections if user just signed in
        await queryClient.invalidateQueries({ queryKey: ['collections'] })
      } else if (event === 'SIGNED_OUT') {
        // Clear all queries on sign out
        queryClient.clear()
        router.refresh()
      } else if (event === 'TOKEN_REFRESHED') {
        // Update user data when token is refreshed
        await queryClient.refetchQueries({ queryKey: ['user'] })
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, queryClient, router])

  return <>{children}</>
}

