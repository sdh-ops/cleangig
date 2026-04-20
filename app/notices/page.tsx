import Header from '@/components/common/Header'
import { FileText, Sparkles, Zap, ShieldCheck } from 'lucide-react'

const NOTICES = [
  {
    date: '2026-04-20',
    badge: '신규',
    title: '쓱싹 v1.0 정식 출시',
    body: '공간 운영의 새로운 기준, 쓱싹이 정식 출시되었습니다. 원클릭 청소 요청, AI 품질 검수, 에스크로 결제로 안심하고 사용하세요.',
    icon: Sparkles,
    tone: 'brand',
  },
  {
    date: '2026-04-18',
    badge: '이벤트',
    title: '홍대 파티룸 100곳 등록 프로모션',
    body: '홍대/합정/망원 지역 파티룸·에어비앤비 운영자는 첫 3회 요청 수수료 무료!',
    icon: Zap,
    tone: 'sun',
  },
  {
    date: '2026-04-15',
    badge: '안전',
    title: '에스크로 결제 시스템 안내',
    body: '모든 청소 대금은 작업 승인 후 정산되어, 공간 파트너와 작업자 모두를 보호합니다.',
    icon: ShieldCheck,
    tone: 'info',
  },
]

export default function NoticesPage() {
  return (
    <div className="sseuksak-shell">
      <Header title="공지사항" showBack />
      <div className="flex-1 pb-8">
        <ul className="divide-y divide-line-soft">
          {NOTICES.map((n, i) => {
            const Icon = n.icon
            return (
              <li key={i} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${n.tone}-soft flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={`text-${n.tone === 'brand' ? 'brand-dark' : n.tone === 'sun' ? '[#92580C]' : 'info'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`chip chip-${n.tone === 'sun' ? 'sun' : n.tone} !text-[10px]`}>{n.badge}</span>
                      <span className="text-[11px] font-bold text-text-faint">{n.date}</span>
                    </div>
                    <h3 className="text-[14.5px] font-extrabold text-ink">{n.title}</h3>
                    <p className="text-[12.5px] font-medium text-text-muted mt-1 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="text-center mt-8 px-5">
          <FileText size={18} className="mx-auto text-text-faint mb-2" />
          <p className="text-[11.5px] font-bold text-text-faint">쓱싹은 지속적으로 업데이트되고 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
