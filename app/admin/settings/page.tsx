'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFeeSettings, saveFeeSettings } from '@/lib/settings'
import { calculateSettlement, DEFAULT_FEES, type FeeSettings } from '@/lib/pricing'
import { formatKRW } from '@/lib/utils'
import { Loader2, Check, RotateCcw, Calculator, Save, AlertCircle } from 'lucide-react'

export default function AdminFeeSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [host, setHost] = useState(5) // percent
  const [worker, setWorker] = useState(5)
  const [wht, setWht] = useState(3.3)
  const [vat, setVat] = useState(10)

  const [preview, setPreview] = useState(35000)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const fees = await getFeeSettings()
      setHost(Math.round(fees.host_fee_rate * 100 * 10) / 10)
      setWorker(Math.round(fees.worker_fee_rate * 100 * 10) / 10)
      setWht(Math.round(fees.withholding_tax_rate * 100 * 10) / 10)
      setVat(Math.round(fees.vat_rate * 100 * 10) / 10)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const asSettings = (): FeeSettings => ({
    host_fee_rate: host / 100,
    worker_fee_rate: worker / 100,
    withholding_tax_rate: wht / 100,
    vat_rate: vat / 100,
  })

  const reset = () => {
    setHost(5); setWorker(5); setWht(3.3); setVat(10)
  }

  const save = async () => {
    setErr(null); setOk(false)
    if (host < 0 || worker < 0 || wht < 0 || vat < 0) { setErr('음수는 허용되지 않습니다.'); return }
    if (host + worker > 50) { setErr('호스트+워커 수수료 합은 50%를 넘을 수 없습니다.'); return }
    setSaving(true)
    const res = await saveFeeSettings(asSettings())
    setSaving(false)
    if (res.ok) { setOk(true); setTimeout(() => setOk(false), 2000) }
    else setErr(res.error || '저장 실패')
  }

  const settlementFreelancer = calculateSettlement(preview, { taxType: 'FREELANCER', fees: asSettings() })
  const settlementBusiness = calculateSettlement(preview, { taxType: 'INDIVIDUAL_BUSINESS', fees: asSettings() })

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-brand" /></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="h-hero text-ink">수수료 · 세율 설정</h1>
        <p className="t-caption mt-1">트랜잭션별로 적용되는 수수료율을 조정하세요. 기본값: 호스트 5% · 워커 5% · 원천징수 3.3% · 부가세 10%.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="h-section text-ink mb-4">요율</h3>
          <RateInput label="호스트 수수료" value={host} onChange={setHost} suffix="%" hint="공간 파트너 거래액에서 차감" />
          <RateInput label="워커 수수료" value={worker} onChange={setWorker} suffix="%" hint="작업자 정산액에서 차감" />
          <RateInput label="원천징수율 (프리랜서)" value={wht} onChange={setWht} suffix="%" hint="소득세 3% + 지방세 0.3% = 3.3%" />
          <RateInput label="부가세율" value={vat} onChange={setVat} suffix="%" hint="참조용 (과세사업자 대상)" />

          <div className="flex gap-2 mt-5">
            <button onClick={reset} className="btn btn-ghost flex-1">
              <RotateCcw size={15} /> 기본값
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
              {saving ? <Loader2 size={16} className="animate-spin" /> : ok ? <><Check size={15} /> 저장됨</> : <><Save size={15} /> 저장</>}
            </button>
          </div>

          {err && (
            <div className="mt-3 p-3 rounded-xl bg-danger-soft border border-danger/15 flex items-start gap-2">
              <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-bold text-danger">{err}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-brand-dark" />
            <h3 className="h-section text-ink">미리보기</h3>
          </div>
          <label className="t-meta block mb-2 ml-1">거래액 (호스트 결제)</label>
          <input
            type="number"
            value={preview}
            onChange={(e) => setPreview(parseInt(e.target.value) || 0)}
            step={1000}
            className="input mb-4"
          />

          <div className="card p-4 bg-surface-soft mb-3">
            <p className="text-[11.5px] font-black text-text-faint uppercase tracking-wide mb-2">프리랜서 워커</p>
            <Row label="거래액" value={formatKRW(settlementFreelancer.gross_amount)} />
            <Row label={`호스트 수수료 (${host}%)`} value={`−${formatKRW(settlementFreelancer.host_fee)}`} dim />
            <Row label={`워커 수수료 (${worker}%)`} value={`−${formatKRW(settlementFreelancer.worker_fee)}`} dim />
            <Row label={`원천징수 (${wht}%)`} value={`−${formatKRW(settlementFreelancer.withholding_tax)}`} dim />
            <div className="divider my-2" />
            <Row label="워커 실수령" value={formatKRW(settlementFreelancer.worker_payout)} bold />
            <Row label="플랫폼 매출" value={formatKRW(settlementFreelancer.platform_revenue)} bold tone="brand" />
          </div>

          <div className="card p-4 bg-surface-soft">
            <p className="text-[11.5px] font-black text-text-faint uppercase tracking-wide mb-2">개인/법인 사업자</p>
            <Row label="거래액" value={formatKRW(settlementBusiness.gross_amount)} />
            <Row label={`호스트 수수료 (${host}%)`} value={`−${formatKRW(settlementBusiness.host_fee)}`} dim />
            <Row label={`워커 수수료 (${worker}%)`} value={`−${formatKRW(settlementBusiness.worker_fee)}`} dim />
            <Row label="원천징수" value="없음" dim />
            <div className="divider my-2" />
            <Row label="워커 실수령" value={formatKRW(settlementBusiness.worker_payout)} bold />
            <Row label="플랫폼 매출" value={formatKRW(settlementBusiness.platform_revenue)} bold tone="brand" />
          </div>
        </div>
      </div>
    </div>
  )
}

function RateInput({ label, value, onChange, suffix, hint }: { label: string; value: number; onChange: (n: number) => void; suffix: string; hint?: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="t-meta block mb-2 ml-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="input pr-10"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint text-sm font-bold">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-text-soft font-medium mt-1 ml-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, dim, bold, tone }: { label: string; value: string; dim?: boolean; bold?: boolean; tone?: 'brand' }) {
  return (
    <div className="flex justify-between text-[13px] py-0.5">
      <span className={`${bold ? 'font-black text-ink' : 'font-semibold'} ${dim ? 'text-text-soft' : 'text-text-muted'}`}>{label}</span>
      <span className={`${bold ? 'font-black' : 'font-semibold'} t-money ${tone === 'brand' ? 'text-brand-dark' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
