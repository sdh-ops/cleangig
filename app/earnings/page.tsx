import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default async function EarningsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'worker') redirect('/dashboard');

    const { data: payments } = await supabase
        .from('payments')
        .select('*, jobs(scheduled_at, spaces(name))')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

    const totalEarned = payments?.filter((p: any) => p.status === 'RELEASED').reduce((s: number, p: any) => s + p.worker_payout, 0) || 0;
    const pendingAmount = payments?.filter((p: any) => p.status === 'HELD').reduce((s: number, p: any) => s + p.worker_payout, 0) || 0;

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                <section className="earnings-header">
                    <h2 className="page-title">내 수익 및 정산</h2>
                    <p className="page-desc text-secondary">열심히 활동하신 소중한 수익 내역입니다.</p>
                </section>

                {/* Summary Cards */}
                <section className="summary-section">
                    <div className="earnings-bento">
                        <div className="bento-item cumulative">
                            <span className="label">누적 수령액</span>
                            <h3 className="value">₩{totalEarned.toLocaleString()}</h3>
                        </div>
                        <div className="bento-item pending card-premium">
                            <span className="label">정산 대기 중</span>
                            <h3 className="value">₩{pendingAmount.toLocaleString()}</h3>
                            {pendingAmount > 0 && <p className="note">매주 월요일 자동 입금 예정</p>}
                        </div>
                    </div>
                </section>

                {/* Payment List */}
                <section className="payment-list-section">
                    <div className="section-header">
                        <h3 className="section-title">상세 내역</h3>
                    </div>

                    {(!payments || payments.length === 0) ? (
                        <div className="empty-state-card card">
                            <div className="icon">💳</div>
                            <h3>정산 내역이 없습니다</h3>
                            <p>첫 청소를 완료하고 수익을 창출해 보세요!</p>
                            <Link href="/clean/jobs" className="btn-premium btn-sm mt-md">일감 찾으러 가기</Link>
                        </div>
                    ) : (
                        <div className="payment-stack">
                            {(payments as any[]).map((p: any) => (
                                <div key={p.id} className="payment-card-premium card">
                                    <div className="card-top">
                                        <div className="job-info">
                                            <h4 className="space-name">{(p.jobs as any)?.spaces?.name || '클리닝 작업'}</h4>
                                            <p className="date text-tertiary">
                                                {(p.jobs as any)?.scheduled_at ? new Date((p.jobs as any).scheduled_at).toLocaleDateString('ko-KR') : '-'}
                                            </p>
                                        </div>
                                        <div className="payout-info">
                                            <span className={`payout-value ${p.status === 'RELEASED' ? 'released' : 'held'}`}>
                                                +₩{p.worker_payout.toLocaleString()}
                                            </span>
                                            <span className={`status-tag ${p.status}`}>
                                                {p.status === 'HELD' ? '대기' : p.status === 'RELEASED' ? '완료' : '환불'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="card-details">
                                        <div className="tax-row">
                                            <span className="tax-label">원천징수(3.3%)</span>
                                            <span className="tax-value">-₩{p.withholding_tax.toLocaleString()}</span>
                                        </div>
                                        <p className="gross-total">세전 합계: ₩{(p.worker_payout + p.withholding_tax).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <BottomNav />

            <style jsx>{`
        .bg-premium-v2 {
          background-color: var(--color-bg);
          min-height: 100vh;
        }
        .page-content {
          padding: 24px 20px 120px;
        }
        .earnings-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .page-desc {
          font-size: 14px;
        }
        .earnings-bento {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }
        .bento-item {
          flex: 1;
          background: #FFFFFF;
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .bento-item.pending {
          background: var(--color-primary);
          color: #FFFFFF;
        }
        .bento-item .label {
          font-size: 12px;
          color: var(--color-text-tertiary);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .pending .label {
          color: rgba(255,255,255,0.7);
        }
        .bento-item .value {
          font-size: 20px;
          font-weight: 900;
        }
        .pending .note {
          font-size: 10px;
          margin-top: 8px;
          color: rgba(255,255,255,0.6);
          font-weight: 600;
        }
        .section-header {
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 800;
        }
        .payment-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .payment-card-premium {
          padding: 24px;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .space-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        .date {
          font-size: 12px;
          font-weight: 600;
        }
        .payout-info {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .payout-value {
          font-size: 17px;
          font-weight: 900;
        }
        .payout-value.released { color: var(--color-primary); }
        .payout-value.held { color: var(--color-text-secondary); }
        
        .status-tag {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .status-tag.HELD { background: #E9ECEF; color: #495057; }
        .status-tag.RELEASED { background: var(--color-primary-soft); color: var(--color-primary); }
        
        .card-details {
          padding-top: 12px;
          border-top: 1px solid var(--color-border-light);
        }
        .tax-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--color-text-tertiary);
          margin-bottom: 2px;
        }
        .gross-total {
          font-size: 11px;
          text-align: right;
          color: var(--color-text-disabled);
        }
        .empty-state-card {
          padding: 60px 24px;
          text-align: center;
        }
        .empty-state-card .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>
        </div>
    );
}
