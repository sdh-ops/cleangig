import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default async function SpacesListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: spaces } = await supabase
        .from('spaces')
        .select('*')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false });

    const SPACE_TYPE_ICON: Record<string, string> = {
        airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
        unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
    };

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                <section className="spaces-header">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="page-title">내 공간 관리</h2>
                            <p className="page-desc text-secondary">등록된 {spaces?.length || 0}개의 공간이 있습니다.</p>
                        </div>
                        <Link href="/spaces/create" className="btn-add-space">
                            <span className="plus">+</span> 등록하기
                        </Link>
                    </div>
                </section>

                <section className="spaces-list-section">
                    {spaces?.length === 0 ? (
                        <div className="empty-state-card card">
                            <div className="icon">🏢</div>
                            <h3>등록된 공간이 없습니다</h3>
                            <p>첫 공간을 등록하고 청소 전문가를 만나보세요.</p>
                            <Link href="/spaces/create" className="btn-premium btn-sm mt-md">공간 등록하기</Link>
                        </div>
                    ) : (
                        <div className="space-grid">
                            {spaces?.map((space) => (
                                <Link href={`/spaces/${space.id}`} key={space.id} className="space-card-premium card">
                                    <div className="card-top">
                                        <div className="type-icon">
                                            {SPACE_TYPE_ICON[space.type] || '🏢'}
                                        </div>
                                        <div className="status-tag">
                                            <span className={`dot ${space.is_active ? 'active' : 'inactive'}`} />
                                            {space.is_active ? '운영 중' : '중단됨'}
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <h3 className="space-name">{space.name}</h3>
                                        <p className="space-address text-tertiary">{space.address}</p>
                                    </div>

                                    <div className="card-footer">
                                        <div className="meta">
                                            <span className="price">기본 ₩{space.base_price?.toLocaleString()}</span>
                                            <span className="divider">•</span>
                                            <span className="size">{space.size_sqm}㎡</span>
                                        </div>
                                        <span className="arrow-btn">›</span>
                                    </div>
                                </Link>
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
        .spaces-header {
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
        .btn-add-space {
          background: var(--color-primary);
          color: #FFF;
          padding: 10px 18px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: var(--shadow-sm);
        }
        .btn-add-space .plus {
          font-size: 18px;
        }
        .spaces-list-section {
          margin-top: 12px;
        }
        .empty-state-card {
          padding: 60px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .empty-state-card .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .empty-state-card h3 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .empty-state-card p {
          font-size: 14px;
          color: var(--color-text-tertiary);
          margin-bottom: 24px;
        }
        .space-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .space-card-premium {
          padding: 24px;
          text-decoration: none;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .type-icon {
          width: 48px;
          height: 48px;
          background: var(--color-bg);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 1px solid var(--color-border-light);
        }
        .status-tag {
          background: #FFFFFF;
          border: 1px solid var(--color-border-light);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-secondary);
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .dot.active { background: #3182F6; }
        .dot.inactive { background: #ADB5BD; }
        
        .card-body {
          margin-bottom: 20px;
        }
        .space-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-bottom: 4px;
        }
        .space-address {
          font-size: 13px;
          line-height: 1.4;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--color-border-light);
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .price {
          color: var(--color-primary);
        }
        .divider {
          color: var(--color-border);
        }
        .arrow-btn {
          font-size: 22px;
          color: var(--color-text-disabled);
        }
      `}</style>
        </div>
    );
}
