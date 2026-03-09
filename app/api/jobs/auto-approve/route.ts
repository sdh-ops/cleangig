import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * 전액 정산 보호 (Auto-Approval Settlement Protection)
 * 호스트가 24시간 동안 응답이 없을 경우 청소 완료를 자동 승인 처리합니다.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // 24시간 전 시간 계산
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const isoOneDayAgo = oneDayAgo.toISOString();

        // 자동 승인 대상 조회: 상태가 'SUBMITTED'이고 업데이트 시점이 24시간 이상 경과된 작업
        const { data: jobsToApprove, error: fetchError } = await supabase
            .from('jobs')
            .select('id, space_id, price, worker_id')
            .eq('status', 'SUBMITTED')
            .lt('updated_at', isoOneDayAgo);

        if (fetchError) throw fetchError;

        if (!jobsToApprove || jobsToApprove.length === 0) {
            return NextResponse.json({ message: '자동 승인 대상 작업이 없습니다.' });
        }

        const results = [];
        for (const job of jobsToApprove) {
            // 1. 작업 상태 업데이트
            const { error: updateError } = await supabase
                .from('jobs')
                .update({
                    status: 'APPROVED',
                    approved_at: new Date().toISOString(),
                    auto_approved: true // 자동 승인 여부 플래그
                })
                .eq('id', job.id);

            if (updateError) {
                results.push({ id: job.id, success: false, error: updateError.message });
                continue;
            }

            // 2. 정산 기록 생성 (Settlement)
            const { error: settlementError } = await supabase
                .from('settlements')
                .insert({
                    job_id: job.id,
                    worker_id: job.worker_id,
                    amount: job.price,
                    status: 'PENDING',
                    reason: '24시간 무응답 자동 승인'
                });

            results.push({ id: job.id, success: !settlementError, error: settlementError?.message });
        }

        return NextResponse.json({
            message: `${results.filter(r => r.success).length}건의 작업이 자동 승인되었습니다.`,
            details: results
        });

    } catch (error: any) {
        console.error('Auto-approve error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
