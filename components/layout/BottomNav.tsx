'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNavShared from '@/components/common/BottomNav'

export default function BottomNav() {
  const [role, setRole] = useState<'operator' | 'worker' | null>(null)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (data?.role === 'operator' || data?.role === 'worker') setRole(data.role)
    })()
  }, [])

  if (!role) return null
  return <BottomNavShared role={role} />
}
