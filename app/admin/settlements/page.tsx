import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import SettlementsClient from './SettlementsClient'

export const dynamic = 'force-dynamic'

export default async function SettlementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!profile || !isPlatformAdmin(profile.email, profile.role)) redirect('/profile')

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, status, gross_amount, platform_fee, worker_payout,
      worker_fee, host_fee, withholding_tax, worker_tax_type,
      created_at, escrow_released_at, updated_at,
      job_id,
      jobs ( id, scheduled_at, spaces ( name ) ),
      worker:worker_id ( id, name, phone, bank_account )
    `)
    .in('status', ['HELD', 'RELEASED', 'PAID_OUT'])
    .order('created_at', { ascending: false })
    .limit(100)

  const list = (payments || []) as any[]
  const held     = list.filter((p) => p.status === 'HELD')
  const released = list.filter((p) => p.status === 'RELEASED')
  const paidOut  = list.filter((p) => p.status === 'PAID_OUT')
  const heldTotal     = held.reduce((s: number, p: any) => s + (p.worker_payout ?? 0), 0)
  const releasedTotal = released.reduce((s: number, p: any) => s + (p.worker_payout ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest mb-1">정산 관리</p>
        <h1 className="text-[22px] font-black text-slate-900">정산 현황</h1>
        <p className="text-[14.5px] text-slate-500 font-semibold mt-0.5">
          테스트 환경 — 실제 이체 없이 상태만 변경됩니다.
        </p>
      </div>

      <SettlementsClient
        held={held}
        released={released}
        paidOut={paidOut}
        heldTotal={heldTotal}
        releasedTotal={releasedTotal}
      />
    </div>
  )
}
