'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDisputesClient({ initialJobs }: { initialJobs: any[] }) {
    const [jobs, setJobs] = useState(initialJobs);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    const handleResolve = async (jobId: string, action: 'APPROVED' | 'CANCELED') => {
        const actionText = action === 'APPROVED' ? '강제 승인' : '환불(취소)';
        if (!confirm(`이 청소요청을 ${actionText} 처리하시겠습니까? 관련 데이터가 영구적으로 업데이트됩니다.`)) return;

        setLoadingId(jobId);
        const supabase = createClient();

        // 1. Update Job Status
        const { error } = await supabase.from('jobs').update({ status: action }).eq('id', jobId);

        if (!error) {
            // 2. Update Dispute Status
            await supabase.from('disputes').update({
                status: 'RESOLVED',
                final_verdict: `Admin Decision: ${action}`,
                updated_at: new Date().toISOString() // Or just let server handle
            }).eq('job_id', jobId);

            // 3. Send Notifications
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                // Host Notify
                await supabase.rpc('notify_user', {
                    p_user_id: job.operator_id,
                    p_title: '⚖️ 중재 결과 알림',
                    p_message: `운영팀에서 해당 건을 [${actionText}] 처리했습니다.`,
                    p_url: `/requests/${jobId}`
                });
                // Worker Notify
                if (job.worker_id) {
                    await supabase.rpc('notify_user', {
                        p_user_id: job.worker_id,
                        p_title: '⚖️ 중재 결과 알림',
                        p_message: `운영팀에서 해당 건을 [${actionText}] 처리했습니다.`,
                        p_url: `/clean/job/${jobId}`
                    });
                }
            }

            alert(`${actionText} 처리가 완료되었습니다.`);
            setJobs(prev => prev.filter(j => j.id !== jobId));
            router.refresh();
        } else {
            alert('처리 중 에러가 발생했습니다.');
        }
        setLoadingId(null);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                        <span className="material-symbols-outlined font-bold">gavel</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">분쟁 중재 센터</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">관리자 전용: 호스트와 파트너 간의 갈등을 검토하고 최종 결정을 내립니다.</p>
            </header>

            {jobs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-700"
                >
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                        <span className="material-symbols-outlined text-[40px]">task_alt</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">현재 진행 중인 분쟁 없음</h3>
                    <p className="text-slate-500">모든 작업이 평화롭게 진행되고 있습니다.</p>
                </motion.div>
            ) : (
                <div className="grid gap-8">
                    {jobs.map((job, idx) => (
                        <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.1 } }}
                            className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700"
                        >
                            {/* Card Header */}
                            <div className="bg-rose-50 dark:bg-rose-950/30 p-6 flex justify-between items-center border-b border-rose-100 dark:border-rose-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                                        <span className="text-2xl">⚠️</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-rose-700 dark:text-rose-400 text-lg uppercase tracking-tight">{job.spaces?.name}</h4>
                                        <p className="text-rose-600/60 dark:text-rose-400/60 text-xs font-bold">{job.spaces?.address}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-rose-500 uppercase mb-1">작업 예정일</p>
                                    <p className="font-black text-rose-900 dark:text-rose-100">{new Date(job.scheduled_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="p-8">
                                {/* Dispute Content */}
                                <div className="mb-8">
                                    <h5 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-4">접수된 이슈 내역</h5>
                                    <div className="space-y-4">
                                        {job.disputes?.map((d: any, dIdx: number) => (
                                            <div key={dIdx} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[20px] border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-1 rounded-md">{d.category}</span>
                                                    <span className="text-slate-400 text-[10px] font-bold">{new Date(d.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{d.description}</p>
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Involved Parties */}
                                <div className="grid grid-cols-2 gap-4 mb-10">
                                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">신고자 (호스트)</p>
                                        <p className="font-black text-slate-900 dark:text-white">{job.operator?.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">{job.operator?.phone}</p>
                                    </div>
                                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">피신고자 (파트너)</p>
                                        <p className="font-black text-slate-900 dark:text-white">{job.worker?.name || '미배정'}</p>
                                        <p className="text-xs text-slate-500 mt-1">{job.worker?.phone || '-'}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <Link
                                        href={`/requests/${job.id}`}
                                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-black py-4 rounded-2xl text-center transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">photo_library</span> 증빙 사진 검토
                                    </Link>
                                    <button
                                        onClick={() => handleResolve(job.id, 'APPROVED')}
                                        disabled={loadingId === job.id}
                                        className="flex-[1.5] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">payments</span> 정산 강제 승인
                                    </button>
                                    <button
                                        onClick={() => handleResolve(job.id, 'CANCELED')}
                                        disabled={loadingId === job.id}
                                        className="flex-[1.5] bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">backspace</span> 환불 및 취소
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@100;400;700;900&display=swap');
                :global(body) { font-family: 'Pretendard', sans-serif; }
            `}</style>
        </div>
    );
}
