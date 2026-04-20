'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SpaceType } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Check,
  Plus,
  X,
  Info,
  Search,
} from 'lucide-react'
import ImageUploader from '@/components/common/ImageUploader'
import NaverMap from '@/components/common/NaverMap'
import { makeChecklist, DEFAULT_CHECKLISTS } from '@/lib/checklists'
import { BASE_PRICE_BY_TYPE } from '@/lib/pricing'
import { spaceTypeLabel, rid } from '@/lib/utils'
import { geocode } from '@/lib/naver'

const TYPE_OPTIONS: { value: SpaceType; icon: string }[] = [
  { value: 'airbnb', icon: '🏠' },
  { value: 'partyroom', icon: '🎉' },
  { value: 'studio', icon: '📸' },
  { value: 'unmanned_store', icon: '🏪' },
  { value: 'study_cafe', icon: '📚' },
  { value: 'practice_room', icon: '🎤' },
  { value: 'gym', icon: '🏋️' },
  { value: 'workspace', icon: '💼' },
  { value: 'other', icon: '📦' },
]

type StepId = 1 | 2 | 3 | 4 | 5
const STEPS: { id: StepId; title: string }[] = [
  { id: 1, title: '공간 유형' },
  { id: 2, title: '위치' },
  { id: 3, title: '기본 정보' },
  { id: 4, title: '청소 안내' },
  { id: 5, title: '체크리스트' },
]

