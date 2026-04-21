'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/storage'
import {
  ChevronLeft,
  Check,
  Loader2,
  ShieldCheck,
  Briefcase,
  User as UserIcon,
  Upload,
  AlertCircle,
} from 'lucide-react'
import type { TaxType, VatType } from '@/lib/types'

export default function TaxProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const [taxType, setTaxType] = useState<TaxType | ''>('')
  const [residentLast, setResidentLast] = useState('')
  const [bizRegNumber, setBizRegNumber] = useState('')
  const [bizRegImage, setBizRegImage] = useState<string | null>(null)
  const [bizName, setBizName] = useState('')
  const [bizHolder, setBizHolder] = useState('')
  const [bizVatType, setBizVatType] = useState<VatType>('SIMPLE')
  const [bizEmail, setBizEmail] = useState('')
  const [agreeSensitive, setAgreeSensitive] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users')
        .select('tax_type, resident_id_last, biz_reg_number, biz_reg_image, biz_name, biz_holder, biz_vat_type, biz_email')
        .eq('id', user.id).single()
      if (data) {
        setTaxType((data.tax_type as TaxType) || '')
        setResidentLast(data.resident_id_last || '')
        setBizRegNumber(data.biz_reg_number || '')
        setBizRegImage(data.biz_reg_image || null)
        setBizName(data.biz_name || '')
        setBizHolder(data.biz_holder || '')
        setBizVatType((data.biz_vat_type as VatType) || 'SIMPLE')
        setBizEmail(data.biz_email || '')
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBizImage = async (file: File) => {
    setUploading(true)
    setErr(null)
    try {
      const { url } = await uploadImage('docs', userId, file, { folder: 'biz' })
      setBizRegImage(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setErr(null)
    if (!taxType) { setErr('세금 유형을 선택해주세요.'); return }

    if (taxType === 'FREELANCER') {
      if (!/^\d{7}$/.test(residentLast)) {
        setErr('주민등록번호 뒷자리 7자리를 정확히 입력해주세요.')
        return
      }
      if (!agreeSensitive) {
        setErr('민감정보 수집·이용에 동의해주세요.')
        return
      }
    }
    if (taxType !== 'FREELANCER') {
      if (!/^\d{10}$/.test(bizRegNumber.replace(/-/g, ''))) {
        setErr('사업자등록번호 10자리를 정확히 입력해주세요.')
        return
      }
      if (!bizName.trim() || !bizHolder.trim()) {
        setErr('상호와 대표자명을 입력해주세요.')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        tax_type: taxType,
        resident_id_last: taxType === 'FREELANCER' ? residentLast : null,
        biz_reg_number: taxType !== 'FREELANCER' ? bizRegNumber.replace(/-/g, '') : null,
        biz_reg_image: taxType !== 'FREELANCER' ? bizRegImage : null,
        biz_name: taxType !== 'FREELANCER' ? bizName.trim() : null,
        biz_holder: taxType !== 'FREELANCER' ? bizHolder.trim() : null,
        biz_vat_type: taxType !== 'FREELANCER' ? bizVatType : null,
        biz_email: bizEmail.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('users').update(payload).eq('id', userId)
      if (error) throw error

      if (taxType === 'FREELANCER' && agreeSensitive) {
        await supabase.from('consents').insert({
          user_id: userId,
          kind: 'SENSITIVE_ID',
          agreed: true,
          version: 'v1',
        })
      }
      router.replace('/profile')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
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
        <h1 className="flex-1 text-center text-[15px] font-extrabold">세금 유형 설정</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-5 pb-28 flex flex-col gap-5">
        <div className="card p-4 bg-info-soft border border-info/15 flex items-start gap-3">
          <ShieldCheck size={18} className="text-info shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-ink-soft font-semibold leading-snug">
            세금 유형에 따라 정산 방식이 달라집니다. <b>프리랜서</b>는 3.3% 원천징수 후 지급, <b>사업자</b>는 본인이 부가세 신고합니다.
          </div>
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">세금 유형 *</label>
          <div className="grid grid-cols-1 gap-2">
            <TaxOption
              selected={taxType === 'FREELANCER'}
              onClick={() => setTaxType('FREELANCER')}
              icon={<UserIcon size={18} />}
              title="프리랜서"
              desc="개인 사업소득 · 3.3% 원천징수 후 정산"
            />
            <TaxOption
              selected={taxType === 'INDIVIDUAL_BUSINESS'}
              onClick={() => setTaxType('INDIVIDUAL_BUSINESS')}
              icon={<Briefcase size={18} />}
              title="개인사업자"
              desc="간이/일반과세자 · 본인 부가세 신고"
            />
            <TaxOption
              selected={taxType === 'BUSINESS'}
              onClick={() => setTaxType('BUSINESS')}
              icon={<Briefcase size={18} />}
              title="법인사업자"
              desc="세금계산서 발행 · 법인세 신고"
            />
          </div>
        </div>

        {taxType === 'FREELANCER' && (
          <>
            <div>
              <label className="t-meta block mb-2 ml-1">주민번호 뒷자리 7자리 *</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={7}
                value={residentLast}
                onChange={(e) => setResidentLast(e.target.value.replace(/\D/g, ''))}
                placeholder="0000000"
                className="input"
                autoComplete="off"
              />
              <p className="text-[11px] text-text-faint font-medium mt-1.5 ml-1 leading-snug">
                원천세 신고에만 사용되며 암호화 저장됩니다. 세무 목적으로 5년간 보관됩니다.
              </p>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeSensitive}
                onChange={(e) => setAgreeSensitive(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#00C896]"
              />
              <span className="text-[12.5px] font-semibold text-ink-soft leading-snug">
                [필수] 원천세 신고 및 세무 처리 목적의 <b>주민번호 수집·이용</b>에 동의합니다. (5년 보관)
              </span>
            </label>
          </>
        )}

        {(taxType === 'INDIVIDUAL_BUSINESS' || taxType === 'BUSINESS') && (
          <>
            <div>
              <label className="t-meta block mb-2 ml-1">사업자등록번호 *</label>
              <input
                value={bizRegNumber}
                onChange={(e) => setBizRegNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="000-00-00000"
                className="input"
                inputMode="numeric"
                maxLength={12}
              />
            </div>
            <div>
              <label className="t-meta block mb-2 ml-1">상호 *</label>
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} className="input" maxLength={40} />
            </div>
            <div>
              <label className="t-meta block mb-2 ml-1">대표자명 *</label>
              <input value={bizHolder} onChange={(e) => setBizHolder(e.target.value)} className="input" maxLength={20} />
            </div>
            <div>
              <label className="t-meta block mb-2 ml-1">과세 구분</label>
              <div className="grid grid-cols-3 gap-2">
                {(['GENERAL', 'SIMPLE', 'EXEMPT'] as VatType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBizVatType(t)}
                    className={`chip !text-[11.5px] !px-2 !py-2 ${bizVatType === t ? 'chip-brand' : 'chip-muted'}`}
                  >
                    {t === 'GENERAL' ? '일반과세' : t === 'SIMPLE' ? '간이과세' : '면세'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="t-meta block mb-2 ml-1">사업자등록증 사본 (권장)</label>
              <label className="card-interactive p-6 flex flex-col items-center justify-center border-2 border-dashed border-line-strong cursor-pointer">
                {bizRegImage ? (
                  <img src={bizRegImage} alt="" className="w-full max-w-[240px] rounded-lg" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-2">
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                    </div>
                    <p className="text-[13px] font-extrabold text-ink">{uploading ? '업로드 중' : '사진 업로드'}</p>
                    <p className="text-[11px] text-text-soft font-bold mt-1">JPG/PNG · 최대 10MB</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBizImage(e.target.files[0])} />
              </label>
            </div>
          </>
        )}

        <div>
          <label className="t-meta block mb-2 ml-1">세금 관련 이메일 (선택)</label>
          <input
            type="email"
            value={bizEmail}
            onChange={(e) => setBizEmail(e.target.value)}
            placeholder="세금계산서 / 원천징수 영수증 수신용"
            className="input"
          />
        </div>

        {err && (
          <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/15 flex items-start gap-2">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-[13px] font-bold text-danger">{err}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={save} disabled={saving || !taxType} className="btn btn-primary w-full">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>저장 <Check size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaxOption({ selected, onClick, icon, title, desc }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 flex items-center gap-3 text-left transition ${
        selected ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{title}</p>
        <p className="text-[11.5px] text-text-soft font-bold mt-0.5 leading-snug">{desc}</p>
      </div>
      {selected && <Check size={18} className="text-brand shrink-0" strokeWidth={3} />}
    </button>
  )
}
