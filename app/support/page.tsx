'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    ChevronDown,
    HelpCircle,
    MessageSquare,
    Send,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

interface Inquiry {
    id: string;
    title: string;
    content: string;
    status: 'OPEN' | 'CLOSED';
    reply: string | null;
    created_at: string;
}

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState<'faq' | 'inquiry'>('faq');
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const faqs = [
        { q: "청소 요청은 어떻게 하나요?", a: "메인 화면에서 '공간 등록' 후 '청소 요청' 버튼을 클릭하여 일정과 상세 정보를 입력하면 파트너 매칭이 시작됩니다." },
        { q: "결제는 언제 이루어지나요?", a: "청소 매칭이 완료되면 결제가 진행되며, 청소 완료 및 호스트 승인 후 파트너에게 정산됩니다." },
        { q: "청소가 마음에 들지 않으면 어떻게 하죠?", a: "작업 완료 후 24시간 이내에 '재청소 요청' 또는 '분쟁 신고'를 통해 중재를 받으실 수 있습니다." },
        { q: "스파클 점수는 무엇인가요?", a: "기존의 매너 온도를 대체한 신뢰 지표입니다. 청소 품질과 매너를 종합적으로 평가하며 점수가 높을수록 매칭 확률이 올라갑니다." }
    ];

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('support_inquiries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setInquiries(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('support_inquiries')
            .insert({
                user_id: user.id,
                title,
                content,
                status: 'OPEN'
            });

        if (error) {
            alert('문의 등록 중 오류가 발생했습니다.');
        } else {
            setTitle('');
            setContent('');
            setIsFormOpen(false);
            fetchInquiries();
            alert('문의가 접수되었습니다. 최대한 빨리 답변 드리겠습니다!');
        }
        setSubmitting(false);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100 font-display flex flex-col mx-auto max-w-md w-full relative">
            <header className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-black tracking-tight">고객센터</h1>
            </header>

            <div className="p-4 flex gap-2">
                <button
                    onClick={() => setActiveTab('faq')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'faq' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                    자주 묻는 질문
                </button>
                <button
                    onClick={() => setActiveTab('inquiry')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === 'inquiry' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                    1:1 문의 내역
                </button>
            </div>

            <main className="flex-1 p-4 pb-24 h-full">
                {activeTab === 'faq' ? (
                    <div className="space-y-4">
                        <div className="bg-primary/5 rounded-3xl p-6 mb-6">
                            <h2 className="text-primary font-black text-lg mb-2">무엇을 도와드릴까요?</h2>
                            <p className="text-slate-500 text-xs font-bold">궁금하신 내용을 클릭하여 확인해보세요.</p>
                        </div>
                        {faqs.map((faq, idx) => (
                            <details key={idx} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none decoration-none">
                                    <div className="flex items-center gap-4">
                                        <span className="text-primary font-black text-lg">Q.</span>
                                        <span className="font-black text-slate-800 dark:text-slate-100">{faq.q}</span>
                                    </div>
                                    <ChevronDown size={20} className="text-slate-300 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="px-6 pb-6 pt-2 text-sm font-medium text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800 mt-2 pt-6 leading-relaxed">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-lg">문의 내역</h2>
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="flex items-center gap-1 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black"
                            >
                                <Plus size={14} /> 새 문의하기
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />)}
                            </div>
                        ) : inquiries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <MessageSquare size={48} className="mb-4 opacity-20" />
                                <p className="font-bold">아직 문의하신 내역이 없습니다.</p>
                            </div>
                        ) : (
                            inquiries.map((inq, idx) => (
                                <div key={inq.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                                        className="w-full p-6 text-left"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${inq.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                                                {inq.status === 'CLOSED' ? '답변완료' : '검토중'}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400">{new Date(inq.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="font-black text-slate-800 dark:text-slate-100">{inq.title}</h3>
                                    </button>

                                    <AnimatePresence>
                                        {expandedId === inq.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-slate-50 dark:bg-slate-800/50 px-6 pb-6 overflow-hidden"
                                            >
                                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{inq.content}</p>

                                                    {inq.reply && (
                                                        <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-primary/20 shadow-sm relative">
                                                            <div className="absolute -top-3 left-4 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">MANAGER REPLY</div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap pt-2">{inq.reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* New Inquiry Modal */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black">1:1 문의 작성</h2>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input
                                    type="text"
                                    required
                                    placeholder="문의 제목"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10"
                                />
                                <textarea
                                    required
                                    placeholder="상세 내용을 입력해주세요. 최대한 구체적으로 작성해주시면 정확한 답변이 가능합니다."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 h-32 resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-primary text-white h-14 rounded-2xl text-[15px] font-black shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? '접수 중...' : '문의 등록하기'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BottomNav />
        </div>
    );
}
