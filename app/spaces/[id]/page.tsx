import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ICalForm from './ICalForm'

const DEFAULT_GALLERY = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD99pCe-LqqbpByS41so2ML_4IbchXYRGFi9gI2kT-XZMAICNdJ95eRXPqJ1Bq9pf64km5da56YjeVoSJPnQusqyg9RA60dU1Dn-Ksv7UoP84VG0aGEgTS_SNrHq36ZZtSxkKStauo1nhq4BjRScbOx-VPYULBJ-hvFmfE5NU8U2iUY6I8NLF1xNSs7XflzjBLuVQEYBveVIGtGSsBY0qyUzDPo6HffX-7cg6wX_FW5jRSNP17CcJF39qr0iEkvCu4zOjArQVVYG6w",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA5GheA58C30uoazAf_fiIvQP8q3KFLSDLQxL-VjMGuEb_ddLr6MFUuusKQygicG1RIG336AMqY74hPeidHP2dlRAHn4U1xWercNn4PH8EwM0eGVHI7d9GuWEj1_LZxxVPV1PQfTY0W23O9xUcv6lVe03vIrGLuwxy0JTMaVyDD51QqdJoCdNydyP19diLBmVWxkE8f3fyjH-jWxe9kOnPCNyAhujN7gJM400H1aygSN4cTqQrwaydATwtRRGgwDZs34QRpWE2T77M",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAn85qz8lL2ek3pjt6I36tLP_n68Pp-g0KoKJrSfB2mXU2NGN5Z6JMgb1ehHuxEPzLoVgSi237W9lwqlEH9L_G4EzZaVZVOiV6LcHL2WDi7mv6Y4489kalV8AyREiCxpNP8cf1MEV1n1e81_9BX6k-2YLvLnYi6TUJAVFbapHRL9I3v0D3AaA68h6uSz23DlWV-bCfJhMRM2BS3oneg-xcPi7bV4iu2GdJZP09c6-khopKDCc6V15zDYGyKtklButixWjhRcR2uzgs"
];

