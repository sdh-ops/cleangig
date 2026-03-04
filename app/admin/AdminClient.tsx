'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
    stats: { totalUsers: number | null; totalOperators: number | null; totalWorkers: number | null; todayJobs: number | null; openJobs: number | null; disputedJobs: number | null }
    recentEvents: any[]
    topWorkers: any[]
    churnRisks: any[]
}

const EVENT_ICON: Record<string, string> = {
    worker_matched: '🤖', job_auto_approved: '✅', job_needs_review: '📸',
    payment_calculated: '💰', worker_churn_risk: '⚠️', operator_churn_risk: '⚠️',
}

export default function AdminClient({ stats, recentEvents, topWorkers, churnRisks }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<'overview' | 'agents' | 'workers' | 'risks'>('overview')
    const [runningAgent, setRunningAgent] = useState<string | null>(null)

    const runAgent = async (name: string) => {
        setRunningAgent(name)
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                body: JSON.stringify({})
            })
            router.refresh()
        } finally { setRunningAgent(null) }
    }

    const tabStyle = (t: string) => ({
        flex: 1, padding: 'var(--spacing-sm) 4px', fontSize: 12, fontWeight: 600,
        color: tab === t ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
        borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
        marginBottom: -1, transition: 'all .2s', cursor: 'pointer',
    } as const)

    return (
        <div style={{ minHeight: '100dvh', background: '#0F172A' }}>
            <header style={{ background: '#1E293B', padding: '20px 24px', borderBottom: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>🧹 CleanGig Admin</h1>
                        <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>AI 운영 대시보드</p>
                    </div>
                    <Link href="/dashboard" style={{ color: '#00C471', fontSize: 13, fontWeight: 600 }}>← 앱으로</Link>
                </div>

                {/* KPI 요약 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
                    {[
                        { label: '전체 회원', val: stats.totalUsers || 0, sub: `운영자 ${stats.totalOperators || 0} · 작업자 ${stats.totalWorkers || 0}`, color: '#3B82F6' },
                        { label: '오늘 청소', val: stats.todayJobs || 0, sub: `매칭 대기 ${stats.openJobs || 0}건`, color: '#00C471' },
                        { label: '분쟁 중', val: stats.disputedJobs || 0, sub: '즉시 처리 필요', color: (stats.disputedJobs || 0) > 0 ? '#EF4444' : '#64748B' },
                    ].map((k, i) => (
                        <div key={i} style={{ background: '#0F172A', borderRadius: 12, padding: '12px 14px', border: `1px solid ${k.color}33` }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.val}</div>
                            <div style={{ fontSize: 11, color: '#F8FAFC', fontWeight: 600 }}>{k.label}</div>
                            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{k.sub}</div>
                        </div>
                    ))}
                </div>
            </header>

            {/* 탭 */}
            <div style={{ background: '#1E293B', display: 'flex', borderBottom: '1px solid #334155', padding: '0 24px' }}>
                {([
                    ['overview', '📊 현황'],
                    ['agents', '🤖 AI 에이전트'],
                    ['workers', '🏆 작업자'],
                    ['risks', '⚠️ 이탈 위험'],
                ] as const).map(([key, label]) => (
                    <button key={key} style={{ ...tabStyle(key), color: tab === key ? '#00C471' : '#64748B', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #00C471' : '2px solid transparent', paddingBottom: 12 }}
                        onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>

            <div style={{ padding: '20px 24px' }}>

                {/* 현황 탭 */}
                {tab === 'overview' && (
                    <div>
                        <h3 style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>최근 에이전트 이벤트</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentEvents.length === 0 ? (
                                <p style={{ color: '#64748B', fontSize: 13 }}>아직 이벤트가 없어요. AI 에이전트를 실행해보세요.</p>
                            ) : recentEvents.map((e: any) => (
                                <div key={e.id} style={{ background: '#1E293B', borderRadius: 12, padding: '12px 16px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>{EVENT_ICON[e.event_type] || '📡'}</span>
                                            <div>
                                                <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{e.event_type}</div>
                                                <div style={{ color: '#64748B', fontSize: 11 }}>{e.processed_by?.join(', ')}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: e.processing_status === 'DONE' ? '#00C471' : '#F59E0B', fontSize: 11, fontWeight: 600 }}>
                                                {e.processing_status}
                                            </div>
                                            <div style={{ color: '#64748B', fontSize: 10 }}>
                                                {new Date(e.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI 에이전트 탭 */}
                {tab === 'agents' && (
                    <div>
                        <h3 style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>에이전트 수동 실행</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { name: 'matching-agent', label: '🤖 Matching Agent', desc: 'OPEN 작업에 적합한 작업자 자동 매칭', color: '#3B82F6' },
                                { name: 'quality-agent', label: '📸 Quality Agent', desc: 'SUBMITTED 작업 사진 AI 검수 + 자동 승인', color: '#8B5CF6' },
                                { name: 'finance-agent', label: '💰 Finance Agent', desc: 'APPROVED 작업 정산 금액 계산', color: '#00C471' },
                                { name: 'growth-agent', label: '📈 Growth Agent', desc: '이탈 위험 사용자 감지 + 점수화', color: '#F59E0B' },
                            ].map(agent => (
                                <div key={agent.name} style={{ background: '#1E293B', borderRadius: 16, padding: '16px 20px', border: `1px solid ${agent.color}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{agent.label}</div>
                                        <div style={{ color: '#64748B', fontSize: 12 }}>{agent.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => runAgent(agent.name)}
                                        disabled={runningAgent === agent.name}
                                        style={{ background: agent.color, color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: runningAgent === agent.name ? 0.7 : 1, minWidth: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                        id={`run-${agent.name}`}
                                    >
                                        {runningAgent === agent.name ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} /> : '▶ 실행'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p style={{ color: '#64748B', fontSize: 12, marginTop: 16 }}>
                            💡 실제 운영 시 Supabase Cron Job으로 자동 스케줄 실행됩니다.
                        </p>
                    </div>
                )}

                {/* 작업자 탭 */}
                {tab === 'workers' && (
                    <div>
                        <h3 style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>🏆 상위 작업자</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {topWorkers.map((w: any, i) => (
                                <div key={w.id} style={{ background: '#1E293B', borderRadius: 12, padding: '14px 16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#78350F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 14 }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#F1F5F9', fontWeight: 700 }}>{w.name}</div>
                                        <div style={{ color: '#64748B', fontSize: 12 }}>{w.tier} · 총 {w.total_jobs}건</div>
                                    </div>
                                    <div style={{ color: '#F59E0B', fontWeight: 800 }}>⭐ {w.avg_rating?.toFixed(1) || '-'}</div>
                                </div>
                            ))}
                            {topWorkers.length === 0 && <p style={{ color: '#64748B', fontSize: 13 }}>아직 데이터가 없어요</p>}
                        </div>
                    </div>
                )}

                {/* 이탈 위험 탭 */}
                {tab === 'risks' && (
                    <div>
                        <h3 style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ 이탈 위험 사용자</h3>
                        <p style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>Growth Agent가 감지한 고위험 사용자입니다. 리텐션 액션이 필요해요.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {churnRisks.map((c: any) => (
                                <div key={c.id} style={{ background: '#1E293B', borderRadius: 12, padding: '14px 16px', border: '1px solid #EF444433', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: '#F1F5F9', fontWeight: 700 }}>{(c.users as any)?.name}</div>
                                        <div style={{ color: '#64748B', fontSize: 12 }}>{(c.users as any)?.role === 'worker' ? '작업자' : '운영자'}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#EF4444', fontWeight: 800, fontSize: 16 }}>{Math.round(c.score * 100)}점</div>
                                        <div style={{ color: '#64748B', fontSize: 11 }}>HIGH RISK</div>
                                    </div>
                                </div>
                            ))}
                            {churnRisks.length === 0 && <p style={{ color: '#64748B', fontSize: 13 }}>이탈 위험 사용자가 없어요 👍</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
