'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFeeSettings, saveFeeSettings } from '@/lib/settings'
import { calculateSettlement, DEFAULT_FEES, PLATFORM_FEE_RATE_BY_TIER, type FeeSettings } from '@/lib/pricing'
import { formatKRW } from '@/lib/utils'
import { Loader2, Check, RotateCcw, Calculator, Save, AlertCircle, TrendingDown } from 'lucide-react'

export default function AdminFeeSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  // 모델A: 단일 플랫폼 이용료 (호스트 결제액 기준)
  const [platform, setPlatform] = useState(DEFAULT_FEES.platform_fee_rate * 100) // percent
  const [wht, setWht] = useState(3.3)
  const [vat, setVat] = useState(10)

  const [preview, setPreview] = useState(35000)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const fees = await getFeeSettings()
      setPlatform(Math.round((fees.platform_fee_rate ?? DEFAULT_FEES.platform_fee_rate) * 100 * 10) / 10)
      setWht(Math.round(fees.withholding_tax_rate * 100 * 10) / 10)
      setVat(Math.round(fees.vat_rate * 100 * 10) / 10)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const asSettings = (): FeeSettings => ({
    host_fee_rate: DEFAULT_FEES.host_fee_rate,     // deprecated (모델A 미사용, 타입 호환 유지)
    worker_fee_rate: DEFAULT_FEES.worker_fee_rate, // deprecated
    platform_fee_rate: platform / 100,
    withholding_tax_rate: wht / 100,
    vat_rate: vat / 100,
  })

  const reset = () => {
    setPlatform(DEFAULT_FEES.platform_fee_rate * 100)
    setWht(DEFAULT_FEES.withholding_tax_rate * 100)
    setVat(DEFAULT_FEES.vat_rate * 100)
  }

  const save = async () => {
    setErr(null); setOk(false)
    if (platform < 0 || wht < 0 || vat < 0) { setErr('음수는 허용되지 않습니다.'); return }
    if (platform > 30) { setErr('플랫폼 이용료는 30%를 넘을 수 없습니다.'); return }
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
        <p className="t-caption mt-1">모델A: 워커 수수료 폐지 — 플랫폼은 호스트 결제액의 단일 이용료만 수취. 기본값: 이용료 15% (스타터, 등급별 15→12% 차등) · 원천징수 3.3% · 부가세 10%.</p>
      </div>

      {/* 티어별 이용료율 요약 */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-brand-dark" />
          <h3 className="h-section text-ink">등급별 플랫폼 이용료율</h3>
        </div>
        <p className="t-caption mb-3">아래 수치는 코드에 고정된 등급별 이용료입니다 (DB 설정값과 별개). 등급이 올라갈수록 이용료가 낮아져 워커 정산액이 늘어납니다.</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { tier: '스타터', rate: PLATFORM_FEE_RATE_BY_TIER['STARTER'], color: 'bg-slate-100 border-slate-200', label: '시작', badge: 'text-slate-600' },
            { tier: '실버',   rate: PLATFORM_FEE_RATE_BY_TIER['SILVER'],  color: 'bg-slate-100 border-slate-200', label: '10건+', badge: 'text-slate-500' },
            { tier: '골드',   rate: PLATFORM_FEE_RATE_BY_TIER['GOLD'],   color: 'bg-amber-50 border-amber-200',  label: '50건+', badge: 'text-amber-600' },
            { tier: '마스터', rate: PLATFORM_FEE_RATE_BY_TIER['MASTER'], color: 'bg-sky-50 border-sky-200',     label: '150건+', badge: 'text-sky-600' },
          ].map((t) => (
            <div key={t.tier} className={`rounded-xl border p-3 text-center ${t.color}`}>
              <p className={`text-[12px] font-black uppercase tracking-wide ${t.badge}`}>{t.tier}</p>
              <p className="text-[22px] font-black text-ink mt-1">{Math.round(t.rate * 100)}%</p>
              <p className="text-[11px] font-bold text-text-faint mt-0.5">{t.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-xl bg-brand-softer border border-brand/20">
          <p className="text-[13.5px] font-bold text-brand-dark">🎁 처음 2건 프로모션: 플랫폼 이용료 10% 적용 (워커 정산액 +5%p)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="h-section text-ink mb-4">기본 요율 (DB 설정)</h3>
          <RateInput label="플랫폼 이용료 (스타터 기준)" value={platform} onChange={setPlatform} suffix="%" hint="호스트 결제액에서 차감 — 등급별 차등은 위 표 참고" />
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
              <p className="text-[14.5px] font-bold text-danger">{err}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-brand-dark" />
            <h3 className="h-section text-ink">미리보기</h3>
          </div>
          <label className="t-meta block mb-2 ml-1">거래액 (공간파트너 결제)</label>
          <input
            type="number"
            value={preview}
            onChange={(e) => setPreview(parseInt(e.target.value) || 0)}
            step={1000}
            className="input mb-4"
          />

          <div className="card p-4 bg-surface-soft mb-3">
            <p className="text-[13.5px] font-black text-text-faint uppercase tracking-wide mb-2">프리랜서 클린파트너</p>
            <Row label="거래액" value={formatKRW(settlementFreelancer.gross_amount)} />
            <Row label={`플랫폼 이용료 (${platform}%)`} value={`−${formatKRW(settlementFreelancer.platform_revenue)}`} dim />
            <Row label={`원천징수 (${wht}%)`} value={`−${formatKRW(settlementFreelancer.withholding_tax)}`} dim />
            <div className="divider my-2" />
            <Row label="클린파트너 실수령" value={formatKRW(settlementFreelancer.worker_payout)} bold />
            <Row label="플랫폼 매출" value={formatKRW(settlementFreelancer.platform_revenue)} bold tone="brand" />
          </div>

          <div className="card p-4 bg-surface-soft">
            <p className="text-[13.5px] font-black text-text-faint uppercase tracking-wide mb-2">개인/법인 사업자</p>
            <Row label="거래액" value={formatKRW(settlementBusiness.gross_amount)} />
            <Row label={`플랫폼 이용료 (${platform}%)`} value={`−${formatKRW(settlementBusiness.platform_revenue)}`} dim />
            <Row label="원천징수" value="없음" dim />
            <div className="divider my-2" />
            <Row label="클린파트너 실수령" value={formatKRW(settlementBusiness.worker_payout)} bold />
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
      {hint && <p className="text-[13.5px] text-text-soft font-medium mt-1 ml-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, dim, bold, tone }: { label: string; value: string; dim?: boolean; bold?: boolean; tone?: 'brand' }) {
  return (
    <div className="flex justify-between text-[15px] py-0.5">
      <span className={`${bold ? 'font-black text-ink' : 'font-semibold'} ${dim ? 'text-text-soft' : 'text-text-muted'}`}>{label}</span>
      <span className={`${bold ? 'font-black' : 'font-semibold'} t-money ${tone === 'brand' ? 'text-brand-dark' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
