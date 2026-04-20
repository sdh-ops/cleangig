'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Check, Loader2, Banknote, ShieldCheck } from 'lucide-react'

const BANKS = [
  'KB국민', '신한', '우리', '하나', 'NH농협', 'IBK기업', 'SC제일', 'KEB하나', '씨티',
  '카카오뱅크', '토스뱅크', 'K뱅크', '케이뱅크', '새마을금고', '신협', '우체국', 'SC제일', '대구', '부산', '광주', '경남', '수협', '제주',
]

export default function BankAccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [holder, setHolder] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('bank_account, name').eq('id', user.id).single()
      if (data?.bank_account) {
        setBankName(data.bank_account.bank_name || '')
        setAccountNumber(data.bank_account.account_number || '')
        setHolder(data.bank_account.account_holder || data.name || '')
      } else if (data?.name) {
        setHolder(data.name)
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    if (!bankName || !accountNumber || !holder) {
      setErr('모든 항목을 입력해주세요.')
      return
    }
    setSaving(true)
    setErr(null)
    const { error } = await supabase.from('users').update({
      bank_account: { bank_name: bankName, account_number: accountNumber, account_holder: holder },
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setSaving(false)
    if (error) { setErr(error.message); return }
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
        <h1 className="flex-1 text-center text-[15px] font-extrabold">정산 계좌</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-5">
        <div className="card p-4 bg-info-soft border border-info/15 flex items-start gap-3">
          <ShieldCheck size={18} className="text-info shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-extrabold text-ink">안전한 정산을 위해 본인 명의 계좌만 등록해주세요.</p>
            <p className="text-[11.5px] text-text-muted font-semibold mt-1">계좌번호는 암호화되어 저장되며 세무/정산 목적 외에는 사용되지 않습니다.</p>
          </div>
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">은행</label>
          <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="input">
            <option value="">은행 선택</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">계좌번호</label>
          <div className="relative">
            <Banknote size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9\-]/g, ''))}
              className="input pl-11"
              placeholder="숫자만 입력"
              inputMode="numeric"
            />
          </div>
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">예금주</label>
          <input value={holder} onChange={(e) => setHolder(e.target.value)} className="input" placeholder="본인 명의" />
        </div>

        {err && <div className="p-3 bg-danger-soft rounded-xl text-[13px] font-bold text-danger">{err}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={save} disabled={saving} className="btn btn-primary w-full">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>계좌 등록 <Check size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
