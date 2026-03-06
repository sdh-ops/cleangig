'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Job, ChecklistItem } from '@/lib/types';
import SecureImage from '@/components/common/SecureImage';

const STATUS_FLOW: Record<string, { next: string; label: string; btnLabel: string; btnIcon: string }> = {
    ASSIGNED: { next: 'EN_ROUTE', label: '배정 완료', btnLabel: '현장으로 출발하기', btnIcon: 'directions_car' },
    EN_ROUTE: { next: 'ARRIVED', label: '이동 중', btnLabel: '현장 도착 완료', btnIcon: 'location_on' },
    ARRIVED: { next: 'IN_PROGRESS', label: '도착', btnLabel: '청소 시작하기', btnIcon: 'cleaning_services' },
    IN_PROGRESS: { next: 'SUBMITTED', label: '청소 중', btnLabel: '작업 완료 보고', btnIcon: 'check_circle' },
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
        if (!user) {
            alert('로그인이 필요합니다.');
            router.push('/login');
            return;
        }
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

        let success = false;
        let retries = 0;
        const maxRetries = 2;

        while (!success && retries <= maxRetries) {
            try {
                const { error: uploadError } = await supabase.storage
                    .from('photos').upload(path, file, { contentType: file.type, upsert: true });

                if (uploadError) throw uploadError;

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
                success = true;
            } catch (err) {
                console.error(`Upload attempt ${retries + 1} failed:`, err);
                retries++;
                if (retries > maxRetries) {
                    alert('사진 업로드에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
                } else {
                    await new Promise(res => setTimeout(res, 1000)); // 1초 대기 후 재시도
                }
            }
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

        let success = false;
        let retries = 0;
        const maxRetries = 2;

        while (!success && retries <= maxRetries) {
            try {
                const { error: uploadError } = await supabase.storage
                    .from('photos').upload(path, file, { contentType: file.type, upsert: true });

                if (uploadError) throw uploadError;

                await supabase.from('photos').insert({
                    job_id: id,
                    uploaded_by: user.id,
                    type: 'damage',
                    photo_url: path,
                    description: damageDesc || '파손 보고'
                });
                success = true;
                alert('파손 보고 사진이 등록되었습니다.');
                setShowDamageReport(false);
                setDamageDesc('');
            } catch (err) {
                console.error(`Damage upload attempt ${retries + 1} failed:`, err);
                retries++;
                if (retries > maxRetries) {
                    alert('파손 사진 업로드에 실패했습니다.');
                } else {
                    await new Promise(res => setTimeout(res, 1000));
                }
            }
        }
        setSubmitting(false);
    };

    const toggleChecklist = (idx: number) => {
        const next = [...checklist];
        next[idx] = { ...next[idx], completed: !next[idx].completed };
        setChecklist(next);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!job) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 p-8">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
            <p className="text-lg font-bold mb-6">작업을 찾을 수 없어요.</p>
            <button className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-primary/90 transition-colors" onClick={() => router.back()}>
                돌아가기
            </button>
        </div>
    );

    const space = job.spaces as any;
    const flow = STATUS_FLOW[job.status];
    const completedCount = checklist.filter(c => c.completed).length;
    const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

    // DateTime format
    const when = new Date(job.scheduled_at);
    const dateStr = when.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = when.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden pb-24 shadow-xl">
            {/* App Bar */}
            <div className="sticky top-0 z-30 flex items-center bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-slate-200 dark:border-slate-800">
                <button onClick={() => router.back()} className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
                    {job.status === 'OPEN' ? '청소요청 상세' : '진행 중인 작업'}
                </h2>
                {job.status !== 'OPEN' && (
                    <button onClick={() => router.push(`/chat/${id}`)} className="absolute right-4 flex size-10 shrink-0 items-center justify-center text-primary rounded-full hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[24px]">chat</span>
                    </button>
                )}
            </div>

            <main className="flex-1 overflow-y-auto w-full">
                {/* Header Content */}
                <div className="px-4 pt-6 pb-4">
                    {job.is_urgent ? (
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/30 rounded-full border border-rose-200 dark:border-rose-800">🔥 긴급 배정 작업</span>
                    ) : (
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold text-primary bg-primary/10 rounded-full border border-primary/20">일반 요금 작업</span>
                    )}
                    <h1 className="tracking-tight text-2xl md:text-[28px] font-bold leading-tight text-left pb-2 text-slate-900 dark:text-slate-100">{space?.name || '청소 작업'}</h1>
                    <div className="flex flex-wrap items-center text-slate-500 dark:text-slate-400 text-sm font-medium pt-1 gap-2">
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            <span>{dateStr}</span>
                        </div>
                        <span className="mx-1 hidden sm:inline">|</span>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span>{timeStr} (예상 {job.estimated_duration}분)</span>
                        </div>
                    </div>
                </div>

                {/* Status Hub (If not OPEN) */}
                {job.status !== 'OPEN' && (
                    <div className="px-4 pb-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-4 relative z-10">
                                <h3 className="font-bold text-lg text-primary">현재 상태</h3>
                                <span className="text-sm font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                                    {job.status === 'ASSIGNED' && '준비 단계'}
                                    {job.status === 'EN_ROUTE' && '이동 단계'}
                                    {job.status === 'ARRIVED' && '작업 대기'}
                                    {job.status === 'IN_PROGRESS' && '작업 중'}
                                    {['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && '완료/검수'}
                                </span>
                            </div>

                            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100 relative z-10">
                                {job.status === 'ASSIGNED' && '🚗 현장으로 출발해 볼까요?'}
                                {job.status === 'EN_ROUTE' && '📍 현장으로 이동 중입니다'}
                                {job.status === 'ARRIVED' && '🏠 도착을 완료했어요'}
                                {job.status === 'IN_PROGRESS' && '🧹 세심하게 청소 중'}
                                {job.status === 'SUBMITTED' && '⏳ 품질 검수 대기 중'}
                                {job.status === 'APPROVED' && '✅ 승인된 작업입니다'}
                                {job.status === 'PAID_OUT' && '💰 정산까지 끝났어요'}
                            </h2>

                            {job.status === 'IN_PROGRESS' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-bold text-primary">진행률 {Math.round(progress)}%</span>
                                        <span className="text-xs font-medium text-slate-500">{completedCount} / {checklist.length} 완료</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Work Conditions (Always show) */}
                <div className="px-4 mt-2 mb-4">
                    <h3 className="text-lg font-bold leading-tight tracking-tight pb-3 border-b border-primary/10 dark:border-primary/20">작업 조건 요약</h3>
                    <div className="py-2 space-y-1">
                        <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">storefront</span>
                                <p className="text-sm font-medium leading-normal">공간 유형</p>
                            </div>
                            <p className="text-sm font-semibold leading-normal text-right">{SPACE_TYPE_ICON[space?.type] || '🏢'} {space?.type?.toUpperCase() || '기타'}</p>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">payments</span>
                                <p className="text-sm font-medium leading-normal">총 수익</p>
                            </div>
                            <p className="text-sm font-bold leading-normal text-right text-primary">₩ {job.price.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">timer</span>
                                <p className="text-sm font-medium leading-normal">소요 시간</p>
                            </div>
                            <p className="text-sm font-semibold leading-normal text-right">예상 {job.estimated_duration}분</p>
                        </div>
                    </div>
                </div>

                {/* Work Guidelines - Only if Assigned, Arrived, etc */}
                {['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                    <div className="px-4 mt-4 mb-4">
                        <h3 className="text-lg font-bold leading-tight tracking-tight pb-3 border-b border-primary/10 dark:border-primary/20">현장 가이드라인</h3>

                        <div className="mt-4 grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                <span className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">vpn_key</span> 출입 방법</span>
                                <p className="text-sm font-bold text-primary break-all">{job.status === 'OPEN' ? '매칭 후 공개' : space?.entry_code || '별도 안내됨'}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                <span className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cleaning_bucket</span> 도구 위치</span>
                                <p className="text-sm font-bold break-all">{space?.cleaning_tool_location || '직접 지참 요망'}</p>
                            </div>
                            <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                <span className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">delete</span> 쓰레기 처리장 위치</span>
                                <p className="text-sm font-bold break-all">{space?.trash_guide || '호스트 안내사항 참조'}</p>
                            </div>
                        </div>

                        {space?.caution_notes && (
                            <div className="flex gap-3 items-start bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 mb-6">
                                <div className="mt-0.5 w-6 h-6 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-300 text-[14px]">warning</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm mb-1 text-rose-800 dark:text-rose-300">호스트 주의사항</h4>
                                    <p className="text-sm text-rose-700 dark:text-rose-400 leading-relaxed">{space.caution_notes}</p>
                                </div>
                            </div>
                        )}

                        {space?.reference_photos?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-bold text-sm mb-3">📸 참고 사진</h4>
                                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
                                    {space.reference_photos.map((url: string, i: number) => (
                                        <div key={i} className="w-[140px] h-[100px] shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                            <img src={url} alt={`Reference ${i}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Map Area */}
                {(job.status === 'OPEN' || job.status === 'ASSIGNED' || job.status === 'EN_ROUTE') && (
                    <div className="px-4 mt-2 mb-8">
                        <div className="h-[180px] rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden relative border border-slate-200 dark:border-slate-700">
                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=seoul&zoom=13&size=400x400&sensor=false')] bg-cover opacity-20"></div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg relative z-10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {job.status === 'OPEN' ? '상세 주소는 매칭 후 공개됩니다' : space?.address}
                            </p>
                            {job.status !== 'OPEN' && (
                                <a href={`https://map.naver.com/v5/search/${encodeURIComponent(space?.address || '')}`} target="_blank" className="text-xs font-bold bg-green-50 text-green-600 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-green-200">
                                    네이버 지도 <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Checklist Interface (If In Progress or Done) */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && checklist.length > 0 && (
                    <div className="mt-2 mb-6 border-t-[8px] border-background-light dark:border-slate-900 pt-6">
                        <div className="px-4 flex items-center mb-4">
                            <span className="material-symbols-outlined text-primary text-[24px] mr-2">checklist</span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex-1">현장 작업 체크리스트</h3>
                        </div>

                        <div className="space-y-3 px-4">
                            {checklist.map((item, idx) => {
                                const isDone = item.completed;
                                const canEdit = job.status === 'IN_PROGRESS';
                                return (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
                                        <div className="px-4">
                                            <label className={`flex gap-x-3 py-4 items-start ${canEdit ? 'cursor-pointer' : ''}`}>
                                                <div className="relative flex items-center mt-1 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isDone}
                                                        onChange={() => canEdit && toggleChecklist(idx)}
                                                        disabled={!canEdit}
                                                        className="peer h-6 w-6 cursor-pointer appearance-none rounded border-2 border-slate-300 dark:border-slate-600 bg-transparent checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70"
                                                    />
                                                    <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold">check</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className={`text-[15px] font-bold leading-normal transition-all ${isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                                                            {item.label}
                                                        </p>
                                                        {item.required && <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] px-2 py-0.5 rounded font-bold">필수</span>}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Photo Upload Section for Checklist */}
                                        {canEdit && (
                                            <div className="px-14 pb-4">
                                                {item.photo_url ? (
                                                    <div className="mt-2 relative">
                                                        <SecureImage srcOrPath={item.photo_url} className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); setActiveUploadIdx(idx); fileInputRef.current?.click(); }}
                                                            className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        {uploadingIdx === idx && (
                                                            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
                                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                                                                <span className="text-[10px] font-bold text-primary">재전송 중...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setActiveUploadIdx(idx); fileInputRef.current?.click(); }}
                                                        disabled={uploadingIdx !== null}
                                                        className={`flex items-center gap-2 text-sm font-bold border border-dashed px-4 py-3 rounded-xl transition-colors w-full justify-center ${uploadingIdx === idx ? 'bg-slate-50 text-slate-400 border-slate-300' : 'text-primary bg-primary/5 hover:bg-primary/10 border-primary/20'}`}
                                                    >
                                                        {uploadingIdx === idx ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                                <span>업로드 중...</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                                                                <span>완료 사진 전송하기 (선택)</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {!canEdit && item.photo_url && (
                                            <div className="px-14 pb-4">
                                                <SecureImage srcOrPath={item.photo_url} className="w-[120px] h-[80px] object-cover rounded-xl border border-slate-200 dark:border-slate-700 opacity-80" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Supplies Checklist */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && (job.supplies_to_check as string[])?.length > 0 && (
                    <div className="border-t-[8px] border-background-light dark:border-slate-900 pt-6 mb-8">
                        <div className="px-4 flex items-center mb-4">
                            <span className="material-symbols-outlined text-primary text-[24px] mr-2">inventory_2</span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex-1">비품 점검</h3>
                        </div>
                        <div className="px-4 space-y-3">
                            {(job.supplies_to_check as string[]).map((item, idx) => {
                                const isShort = supplyShortages.includes(item);
                                const canEdit = job.status === 'IN_PROGRESS';
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <span className="font-bold text-[15px]">{item}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => canEdit && setSupplyShortages(prev => prev.filter(x => x !== item))}
                                                disabled={!canEdit}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${!isShort ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
                                            >충분함</button>
                                            <button
                                                onClick={() => canEdit && setSupplyShortages(prev => [...prev, item])}
                                                disabled={!canEdit}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isShort ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
                                            >부족함</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 max-w-md mx-auto z-40 pb-safe shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)]">
                {job.status === 'OPEN' ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">예상 작업 수익</span>
                            <span className="text-2xl font-black text-primary">₩ {job.price.toLocaleString()}</span>
                        </div>
                        {application ? (
                            <button disabled className="w-full bg-slate-200 text-slate-500 font-bold py-4 rounded-xl shadow-sm cursor-not-allowed">
                                지원 완료. 매칭 결과를 기다리는 중입니다.
                            </button>
                        ) : (
                            <button
                                onClick={handleApply}
                                disabled={submitting}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <span>처리 중...</span>
                                ) : (
                                    <><span>지원서 제출하기</span><span className="material-symbols-outlined text-[18px]">send</span></>
                                )}
                            </button>
                        )}
                    </div>
                ) : flow ? (
                    <button
                        onClick={handleStatusNext}
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <span>처리 중...</span>
                        ) : (
                            <><span>{flow.btnLabel}</span><span className="material-symbols-outlined text-[20px]">{flow.btnIcon}</span></>
                        )}
                    </button>
                ) : (
                    <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-4 rounded-xl shadow-sm cursor-not-allowed flex items-center justify-center gap-2">
                        <span>모든 절차가 완료되었습니다</span><span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </button>
                )}
            </div>

            {/* Hidden Photo Inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file && activeUploadIdx !== null) handlePhotoUpload(file, activeUploadIdx); e.target.value = ''; }} />
            <input ref={damagePhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleDamageReportUpload(file); e.target.value = ''; }} />

            <style jsx>{`
                .pb-safe { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