export default function CreateSpacePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<StepId>(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [type, setType] = useState<SpaceType | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [sizePyeong, setSizePyeong] = useState<string>('')
  const [basePrice, setBasePrice] = useState<number>(30000)

  const [photos, setPhotos] = useState<string[]>([])
  const [referencePhotos, setReferencePhotos] = useState<string[]>([])

  const [toolLocation, setToolLocation] = useState('')
  const [parkingGuide, setParkingGuide] = useState('')
  const [trashGuide, setTrashGuide] = useState('')
  const [hasToilet, setHasToilet] = useState(true)
  const [hasKitchen, setHasKitchen] = useState(false)
  const [hasBed, setHasBed] = useState(false)
  const [hasBalcony, setHasBalcony] = useState(false)

  const [checklist, setChecklist] = useState<{ id: string; label: string; required: boolean }[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    if (type) {
      setBasePrice(BASE_PRICE_BY_TYPE[type] ?? 30000)
      if (checklist.length === 0) {
        setChecklist(DEFAULT_CHECKLISTS[type].map((it) => ({ id: rid('ck'), ...it })))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const handleGeocode = async () => {
    if (!address.trim()) return
    setGeoLoading(true)
    const result = await geocode(address.trim())
    if (result) setCoords({ lat: result.lat, lng: result.lng })
    setGeoLoading(false)
  }

  const sizeSqm = sizePyeong ? Math.round(parseFloat(sizePyeong) * 3.3 * 10) / 10 : undefined

  const canProceed = (() => {
    if (step === 1) return !!type
    if (step === 2) return !!address.trim()
    if (step === 3) return !!name.trim()
    if (step === 4) return true
    if (step === 5) return checklist.length > 0
    return false
  })()

  const handleNext = () => {
    if (!canProceed) return
    if (step === 5) return handleSubmit()
    setStep((s) => (s + 1) as StepId)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const payload = {
        operator_id: user.id,
        name: name.trim(),
        type,
        address: address.trim(),
        address_detail: addressDetail.trim() || null,
        location: coords
          ? { type: 'Point', coordinates: [coords.lng, coords.lat] }
          : null,
        size_pyeong: sizePyeong ? parseFloat(sizePyeong) : null,
        size_sqm: sizeSqm ?? null,
        base_price: basePrice,
        estimated_duration: 90,
        cleaning_difficulty: 'NORMAL',
        cleaning_tool_location: toolLocation || null,
        parking_guide: parkingGuide || null,
        trash_guide: trashGuide || null,
        has_toilet: hasToilet,
        has_kitchen: hasKitchen,
        has_bed: hasBed,
        has_balcony: hasBalcony,
        checklist_template: checklist.map((c) => ({ ...c, completed: false })),
        photos,
        reference_photos: referencePhotos,
        is_active: true,
      }

      const { data, error } = await supabase.from('spaces').insert(payload).select('id').single()
      if (error) throw error

      router.replace(data?.id ? `/spaces/${data.id}` : '/spaces')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '공간 등록에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button
          onClick={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as StepId))}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-muted active:scale-95 transition"
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[15px] font-extrabold text-ink">공간 등록</h1>
          <p className="text-[11px] text-text-soft font-bold">
            {step}/{STEPS.length} · {STEPS[step - 1].title}
          </p>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-5 pt-4 pb-1 bg-surface">
        <div className="flex gap-1.5">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex-1 h-1.5 rounded-full ${s.id <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-5 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="h-title text-ink">어떤 공간을 운영하세요?</h2>
              <p className="t-caption mt-1.5">공간 유형에 맞게 체크리스트 · 기본 가격이 자동 설정됩니다.</p>
              <div className="grid grid-cols-3 gap-2.5 mt-6">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center text-center p-2 transition ${
                      type === opt.value ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span className="text-[28px] mb-1" style={{ lineHeight: 1 }}>{opt.icon}</span>
                    <span className={`text-[11.5px] font-extrabold leading-tight ${type === opt.value ? 'text-brand-dark' : 'text-ink'}`}>
                      {spaceTypeLabel(opt.value)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">공간이 어디 있나요?</h2>
                <p className="t-caption mt-1.5">지도에 표시될 위치입니다.</p>
              </div>
              <div>
                <label className="t-meta block mb-2 ml-1">도로명 주소 *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="서울 마포구 홍익로 XX"
                      className="input pl-11"
                      onBlur={handleGeocode}
                    />
                  </div>
                  <button
                    onClick={handleGeocode}
                    disabled={!address.trim() || geoLoading}
                    className="btn btn-secondary !min-h-[56px] !px-4"
                    aria-label="주소 확인"
                  >
                    {geoLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="t-meta block mb-2 ml-1">상세 주소</label>
                <input
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="2층 201호"
                  className="input"
                />
              </div>

              {coords ? (
                <NaverMap
                  height={200}
                  center={coords}
                  markers={[{ lat: coords.lat, lng: coords.lng, title: name || '공간 위치', tone: 'brand' }]}
                  interactive={false}
                />
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-line p-6 text-center">
                  <MapPin size={22} className="mx-auto text-text-faint mb-2" />
                  <p className="text-[12.5px] font-bold text-text-soft">
                    주소를 입력하면 지도에 위치가 표시됩니다.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">공간 기본 정보</h2>
                <p className="t-caption mt-1.5">작업자에게 보여질 정보입니다.</p>
              </div>

              <div>
                <label className="t-meta block mb-2 ml-1">공간 이름 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예) 홍대 파티룸 A호"
                  className="input"
                  maxLength={40}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-meta block mb-2 ml-1">평수</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sizePyeong}
                      onChange={(e) => setSizePyeong(e.target.value)}
                      placeholder="15"
                      className="input pr-10"
                      min={1}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint text-sm font-bold">평</span>
                  </div>
                  {sizeSqm && <p className="text-[11px] text-text-soft font-bold mt-1 ml-1">≈ {sizeSqm}㎡</p>}
                </div>
                <div>
                  <label className="t-meta block mb-2 ml-1">기본 가격</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseInt(e.target.value) || 0)}
                      className="input pr-10"
                      step={1000}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint text-sm font-bold">원</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="t-meta block mb-2 ml-1">공간 시설</label>
                <div className="flex flex-wrap gap-2">
                  <FacilityChip selected={hasToilet} onClick={() => setHasToilet((v) => !v)} label="화장실" />
                  <FacilityChip selected={hasKitchen} onClick={() => setHasKitchen((v) => !v)} label="주방" />
                  <FacilityChip selected={hasBed} onClick={() => setHasBed((v) => !v)} label="침구" />
                  <FacilityChip selected={hasBalcony} onClick={() => setHasBalcony((v) => !v)} label="발코니" />
                </div>
              </div>

              <ImageUploader
                bucket="spaces"
                folder="photos"
                value={photos}
                onChange={setPhotos}
                max={6}
                label="공간 사진 (최대 6장)"
                hint="밝고 깨끗한 사진이 매칭 확률을 높여요."
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">작업자에게 안내할 내용</h2>
                <p className="t-caption mt-1.5">상세한 안내는 작업 품질을 높여줍니다.</p>
              </div>

              <div>
                <label className="t-meta block mb-2 ml-1">청소도구 위치</label>
                <textarea
                  value={toolLocation}
                  onChange={(e) => setToolLocation(e.target.value)}
                  placeholder="현관 신발장 아래 청소함"
                  className="input min-h-[80px]"
                  rows={2}
                />
              </div>
              <div>
                <label className="t-meta block mb-2 ml-1">주차 안내</label>
                <textarea
                  value={parkingGuide}
                  onChange={(e) => setParkingGuide(e.target.value)}
                  placeholder="건물 지하 1층 주차장 (10분 무료)"
                  className="input min-h-[80px]"
                  rows={2}
                />
              </div>
              <div>
                <label className="t-meta block mb-2 ml-1">쓰레기 분리 안내</label>
                <textarea
                  value={trashGuide}
                  onChange={(e) => setTrashGuide(e.target.value)}
                  placeholder="일반쓰레기는 공용 쓰레기장, 음식물은 별도 수거함"
                  className="input min-h-[80px]"
                  rows={2}
                />
              </div>

              <ImageUploader
                bucket="spaces"
                folder="reference"
                value={referencePhotos}
                onChange={setReferencePhotos}
                max={4}
                label="참고 사진 - 완료 예시 (선택)"
                hint="청소 후 상태 기준 사진입니다. 작업자가 참고해요."
              />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">청소 체크리스트</h2>
                <p className="t-caption mt-1.5">
                  작업자가 사진과 함께 체크할 항목입니다.{' '}
                  {type && <span className="font-bold text-brand-dark">· {spaceTypeLabel(type)} 템플릿 적용됨</span>}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="card p-3.5 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-brand-softer text-brand-dark font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setChecklist((list) =>
                          list.map((c) => (c.id === item.id ? { ...c, label: e.target.value } : c)),
                        )
                      }
                      className="flex-1 bg-transparent outline-none text-[14px] font-semibold text-ink"
                    />
                    <button
                      onClick={() =>
                        setChecklist((list) =>
                          list.map((c) => (c.id === item.id ? { ...c, required: !c.required } : c)),
                        )
                      }
                      className={`chip ${item.required ? 'chip-brand' : 'chip-muted'} !text-[10px] px-2 py-0.5`}
                    >
                      {item.required ? '필수' : '선택'}
                    </button>
                    <button
                      onClick={() => setChecklist((list) => list.filter((c) => c.id !== item.id))}
                      className="text-text-faint hover:text-danger transition p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 mt-1">
                  <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="항목 추가"
                    className="input flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItem.trim()) {
                        setChecklist((list) => [
                          ...list,
                          { id: rid('ck'), label: newItem.trim(), required: false },
                        ])
                        setNewItem('')
                      }
                    }}
                  />
                  <button
                    disabled={!newItem.trim()}
                    onClick={() => {
                      setChecklist((list) => [
                        ...list,
                        { id: rid('ck'), label: newItem.trim(), required: false },
                      ])
                      setNewItem('')
                    }}
                    className="btn btn-secondary min-h-[56px] px-5"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-2 p-4 rounded-2xl bg-info-soft border border-info/15">
                <div className="flex items-start gap-2.5">
                  <Info size={16} className="text-info shrink-0 mt-0.5" />
                  <div className="text-[12.5px] text-ink-soft font-semibold leading-snug">
                    필수 항목은 사진 인증이 필요합니다. AI가 체크리스트 이행 여부를 자동 검증해요.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {err && <div className="mt-4 p-3 bg-danger-soft rounded-xl text-[13px] font-bold text-danger">{err}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={handleNext} disabled={!canProceed || loading} className="btn btn-primary w-full">
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === 5 ? (
              <>공간 등록 완료 <Check size={20} /></>
            ) : (
              <>다음 <ChevronRight size={20} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function FacilityChip({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`chip ${selected ? 'chip-brand' : 'chip-muted'} !px-4 !py-2 !text-[13px] border-2 ${
        selected ? 'border-brand/30' : 'border-transparent'
      }`}
    >
      {label}
    </button>
  )
}
