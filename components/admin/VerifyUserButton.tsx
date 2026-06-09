'use client'

import { useState } from 'react'
import { BadgeCheck, BadgeX } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isVerified: boolean
}

export default function VerifyUserButton({ userId, isVerified }: Props) {
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(isVerified)
  const router = useRouter()

  const toggle = async () => {
    if (loading) return
    const next = !current
    const label = next ? '인증 승인' : '인증 취소'
    if (!confirm(`${label} 하시겠어요?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_verified: next }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setCurrent(next)
      router.refresh()
    } catch (e) {
      alert('처리 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={current ? '인증 취소' : '인증 승인'}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition active:scale-95
        ${current
          ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
        disabled:opacity-50`}
    >
      {loading ? (
        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : current ? (
        <BadgeCheck size={12} />
      ) : (
        <BadgeX size={12} />
      )}
      {current ? '인증됨' : '미인증'}
    </button>
  )
}
