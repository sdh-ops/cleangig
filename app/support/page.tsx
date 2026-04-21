'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/common/Header'
import LegalFooter from '@/components/common/LegalFooter'
import { ChevronRight, MessageCircle, Phone, Mail, ChevronDown, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQS = [
  {
    q: '쓱싹은 어떤 서비스인가요?',
    a: '공간 운영자와 클린 파트너를 연결하는 양방향 청소 매칭 플랫폼입니다. 청소가 필요한 사람은 원클릭으로 요청하고, 부업으로 청소하고 싶은 사람은 원하는 시간·지역에서 일할 수 있어요.',
  },
  {
    q: '[클린 파트너] 어떻게 일을 시작하나요?',
    a: '가입 후 역할을 "클린 파트너"로 선택, 정산 계좌를 등록하면 바로 작업을 찾을 수 있어요. 본인 인증을 마치면 매칭 우선순위가 올라갑니다.',
  },
  {
    q: '[클린 파트너] 얼마나 벌 수 있나요?',
    a: '건당 평균 3~5만원(기본 청소 기준)이며, 심야·긴급 할증 시 더 올라갑니다. 주 1회 정산되며 티어가 올라갈수록 수수료 할인과 우선 매칭 혜택이 커집니다.',
  },
  {
    q: '[클린 파트너] 근로자로 분류되나요?',
    a: '아니요. 쓱싹은 중개 플랫폼이고, 클린 파트너는 프리랜서/개인사업자로 독립적으로 일합니다. 일하는 시간·장소를 자유롭게 선택할 수 있어요.',
  },
  {
    q: '[공간 파트너] 결제는 언제 이뤄지나요?',
    a: '청소 요청 시 결제가 이뤄지며, 에스크로로 안전하게 보관됩니다. 작업 승인 후 클린 파트너에게 정산됩니다.',
  },
  {
    q: '[공간 파트너] 취소하면 환불은?',
    a: '24시간 전 취소 시 전액 환불, 3시간 전 30%, 1시간 전 50% 수수료가 발생하며, 1시간 이내는 환불이 어렵습니다.',
  },
  {
    q: '품질은 어떻게 보증되나요?',
    a: '필수 체크리스트 항목은 사진 인증이 필요하며, AI가 자동 검수합니다. 리뷰·매너 온도·티어 시스템으로 신뢰를 관리해요.',
  },
  {
    q: '플랫폼 수수료는 얼마인가요?',
    a: '거래 금액의 10~15%이며, 클린 파트너 티어가 올라갈수록 수수료 할인이 적용됩니다.',
  },
]

export default function SupportPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="sseuksak-shell">
      <Header title="고객지원" showBack />

      <div className="flex-1 pb-8">
        {/* Contact methods */}
        <div className="px-5 pt-5">
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            <ContactCard href="/chat" icon={<MessageCircle size={18} />} label="1:1 문의" />
            <ContactCard href="tel:1533-0000" icon={<Phone size={18} />} label="1533-0000" />
            <ContactCard href="mailto:help@sseuksak.com" icon={<Mail size={18} />} label="이메일" />
          </div>
        </div>

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
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-muted"
                >
                  <span className="text-[13.5px] font-extrabold text-ink flex-1">Q. {faq.q}</span>
                  <ChevronDown size={16} className={`shrink-0 text-text-faint transition ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 pt-0 text-[13px] font-medium text-text-muted leading-relaxed border-t border-line-soft">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
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

        <p className="text-center mt-6 text-[11px] font-medium text-text-faint">
          쓱싹 v1.0 · 운영시간 평일 10:00–18:00
        </p>
      </div>
      <LegalFooter />
    </div>
  )
}

function ContactCard({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="card-interactive p-4 flex flex-col items-center text-center gap-2 active:scale-95"
    >
      <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[12.5px] font-extrabold text-ink">{label}</span>
    </a>
  )
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted">
      <span className="flex-1 text-[13.5px] font-extrabold text-ink">{label}</span>
      <ChevronRight size={16} className="text-text-faint" />
    </Link>
  )
}
