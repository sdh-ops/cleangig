'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/storage'
import Link from 'next/link'
import {
  ChevronLeft, Home, ShieldCheck, Check, Loader2, Upload,
  AlertCircle, BadgeCheck, Building2, FileText,
} from 'lucide-react'
import { toKoreanErrorMessage } from '@/lib/errors'

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

  // 공간파트너 사업자 정보
  const [bizName, setBizName] = useState('')
  const [bizRegNumber, setBizRegNumber] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizRegImage, setBizRegImage] = useState<string | null>(null)
  const [uploadingBiz, setUploadingBiz] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('users')
        .select('is_verified, role, business_name, biz_reg_number, biz_address, biz_reg_image')
        .eq('id', user.id)
        .single()
      if (data) {
        setIsVerified(data.is_verified)
        setRole(data.role || 'operator')
        setBizName(data.business_name || '')
        setBizRegNumber(data.biz_reg_number || '')
        setBizAddress(data.biz_address || '')
        setBizRegImage(data.biz_reg_image || null)
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 클린파트너: 신분증 업로드 (업로드 = 즉시 제출)
  const handleIdUpload = async (file: File) => {
    setUploading(true)
    setErr(null)
    try {
      const { url } = await uploadImage('docs', userId, file, { folder: 'id' })
      await supabase.from('users').update({
        preferences: { verification_doc_url: url, submitted_at: new Date().toISOString() },
      }).eq('id', userId)
      setSubmitted(true)
    } catch (e) {
      setErr(toKoreanErrorMessage(e instanceof Error ? e.message : null))
    } finally {
      setUploading(false)
    }
  }

  // 공간파트너: 사업자등록증 사진 업로드 (저장은 제출 버튼에서)
  const handleBizDocUpload = async (file: File) => {
    setUploadingBiz(true)
    setErr(null)
    try {
      const { url } = await uploadImage('docs', userId, file, { folder: 'biz' })
      setBizRegImage(url)
    } catch (e) {
      setErr(toKoreanErrorMessage(e instanceof Error ? e.message : null))
    } finally {
      setUploadingBiz(false)
    }
  }

  // 공간파트너: 최종 제출
  const handleOperatorSubmit = async () => {
    setErr(null)
    if (!bizName.trim()) { setErr('업체명을 입력해주세요.'); return }
    if (!bizRegImage) { setErr('사업자등록증 또는 신분증 사진을 업로드해주세요.'); return }
    setUploading(true)
    try {
      const payload: Record<string, unknown> = {
        business_name: bizName.trim(),
        biz_reg_image: bizRegImage,
        preferences: { verification_doc_url: bizRegImage, submitted_at: new Date().toISOString() },
      }
      if (bizRegNumber.trim()) payload.biz_reg_number = bizRegNumber.replace(/-/g, '')
      if (bizAddress.trim()) payload.biz_address = bizAddress.trim()
      const { error } = await supabase.from('users').update(payload).eq('id', userId)
      if (error) throw error
      setSubmitted(true)
    } catch (e) {
      setErr(toKoreanErrorMessage(e instanceof Error ? e.message : null))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="불러오는 중" className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <div className="flex items-center gap-0.5">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <Link href="/profile" aria-label="내 정보" className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-muted">
            <Home size={16} className="text-text-soft" />
          </Link>
        </div>
        <h1 className="flex-1 text-center text-[15px] font-extrabold">
          {role === 'operator' ? '사업자 인증' : '본인 인증'}
        </h1>
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
              <p className="text-[14.5px] text-text-muted font-semibold mt-0.5">인증된 파트너로 활동 중입니다.</p>
            </div>
          </div>

        ) : submitted ? (
          <div className="card p-6 bg-info-soft border border-info/15 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-info flex items-center justify-center">
              <Check size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-ink">제출 완료</h3>
              <p className="text-[14.5px] text-text-muted font-semibold mt-0.5">관리자 검토 후 1영업일 이내 인증됩니다.</p>
            </div>
          </div>

        ) : role === 'operator' ? (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-softer flex items-center justify-center">
                  <Building2 size={20} className="text-brand-dark" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">사업자 정보 등록</h3>
                  <p className="text-[13.5px] text-text-muted font-semibold mt-0.5">신뢰도가 높아지고 매칭률이 2배 올라요.</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-[14.5px] font-semibold text-ink-soft">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-brand shrink-0 mt-0.5" />
                  업체명 필수 · 사업자번호·주소 선택
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-brand shrink-0 mt-0.5" />
                  사업자등록증 사본 또는 신분증 사진 필수
                </li>
              </ul>
            </div>

            <div>
              <label htmlFor="op-biz-name" className="t-meta block mb-2 ml-1">업체명 *</label>
              <input
                id="op-biz-name"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="예) 강남 파티룸, 스튜디오 더난"
                className="input"
                maxLength={40}
              />
            </div>

            <div>
              <label htmlFor="op-biz-reg" className="t-meta block mb-2 ml-1">사업자등록번호 (선택)</label>
              <input
                id="op-biz-reg"
                value={bizRegNumber}
                onChange={(e) => setBizRegNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="000-00-00000"
                className="input"
                inputMode="numeric"
                maxLength={12}
              />
            </div>

            <div>
              <label htmlFor="op-biz-addr" className="t-meta block mb-2 ml-1">사업장 주소 (선택)</label>
              <input
                id="op-biz-addr"
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                placeholder="예) 서울시 강남구 테헤란로 123"
                className="input"
                maxLength={100}
              />
            </div>

            <div>
              <label className="t-meta block mb-2 ml-1">사업자등록증 또는 신분증 사진 *</label>
              <label className="card-interactive p-6 flex flex-col items-center justify-center border-2 border-dashed border-line-strong cursor-pointer">
                {bizRegImage ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <img src={bizRegImage} alt="사업자 서류" className="max-h-40 rounded-xl object-contain" />
                    <p className="text-[14px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={14} /> 업로드 완료 — 다시 올리려면 탭
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-3">
                      {uploadingBiz ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                    </div>
                    <p className="text-[14px] font-extrabold text-ink">
                      {uploadingBiz ? '업로드 중...' : '사진 업로드'}
                    </p>
                    <p className="text-[13.5px] text-text-soft font-bold mt-1">JPG/PNG · 최대 10MB</p>
                    <p className="text-[13px] text-text-faint font-medium mt-1">글자가 선명하게 보이도록 촬영해주세요</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleBizDocUpload(e.target.files[0])}
                />
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-info-soft border border-info/15 flex items-start gap-2">
              <AlertCircle size={16} className="text-info shrink-0 mt-0.5" />
              <div className="text-[14.5px] text-ink-soft font-semibold leading-snug">
                업로드된 서류는 암호화 저장되며 신원 확인 후 폐기됩니다.
              </div>
            </div>

            {err && (
              <div className="p-3 bg-danger-soft rounded-xl text-[15px] font-bold text-danger flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {err}
              </div>
            )}
          </>

        ) : (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-softer flex items-center justify-center">
                  <ShieldCheck size={20} className="text-brand-dark" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">신원 인증하고 쓱싹 배지 받기</h3>
                  <p className="text-[13.5px] text-text-muted font-semibold mt-0.5">인증 파트너는 매칭률이 2배 높아져요.</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-[15px] font-semibold text-ink-soft">
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-brand shrink-0 mt-0.5" />
                  신분증 사진 (주민번호 뒷자리 가려주세요)
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
              <p className="text-[13.5px] text-text-soft font-bold mt-1">JPG/PNG · 최대 10MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
              />
            </label>

            <div className="p-4 rounded-2xl bg-info-soft border border-info/15 flex items-start gap-2">
              <AlertCircle size={16} className="text-info shrink-0 mt-0.5" />
              <div className="text-[14.5px] text-ink-soft font-semibold leading-snug">
                업로드된 인증 서류는 암호화되어 저장되며, 검토 후 즉시 폐기됩니다.
              </div>
            </div>

            {err && <div className="p-3 bg-danger-soft rounded-xl text-[15px] font-bold text-danger">{err}</div>}
          </>
        )}
      </div>

      {/* 공간파트너 전용 제출 버튼 */}
      {!isVerified && !submitted && role === 'operator' && (
        <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
          <div className="max-w-[480px] mx-auto px-5 py-3.5">
            <button
              onClick={handleOperatorSubmit}
              disabled={uploading || uploadingBiz}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {uploading
                ? <Loader2 size={18} className="animate-spin" />
                : <>제출하고 검토 요청 <Check size={18} /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
