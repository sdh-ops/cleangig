'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Loader2, Check, Bell, MapPin, Zap } from 'lucide-react'

type Prefs = {
  notify_new_jobs: boolean
  notify_urgent: boolean
  notify_messages: boolean
  radius_km: number
  min_price: number
}

const DEFAULT_PREFS: Prefs = {
  notify_new_jobs: true,
  notify_urgent: true,
  notify_messages: true,
  radius_km: 5,
  min_price: 20000,
}

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('preferences').eq('id', user.id).single()
      if (data?.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences })
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    setSaving(true)
    await supabase.from('users').update({ preferences: prefs, updated_at: new Date().toISOString() }).eq('id', userId)
    setSaving(false)
    router.replace('/profile')
  }

  if (loading) {
    return <div className="sseuksak-shell flex items-center justify-center"><Loader2 size={24} className="animate-spin text-brand" /></div>
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-extrabold">작업 알림 설정</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-5 pb-28 flex flex-col gap-4">
        <section className="card overflow-hidden">
          <h3 className="px-4 pt-4 pb-2 text-[12px] font-black text-text-faint uppercase tracking-wide">알림</h3>
          <Toggle
            icon={<Bell size={17} />}
            label="신규 작업 알림"
            sub="내 반경 안에 새 작업이 올라오면 알림"
            checked={prefs.notify_new_jobs}
            onChange={(v) => setPrefs({ ...prefs, notify_new_jobs: v })}
          />
          <div className="mx-4 border-t border-line-soft" />
          <Toggle
            icon={<Zap size={17} />}
            label="긴급 작업 우선 알림"
            sub="긴급 건은 소리+진동으로"
            checked={prefs.notify_urgent}
            onChange={(v) => setPrefs({ ...prefs, notify_urgent: v })}
          />
          <div className="mx-4 border-t border-line-soft" />
          <Toggle
            icon={<Bell size={17} />}
            label="채팅 알림"
            sub="파트너 메시지 수신 시"
            checked={prefs.notify_messages}
            onChange={(v) => setPrefs({ ...prefs, notify_messages: v })}
          />
        </section>

        <section className="card p-4">
          <h3 className="text-[12px] font-black text-text-faint uppercase tracking-wide mb-3">매칭 조건</h3>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={15} className="text-text-muted" />
              <span className="text-[13.5px] font-extrabold text-ink">알림 반경</span>
              <span className="ml-auto text-[13px] font-bold text-brand-dark">{prefs.radius_km}km</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={prefs.radius_km}
              onChange={(e) => setPrefs({ ...prefs, radius_km: parseInt(e.target.value) })}
              className="w-full accent-[#00C896]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13.5px] font-extrabold text-ink">최소 작업 금액</span>
              <span className="ml-auto text-[13px] font-bold text-brand-dark">{prefs.min_price.toLocaleString()}원</span>
            </div>
            <input
              type="range"
              min={10000}
              max={100000}
              step={5000}
              value={prefs.min_price}
              onChange={(e) => setPrefs({ ...prefs, min_price: parseInt(e.target.value) })}
              className="w-full accent-[#00C896]"
            />
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={save} disabled={saving} className="btn btn-primary w-full">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>저장 <Check size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ icon, label, sub, checked, onChange }: { icon: React.ReactNode; label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted text-left">
      <div className="w-9 h-9 rounded-full bg-surface-muted text-text-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
        <p className="text-[11.5px] text-text-soft font-bold">{sub}</p>
      </div>
      <div className={`w-11 h-6 rounded-full transition flex items-center px-0.5 ${checked ? 'bg-brand justify-end' : 'bg-line-strong justify-start'}`}>
        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
      </div>
    </button>
  )
}