export default async function SpaceDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: space } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', params.id)
        .eq('operator_id', user.id)
        .single()

    if (!space) redirect('/spaces')

    // Fetch Jobs for Stats & History
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*, cleaner:worker_id(name)')
        .eq('space_id', space.id)
        .order('scheduled_at', { ascending: true })

    const allJobs = jobs || []
    const now = new Date()

    // Past jobs (History) -> completed or past
    const pastJobs = allJobs.filter(j => new Date(j.scheduled_at) < now || ['APPROVED', 'PAID_OUT'].includes(j.status)).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    // Future jobs -> scheduled later
    const futureJobs = allJobs.filter(j => new Date(j.scheduled_at) >= now && !['APPROVED', 'PAID_OUT', 'CANCELED'].includes(j.status)).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

    const lastJob = pastJobs[0]
    const nextJob = futureJobs[0]

    const formatShortDate = (iso?: string) => {
        if (!iso) return '없음'
        const d = new Date(iso)
        const today = new Date()
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) return '오늘'
        if (d.getDate() === today.getDate() + 1 && d.getMonth() === today.getMonth()) return `내일 (${d.getMonth() + 1}.${d.getDate()})`
        if (d.getDate() === today.getDate() - 1 && d.getMonth() === today.getMonth()) return `어제 (${d.getMonth() + 1}.${d.getDate()})`
        if (d < today) return `${diffDays}일 전 (${d.getMonth() + 1}.${d.getDate()})`

        return `${d.getMonth() + 1}.${d.getDate()}`
    }

    const formatHistoryDate = (iso: string) => {
        const d = new Date(iso);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getMonth() + 1}.${d.getDate()} (${days[d.getDay()]})`
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto bg-white dark:bg-[#1c2227] shadow-lg pb-[90px]">

                {/* Header */}
                <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-white dark:bg-[#1c2227] z-10 border-b border-slate-200 dark:border-slate-800">
                    <Link href="/spaces" className="flex size-12 shrink-0 items-center justify-center text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">공간 상세 정보</h2>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    {/* Gallery */}
                    <div className="grid grid-cols-2 gap-2 p-4">
                        <div className="col-span-2">
                            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg" style={{ backgroundImage: `url('${DEFAULT_GALLERY[0]}')` }}></div>
                        </div>
                        <div>
                            <div className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-lg" style={{ backgroundImage: `url('${DEFAULT_GALLERY[1]}')` }}></div>
                        </div>
                        <div>
                            <div className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-lg relative" style={{ backgroundImage: `url('${DEFAULT_GALLERY[2]}')` }}>
                                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                                    <span className="text-white font-medium text-sm">+2 더보기</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Space Info */}
                    <div className="flex p-4 flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-1">{space.name}</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">location_on</span> {space.address}
                                    </p>
                                </div>
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                                    {space.type === 'airbnb' ? '에어비앤비' : '일반공간'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">최근 청소 완료</span>
                                <span className="text-sm font-bold">{formatShortDate(lastJob?.scheduled_at)}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">다음 예정 청소</span>
                                <span className="text-sm font-bold">{formatShortDate(nextJob?.scheduled_at)}</span>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">상세 정보</p>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm text-slate-500">기본 단가</span>
                                <span className="text-sm font-bold text-primary">₩{space.base_price?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm text-slate-500">출입 정보 (보호됨)</span>
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-500">🔒 {space.entry_code || '미입력'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm text-slate-500">면적</span>
                                <span className="text-sm font-medium">{space.size_sqm ? `${space.size_sqm}㎡` : '미입력'}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex w-full gap-3">
                            <button className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-[0.015em] flex-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                                <span className="material-symbols-outlined mr-2 text-[20px]">edit_document</span>
                                <span className="truncate">정보 수정</span>
                            </button>
                            <Link href={`/requests/create?space_id=${space.id}`} className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] flex-1 hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 shrink-0">
                                <span className="material-symbols-outlined mr-2 text-[20px]">calendar_add_on</span>
                                <span className="truncate">예약 추가</span>
                            </Link>
                        </div>

                        {/* iCal Form Integration */}
                        <div className="mt-2">
                            <ICalForm spaceId={space.id} initialUrl={space.ical_url} />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-2 bg-slate-50 dark:bg-[#15191d] w-full"></div>

                    {/* Cleaning History */}
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">청소 내역</h3>
                            <button className="text-sm text-primary font-medium">전체보기</button>
                        </div>

                        <div className="flex flex-col gap-4">
                            {pastJobs.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                    아직 완료된 청소 내역이 없습니다.
                                </div>
                            ) : (
                                pastJobs.slice(0, 5).map((job) => (
                                    <Link href={`/requests/${job.id}`} key={job.id} className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c2227] shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-primary">
                                                {job.status === 'APPROVED' || job.status === 'PAID_OUT' ? 'check_circle' : 'history'}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm">
                                                    {job.is_urgent ? '긴급 당일 청소' : '일반 정기 청소'}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {formatHistoryDate(job.scheduled_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                담당 파트너: {job.cleaner?.name || '정보 없음'}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-[#1c2227] border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,20px)] pt-2 px-4 flex justify-between z-20">
                    <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors py-2">
                        <span className="material-symbols-outlined text-[24px]">home</span>
                        <p className="text-[10px] font-medium leading-normal">홈</p>
                    </Link>
                    <Link href="/spaces" className="flex flex-1 flex-col items-center justify-end gap-1 text-primary py-2">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
                        <p className="text-[10px] font-medium leading-normal">내 공간</p>
                    </Link>
                    <Link href="/requests" className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors py-2">
                        <span className="material-symbols-outlined text-[24px]">assignment</span>
                        <p className="text-[10px] font-medium leading-normal">요청 내역</p>
                    </Link>
                    <Link href="/profile" className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors py-2">
                        <span className="material-symbols-outlined text-[24px]">person</span>
                        <p className="text-[10px] font-medium leading-normal">마이</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
