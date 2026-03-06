'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function RequestsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.push('/login');
        return;
      }

      const { data: jobData } = await supabase
        .from('jobs')
        .select('*, spaces(name, address, type, reference_photos)')
        .eq('operator_id', u.id)
        .order('scheduled_at', { ascending: false });

      if (jobData) setJobs(jobData);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    OPEN: { label: '매칭 중', cls: 'badge-open' },
    ASSIGNED: { label: '배정 완료', cls: 'badge-assigned' },
    EN_ROUTE: { label: '이동 중', cls: 'badge-assigned' },
    ARRIVED: { label: '도착', cls: 'badge-assigned' },
    IN_PROGRESS: { label: '청소 중', cls: 'badge-progress' },
    SUBMITTED: { label: '검수 대기', cls: 'badge-submitted' },
    APPROVED: { label: '승인 완료', cls: 'badge-approved' },
    DISPUTED: { label: '분쟁 중', cls: 'badge-disputed' },
    PAID_OUT: { label: '정산 완료', cls: 'badge-paid' },
    CANCELED: { label: '취소', cls: 'badge-canceled' },
  };

  if (loading) return <div className="loading">로딩 중...</div>;

  return (
    <div className="page-container bg-premium-v2">
      <Header />

      <main className="page-content">
        <section className="requests-header">
          <h2 className="page-title">청소 요청 내역</h2>
          <p className="page-desc text-secondary">등록하신 모든 청소의 진행 현황입니다.</p>
        </section>

        <section className="requests-list-section">
          {jobs.length === 0 ? (
            <div className="empty-state-card card">
              <div className="icon">📋</div>
              <h3>청소 요청 내역이 없습니다</h3>
              <p>전문 클린 파트너에게 청소를 요청해 보세요.</p>
              <Link href="/requests/create" className="btn-premium btn-sm mt-md">첫 요청 등록하기</Link>
            </div>
          ) : (
            <div className="job-stack">
              {jobs.map((job: any) => (
                <Link href={`/requests/${job.id}`} key={job.id} className="request-card-premium card">
                  <div className="card-header">
                    <div className="space-info">
                      {job.spaces?.reference_photos?.[0] ? (
                        <img src={job.spaces.reference_photos[0]} alt="" className="space-thumb" />
                      ) : (
                        <div className="space-thumb-placeholder">🏢</div>
                      )}
                      <div>
                        <h4 className="space-name">{job.spaces?.name}</h4>
                        <p className="date-time text-tertiary">
                          {new Date(job.scheduled_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} • {new Date(job.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`status-pill ${STATUS_MAP[job.status]?.cls}`}>
                      {STATUS_MAP[job.status]?.label}
                    </span>
                  </div>

                  <div className="card-footer">
                    <div className="price-info">
                      <span className="label">결제 금액</span>
                      <span className="value">₩{(job.price || 0).toLocaleString()}</span>
                    </div>
                    <span className="detail-link">상세보기 ›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />

      <style jsx>{`
        .bg-premium-v2 { background-color: var(--color-bg); min-height: 100vh; }
        .page-content { padding: 24px 20px 120px; }
        .requests-header { margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; }
        .page-desc { font-size: 14px; }
        .job-stack { display: flex; flex-direction: column; gap: 16px; }
        .request-card-premium { padding: 20px; text-decoration: none; display: block; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .space-info { display: flex; gap: 12px; align-items: center; }
        .space-thumb, .space-thumb-placeholder { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--color-border-light); }
        .space-thumb-placeholder { background: var(--color-bg); display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .space-name { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 2px; }
        .date-time { font-size: 12px; font-weight: 600; }
        .status-pill { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; }
        .badge-open { background: #EBF3FF; color: #3182F6; }
        .badge-assigned { background: #E7F9ED; color: #00C471; }
        .badge-progress { background: #FFF4E5; color: #FF9500; }
        .badge-submitted { background: #F3E8FF; color: #7C3AED; }
        .badge-approved { background: #F0FDF4; color: #15803D; }
        .badge-disputed { background: #FEF2F2; color: #EF4444; }
        .badge-paid { background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; }
        .badge-canceled { background: #FDECEC; color: #E91E63; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--color-border-light); }
        .price-info { display: flex; align-items: center; gap: 8px; }
        .price-info .label { font-size: 11px; font-weight: 700; color: var(--color-text-tertiary); }
        .price-info .value { font-size: 16px; font-weight: 800; color: var(--color-primary); }
        .detail-link { font-size: 13px; font-weight: 700; color: var(--color-text-tertiary); }
        .empty-state-card { padding: 60px 24px; text-align: center; }
        .empty-state-card .icon { font-size: 48px; margin-bottom: 16px; }
        .loading { padding: 40px; text-align: center; }
      `}</style>
    </div>
  );
}
