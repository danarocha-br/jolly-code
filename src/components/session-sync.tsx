'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/app/store'
import { User } from '@supabase/supabase-js'

export function SessionSync({ user }: { user: User | null }) {
  useEffect(() => {
    useUserStore.setState({ user })
  }, [user])

  return null
}
