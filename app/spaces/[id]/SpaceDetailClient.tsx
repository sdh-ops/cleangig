'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  ChevronLeft,
  MapPin,
  Edit3,
  Calendar,
  Wallet,
  Sparkles,
  Building2,
  Zap,
  Power,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import NaverMap from '@/components/common/NaverMap'
import { formatKRW, spaceTypeLabel } from '@/lib/utils'
import type { SpaceType } from '@/lib/types'

type Space = {
  id: string
  operator_id: string
  name: string
  type: SpaceType
  address: string
  address_detail?: string
  location?: { coordinates?: [number, number] } | null
  size_pyeong?: number
  size_sqm?: number
  base_price: number
  estimated_duration: number
  photos?: string[]
  reference_photos?: string[]
  cleaning_tool_location?: string
  parking_guide?: string
  trash_guide?: string
  has_toilet?: boolean
  has_kitchen?: boolean
  has_bed?: boolean
  has_balcony?: boolean
  is_active: boolean
  checklist_template?: { id: string; label: string; required: boolean }[]
}

type Props = {
  space: Space
  isOwner: boolean
  totalJobs: number
  monthCount: number
  lifetimeSpent: number
}

export default function SpaceDetailClient({ space, isOwner, totalJobs, monthCount, lifetimeSpent }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isActive, setIsActive] = useState(space.is_active)

  const coords = space.location?.coordinates
    ? { lat: space.location.coordinates[1], lng: space.location.coordinates[0] }
    : null

  const toggleActive = async () => {
    setToggling(true)
    const { error } = await supabase.from('spaces').update({ is_active: !isActive }).eq('id', space.id)
    if (!error) setIsActive(!isActive)
    setToggling(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('spaces').delete().eq('id', space.id)
    if (!error) router.replace('/spaces')
    setDeleting(false)
  }

  const facilities = [
    space.has_toilet && '화장실',
    space.has_kitchen && '주방',
    space.has_bed && '침구',
    space.has_balcony && '발코니',
  ].filter(Boolean) as string[]

  return (
    <div className="sseuksak-shell">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[14.5px] font-extrabold text-ink truncate">{space.name}</h1>
          </div>
          {isOwner ? (
            <Link href={`/spaces/${space.id}/edit`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
              <Edit3 size={18} />
            </Link>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      <div className="flex-1 pb-28">
        {/* Photos carousel */}
        {space.photos && space.photos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x px-5 py-4">
            {space.photos.map((p, i) => (
              <div key={i} className="shrink-0 w-[78%] aspect-[4/3] rounded-2xl bg-surface-muted overflow-hidden snap-center">
                <img src={p} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-5 my-4 aspect-[16/9] rounded-2xl bg-brand-softer flex items-center justify-center">
            <Building2 size={36} className="text-brand-dark" />
          </div>
        )}

        {/* Title */}
        <div className="px-5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="chip chip-brand !text-[10.5px]">{spaceTypeLabel(space.type)}</span>
            {isActive ? (
              <span className="chip chip-success !text-[10.5px]">운영중</span>
            ) : (
              <span className="chip chip-muted !text-[10.5px]">비활성</span>
            )}
          </div>
          <h1 className="h-title text-ink">{space.name}</h1>
          <p className="t-caption mt-1.5 flex items-center gap-1">
            <MapPin size={12} /> {space.address} {space.address_detail ?? ''}
          </p>
        </div>

        {/* Stats */}
        {isOwner && (
          <div className="grid grid-cols-3 gap-2 mx-5 mt-5">
            <Stat label="전체 작업" value={`${totalJobs}건`} icon={<Sparkles size={14} />} />
            <Stat label="이번 달" value={`${monthCount}건`} icon={<Calendar size={14} />} />
            <Stat label="누적 지출" value={formatKRW(lifetimeSpent, { short: true })} icon={<Wallet size={14} />} />
          </div>
        )}

        {/* Info sections */}
        <div className="mx-5 mt-5 flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="text-[13px] font-black text-text-faint uppercase tracking-wide mb-2">공간 정보</h3>
            <div className="flex flex-col gap-2 text-[13.5px] font-semibold text-ink">
              <Row label="기본 가격" value={formatKRW(space.base_price)} />
              <Row label="예상 소요시간" value={`${space.estimated_duration ?? 90}분`} />
              {space.size_pyeong && <Row label="크기" value={`${space.size_pyeong}평 (${space.size_sqm}㎡)`} />}
              {facilities.length > 0 && <Row label="시설" value={facilities.join(' · ')} />}
            </div>
          </div>

          {(space.cleaning_tool_location || space.parking_guide || space.trash_guide) && (
            <div className="card p-4">
              <h3 className="text-[13px] font-black text-text-faint uppercase tracking-wide mb-2">현장 안내</h3>
              <div className="flex flex-col gap-3">
                {space.parking_guide && <GuideRow label="주차" value={space.parking_guide} />}
                {space.cleaning_tool_location && <GuideRow label="청소도구" value={space.cleaning_tool_location} />}
                {space.trash_guide && <GuideRow label="쓰레기" value={space.trash_guide} />}
              </div>
            </div>
          )}

          {space.checklist_template && space.checklist_template.length > 0 && (
            <div className="card p-4">
              <h3 className="text-[13px] font-black text-text-faint uppercase tracking-wide mb-2">
                체크리스트 ({space.checklist_template.length}개)
              </h3>
              <ul className="flex flex-col gap-1.5">
                {space.checklist_template.map((c) => (
                  <li key={c.id} className="text-[13.5px] font-semibold text-ink flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                    {c.label}
                    {c.required && <span className="chip chip-muted !text-[10px] !px-1.5 !py-0">필수</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {coords && (
            <div>
              <h3 className="text-[13px] font-black text-text-faint uppercase tracking-wide mb-2 mx-1">위치</h3>
              <NaverMap
                height={200}
                center={coords}
                markers={[{ lat: coords.lat, lng: coords.lng, title: space.name, tone: 'brand' }]}
                interactive={false}
              />
            </div>
          )}

          {isOwner && (
            <div className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="text-[13.5px] font-extrabold text-ink">{isActive ? '공간 운영 중' : '공간 비활성'}</h3>
                <p className="text-[11.5px] text-text-soft font-bold mt-0.5">비활성 시 신규 요청을 만들 수 없어요.</p>
              </div>
              <button
                onClick={toggleActive}
                disabled={toggling}
                className={`w-12 h-7 rounded-full flex items-center px-0.5 transition ${isActive ? 'bg-brand justify-end' : 'bg-line-strong justify-start'}`}
              >
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {toggling ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} className={isActive ? 'text-brand-dark' : 'text-text-faint'} />}
                </div>
              </button>
            </div>
          )}

          {isOwner && (
            <button
              onClick={() => setShowDelete(true)}
              className="mt-2 text-[13px] font-bold text-text-muted hover:text-danger transition flex items-center justify-center gap-1.5 py-3"
            >
              <Trash2 size={14} /> 공간 삭제
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
          <div className="max-w-[480px] mx-auto px-5 py-3.5">
            <Link
              href={`/requests/create?space=${space.id}`}
              className="btn btn-primary w-full"
            >
              <Zap size={18} strokeWidth={2.5} />
              이 공간 청소 요청하기
            </Link>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowDelete(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="h-section text-ink">공간 삭제</h3>
              <button onClick={() => setShowDelete(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="t-caption mb-5">정말 이 공간을 삭제할까요? 관련된 요청 내역도 모두 사라집니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="flex-1 btn btn-ghost">유지</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 btn btn-primary !bg-danger">
                {deleting ? <Loader2 size={18} className="animate-spin" /> : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-line-soft p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-text-soft">
        {icon}
        {label}
      </div>
      <div className="t-money text-[15px] text-ink mt-1">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-soft font-semibold shrink-0">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  )
}

function GuideRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-[13.5px] font-semibold text-ink leading-snug mt-0.5">{value}</p>
    </div>
  )
}
