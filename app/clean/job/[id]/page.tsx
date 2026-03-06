'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Job, ChecklistItem } from '@/lib/types';
import SecureImage from '@/components/common/SecureImage';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

const STATUS_FLOW: Record<string, { next: string; label: string; btnLabel: string; btnColor: string }> = {
    ASSIGNED: { next: 'EN_ROUTE', label: '배정 완료', btnLabel: '🚗 출발하기', btnColor: 'btn-primary' },
    EN_ROUTE: { next: 'ARRIVED', label: '이동 중', btnLabel: '📍 도착 완료', btnColor: 'btn-primary' },
    ARRIVED: { next: 'IN_PROGRESS', label: '도착', btnLabel: '🧹 청소 시작', btnColor: 'btn-primary' },
    IN_PROGRESS: { next: 'SUBMITTED', label: '청소 중', btnLabel: '✅ 청소 완료 제출', btnColor: 'btn-primary' },
};

const SPACE_TYPE_ICON: Record<string, string> = {
    airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
    unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
};

export default function JobDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [job, setJob] = useState<Job | null>(null);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [supplyShortages, setSupplyShortages] = useState<string[]>([]);
    const [extraCharge, setExtraCharge] = useState(0);
    const [extraChargeReason, setExtraChargeReason] = useState('');
    const [showExtraCharge, setShowExtraCharge] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const damagePhotoInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadIdx, setActiveUploadIdx] = useState<number | null>(null);
    const [damageDesc, setDamageDesc] = useState('');
    const [showDamageReport, setShowDamageReport] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [application, setApplication] = useState<any>(null);
    const [applyMessage, setApplyMessage] = useState('');

    useEffect(() => {
        fetchJob();
        const supabase = createClient();
        const channel = supabase.channel(`job-${id}-premium`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
                (payload) => setJob(payload.new as Job))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [id]);

    const fetchJob = async () => {
        const supabase = createClient();
        const { data: { user: u } } = await supabase.auth.getUser();
        setUser(u);

        const { data } = await supabase
            .from('jobs').select('*, spaces(*)')
            .eq('id', id).single();
        if (data) {
            setJob(data as Job);
            setChecklist((data.checklist as ChecklistItem[]) || []);
            setSupplyShortages((data.supply_shortages as string[]) || []);
            setExtraCharge(data.extra_charge_amount || 0);
            setExtraChargeReason(data.extra_charge_reason || '');
            if (u) {
                const { data: appData } = await supabase.from('job_applications')
                    .select('*').eq('job_id', id).eq('worker_id', u.id).single();
                setApplication(appData);
            }
        }
        setLoading(false);
    };

    const handleApply = async () => {
        if (!user) return;
        setSubmitting(true);
        const supabase = createClient();
        const { error } = await supabase.from('job_applications').insert({
            job_id: id,
            worker_id: user.id,
            message: applyMessage
        });
        if (!error) {
            alert('지원이 완료되었습니다. 공간파트너의 승낙을 기다려주세요.');
            fetchJob();
        } else {
            alert('지원에 실패했습니다.');
        }
        setSubmitting(false);
    };

    const handleStatusNext = async () => {
        if (!job) return;
        const flow = STATUS_FLOW[job.status];
        if (!flow) return;
        setSubmitting(true);
        const supabase = createClient();

        if (flow.next === 'SUBMITTED') {
            const required = checklist.filter(c => c.required);
            const incomplete = required.filter(c => !c.completed);
            if (incomplete.length > 0) {
                alert(`필수 항목 ${incomplete.length}개를 완료해주세요: ${incomplete[0].label}`);
                setSubmitting(false); return;
            }

            const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true })
                .eq('job_id', id).eq('type', 'after');
            if (!count || count === 0) {
                alert('청소 완료 사진을 최소 1장 이상 업로드해주세요.');
                setSubmitting(false); return;
            }
        }

        await supabase.from('jobs').update({
            status: flow.next,
            checklist,
            supply_shortages: supplyShortages,
            extra_charge_amount: extraCharge,
            extra_charge_reason: extraChargeReason,
            ...(flow.next === 'IN_PROGRESS' ? { started_at: new Date().toISOString() } : {}),
            ...(flow.next === 'SUBMITTED' ? { completed_at: new Date().toISOString() } : {}),
        }).eq('id', id);

        if (flow.next === 'SUBMITTED') {
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/quality-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ job_id: id })
            }).catch(console.error);
        }

        await fetchJob();
        setSubmitting(false);
    };

    const handlePhotoUpload = async (file: File, checklistIdx?: number) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !job) return;

        setUploadingIdx(checklistIdx ?? -1);
        const ext = file.name.split('.').pop();
        const path = `jobs/${id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('photos').upload(path, file, { contentType: file.type });

        if (uploadError) { alert('사진 업로드 실패'); setUploadingIdx(null); return; }

        await supabase.from('photos').insert({
            job_id: id,
            uploaded_by: user.id,
            type: 'after',
            photo_url: path,
            checklist_item_id: checklistIdx !== undefined ? checklist[checklistIdx]?.id : null,
        });

        if (checklistIdx !== undefined) {
            const next = [...checklist];
            next[checklistIdx] = { ...next[checklistIdx], completed: true, photo_url: path };
            setChecklist(next);
        }
        setUploadingIdx(null);
    };

    const handleDamageReportUpload = async (file: File) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !job) return;

        setSubmitting(true);
        const ext = file.name.split('.').pop();
        const path = `damage/${id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('photos').upload(path, file, { contentType: file.type });

        if (uploadError) { alert('파손 사진 업로드 실패'); setSubmitting(false); return; }

        await supabase.from('photos').insert({
            job_id: id,
            uploaded_by: user.id,
            type: 'damage',
            photo_url: path,
            description: damageDesc || '파손 보고'
        });

        alert('파손 보고 사진이 등록되었습니다.');
        setSubmitting(false);
        setShowDamageReport(false);
        setDamageDesc('');
    };

    const toggleChecklist = (idx: number) => {
        const next = [...checklist];
        next[idx] = { ...next[idx], completed: !next[idx].completed };
        setChecklist(next);
    };

    if (loading) return (
        <div className="page-container flex items-center justify-center min-h-dvh">
            <div className="spinner" />
        </div>
    );

    if (!job) return (
        <div className="page-container text-center p-3xl">
            <p>작업을 찾을 수 없어요.</p>
            <button className="btn btn-secondary mt-md" onClick={() => router.back()}>돌아가기</button>
        </div>
    );

    const flow = STATUS_FLOW[job.status];
    const space = job.spaces as any;
    const completedCount = checklist.filter(c => c.completed).length;
    const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

    return (
        <div className="page-container bg-premium-v2">
            <header className="premium-header">
                <button className="back-btn" onClick={() => router.back()}>←</button>
                <div className="title-box">
                    <h1 className="space-name">{space?.name || '청소 작업'}</h1>
                    <p className="address text-tertiary">{space?.address}</p>
                </div>
                <button className="cs-btn" onClick={() => router.push(`/chat/${id}`)}>
                    💬
                </button>
            </header>

            <main className="page-content">
                {/* Status Hub Card */}
                <section className="status-hub card-premium mb-xl">
                    <div className="hub-top">
                        <span className="status-tag">
                            {job.status === 'ASSIGNED' && '준비 단계'}
                            {job.status === 'EN_ROUTE' && '이동 단계'}
                            {job.status === 'ARRIVED' && '작업 대기'}
                            {job.status === 'IN_PROGRESS' && '작업 중'}
                            {['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && '완료 확인'}
                        </span>
                        <div className="price-label">₩{job.price.toLocaleString()}</div>
                    </div>
                    <h2 className="main-status-title">
                        {job.status === 'ASSIGNED' && '🚗 지금 출발할까요?'}
                        {job.status === 'EN_ROUTE' && '📍 현장으로 이동 중'}
                        {job.status === 'ARRIVED' && '🏠 도착을 완료했어요'}
                        {job.status === 'IN_PROGRESS' && '🧹 세심하게 청소 중'}
                        {job.status === 'SUBMITTED' && '⏳ 품질 검수 대기 중'}
                        {job.status === 'APPROVED' && '✅ 승인된 작업입니다'}
                        {job.status === 'PAID_OUT' && '💰 정산까지 끝났어요'}
                    </h2>
                    <p className="status-desc text-secondary">
                        {job.status === 'ASSIGNED' && '출발 버튼을 누르면 이동이 기록됩니다.'}
                        {job.status === 'EN_ROUTE' && '현장에 도착하면 도착 완료를 눌러주세요.'}
                        {job.status === 'ARRIVED' && '가이드를 숙지하고 청소를 시작해 주세요.'}
                        {job.status === 'IN_PROGRESS' && '사진을 찍으며 체크리스트를 완성하세요.'}
                        {job.status === 'SUBMITTED' && '최대 24시간 이내에 승인 처리가 완료됩니다.'}
                    </p>
                </section>

                {/* Action Sections */}
                {['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                    <section className="guide-section mb-xl">
                        <h3 className="section-title mb-md">📘 현장 가이드라인</h3>

                        <div className="guide-grid mb-lg">
                            <div className="guide-item card-soft">
                                <span className="label">🔑 출입 방법</span>
                                <p className="value highlight">{space?.entry_code || '현장 확인'}</p>
                            </div>
                            <div className="guide-item card-soft">
                                <span className="label">🧽 도구 위치</span>
                                <p className="value">{space?.cleaning_tool_location || '제공 안됨'}</p>
                            </div>
                            <div className="guide-item card-soft">
                                <span className="label">🗑 쓰레기 처리</span>
                                <p className="value">{space?.trash_guide || '확인 필요'}</p>
                            </div>
                            <div className="guide-item card-soft">
                                <span className="label">🗺️ 네이버 지도</span>
                                <a href={`https://map.naver.com/v5/search/${encodeURIComponent(space?.address || '')}`} target="_blank" className="map-link">길찾기 →</a>
                            </div>
                        </div>

                        {space?.caution_notes && (
                            <div className="caution-box mb-lg">
                                <strong>⚠️ 주의사항:</strong> {space.caution_notes}
                            </div>
                        )}

                        {space?.reference_photos?.length > 0 && (
                            <div className="ref-photos">
                                <p className="sub-label mb-xs">✨ 청소 기준 사진</p>
                                <div className="photo-caro no-scrollbar">
                                    {space.reference_photos.map((url: string, i: number) => (
                                        <img key={i} src={url} alt="Reference" className="ref-img" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Checklist */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && checklist.length > 0 && (
                    <section className="checklist-section mb-xl">
                        <div className="section-header flex justify-between items-end mb-sm">
                            <h3 className="section-title">📝 체크리스트</h3>
                            <span className="progress-text">{completedCount}/{checklist.length} 완료</span>
                        </div>
                        <div className="progress-bar mb-md">
                            <div className="bar-inner" style={{ width: `${progress}%` }} />
                        </div>

                        <div className="check-stack">
                            {checklist.map((item, idx) => (
                                <div key={item.id} className={`check-card ${item.completed ? 'completed' : ''}`}>
                                    <button className="check-bullet" onClick={() => toggleChecklist(idx)} disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}>
                                        {item.completed && '✓'}
                                    </button>
                                    <div className="check-info">
                                        <span className="check-label">{item.label}</span>
                                        {item.required && <span className="req-badge">필수</span>}
                                    </div>
                                    {job.status === 'IN_PROGRESS' && (
                                        <button className="photo-upload-btn" onClick={() => { setActiveUploadIdx(idx); fileInputRef.current?.click(); }}>
                                            {item.photo_url ? '✨' : uploadingIdx === idx ? '⏳' : '📸'}
                                        </button>
                                    )}
                                    {item.photo_url && !['IN_PROGRESS'].includes(job.status) && (
                                        <SecureImage srcOrPath={item.photo_url} className="check-thumb" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Supplies Check */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && (job.supplies_to_check as string[])?.length > 0 && (
                    <section className="supplies-section mb-xl">
                        <h3 className="section-title mb-xs">🚨 비품 부족 보고</h3>
                        <p className="section-desc mb-md">부족한 비품을 선택해 주세요.</p>
                        <div className="grid-2-col">
                            {(job.supplies_to_check as string[]).map((item, idx) => {
                                const isShort = supplyShortages.includes(item);
                                return (
                                    <button key={idx} className={`supply-btn ${isShort ? 'active' : ''}`}
                                        onClick={() => setSupplyShortages(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])}
                                        disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}
                                    >
                                        {isShort ? '⚠️' : '📦'} {item}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Extra Charge Form */}
                {job.status === 'IN_PROGRESS' && (
                    <section className="extra-charge-section card-soft mb-xl">
                        <div className="flex justify-between items-center mb-md">
                            <h3 className="section-title-sm">💸 특이사항 추가 비용 청구</h3>
                            <button className="toggle-btn" onClick={() => setShowExtraCharge(!showExtraCharge)}>
                                {showExtraCharge || extraCharge > 0 ? '접기' : '작성'}
                            </button>
                        </div>
                        {(showExtraCharge || extraCharge > 0) && (
                            <div className="extra-form">
                                <div className="input-group mb-md">
                                    <label>청구 금액 (원)</label>
                                    <input type="number" value={extraCharge || ''} onChange={e => setExtraCharge(parseInt(e.target.value) || 0)} placeholder="0" />
                                </div>
                                <div className="input-group">
                                    <label>청구 사유 및 내용 (필수)</label>
                                    <textarea value={extraChargeReason} onChange={e => setExtraChargeReason(e.target.value)} placeholder="심한 오염 등 구체적 사유 작성" rows={2} />
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Floating Action Button */}
            {flow && job.status !== 'OPEN' && (
                <div className="fab-container">
                    <button className="fab-btn" onClick={handleStatusNext} disabled={submitting || (extraCharge > 0 && !extraChargeReason.trim())}>
                        {submitting ? '처리 중...' : flow.btnLabel}
                    </button>
                </div>
            )}

            {/* Inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file && activeUploadIdx !== null) handlePhotoUpload(file, activeUploadIdx); e.target.value = ''; }} />
            <input ref={damagePhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleDamageReportUpload(file); e.target.value = ''; }} />

            <style jsx>{`
        .bg-premium-v2 { background: var(--color-bg); min-height: 100vh; }
        .premium-header {
           position: sticky; top: 0; z-index: 100;
           background: #FFFFFF; padding: 20px 20px 14px;
           display: flex; align-items: center; gap: 16px;
           border-bottom: 1px solid var(--color-border-light);
        }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: #F8F9FA; border: none; font-size: 20px; }
        .title-box { flex: 1; overflow: hidden; }
        .title-box .space-name { font-size: 17px; font-weight: 800; line-height: 1.2; word-break: break-all; }
        .title-box .address { font-size: 12px; }
        .cs-btn { width: 44px; height: 44px; border-radius: 14px; background: var(--color-primary-soft); border: none; font-size: 20px; }
        
        .page-content { padding: 24px 20px 120px; }
        .card-premium { background: var(--color-primary); color: #FFFFFF; padding: 28px; border-radius: 28px; box-shadow: var(--shadow-md); }
        .status-tag { background: rgba(255,255,255,0.2); color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; }
        .price-label { font-size: 20px; font-weight: 900; }
        .hub-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .main-status-title { font-size: 22px; font-weight: 900; margin-bottom: 8px; }
        .status-desc { font-size: 14px; color: rgba(255,255,255,0.8) !important; line-height: 1.5; }
        
        .section-title { font-size: 18px; font-weight: 800; }
        .guide-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .card-soft { background: #FFFFFF; border: 1px solid var(--color-border-light); border-radius: 20px; padding: 16px; }
        .guide-item .label { font-size: 11px; color: var(--color-text-tertiary); font-weight: 700; display: block; margin-bottom: 4px; }
        .guide-item .value { font-size: 14px; font-weight: 800; }
        .guide-item .value.highlight { color: var(--color-primary); }
        .map-link { color: #03C75A; font-weight: 800; font-size: 13px; text-decoration: none; }
        .caution-box { background: #FFF1F2; color: #E11D48; padding: 16px; border-radius: 16px; font-size: 13px; }
        
        .photo-caro { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
        .ref-img { width: 140px; height: 100px; border-radius: 16px; object-fit: cover; border: 1px solid var(--color-border-light); flex-shrink: 0; }
        
        .progress-bar { height: 8px; background: var(--color-border-light); border-radius: 4px; overflow: hidden; }
        .bar-inner { height: 100%; background: var(--color-primary); transition: width 0.3s; }
        .check-stack { display: flex; flex-direction: column; gap: 10px; }
        .check-card { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--color-border-light); }
        .check-card.completed { background: #F8FAFC; border-color: #E2E8F0; opacity: 0.8; }
        .check-bullet { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #D1D8E0; background: #fff; display: flex; alignItems: center; justifyContent: center; color: var(--color-primary); font-weight: 900; }
        .check-card.completed .check-bullet { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
        .check-info { flex: 1; display: flex; align-items: center; gap: 6px; }
        .check-label { font-size: 15px; font-weight: 700; }
        .req-badge { font-size: 10px; background: #FFF1F2; color: #E11D48; padding: 1px 4px; border-radius: 4px; font-weight: 800; }
        .photo-upload-btn { width: 40px; height: 40px; border-radius: 12px; background: #F8F9FA; border: 1px solid var(--color-border-light); font-size: 18px; }
        .check-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
        
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .supply-btn { padding: 16px; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--color-border-light); font-size: 14px; font-weight: 800; color: #4E5968; }
        .supply-btn.active { background: #FFF1F2; border-color: #FECDD3; color: #E11D48; }
        
        .input-group label { display: block; font-size: 12px; font-weight: 800; color: var(--color-text-tertiary); margin-bottom: 6px; }
        .input-group input, .input-group textarea { width: 100%; padding: 14px; border-radius: 14px; border: 1px solid var(--color-border-light); background: #F8F9FA; font-size: 14px; font-weight: 700; outline: none; }
        .toggle-btn { color: var(--color-primary); font-weight: 800; font-size: 13px; background: none; border: none; }
        
        .fab-container { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); z-index: 200; }
        .fab-btn { width: 100%; height: 60px; border-radius: 20px; background: var(--color-primary); color: #fff; border: none; font-size: 18px; font-weight: 900; box-shadow: 0 10px 20px rgba(49, 130, 246, 0.3); }
        .hidden { display: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
        </div>
    );
}
