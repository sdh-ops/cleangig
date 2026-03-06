import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Next.js 14기준 Page Props
export default async function PaymentSuccessPage({ searchParams }: { searchParams: any }) {
    const paymentKey = searchParams.paymentKey as string
    const orderId = searchParams.orderId as string
    const amount = Number(searchParams.amount)

    const context = searchParams.context as string
    const jobId = searchParams.jobId as string
    const workerId = searchParams.workerId as string
    const appId = searchParams.appId as string

    let isSuccess = false
    let errorMessage = ''

    // 1. 토스 서버로 승인(Confirm) 요청
    const secretKey = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6'
    const basicToken = Buffer.from(`${secretKey}:`).toString('base64')

    try {
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basicToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentKey, orderId, amount })
        })

        if (!response.ok) {
            const errObj = await response.json()
            errorMessage = errObj.message || '결제 승인 중 오류가 발생했습니다.'
        } else {
            isSuccess = true
        }
    } catch (err: any) {
        errorMessage = err.message || '네트워크 오류가 발생했습니다.'
    }

    // 2. 승인 성공 시 DB 상태 동기화
    if (isSuccess && jobId) {
        const supabase = await createClient()

        if (context === 'accept' && workerId && appId) {
            // 배정 완료로 변경
            await supabase.from('jobs').update({ status: 'ASSIGNED', worker_id: workerId }).eq('id', jobId)
            await supabase.from('job_applications').update({ status: 'ACCEPTED' }).eq('id', appId)
            await supabase.from('job_applications').update({ status: 'REJECTED' }).eq('job_id', jobId).neq('id', appId)

            // 알림
            await supabase.rpc('notify_user', {
                p_user_id: workerId,
                p_title: '🎉 매칭 확정!',
                p_message: '결제가 완료되어 일감이 확정되었습니다. 일정을 확인해주세요!',
                p_url: `/clean/job/${jobId}`
            })
        } else if (context === 'extra') {
            // 추가 결제 완료 (즉시 승인)
            await supabase.from('jobs').update({ status: 'APPROVED' }).eq('id', jobId)
        }
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex justify-center">
            <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark shadow-xl overflow-x-hidden border-x border-slate-200 dark:border-slate-800">
                {/* Top App Bar */}
                <header className="flex items-center px-4 py-3 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-800">
                    <Link href={jobId ? `/requests/${jobId}` : '/dashboard'} className="flex size-10 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </Link>
                    <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight flex-1 text-center pr-10">
                        {isSuccess ? '결제 완료' : '결제 실패'}
                    </h1>
                </header>

                <main className="flex-1 flex flex-col overflow-y-auto">
                    {/* Status Animation/Icon Area */}
                    <div className="flex flex-col px-6 py-10 items-center justify-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 
                            ${isSuccess ? 'bg-primary/20 animate-pulse' : 'bg-rose-500/20'}
                        `}>
                            <span className={`material-symbols-outlined text-[48px] ${isSuccess ? 'text-primary' : 'text-rose-500'}`}>
                                {isSuccess ? 'check_circle' : 'error'}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight">
                                {isSuccess ? '안전 결제 완료' : '결제 실패'}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: isSuccess ? '대금이 안전하게 에스크로에 보관되었습니다.<br/>클린파트너가 작업을 완료하면 정산됩니다.' : errorMessage }} />
                        </div>
                    </div>

                    {isSuccess && (
                        /* Transaction Details Card */
                        <div className="px-4 pb-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                                <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">결제 정보</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center gap-x-4">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">결제 금액</p>
                                        <p className="text-primary text-lg font-black tracking-tight">{amount.toLocaleString()}원</p>
                                    </div>
                                    <div className="flex justify-between items-center gap-x-4">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">주문 번호</p>
                                        <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{orderId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Bottom Action Button */}
                <footer className="p-4 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-10 pb-8">
                    <Link href={jobId ? `/requests/${jobId}` : '/dashboard'} className="w-full flex items-center justify-center rounded-xl h-14 bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-base font-bold shadow-sm transition-opacity">
                        <span>{isSuccess ? '상세 페이지로 돌아가기' : '다시 확인하기'}</span>
                    </Link>
                </footer>
            </div>
        </div>
    )
}
