'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SpaceType } from '@/lib/types'
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
import AccessCodesEditor, { makeAccessCode, type AccessCode } from '@/components/common/AccessCodesEditor'
import { makeChecklist, DEFAULT_CHECKLISTS } from '@/lib/checklists'
import { suggestBasePrice } from '@/lib/pricing'
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

type StepId = 1 | 2 | 3 | 4 | 5 | 6
const STEPS: { id: StepId; title: string }[] = [
  { id: 1, title: '공간 유형' },
  { id: 2, title: '위치' },
  { id: 3, title: '기본 정보' },
  { id: 4, title: '출입·현장 안내' },
  { id: 5, title: '체크리스트' },
  { id: 6, title: '사업자 정보' },
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
  // 난이도는 청소 요청 단계에서 매번 선택. 공간 기본가는 '보통' 기준으로 산출.
  const difficulty = '보통' as const

  const [photos, setPhotos] = useState<string[]>([])
  const [referencePhotos, setReferencePhotos] = useState<string[]>([])

  const [toolLocation, setToolLocation] = useState('')
  const [parkingGuide, setParkingGuide] = useState('')
  const [trashGuide, setTrashGuide] = useState('')
  // 출입 보안정보 (공간 단위로 1회 저장 → 매 청소 재사용) — 가변 목록
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([makeAccessCode('출입문', '')])
  const [cautionNotes, setCautionNotes] = useState('') // 주의사항
  const [toiletCount, setToiletCount] = useState(1)
  const [kitchenCount, setKitchenCount] = useState(0)
  const [bedCount, setBedCount] = useState(0)
  const [balconyCount, setBalconyCount] = useState(0)

  const [checklist, setChecklist] = useState<{ id: string; label: string; required: boolean }[]>([])
  const [newItem, setNewItem] = useState('')

  // Biz info (per-space)
  const [bizTypeSel, setBizTypeSel] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
  const [bizRegNumber, setBizRegNumber] = useState('')
  const [bizEmail, setBizEmail] = useState('')
  const [bizRegImage, setBizRegImage] = useState<string[]>([])
  const [vatType, setVatType] = useState<'GENERAL' | 'SIMPLE' | 'EXEMPT'>('SIMPLE')
  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(false)
  const [mailOrderNo, setMailOrderNo] = useState('')

  // 타입 변경 시 체크리스트 초기화
  useEffect(() => {
    if (type && checklist.length === 0) {
      setChecklist(DEFAULT_CHECKLISTS[type].map((it) => ({ id: rid('ck'), ...it })))
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

  // 출입 비밀번호: 라벨+값 모두 채운 항목이 최소 1개 필요
  const hasValidAccessCode = accessCodes.some((c) => c.label.trim() && c.value.trim())

  const canProceed = (() => {
    if (step === 1) return !!type
    if (step === 2) return !!coords && !geoLoading // 지도 핀(좌표) 필수
    if (step === 3) return !!name.trim()
    if (step === 4) return hasValidAccessCode // 출입 방법 1개 이상 필수
    if (step === 5) return checklist.length > 0
    if (step === 6) {
      if (bizTypeSel === 'BUSINESS') {
        // 사업자 운영: 등록번호 + 등록증 사본 필수
        return /^\d{10}$/.test(bizRegNumber.replace(/-/g, '')) && !!bizRegImage[0]
      }
      return true
    }
    return false
  })()

  const handleNext = () => {
    if (!canProceed) return
    if (step === 6) return handleSubmit()
    setStep((s) => (s + 1) as StepId)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const basePrice = suggestBasePrice(type as SpaceType, sizePyeong ? parseFloat(sizePyeong) : null, difficulty)

      // 채워진 출입 비밀번호만 저장 (라벨·값 모두 있는 항목)
      const filledCodes = accessCodes
        .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
        .filter((c) => c.label && c.value)

      // Core payload (columns that definitely exist)
      const corePayload = {
        operator_id: user.id,
        name: name.trim(),
        type,
        address: address.trim(),
        address_detail: addressDetail.trim() || null,
        // 코드베이스 전역에서 location.coordinates(GeoJSON)로 읽으므로 GeoJSON으로 저장
        location: coords ? { type: 'Point', coordinates: [coords.lng, coords.lat] } : null,
        size_pyeong: sizePyeong ? parseFloat(sizePyeong) : null,
        size_sqm: sizeSqm ? Math.round(sizeSqm) : null,
        base_price: basePrice,
        estimated_duration: 90,
        cleaning_tool_location: toolLocation || null,
        parking_guide: parkingGuide || null,
        trash_guide: trashGuide || null,
        entry_code: filledCodes[0]?.value || null, // 하위호환
        checklist_template: checklist.map((c) => ({ ...c, completed: false })),
        photos,
        is_active: true,
      }

      // Extended payload (columns added in later migrations — may not exist on older DBs)
      const extendedPayload = {
        ...corePayload,
        access_codes: filledCodes,
        caution_notes: cautionNotes.trim() || null,
        cleaning_difficulty: difficulty,
        has_toilet: toiletCount > 0,
        has_kitchen: kitchenCount > 0,
        has_bed: bedCount > 0,
        has_balcony: balconyCount > 0,
        toilet_count: toiletCount,
        kitchen_count: kitchenCount,
        bed_count: bedCount,
        balcony_count: balconyCount,
        reference_photos: referencePhotos,
        biz_type: bizTypeSel,
        biz_reg_number: bizTypeSel === 'BUSINESS' ? bizRegNumber.replace(/-/g, '') : null,
        biz_email: bizEmail.trim() || null,
        biz_reg_image: bizRegImage[0] || null,
        vat_type: bizTypeSel === 'BUSINESS' ? vatType : 'EXEMPT',
        tax_invoice_required: bizTypeSel === 'BUSINESS' ? taxInvoiceRequired : false,
      }

      // Try extended first, fall back to core if columns missing
      let result = await supabase.from('spaces').insert(extendedPayload).select('id').single()
      if (result.error && result.error.message?.includes('column')) {
        result = await supabase.from('spaces').insert(corePayload).select('id').single()
      }
      if (result.error) throw result.error

      router.replace(result.data?.id ? `/spaces/${result.data.id}` : '/spaces')
    } catch (e) {
      const raw = (e as any)?.message || (e as any)?.details || (e as any)?.hint || ''
      const isGeometryError = raw.includes('geometry') || raw.includes('parse error') || raw.includes('invalid')
      const msg = isGeometryError
        ? '위치 정보에 문제가 있어요. 지도 핀을 다시 이동하거나 주소를 다시 검색해주세요.'
        : raw || '공간 등록에 실패했습니다.'
      setErr(msg)
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
          {step === 1 && (
            <div>
              <h2 className="h-title text-ink">어떤 공간을 운영하세요?</h2>
              <p className="t-caption mt-1.5">공간 유형에 맞게 체크리스트가 자동 적용됩니다.</p>
              <div className="grid grid-cols-3 gap-2.5 mt-6">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    aria-pressed={type === opt.value}
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
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
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

              {address.trim() && !coords && !geoLoading && (
                <div className="flex items-center gap-2 p-3 bg-sun-soft rounded-xl border border-sun/30">
                  <span className="text-sm">📍</span>
                  <p className="text-[12.5px] font-bold text-ink-soft">검색 버튼을 눌러 위치를 확인하세요. 핀이 틀리면 지도를 눌러 직접 옮길 수 있어요.</p>
                </div>
              )}

              {coords ? (
                <div>
                  <NaverMap
                    height={220}
                    center={coords}
                    markers={[{ lat: coords.lat, lng: coords.lng, title: name || '공간 위치', tone: 'brand' }]}
                    interactive
                    onMapClick={(lat, lng) => setCoords({ lat, lng })}
                  />
                  <p className="text-[11.5px] font-bold text-text-soft mt-2 ml-1 flex items-center gap-1">
                    <MapPin size={12} className="text-brand" /> 핀 위치가 정확하지 않으면 지도를 눌러 옮겨주세요.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-line p-6 text-center">
                  <MapPin size={22} className="mx-auto text-text-faint mb-2" />
                  <p className="text-[12.5px] font-bold text-text-soft">
                    주소를 입력하고 검색하면 지도에 위치가 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">공간 기본 정보</h2>
                <p className="t-caption mt-1.5">클린파트너에게 보여질 정보입니다.</p>
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

              {/* 면적 */}
              <div>
                <label className="t-meta block mb-2 ml-1">평수 <span className="text-text-faint font-normal">(선택)</span></label>
                <div className="relative">
                  <input
                    type="number"
                    value={sizePyeong}
                    onChange={(e) => setSizePyeong(e.target.value)}
                    placeholder="20"
                    className="input pr-10"
                    min={1}
                    inputMode="numeric"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint text-sm font-bold">평</span>
                </div>
                {sizeSqm && <p className="text-[11px] text-text-soft font-bold mt-1 ml-1">≈ {sizeSqm}㎡</p>}
                <p className="text-[11px] text-text-soft font-medium mt-1.5 ml-1 leading-snug">
                  청소 난이도·가격은 <b className="text-brand-dark">청소를 요청할 때마다</b> 면적 기준으로 정하게 돼요.
                </p>
              </div>

              <div>
                <label className="t-meta block mb-2 ml-1">공간 시설 <span className="text-text-faint font-normal">(개수 입력)</span></label>
                <div className="grid grid-cols-2 gap-2.5">
                  <FacilityCounter label="화장실 🚽" count={toiletCount} onChange={setToiletCount} />
                  <FacilityCounter label="주방 🍳" count={kitchenCount} onChange={setKitchenCount} />
                  <FacilityCounter label="침구 🛏️" count={bedCount} onChange={setBedCount} />
                  <FacilityCounter label="발코니 🌿" count={balconyCount} onChange={setBalconyCount} />
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
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">출입·현장 안내</h2>
                <p className="t-caption mt-1.5">클린파트너가 현장에 들어가 작업할 수 있도록 알려주세요.</p>
              </div>

              {/* 출입 비밀번호 — 가변 목록 */}
              <div>
                <label className="t-meta block mb-2 ml-1 flex items-center gap-1">
                  🔑 출입 비밀번호 <span className="text-danger">*</span>
                </label>
                <AccessCodesEditor codes={accessCodes} onChange={setAccessCodes} />
                <p className="text-[11px] text-text-soft font-medium mt-2 ml-1 leading-snug">
                  공동현관·출입문·청소도구함 등 필요한 만큼 추가하세요. 배정된 클린파트너에게만 공개되며 안전하게 보관됩니다.
                </p>
              </div>

              {/* 주의사항 */}
              <div>
                <label className="t-meta block mb-2 ml-1">⚠️ 주의사항 <span className="text-text-faint font-normal">(선택)</span></label>
                <textarea
                  value={cautionNotes}
                  onChange={(e) => setCautionNotes(e.target.value)}
                  placeholder="예) 반려동물 있음, 특정 가구 손대지 말 것, 소음 주의 시간대 등"
                  className="input min-h-[80px]"
                  rows={2}
                />
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
                hint="청소 후 상태 기준 사진입니다. 클린파트너가 참고해요."
              />
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">청소 체크리스트</h2>
                <p className="t-caption mt-1.5">
                  클린파트너가 사진과 함께 체크할 항목입니다.{' '}
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
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">사업자 정보</h2>
                <p className="t-caption mt-1.5">세금계산서·현금영수증 발행 시 필요합니다. 사업자가 아니어도 OK.</p>
              </div>

              <div>
                <label className="t-meta block mb-2 ml-1">이 공간의 운영 형태 *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBizTypeSel('INDIVIDUAL')}
                    className={`rounded-2xl border-2 p-4 text-left transition ${bizTypeSel === 'INDIVIDUAL' ? 'border-brand bg-brand-softer' : 'border-line-soft'}`}
                  >
                    <p className="text-[14px] font-extrabold text-ink">개인 운영</p>
                    <p className="text-[11px] text-text-soft font-bold mt-0.5">비사업자 · 현금영수증만</p>
                  </button>
                  <button
                    onClick={() => setBizTypeSel('BUSINESS')}
                    className={`rounded-2xl border-2 p-4 text-left transition ${bizTypeSel === 'BUSINESS' ? 'border-brand bg-brand-softer' : 'border-line-soft'}`}
                  >
                    <p className="text-[14px] font-extrabold text-ink">사업자 운영</p>
                    <p className="text-[11px] text-text-soft font-bold mt-0.5">세금계산서 발행 가능</p>
                  </button>
                </div>
              </div>

              {bizTypeSel === 'BUSINESS' && (
                <>
                  <div>
                    <label className="t-meta block mb-2 ml-1">사업자등록번호 *</label>
                    <input
                      value={bizRegNumber}
                      onChange={(e) => setBizRegNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="000-00-00000"
                      className="input"
                      inputMode="numeric"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <label className="t-meta block mb-2 ml-1">과세 구분</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['GENERAL', 'SIMPLE', 'EXEMPT'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setVatType(t)}
                          className={`chip !text-[11.5px] !px-2 !py-2 ${vatType === t ? 'chip-brand' : 'chip-muted'}`}
                        >
                          {t === 'GENERAL' ? '일반과세' : t === 'SIMPLE' ? '간이과세' : '면세'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="t-meta block mb-2 ml-1">세금계산서 수신 이메일</label>
                    <input
                      type="email"
                      value={bizEmail}
                      onChange={(e) => setBizEmail(e.target.value)}
                      placeholder="tax@example.com"
                      className="input"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxInvoiceRequired}
                      onChange={(e) => setTaxInvoiceRequired(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#0EA5E9]"
                    />
                    <span className="text-[12.5px] font-semibold text-ink-soft leading-snug">
                      거래 시 <b>세금계산서 자동 발행</b> 요청
                    </span>
                  </label>
                  <ImageUploader
                    bucket="docs"
                    folder="biz"
                    value={bizRegImage}
                    onChange={setBizRegImage}
                    max={1}
                    label="사업자등록증 사본 *"
                    hint="세금계산서 발행·정산을 위해 필수입니다. 사진 또는 PDF 캡처를 올려주세요."
                  />
                  {!bizRegImage[0] && (
                    <p className="text-[12px] font-bold text-danger ml-1 -mt-2">
                      사업자 운영은 사업자등록증 사본 등록이 필요합니다.
                    </p>
                  )}
                </>
              )}

              {/* 통신판매업 신고번호 — 전자상거래법 제12조 */}
              <div>
                <label className="t-meta block mb-1 ml-1 flex items-center gap-1.5">
                  통신판매업 신고번호
                  <span className="text-[10px] font-bold text-sun bg-sun/10 px-1.5 py-0.5 rounded-full">전자상거래법 표시 의무</span>
                </label>
                <input
                  value={mailOrderNo}
                  onChange={(e) => setMailOrderNo(e.target.value)}
                  placeholder="제2026-서울마포-XXXX호"
                  className="input"
                />
                <p className="text-[11px] text-text-soft font-medium mt-1 ml-1 leading-snug">
                  전자상거래법 제12조에 따라 온라인 중개 거래 시 신고번호를 표시해야 합니다.
                  아직 신고 전이라면 신고 후 설정에서 추가할 수 있습니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-info-soft border border-info/15 flex items-start gap-2.5">
                <Info size={16} className="text-info shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-ink-soft font-semibold leading-snug">
                  입력한 정보는 결제·정산 시 자동 적용되며, 세무 처리 외에는 사용되지 않습니다.
                </div>
              </div>
            </div>
          )}

        {err && (
          <div
            ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="mt-4 p-3.5 bg-danger-soft rounded-xl border border-danger/20 flex items-start gap-2.5"
          >
            <span className="text-danger text-base shrink-0">⚠️</span>
            <p className="text-[13px] font-bold text-danger leading-snug">{err}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5 flex flex-col gap-2">
          {!canProceed && !loading && (() => {
            const hint =
              step === 1 ? '공간 유형을 선택해주세요.' :
              step === 2 ? '주소를 입력하고 검색 버튼을 눌러 위치를 확인해주세요.' :
              step === 3 ? '공간 이름을 입력해주세요.' :
              step === 4 ? '출입 비밀번호를 하나 이상 입력해주세요.' :
              step === 5 ? '체크리스트 항목을 하나 이상 추가해주세요.' :
              step === 6 && bizTypeSel === 'BUSINESS' ? '사업자등록번호와 사업자등록증 사본을 입력해주세요.' :
              null
            return hint ? (
              <p className="text-[12px] font-bold text-text-soft text-center">{hint}</p>
            ) : null
          })()}
          <button onClick={handleNext} disabled={!canProceed || loading} className="btn btn-primary w-full">
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === STEPS.length ? (
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

function FacilityCounter({ label, count, onChange }: { label: string; count: number; onChange: (n: number) => void }) {
  const active = count > 0
  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl border-2 transition ${active ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}>
      <span className={`text-[13px] font-extrabold ${active ? 'text-brand-dark' : 'text-text-soft'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          className="w-7 h-7 rounded-full bg-surface border border-line-soft flex items-center justify-center text-ink font-black text-[16px] active:scale-90 transition"
        >−</button>
        <span className={`w-5 text-center text-[15px] font-black tabular-nums ${active ? 'text-brand-dark' : 'text-text-faint'}`}>{count}</span>
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-black text-[16px] active:scale-90 transition"
        >+</button>
      </div>
    </div>
  )
}
