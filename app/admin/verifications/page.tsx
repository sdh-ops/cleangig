import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import { timeAgo } from '@/lib/utils'
import { ShieldCheck, Phone, Mail, FileText, Building2, AlertCircle } from 'lucide-react'
import VerifyActions from './VerifyActions'

export const dynamic = 'force-dynamic'

type PendingUser = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
  created_at: string
  biz_reg_image: string | null
  business_name: string | null
  biz_reg_number: string | null
  biz_holder: string | null
  biz_type: string | null
  biz_category: string | null
  biz_address: string | null
  biz_vat_type: string | null
  preferences: Record<string, unknown> | null
}

export default async function VerificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  const { data } = await supabase
    .from('users')
    .select('id, name, email, phone, role, created_at, biz_reg_image, business_name, biz_reg_number, biz_holder, biz_type, biz_category, biz_address, biz_vat_type, preferences')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(200)

  // 제출 완료 + 미반려 건만 심사 큐에 노출
  const pending = ((data || []) as PendingUser[]).filter((u) => {
    const prefs = u.preferences || {}
    if (prefs.verification_status === 'rejected') return false
    const hasDoc = !!u.biz_reg_image || !!prefs.verification_doc_url
    return hasDoc
  })

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest mb-1">인증 심사</p>
        <h1 className="text-[22px] font-black text-slate-900">제출된 인증 서류</h1>
        <p className="text-[14.5px] text-slate-500 font-semibold mt-0.5">
          서류와 정보를 확인하고 승인 또는 반려하세요. 반려 시 재제출 요청 알림이 발송됩니다.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-[15px] text-slate-400 font-semibold">심사 대기 중인 인증 서류가 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => {
            const prefs = u.preferences || {}
            const docUrl = (u.biz_reg_image || (prefs.verification_doc_url as string)) ?? null
            const submittedAt = prefs.submitted_at as string | undefined
            const isOperator = u.role === 'operator'

            return (
              <div key={u.id} className="card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* 서류 이미지 */}
                  <a
                    href={docUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    {docUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={docUrl} alt="제출 서류" className="w-full h-40 sm:h-32 object-cover hover:opacity-90 transition" />
                    ) : (
                      <div className="w-full h-40 sm:h-32 flex items-center justify-center text-slate-300">
                        <FileText size={28} />
                      </div>
                    )}
                  </a>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[16px] font-black text-slate-900">{u.name || '이름 없음'}</span>
                      <span className={`text-[13px] font-black px-2 py-0.5 rounded-full ${
                        isOperator ? 'bg-brand-softer text-brand-dark' : 'bg-sky-100 text-sky-700'
                      }`}>
                        {isOperator ? '공간파트너' : '클린파트너'}
                      </span>
                      {submittedAt && (
                        <span className="text-[13px] text-slate-400 font-bold">{timeAgo(submittedAt)} 제출</span>
                      )}
                    </div>

                    {/* 연락처 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2">
                      {u.phone && (
                        <a href={`tel:${u.phone}`} className="flex items-center gap-1 text-[14px] font-bold text-slate-600 hover:text-sky-600">
                          <Phone size={11} /> {u.phone}
                        </a>
                      )}
                      {u.email && (
                        <span className="flex items-center gap-1 text-[13.5px] text-slate-400 font-medium">
                          <Mail size={11} /> {u.email}
                        </span>
                      )}
                    </div>

                    {/* 사업자 정보 (공간파트너 + 사업자 입력 시) */}
                    {isOperator && (u.business_name || u.biz_reg_number) && (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-1.5 text-[13px] font-black text-slate-500 uppercase tracking-wide">
                          <Building2 size={12} /> 사업자 정보
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[14px]">
                          <Field label="업체명(상호)" value={u.business_name} />
                          <Field label="대표자명" value={u.biz_holder} />
                          <Field label="사업자번호" value={formatBizNum(u.biz_reg_number)} />
                          <Field label="과세유형" value={vatLabel(u.biz_vat_type)} />
                          <Field label="업태" value={u.biz_type} />
                          <Field label="종목" value={u.biz_category} />
                          <Field label="주소" value={u.biz_address} span />
                        </dl>
                      </div>
                    )}

                    {!docUrl && (
                      <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-amber-600 mb-2">
                        <AlertCircle size={13} /> 서류 이미지를 찾을 수 없어요
                      </div>
                    )}

                    {/* 액션 */}
                    <div className="flex justify-end">
                      <VerifyActions userId={u.id} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-[12.5px] font-bold text-slate-400">{label}</dt>
      <dd className="text-[14px] font-bold text-slate-800">{value || '—'}</dd>
    </div>
  )
}

function formatBizNum(n?: string | null) {
  if (!n) return null
  const d = n.replace(/[^0-9]/g, '')
  if (d.length !== 10) return n
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

function vatLabel(v?: string | null) {
  if (v === 'GENERAL') return '일반과세'
  if (v === 'SIMPLE') return '간이과세'
  if (v === 'EXEMPT') return '면세'
  return null
}
