import { createClient } from '@/lib/supabase/server'
import Header from '@/components/common/Header'
import { FileText, Sparkles, Zap, ShieldCheck, Wallet } from 'lucide-react'

const FALLBACK_NOTICES = [
  {
    date: '2026-06-11',
    badge: '베타',
    title: '쓱싹 베타 서비스 운영 중',
    body: '현재 베타 테스트 단계입니다. 이용 중 불편한 점이나 버그는 고객지원으로 알려주시면 빠르게 반영하겠습니다.',
    icon: 'Sparkles',
    tone: 'brand',
  },
  {
    date: '2026-06-11',
    badge: '수수료 개편',
    title: '클린파트너 수수료 대폭 인하',
    body: '스타터 6% · 실버 5% · 골드 4% · 마스터 3%로 개편되었습니다. 처음 2건은 2% 특별 프로모션이 적용됩니다.',
    icon: 'Wallet',
    tone: 'sun',
  },
  {
    date: '2026-06-11',
    badge: '클린파트너',
    title: '주말 부업 · 클린파트너 모집',
    body: '청소 경험 없어도 OK. 초기 자본 0원, 원하는 시간·지역에서 바로 시작하세요. 완료 후 3일 이내 정산.',
    icon: 'Zap',
    tone: 'brand',
  },
  {
    date: '2026-06-11',
    badge: '안전',
    title: '안전 결제 + AI 품질 확인',
    body: '모든 청소 대금은 작업 승인 후 정산되어 양쪽 모두를 보호합니다. 문제 발생 시 분쟁 신고로 24시간 내 조정됩니다.',
    icon: 'ShieldCheck',
    tone: 'info',
  },
]

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Zap, ShieldCheck, Wallet, FileText,
}

const TONE_ICON_COLOR: Record<string, string> = {
  brand: 'text-brand-dark',
  sun: 'text-[#92580C]',
  info: 'text-info',
  danger: 'text-danger',
  success: 'text-success',
}

export default async function NoticesPage() {
  const supabase = await createClient()

  // notices 테이블이 있으면 DB에서, 없으면 fallback 사용
  const { data: dbNotices } = await supabase
    .from('notices')
    .select('id, title, body, badge, tone, icon, date, is_published')
    .eq('is_published', true)
    .order('date', { ascending: false })
    .limit(50)

  const notices = (dbNotices && dbNotices.length > 0) ? dbNotices : FALLBACK_NOTICES

  return (
    <div className="sseuksak-shell">
      <Header title="공지사항" showBack />
      <div className="flex-1 pb-8">
        <ul className="divide-y divide-line-soft">
          {notices.map((n: any, i: number) => {
            const Icon = ICON_MAP[n.icon] || FileText
            return (
              <li key={n.id ?? i} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${n.tone}-soft flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={TONE_ICON_COLOR[n.tone] ?? 'text-brand-dark'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`chip chip-${n.tone === 'sun' ? 'sun' : n.tone} !text-[13px]`}>{n.badge}</span>
                      <span className="text-[13.5px] font-bold text-text-faint">
                        {typeof n.date === 'string' ? n.date.slice(0, 10) : n.date}
                      </span>
                    </div>
                    <h3 className="text-[14.5px] font-extrabold text-ink">{n.title}</h3>
                    <p className="text-[14.5px] font-medium text-text-muted mt-1 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="text-center mt-8 px-5">
          <FileText size={18} className="mx-auto text-text-faint mb-2" />
          <p className="text-[13.5px] font-bold text-text-faint">쓱싹은 지속적으로 업데이트되고 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
