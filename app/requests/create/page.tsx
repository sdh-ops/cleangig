'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Space } from '@/lib/types'

export default function CreateRequestPage() {
    const router = useRouter()
    const [spaces, setSpaces] = useState<Space[]>([])
    const [favoritePartners, setFavoritePartners] = useState<any[]>([])
    const [form, setForm] = useState({
        space_id: '',
        scheduled_date: '',
        time_window_start: '11:00',
        time_window_end: '15:00',
        is_urgent: false,
        is_recurring: false,
        recurring_days: [] as string[],
        special_instructions: '',
        supplies_to_check: [] as string[],
        targeted_worker_id: ''
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

            const { data: favs } = await supabase
                .from('favorite_partners')
                .select('worker_id, users!favorite_partners_worker_id_fkey(id, name, tier, avg_rating)')
                .eq('operator_id', user.id)
            if (favs) setFavoritePartners(favs)
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

    const handleSpaceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const spaceId = e.target.value;
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
            supplies_to_check: form.supplies_to_check,
            targeted_worker_id: form.targeted_worker_id || null,
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
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen antialiased flex flex-col mx-auto max-w-md w-full relative">
            {/* TopAppBar */}
            <div className="sticky top-0 z-20 flex items-center bg-background-light dark:bg-background-dark p-4 justify-between border-b border-slate-200 dark:border-slate-800">
                <button onClick={() => router.back()} className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 focus:outline-none">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">새로운 청소 요청</h2>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-40">
                {/* Space Selection */}
                <div className="px-4 pt-6 pb-2">
                    <h1 className="text-[22px] font-bold leading-tight tracking-tight mb-4">어떤 공간을 청소할까요?</h1>
                    <label className="flex flex-col w-full">
                        <span className="text-sm font-medium leading-normal mb-2 text-slate-700 dark:text-slate-300">청소할 공간 *</span>
                        {spaces.length === 0 ? (
                            <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="mb-4 text-slate-600 dark:text-slate-400">등록된 공간이 없어요</p>
                                <button onClick={() => router.push('/spaces/create')} className="w-full h-12 bg-primary text-white rounded-lg font-bold flex items-center justify-center">
                                    공간 먼저 등록하기
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    className="appearance-none form-input flex w-full flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 px-4 pr-10 text-base font-medium"
                                    value={form.space_id}
                                    onChange={handleSpaceSelect}
                                >
                                    <option disabled value="">공간을 선택해주세요</option>
                                    {spaces.map(space => (
                                        <option key={space.id} value={space.id}>
                                            {space.type === 'airbnb' ? '🏠 ' : space.type === 'partyroom' ? '🎉 ' : space.type === 'studio' ? '📸 ' : '🏢 '}
                                            {space.name} ({space.address})
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>
                        )}
                    </label>
                </div>

                <div className="h-4"></div>

                {/* Date & Time Selection */}
                <div className="px-4 py-2">
                    <h1 className="text-[22px] font-bold leading-tight tracking-tight mb-4">언제 청소가 필요하신가요?</h1>

                    <div className="flex flex-col mb-4">
                        <label className="flex flex-col flex-1">
                            <span className="text-sm font-medium leading-normal mb-2 text-slate-700 dark:text-slate-300">청소 날짜 *</span>
                            <div className="relative flex items-center">
                                <input
                                    className="appearance-none form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 px-4 pr-10 text-base font-medium"
                                    type="date"
                                    min={minDate}
                                    value={form.scheduled_date}
                                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                                />
                            </div>
                        </label>
                    </div>

                    <div className="flex gap-4 items-end mb-2">
                        <label className="flex flex-col flex-1">
                            <span className="text-sm font-medium leading-normal mb-2 text-slate-700 dark:text-slate-300">시작 가능 시간 *</span>
                            <div className="relative flex items-center">
                                <input
                                    className="appearance-none form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 px-4 pr-10 text-base font-medium"
                                    type="time"
                                    value={form.time_window_start}
                                    onChange={e => setForm(f => ({ ...f, time_window_start: e.target.value }))}
                                />
                                <span className="material-symbols-outlined absolute right-3 text-slate-400 pointer-events-none">schedule</span>
                            </div>
                        </label>
                        <div className="text-lg font-bold text-slate-400 pb-3">~</div>
                        <label className="flex flex-col flex-1">
                            <span className="text-sm font-medium leading-normal mb-2 text-slate-700 dark:text-slate-300">완료 한계 시간 *</span>
                            <div className="relative flex items-center">
                                <input
                                    className="appearance-none form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 px-4 pr-10 text-base font-medium"
                                    type="time"
                                    value={form.time_window_end}
                                    onChange={e => setForm(f => ({ ...f, time_window_end: e.target.value }))}
                                />
                                <span className="material-symbols-outlined absolute right-3 text-slate-400 pointer-events-none">schedule_send</span>
                            </div>
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 px-1">클린파트너가 위 시간 범위 내에 도착하여 청소를 모두 마칩니다.</p>

                    {/* Recurring Config */}
                    <div className="flex flex-col w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-4">
                        <div
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
                        >
                            <div>
                                <div className="font-bold text-base flex items-center gap-1">🔁 정기 청소 (반복)</div>
                                <div className="text-xs text-slate-500 mt-1">매주 정해진 요일에 자동으로 청소 요청</div>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${form.is_recurring ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transition-transform ${form.is_recurring ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {form.is_recurring && (
                            <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-medium mb-3 mt-3">반복 요일 선택</p>
                                <div className="flex gap-2 justify-between">
                                    {['월', '화', '수', '목', '금', '토', '일'].map(day => {
                                        const selected = form.recurring_days.includes(day)
                                        return (
                                            <button
                                                key={day}
                                                className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${selected ? 'bg-primary text-white border-primary border-2 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600'}`}
                                                onClick={() => {
                                                    setForm(f => ({
                                                        ...f,
                                                        recurring_days: selected
                                                            ? f.recurring_days.filter(d => d !== day)
                                                            : [...f.recurring_days, day]
                                                    }))
                                                }}
                                            >
                                                {day}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Urgent Config */}
                    <div className="flex flex-col w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-3">
                        <div
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setForm(f => ({ ...f, is_urgent: !f.is_urgent }))}
                        >
                            <div>
                                <div className="font-bold text-base flex items-center gap-1 text-red-500">🔥 긴급 요청</div>
                                <div className="text-xs text-slate-500 mt-1">+30% 요금으로 더 빠른 매칭</div>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${form.is_urgent ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transition-transform ${form.is_urgent ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="h-4"></div>

                {/* Special Instructions */}
                <div className="px-4 py-2">
                    <h1 className="text-[22px] font-bold leading-tight tracking-tight mb-4">요청사항이 있으신가요?</h1>

                    <label className="flex flex-col w-full mb-6">
                        <span className="text-sm font-medium leading-normal mb-2 text-slate-700 dark:text-slate-300">특이사항 또는 주의사항 (선택)</span>
                        <textarea
                            className="form-textarea flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-base font-normal resize-none min-h-[120px]"
                            placeholder="예: 고양이가 있어요. 베란다 창틀 청소도 부탁드려요."
                            value={form.special_instructions}
                            onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))}
                        ></textarea>
                    </label>

                    <label className="flex flex-col w-full mb-6 relative">
                        <span className="text-sm font-medium leading-normal mb-1 text-slate-700 dark:text-slate-300">클린파트너가 꼭 확인해야 할 비품 (선택)</span>
                        <span className="text-xs text-slate-500 mb-3">체크해두시면 클린파트너가 수량 부족 시 알려줍니다.</span>
                        <div className="flex flex-wrap gap-2">
                            {['휴지', '수건', '종량제봉투', '핸드워시', '주방세제', '음료수'].map(item => {
                                const isSelected = form.supplies_to_check.includes(item)
                                return (
                                    <button
                                        key={item}
                                        className={`px-4 py-2 rounded-full text-sm transition-all ${isSelected ? 'bg-primary-light text-primary border border-primary font-bold shadow-sm' : 'bg-slate-100 dark:bg-slate-800 border-transparent border text-slate-600 dark:text-slate-300 font-medium'}`}
                                        onClick={() => setForm(f => ({
                                            ...f,
                                            supplies_to_check: isSelected
                                                ? f.supplies_to_check.filter(x => x !== item)
                                                : [...f.supplies_to_check, item]
                                        }))}
                                    >
                                        {item}
                                    </button>
                                )
                            })}
                        </div>
                    </label>

                    {/* Favorite Partner Direct Message */}
                    {favoritePartners.length > 0 && (
                        <div className="flex flex-col w-full bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50 p-4 mb-4">
                            <span className="text-sm font-bold leading-normal mb-1 text-orange-700 dark:text-orange-500">💖 단골 파트너 지정 전송 (선택)</span>
                            <span className="text-xs text-orange-600/80 dark:text-orange-400/80 mb-3">지정한 파트너에게만 알림이 가며 수락 대기 상태가 됩니다.</span>

                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                                <button
                                    className={`snap-center flex flex-col items-center justify-center p-3 min-w-[80px] rounded-xl border-2 transition-all flex-shrink-0 ${form.targeted_worker_id === '' ? 'border-orange-500 bg-orange-100 dark:bg-orange-800/50' : 'border-transparent bg-white dark:bg-slate-800 opacity-80'}`}
                                    onClick={() => setForm(f => ({ ...f, targeted_worker_id: '' }))}
                                >
                                    <span className="text-2xl mb-1">📢</span>
                                    <span className={`text-[11px] ${form.targeted_worker_id === '' ? 'font-bold text-orange-700 dark:text-orange-300' : 'font-medium text-slate-600 dark:text-slate-400'}`}>전체 공개</span>
                                </button>

                                {favoritePartners.map(fav => {
                                    const worker = fav.users
                                    if (!worker) return null
                                    const isSelected = form.targeted_worker_id === worker.id
                                    return (
                                        <button
                                            key={worker.id}
                                            className={`snap-center flex flex-col items-center justify-center p-3 min-w-[90px] rounded-xl border-2 transition-all flex-shrink-0 ${isSelected ? 'border-orange-500 bg-orange-100 dark:bg-orange-800/50' : 'border-transparent bg-white dark:bg-slate-800 opacity-80'}`}
                                            onClick={() => setForm(f => ({ ...f, targeted_worker_id: worker.id }))}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg mb-1">{worker.name[0]}</div>
                                            <span className={`text-[12px] truncate max-w-full ${isSelected ? 'font-bold text-orange-800 dark:text-orange-300' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{worker.name}</span>
                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{worker.tier}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom Action Area */}
            <div className="fixed bottom-0 z-30 w-full max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 p-4 pb-8 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {selectedSpace && (
                    <div className="flex flex-col mb-3 px-1 gap-1">
                        <div className="flex justify-between items-center text-[13px] text-slate-500">
                            <span>기본 청소비 ({selectedSpace.estimated_duration}분 소요)</span>
                            <span>{selectedSpace.base_price.toLocaleString()}원</span>
                        </div>
                        {form.is_urgent && (
                            <div className="flex justify-between items-center text-[13px] text-red-500 font-medium">
                                <span>긴급 할증 (+30%)</span>
                                <span>+{Math.round(selectedSpace.base_price * 0.3).toLocaleString()}원</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                            <span>파트너 수령액</span>
                            <span className="font-bold">{price.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100">최종 결제 금액 (수수료 포함)</span>
                            <span className="text-2xl font-bold text-primary">₩{Math.round(price * 1.1).toLocaleString()}</span>
                        </div>
                    </div>
                )}
                {!selectedSpace && (
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-base font-medium text-slate-600 dark:text-slate-400">예상 결제 금액</span>
                        <span className="text-2xl font-bold text-slate-300 dark:text-slate-700">-</span>
                    </div>
                )}
                <button
                    className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg flex items-center justify-center hover:bg-primary/95 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                    onClick={handleSubmit}
                    disabled={loading || !form.space_id || !form.scheduled_date || spaces.length === 0}
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : '요청 올리기'}
                </button>
            </div>
        </div>
    )
}
