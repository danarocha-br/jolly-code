'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useUserStore } from '@/app/store'

type AuthContextValue = {
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Hook to access auth context including initialization state
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * AuthProvider sets up a Supabase auth state listener to automatically
 * update the app when the user signs in or out, eliminating the need
 * for manual page refreshes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    // Set up auth state listener
    // Note: onAuthStateChange fires immediately with current session state when subscribed
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Mark as initialized on the first auth state change event
      // This happens immediately when the listener is set up
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true
        setIsInitialized(true)
      }

      // Update user store with new session data (synchronous, always runs)
      if (session?.user) {
        useUserStore.setState({ user: session.user })
      } else {
        useUserStore.setState({ user: null })
      }

      try {
        // Invalidate and refetch user query to update UI
        await queryClient.invalidateQueries({ queryKey: ['user'] })

        // Handle different auth events
        if (event === 'SIGNED_IN') {
          // Refresh server components to get latest data
          router.refresh()
          
          // Refetch collections if user just signed in
          await queryClient.invalidateQueries({ queryKey: ['collections'] })
        } else if (event === 'SIGNED_OUT') {
          // Invalidate user-specific queries on sign out, preserving public data
          await queryClient.invalidateQueries({ queryKey: ['user'] })
          await queryClient.invalidateQueries({ queryKey: ['billing-info'] })
          await queryClient.invalidateQueries({ queryKey: ['user-plan'] })
          await queryClient.invalidateQueries({ queryKey: ['collections'] })
          router.refresh()
        } else if (event === 'TOKEN_REFRESHED') {
          // Update user data when token is refreshed
          await queryClient.refetchQueries({ queryKey: ['user'] })
        }
      } catch (error) {
        // Log error but don't break auth flow - store state is already updated
        console.error('[AuthProvider] Error handling auth state change:', error)
        
        // Minimal recovery: attempt safe router refresh to keep UI consistent
        try {
          router.refresh()
        } catch (refreshError) {
          console.error('[AuthProvider] Error during fallback router refresh:', refreshError)
        }
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient, router, supabase])

  const contextValue = useMemo(
    () => ({ isInitialized }),
    [isInitialized]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

