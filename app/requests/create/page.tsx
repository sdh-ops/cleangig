'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Space } from '@/lib/types'

export default function CreateRequestPage() {
    const router = useRouter()
    const [spaces, setSpaces] = useState<Space[]>([])
    const [form, setForm] = useState({
        space_id: '',
        scheduled_date: '',
        time_window_start: '11:00',
        time_window_end: '15:00',
        is_urgent: false,
        is_recurring: false,
        recurring_days: [] as string[],
        special_instructions: '',
    })
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
    const [loading, setLoading] = useState(false)
    const [price, setPrice] = useState(0)

    useEffect(() => {
        const fetchSpaces = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('spaces').select('*')
                .eq('operator_id', user.id).eq('is_active', true)
            setSpaces(data as Space[] || [])
        }
        fetchSpaces()

        // 오늘 날짜 기본값
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        setForm(f => ({ ...f, scheduled_date: `${yyyy}-${mm}-${dd}` }))
    }, [])

    useEffect(() => {
        if (!selectedSpace) return
        let p = selectedSpace.base_price
        if (form.is_urgent) p = Math.round(p * 1.3)
        setPrice(p)
    }, [selectedSpace, form.is_urgent])

    const handleSpaceSelect = (spaceId: string) => {
        const space = spaces.find(s => s.id === spaceId)
        setSelectedSpace(space || null)
        setForm(f => ({ ...f, space_id: spaceId }))
    }

    const handleSubmit = async () => {
        if (!form.space_id || !form.scheduled_date) return
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const scheduledAt = new Date(`${form.scheduled_date}T${form.time_window_start}:00+09:00`).toISOString()

        const { data: job, error } = await supabase.from('jobs').insert({
            space_id: form.space_id,
            operator_id: user.id,
            status: 'OPEN',
            scheduled_at: scheduledAt,
            time_window_start: form.time_window_start,
            time_window_end: form.time_window_end,
            estimated_duration: selectedSpace?.estimated_duration || 60,
            price,
            price_breakdown: {
                base: selectedSpace?.base_price || 0,
                urgency_multiplier: form.is_urgent ? 1.3 : 1.0,
            },
            checklist: selectedSpace?.checklist_template || [],
            special_instructions: form.special_instructions || null,
            is_urgent: form.is_urgent,
            is_recurring: form.is_recurring,
            recurring_config: form.is_recurring ? { days: form.recurring_days } : null,
        }).select().single()

        if (!error && job) {
            // Matching Agent 즉시 실행 (비동기)
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/matching-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ job_id: job.id })
            }).catch(console.error)

            router.push(`/requests/${job.id}?created=1`)
        } else {
            alert('요청 생성에 실패했어요.')
            setLoading(false)
        }
    }

    const minDate = new Date().toISOString().split('T')[0]

    return (
        <div className="page-container">
            <header className="form-header">
                <button onClick={() => router.back()} className="back-btn">←</button>
                <h1 className="form-title">새 청소 요청</h1>
                <div style={{ width: 40 }} />
            </header>

            <div className="page-content">
                {/* 공간 선택 */}
                <div className="form-group">
                    <label className="form-label">청소할 공간 *</label>
                    {spaces.length === 0 ? (
                        <div className="no-space-msg">
                            <p>등록된 공간이 없어요</p>
                            <a href="/spaces/create" className="btn btn-primary btn-sm">공간 먼저 등록하기</a>
                        </div>
                    ) : (
                        <div className="space-select-list">
                            {spaces.map(space => (
                                <button
                                    key={space.id}
                                    className={`space-select-btn ${form.space_id === space.id ? 'selected' : ''}`}
                                    onClick={() => handleSpaceSelect(space.id)}
                                    id={`space-${space.id}`}
                                >
                                    <span className="space-type-icon">
                                        {space.type === 'airbnb' ? '🏠' : space.type === 'partyroom' ? '🎉' : space.type === 'studio' ? '📸' : '🏢'}
                                    </span>
                                    <div className="space-select-info">
                                        <div className="space-select-name">{space.name}</div>
                                        <div className="space-select-addr">{space.address}</div>
                                    </div>
                                    {form.space_id === space.id && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 일시 선택 */}
                <div className="form-group">
                    <label className="form-label">청소 날짜 *</label>
                    <input className="form-input" type="date" min={minDate}
                        value={form.scheduled_date}
                        onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>

                <div className="form-group">
                    <label className="form-label">청소 가능 시간 (선택 범위 내 작업 완료) *</label>
                    <div className="time-window-row">
                        <div className="time-col">
                            <span className="text-xs text-secondary mb-xs">시작 가능 시간</span>
                            <input className="form-input" type="time" value={form.time_window_start}
                                onChange={e => setForm(f => ({ ...f, time_window_start: e.target.value }))} />
                        </div>
                        <div className="time-tilde">~</div>
                        <div className="time-col">
                            <span className="text-xs text-secondary mb-xs">완료 한계 시간</span>
                            <input className="form-input" type="time" value={form.time_window_end}
                                onChange={e => setForm(f => ({ ...f, time_window_end: e.target.value }))} />
                        </div>
                    </div>
                    <p className="form-hint mt-xs">클린파트너가 위 시간 범위 내에 도착하여 청소를 모두 마칩니다.</p>
                </div>

                {/* 반복 청소 옵션 */}
                <div className="urgent-toggle" onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}>
                    <div className="urgent-info">
                        <div className="urgent-title">🔁 정기 청소 (반복)</div>
                        <div className="urgent-desc">매주 정해진 요일에 자동으로 청소 요청</div>
                    </div>
                    <div className={`toggle ${form.is_recurring ? 'on' : ''}`}>
                        <div className="toggle-thumb" />
                    </div>
                </div>

                {form.is_recurring && (
                    <div className="form-group slide-down">
                        <label className="form-label">반복 요일 선택</label>
                        <div className="day-picker">
                            {['월', '화', '수', '목', '금', '토', '일'].map(day => {
                                const selected = form.recurring_days.includes(day)
                                return (
                                    <button
                                        key={day}
                                        className={`day-btn ${selected ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForm(f => ({
                                                ...f,
                                                recurring_days: selected
                                                    ? f.recurring_days.filter(d => d !== day)
                                                    : [...f.recurring_days, day]
                                            }))
                                        }}
                                    >{day}</button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 긴급 옵션 */}
                <div className="urgent-toggle" onClick={() => setForm(f => ({ ...f, is_urgent: !f.is_urgent }))}>
                    <div className="urgent-info">
                        <div className="urgent-title">🔥 긴급 요청</div>
                        <div className="urgent-desc">+30% 요금으로 더 빠른 매칭</div>
                    </div>
                    <div className={`toggle ${form.is_urgent ? 'on' : ''}`}>
                        <div className="toggle-thumb" />
                    </div>
                </div>

                {/* 특이사항 */}
                <div className="form-group">
                    <label className="form-label">특이사항 (선택)</label>
                    <textarea className="form-input" rows={2}
                        placeholder="클린파트너에게 전달할 내용 (예: 비밀번호 1234, 반려동물 있음)"
                        value={form.special_instructions}
                        onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))} />
                </div>

                {/* 가격 요약 */}
                {selectedSpace && (
                    <div className="price-summary">
                        <div className="price-row">
                            <span>기본 청소 단가</span>
                            <span>{selectedSpace.base_price.toLocaleString()}원</span>
                        </div>
                        {form.is_urgent && (
                            <div className="price-row text-primary">
                                <span>🔥 긴급 할증 (+30%)</span>
                                <span>+{Math.round(selectedSpace.base_price * 0.3).toLocaleString()}원</span>
                            </div>
                        )}
                        <div className="divider" />
                        <div className="price-row price-total">
                            <span>클린파트너 수령액</span>
                            <span>{price.toLocaleString()}원</span>
                        </div>
                        <div className="price-row text-secondary text-sm">
                            <span>공간파트너 결제 금액 (수수료 10%)</span>
                            <span>{Math.round(price * 1.1).toLocaleString()}원</span>
                        </div>
                        <div className="price-row text-secondary text-sm">
                            <span>예상 소요 시간</span>
                            <span>{selectedSpace.estimated_duration}분</span>
                        </div>
                    </div>
                )}

                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={handleSubmit}
                    disabled={loading || !form.space_id || !form.scheduled_date || spaces.length === 0}
                    id="submit-request"
                >
                    {loading ? <span className="spinner" /> : '✅ 청소 요청 등록하기'}
                </button>
            </div>

            <style jsx>{`
        .form-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--spacing-md);
          padding-top: calc(var(--spacing-md) + env(safe-area-inset-top, 0));
          border-bottom: 1px solid var(--color-border-light);
          background: var(--color-surface); position: sticky; top: 0; z-index: 10;
        }
        .back-btn { font-size: 22px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .back-btn:hover { background: var(--color-bg); }
        .form-title { font-size: var(--font-lg); font-weight: 700; }
        .no-space-msg { text-align: center; padding: var(--spacing-lg); background: var(--color-bg); border-radius: 12px; display: flex; flex-direction: column; gap: var(--spacing-sm); align-items: center; }
        .space-select-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
        .space-select-btn {
          display: flex; align-items: center; gap: var(--spacing-md);
          padding: var(--spacing-md); border-radius: 14px; text-align: left;
          border: 2px solid var(--color-border); background: var(--color-surface);
          cursor: pointer; transition: all var(--transition-fast); width: 100%;
        }
        .space-select-btn.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
        .space-type-icon { font-size: 28px; flex-shrink: 0; }
        .space-select-info { flex: 1; }
        .space-select-name { font-size: var(--font-md); font-weight: 700; }
        .space-select-addr { font-size: var(--font-xs); color: var(--color-text-tertiary); }
        .time-window-row { display: flex; align-items: flex-end; gap: var(--spacing-sm); }
        .time-col { flex: 1; display: flex; flex-direction: column; }
        .time-tilde { padding-bottom: 12px; font-weight: 700; color: var(--color-text-tertiary); }
        .day-picker { display: flex; gap: 8px; justify-content: space-between; margin-top: 8px; }
        .day-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-surface); font-weight: 600; font-size: 14px; cursor: pointer; transition: all .2s; }
        .day-btn.selected { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
        .urgent-toggle {
          display: flex; justify-content: space-between; align-items: center;
          padding: var(--spacing-md); border-radius: 14px;
          border: 2px solid var(--color-border); background: var(--color-surface);
          cursor: pointer; margin-bottom: var(--spacing-md);
        }
        .urgent-title { font-weight: 700; font-size: var(--font-md); }
        .urgent-desc { font-size: var(--font-xs); color: var(--color-text-secondary); }
        .toggle { width: 48px; height: 28px; border-radius: 999px; background: var(--color-border); position: relative; transition: background var(--transition-fast); flex-shrink: 0; }
        .toggle.on { background: var(--color-primary); }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: transform var(--transition-fast); }
        .toggle.on .toggle-thumb { transform: translateX(20px); }
        .price-summary { background: var(--color-bg); border-radius: 14px; padding: var(--spacing-md); margin-bottom: var(--spacing-md); }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: var(--font-sm); }
        .price-total { font-size: var(--font-md); font-weight: 800; }
      `}</style>
        </div>
    )
}
