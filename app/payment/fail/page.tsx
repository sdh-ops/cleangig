import Link from 'next/link'

export default function PaymentFailPage({ searchParams }: { searchParams: any }) {
    const code = searchParams.code as string
    const message = searchParams.message as string
    const jobId = searchParams.jobId as string

    return (
        <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 400, margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: '#EF4444' }}>결제가 취소되었거나 실패했습니다</h1>

            <div style={{ background: '#FEF2F2', padding: 20, borderRadius: 12, border: '1px solid #FECDD3', marginBottom: 32, textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: '#E11D48', fontWeight: 600, marginBottom: 8 }}>에러 메시지</div>
                <div style={{ fontSize: 15, color: '#9F1239' }}>{message || '원인을 알 수 없는 오류'}</div>
                {code && <div style={{ marginTop: 8, fontSize: 12, color: '#BE123C' }}>코드: {code}</div>}
            </div>

            <Link href={jobId ? `/requests/${jobId}` : '/dashboard'}
                style={{ display: 'block', padding: '16px', background: '#F1F5F9', color: '#475569', textDecoration: 'none', borderRadius: 8, fontWeight: 700, border: '1px solid #CBD5E1' }}>
                돌아가기
            </Link>
        </div>
    )
}
