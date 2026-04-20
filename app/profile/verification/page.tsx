'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/storage'
import { ChevronLeft, ShieldCheck, Check, Loader2, Upload, AlertCircle, BadgeCheck } from 'lucide-react'

export default function VerificationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [role, setRole] = useState<string>('operator')
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('is_verified, role').eq('id', user.id).single()
      if (data) {
        setIsVerified(data.is_verified)
        setRole(data.role || 'operator')
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setErr(null)
    try {
      const { url } = await uploadImage('docs', userId, file, { folder: 'id' })
      // store path in users preferences for admin review (in real app - separate table + queue)
      await supabase.from('users').update({
        preferences: { verification_doc_url: url, submitted_at: new Date().toISOString() },
      }).eq('id', userId)
      setSubmitted(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
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
        <h1 className="flex-1 text-center text-[15px] font-extrabold">본인 인증</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-5">
        {isVerified ? (
          <div className="card p-6 bg-brand-softer border border-brand/15 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center">
              <BadgeCheck size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-ink">인증 완료</h3>
              <p className="text-[12px] text-text-muted font-semibold mt-0.5">인증된 파트너로 활동 중입니다.</p>
            </div>
          </div>
        ) : submitted ? (
          <div className="card p-6 bg-info-soft border border-info/15 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-info flex items-center justify-center">
              <Check size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-ink">제출 완료</h3>
              <p className="text-[12px] text-text-muted font-semibold mt-0.5">관리자 검토 후 1영업일 이내 인증됩니다.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-softer flex items-center justify-center">
                  <ShieldCheck size={20} className="text-brand-dark" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">신원 인증하고 쓱싹 배지 받기</h3>
                  <p className="text-[11.5px] text-text-muted font-semibold mt-0.5">인증 파트너는 매칭률이 2배 높아져요.</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-[13px] font-semibold text-ink-soft">
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-brand shrink-0 mt-0.5" />
                  {role === 'operator' ? '사업자등록증 또는 신분증 사진' : '신분증 사진 (주민번호 뒷자리 가려주세요)'}
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-brand shrink-0 mt-0.5" />
                  밝고 선명하게, 글자가 잘 보이게
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-brand shrink-0 mt-0.5" />
                  이름과 생년월일이 보여야 합니다
                </li>
              </ul>
            </div>

            <label className="card-interactive p-8 flex flex-col items-center justify-center border-2 border-dashed border-line-strong cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-3">
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              </div>
              <p className="text-[14px] font-extrabold text-ink">
                {uploading ? '업로드 중...' : '사진 업로드'}
              </p>
              <p className="text-[11.5px] text-text-soft font-bold mt-1">JPG/PNG · 최대 10MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </label>

            <div className="p-4 rounded-2xl bg-info-soft border border-info/15 flex items-start gap-2">
              <AlertCircle size={16} className="text-info shrink-0 mt-0.5" />
              <div className="text-[12px] text-ink-soft font-semibold leading-snug">
                업로드된 인증 서류는 암호화되어 저장되며, 검토 후 즉시 폐기됩니다.
              </div>
            </div>

            {err && <div className="p-3 bg-danger-soft rounded-xl text-[13px] font-bold text-danger">{err}</div>}
          </>
        )}
      </div>
    </div>
  )
}
