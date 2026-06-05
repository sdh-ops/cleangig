'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeToPush } from '@/lib/push'

export default function PushSubscriptionInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    // 이미 권한이 허용된 경우 조용히 구독 등록 (재방문·새로고침 시 구독 갱신)
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) subscribeToPush()
    })
  }, [])

  return null
}
