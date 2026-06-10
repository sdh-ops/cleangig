'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Header from '@/components/common/Header'
import LegalFooter from '@/components/common/LegalFooter'
import {
  ChevronRight,
  MessageCircle,
  Mail,
  ChevronDown,
  HelpCircle,
  PenLine,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react'
const FAQS = [
  {
    q: '쓱싹은 어떤 서비스인가요?',
    a: '공간파트너와 클린파트너를 연결하는 양방향 청소 매칭 플랫폼입니다. 청소가 필요한 공간 운영자는 원클릭으로 요청하고, 청소로 부수입을 원하는 분은 초기 자본 없이 원하는 시간·지역에서 바로 시작할 수 있어요.',
  },
  {
    q: '[클린파트너] 초기 비용 없이 시작할 수 있나요?',
    a: '네. 별도 장비 구매나 창업 비용 없이 가입 즉시 작업을 수락하고 부수입을 만들 수 있습니다. 청소 도구는 공간파트너가 현장에 비치해두며, 위치도 앱에서 안내됩니다.',
  },
  {
    q: '[클린파트너] 얼마나 벌 수 있나요?',
    a: '건당 3~5만원(기본 청소 기준)이며, 난이도·면적·심야·긴급 할증 시 더 올라갑니다. 주 1회 정산되며 티어가 올라갈수록 수수료 할인과 우선 매칭 혜택이 커집니다.',
  },
  {
    q: '[클린파트너] 근로자로 분류되나요?',
    a: '아니요. 쓱싹은 중개 플랫폼이고 클린파트너는 프리랜서/개인사업자로 독립적으로 일합니다. 근무 시간·장소를 자유롭게 선택할 수 있어 눈치 없이 본업 외 부수입을 올릴 수 있어요.',
  },
  {
    q: '[공간파트너] 청소 요청은 얼마나 빨리 되나요?',
    a: '요청을 등록하면 근처 클린파트너에게 바로 알림이 가고, 수락하는 순간 매칭됩니다. 긴급 요청 기능을 이용하면 더 많은 클린파트너에게 즉시 알림이 발송됩니다.',
  },
  {
    q: '[공간파트너] 결제와 취소·환불 정책은?',
    a: '청소 요청 시 에스크로 결제가 이뤄지며, 작업 승인 후 클린파트너에게 정산됩니다. 24시간 전 취소 시 전액 환불, 3시간 전 30% 수수료, 1시간 전 50% 수수료, 1시간 이내 환불 불가입니다.',
  },
  {
    q: '품질은 어떻게 보증되나요?',
    a: '필수 체크리스트 항목은 사진 인증이 필요하며, AI가 자동 검수합니다. 리뷰·매너 온도·티어 시스템으로 신뢰를 관리해요. 문제 발생 시 분쟁 신고 기능을 통해 24시간 내 조정이 이뤄집니다.',
  },
  {
    q: '플랫폼 수수료는 얼마인가요?',
    a: '클린파트너 수수료는 스타터 15%, 실버 13%, 골드 11%, 마스터 9%입니다. 티어가 높을수록 수수료가 낮아집니다.',
  },
]

const CATEGORIES = [
  { key: 'payment', label: '💳 결제/정산 문제' },
  { key: 'match', label: '🔍 매칭 관련' },
  { key: 'quality', label: '🧹 청소 품질 이슈' },
  { key: 'account', label: '👤 계정/인증 문제' },
  { key: 'legal', label: '⚖️ 법적/계약 문의' },
  { key: 'other', label: '💬 기타 문의' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: '접수됨', color: 'text-brand-dark bg-brand-softer' },
  IN_PROGRESS: { label: '검토중', color: 'text-[#92580C] bg-sun-soft' },
  RESOLVED: { label: '해결됨', color: 'text-emerald-700 bg-emerald-50' },
  CLOSED: { label: '종료', color: 'text-text-faint bg-surface-muted' },
}

type Ticket = {
  id: string
  category: string
  title: string
  status: string
  reply: string | null
  replied_at: string | null
  created_at: string
}

export default function SupportPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const loadTickets = async () => {
    setLoadingTickets(true)
    try {
      const res = await fetch('/api/support')
      const data = await res.json()
      if (data.ok) setTickets(data.tickets ?? [])
    } catch { /* ignore */ }
    setLoadingTickets(false)
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleSubmit = async () => {
    if (!category) { setSubmitErr('문의 유형을 선택해주세요.'); return }
    if (!title.trim() || title.trim().length < 5) { setSubmitErr('제목을 5자 이상 입력해주세요.'); return }
    if (!body.trim() || body.trim().length < 10) { setSubmitErr('내용을 10자 이상 입력해주세요.'); return }

    setSubmitting(true)
    setSubmitErr(null)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, body }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error === 'unauthorized' ? '로그인이 필요합니다.' : '접수 실패. 다시 시도해주세요.')
      setSubmitted(true)
      setShowForm(false)
      setCategory('')
      setTitle('')
      setBody('')
      await loadTickets()
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : '접수 실패')
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setShowForm(false)
    setCategory('')
    setTitle('')
    setBody('')
    setSubmitErr(null)
    setSubmitted(false)
  }

  return (
    <div className="sseuksak-shell">
      <Header title="고객지원" showBack />

      <div className="flex-1 pb-8 overflow-y-auto">
        {/* Quick contacts */}
        <div className="px-5 pt-5">
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="card-interactive p-4 flex flex-col items-center text-center gap-2 active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center">
                <PenLine size={18} />
              </div>
              <span className="text-[14.5px] font-extrabold text-ink">1:1 문의하기</span>
              <span className="text-[13.5px] font-medium text-text-soft leading-snug">평일 10시–18시 답변</span>
            </button>
            <a
              href="mailto:help@sseuksak.com"
              className="card-interactive p-4 flex flex-col items-center text-center gap-2 active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center">
                <Mail size={18} />
              </div>
              <span className="text-[14.5px] font-extrabold text-ink">이메일 문의</span>
              <span className="text-[13.5px] font-medium text-text-soft leading-snug">help@sseuksak.com</span>
            </a>
          </div>
        </div>

        {/* Success banner */}
        {submitted && (
          <div className="mx-5 mb-4 p-3.5 rounded-2xl bg-brand-softer border border-brand/20 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-brand-dark shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-extrabold text-ink">문의가 접수됐습니다!</p>
              <p className="text-[13.5px] font-medium text-text-soft mt-0.5">영업일 기준 1–2일 내 이메일 또는 앱 알림으로 답변드립니다.</p>
            </div>
            <button onClick={() => setSubmitted(false)} className="ml-auto shrink-0">
              <X size={16} className="text-text-faint" />
            </button>
          </div>
        )}

        {/* My tickets */}
        {(tickets.length > 0 || loadingTickets) && (
          <div className="px-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-brand-dark" />
              <h2 className="h-section text-ink">내 문의 내역</h2>
            </div>
            {loadingTickets ? (
              <div className="flex justify-center py-4">
                <Loader2 size={22} className="animate-spin text-brand" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {tickets.map((t) => {
                  const st = STATUS_LABELS[t.status] ?? STATUS_LABELS.OPEN
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="card w-full text-left p-4 hover:bg-surface-muted active:scale-[0.99] transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[13px] font-black px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                              {t.reply && <span className="text-[13px] font-bold text-brand-dark">✓ 답변 도착</span>}
                            </div>
                            <p className="text-[15px] font-extrabold text-ink truncate">{t.title}</p>
                            <p className="text-[13.5px] font-medium text-text-faint mt-0.5">
                              {new Date(t.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-text-faint shrink-0 mt-1" />
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="px-5">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={16} className="text-brand-dark" />
            <h2 className="h-section text-ink">자주 묻는 질문</h2>
          </div>
          <ul className="flex flex-col gap-2.5">
            {FAQS.map((faq, i) => (
              <li key={i} className="card overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-muted"
                >
                  <span className="text-[15px] font-extrabold text-ink flex-1">Q. {faq.q}</span>
                  <ChevronDown size={16} className={`shrink-0 text-text-faint transition ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                  {faqOpen === i && (
                    <p className="px-4 pb-4 pt-0 text-[15px] font-medium text-text-muted leading-relaxed border-t border-line-soft">
                      {faq.a}
                    </p>
                  )}
              </li>
            ))}
          </ul>
        </div>

        {/* Links */}
        <div className="px-5 pt-6">
          <ul className="card overflow-hidden">
            <RowLink href="/notices" label="공지사항" />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink href="/terms" label="이용약관" />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink href="/privacy" label="개인정보 처리방침" />
          </ul>
        </div>

        <p className="text-center mt-6 text-[13.5px] font-medium text-text-faint">
          쓱싹 v1.0 · 운영시간 평일 10:00–18:00
        </p>
      </div>

      <LegalFooter />

      {/* 1:1 문의 폼 */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center"
            onClick={resetForm}
          >
            <div
              className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom overflow-y-auto max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PenLine size={18} className="text-brand-dark" />
                  <h3 className="h-section text-ink">1:1 문의하기</h3>
                </div>
                <button onClick={resetForm} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <p className="t-caption mb-5">영업일 기준 1–2일 내 답변드립니다. 긴급한 문제는 분쟁 신고 기능을 이용해주세요.</p>

              <div className="mb-4">
                <label className="t-meta block mb-2 ml-1">문의 유형 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`rounded-xl border-2 p-3 text-[14.5px] font-extrabold text-left transition ${
                        category === c.key
                          ? 'border-brand bg-brand-softer text-brand-dark'
                          : 'border-line-soft bg-surface text-ink hover:border-line-strong'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="t-meta block mb-2 ml-1">제목 * <span className="font-normal text-text-faint">(최대 100자)</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문의 제목을 간략히 입력해주세요"
                  className="input"
                  maxLength={100}
                />
              </div>

              <div className="mb-4">
                <label className="t-meta block mb-2 ml-1">내용 * <span className="font-normal text-text-faint">(최대 2000자)</span></label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="문제 상황, 발생 일시, 작업 ID 등을 자세히 적어주세요."
                  className="input min-h-[140px]"
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-[13.5px] text-text-faint font-medium mt-1 ml-1">{body.length}/2000</p>
              </div>

              <div className="mb-5 p-3.5 rounded-xl bg-surface-muted border border-line-soft">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={13} className="text-text-soft" />
                  <p className="text-[14.5px] font-extrabold text-ink">답변 안내</p>
                </div>
                <ul className="text-[13.5px] font-medium text-text-soft leading-relaxed space-y-0.5">
                  <li>• 평일 10:00–18:00 접수 건: 당일 또는 익일 답변</li>
                  <li>• 공휴일·주말 접수 건: 다음 영업일 답변</li>
                  <li>• 결제/분쟁 관련: 최우선 처리</li>
                </ul>
              </div>

              {submitErr && (
                <div className="mb-3 p-2.5 rounded-xl bg-danger-soft border border-danger/15 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-danger shrink-0" />
                  <p className="text-[14.5px] font-bold text-danger">{submitErr}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={resetForm} disabled={submitting} className="flex-1 btn btn-ghost">취소</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn btn-primary">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : '문의 접수'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 티켓 상세 모달 */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom overflow-y-auto max-h-[85dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="h-section text-ink">문의 상세</h3>
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="card p-4 mb-4 bg-surface-muted">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[13px] font-black px-2 py-0.5 rounded-full ${(STATUS_LABELS[selectedTicket.status] ?? STATUS_LABELS.OPEN).color}`}>
                    {(STATUS_LABELS[selectedTicket.status] ?? STATUS_LABELS.OPEN).label}
                  </span>
                  <span className="text-[13.5px] text-text-faint font-medium">
                    {new Date(selectedTicket.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <h4 className="text-[14px] font-extrabold text-ink mb-1">{selectedTicket.title}</h4>
                <p className="text-[13.5px] font-bold text-text-faint capitalize">{CATEGORIES.find(c => c.key === selectedTicket.category)?.label ?? selectedTicket.category}</p>
              </div>

              {selectedTicket.reply ? (
                <div className="card p-4 bg-brand-softer border border-brand/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-brand-dark" />
                    <p className="text-[14.5px] font-extrabold text-brand-dark">쓱싹 답변</p>
                    {selectedTicket.replied_at && (
                      <span className="text-[13.5px] text-text-faint ml-auto">
                        {new Date(selectedTicket.replied_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-medium text-ink leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.reply}
                  </p>
                </div>
              ) : (
                <div className="card p-4 bg-surface-muted border border-line-soft">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-text-soft" />
                    <p className="text-[15px] font-semibold text-text-muted">답변 대기 중입니다. 영업일 기준 1–2일 내 답변드립니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  )
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted">
      <span className="flex-1 text-[15px] font-extrabold text-ink">{label}</span>
      <ChevronRight size={16} className="text-text-faint" />
    </Link>
  )
}
