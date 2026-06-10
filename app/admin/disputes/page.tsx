import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react'
import { timeAgo, formatKRW } from '@/lib/utils'
import DisputeResolveActions from './DisputeResolveActions'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      id, status, category, description, refund_amount, created_at, job_id,
      reporter:reporter_id(name, phone, email),
      jobs(id, price, status, spaces(name), operator:operator_id(name, phone), worker:worker_id(name, phone))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const list = (disputes || []) as any[]
  const open   = list.filter((d) => d.status === 'OPEN')
  const closed = list.filter((d) => d.status !== 'OPEN')

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13.5px] font-black text-red-500 uppercase tracking-widest mb-0.5">분쟁 처리</p>
        <h1 className="text-[20px] font-black text-slate-900">분쟁 관리</h1>
      </div>

      {open.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-[15px] font-extrabold text-slate-700">처리 대기 분쟁 없음</p>
          <p className="text-[14.5px] text-slate-400 font-bold mt-1">모든 분쟁이 해결되었습니다 ✨</p>
        </div>
      ) : (
        <section>
          <p className="text-[13.5px] font-black text-red-500 uppercase tracking-wider mb-2">
            ⚠ 처리 대기 · {open.length}건
          </p>
          <div className="space-y-3">
            {open.map((d) => (
              <DisputeCard key={d.id} d={d} urgent />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <p className="text-[13.5px] font-black text-slate-400 uppercase tracking-wider mb-2">처리 완료 · {closed.length}건</p>
          <div className="space-y-2">
            {closed.map((d) => (
              <DisputeCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function DisputeCard({ d, urgent }: { d: any; urgent?: boolean }) {
  return (
    <div className={`card p-4 ${urgent ? 'border-red-200 bg-red-50/50' : ''}`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[13px] font-black px-2.5 py-1 rounded-full
          ${d.status === 'OPEN'     ? 'bg-red-100 text-red-600' :
            d.status === 'RESOLVED' ? 'bg-green-100 text-green-600' :
            'bg-slate-100 text-slate-500'}`}>
          {d.status === 'OPEN' ? '처리 대기' : d.status === 'RESOLVED' ? '해결됨' : '종료'}
        </span>
        <span className="text-[13px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {d.category || '일반'}
        </span>
        <span className="text-[13.5px] text-slate-400 font-bold ml-auto">{timeAgo(d.created_at)}</span>
      </div>

      {/* 공간 + 금액 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link
            href={`/requests/${d.job_id}`}
            className="text-[14px] font-extrabold text-slate-900 hover:text-sky-600 transition"
          >
            {d.jobs?.spaces?.name || '(공간 없음)'}
          </Link>
          <p className="text-[13.5px] text-slate-500 font-bold mt-0.5">
            거래액 {formatKRW(d.jobs?.price)}
            {d.refund_amount > 0 && (
              <span className="ml-2 text-red-500">환불 요청 {formatKRW(d.refund_amount)}</span>
            )}
          </p>
        </div>
      </div>

      {/* 내용 */}
      {d.description && (
        <p className="text-[15px] font-medium text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-3 py-2.5 mb-3 border border-slate-200">
          "{d.description}"
        </p>
      )}

      {/* 당사자 연락처 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <ContactChip
          label="신고자"
          name={d.reporter?.name}
          phone={d.reporter?.phone}
        />
        <ContactChip
          label="공간파트너"
          name={d.jobs?.operator?.name}
          phone={d.jobs?.operator?.phone}
        />
        <ContactChip
          label="클린파트너"
          name={d.jobs?.worker?.name}
          phone={d.jobs?.worker?.phone}
        />
      </div>

      {/* 조치 버튼 */}
      {d.status === 'OPEN' && (
        <DisputeResolveActions disputeId={d.id} jobPrice={d.jobs?.price || 0} />
      )}
    </div>
  )
}

function ContactChip({ label, name, phone }: { label: string; name?: string; phone?: string }) {
  if (!name) return null
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-[14.5px] font-extrabold text-slate-800 truncate">{name}</p>
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="shrink-0 w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition">
          <Phone size={13} />
        </a>
      )}
    </div>
  )
}
