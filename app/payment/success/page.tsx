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
        <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 400, margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
            {isSuccess ? (
                <>
                    <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#10B981' }}>안전 결제 완료</h1>
                    <p style={{ color: '#64748B', lineHeight: 1.5, marginBottom: 32 }}>
                        대금이 안전하게 에스크로에 보관되었습니다.<br />
                        클린파트너가 작업을 완료하면 정산됩니다.
                    </p>
                    <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 32, textAlign: 'left' }}>
                        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>결제 금액</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{amount.toLocaleString()}원</div>
                        <div style={{ marginTop: 12, fontSize: 13, color: '#64748B' }}>주문번호: {orderId}</div>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 60, marginBottom: 20 }}>❌</div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#EF4444' }}>결제 실패</h1>
                    <p style={{ color: '#64748B', lineHeight: 1.5, marginBottom: 32 }}>
                        {errorMessage}
                    </p>
                </>
            )}

            <Link href={jobId ? `/requests/${jobId}` : '/dashboard'}
                style={{ display: 'block', padding: '16px', background: '#0F172A', color: '#fff', textDecoration: 'none', borderRadius: 8, fontWeight: 700 }}>
                {isSuccess ? '상세 페이지로 돌아가기' : '다시 확인하기'}
            </Link>
        </div>
    )
}
