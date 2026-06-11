'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Check, Loader2, MapPin, Search } from 'lucide-react'
import ImageUploader from '@/components/common/ImageUploader'
import NaverMap from '@/components/common/NaverMap'
import AccessCodesEditor, { makeAccessCode, type AccessCode } from '@/components/common/AccessCodesEditor'
import { geocode } from '@/lib/naver'
import { spaceTypeLabel } from '@/lib/utils'
import { parseLocation, toEwkt } from '@/lib/geo'
import type { SpaceType } from '@/lib/types'

export default function EditSpacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [type, setType] = useState<SpaceType>('other')
  const [basePrice, setBasePrice] = useState(30000)
  const [sizePyeong, setSizePyeong] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [referencePhotos, setReferencePhotos] = useState<string[]>([])
  const [accessGuide, setAccessGuide] = useState('')
  const [toolLocation, setToolLocation] = useState('')
  const [parkingGuide, setParkingGuide] = useState('')
  const [trashGuide, setTrashGuide] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [cautionNotes, setCautionNotes] = useState('')
  const [icalUrl, setIcalUrl] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('spaces').select('*').eq('id', id).single()
      if (!data) {
        router.replace('/spaces')
        return
      }
      setName(data.name || '')
      setAddress(data.address || '')
      setAddressDetail(data.address_detail || '')
      setType(data.type)
      setBasePrice(data.base_price)
      setSizePyeong(data.size_pyeong?.toString() || '')
      setPhotos(data.photos || [])
      setReferencePhotos(data.reference_photos || [])
      setAccessGuide(data.access_guide || '')
      setToolLocation(data.cleaning_tool_location || '')
      setParkingGuide(data.parking_guide || '')
      setTrashGuide(data.trash_guide || '')
      setCautionNotes(data.caution_notes || '')
      setIcalUrl(data.ical_url || '')
      // access_codes(신규) 우선, 없으면 기존 entry_code를 '출입문' 한 줄로 변환
      const loaded: AccessCode[] = Array.isArray(data.access_codes) && data.access_codes.length > 0
        ? data.access_codes.map((c: any) => makeAccessCode(c.label || '출입문', c.value || ''))
        : data.entry_code
          ? [makeAccessCode('출입문', data.entry_code)]
          : [makeAccessCode('출입문', '')]
      setAccessCodes(loaded)
      const parsedLoc = parseLocation(data.location)
      if (parsedLoc) {
        setCoords(parsedLoc)
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGeocode = async () => {
    if (!address.trim()) return
    setGeoLoading(true)
    const r = await geocode(address.trim())
    if (r) setCoords({ lat: r.lat, lng: r.lng })
    setGeoLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      const filledCodes = accessCodes
        .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
        .filter((c) => c.label && c.value)

      const basePayload = {
        name: name.trim(),
        address: address.trim(),
        address_detail: addressDetail.trim() || null,
        type,
        base_price: basePrice,
        size_pyeong: sizePyeong ? parseFloat(sizePyeong) : null,
        size_sqm: sizePyeong ? Math.round(parseFloat(sizePyeong) * 3.3 * 10) / 10 : null,
        photos,
        reference_photos: referencePhotos,
        access_guide: accessGuide || null,
        cleaning_tool_location: toolLocation || null,
        parking_guide: parkingGuide || null,
        trash_guide: trashGuide || null,
        entry_code: filledCodes[0]?.value || null,
        location: coords ? toEwkt(coords.lat, coords.lng) : null,
      }
      // access_codes / caution_notes 컬럼 미존재 DB 대비 fallback
      let { error } = await supabase
        .from('spaces')
        .update({ ...basePayload, access_codes: filledCodes, caution_notes: cautionNotes.trim() || null, ical_url: icalUrl.trim() || null })
        .eq('id', id)
      if (error && error.message?.includes('column')) {
        ;({ error } = await supabase.from('spaces').update(basePayload).eq('id', id))
      }
      if (error) throw error
      router.replace(`/spaces/${id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-extrabold text-ink">공간 수정</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-5 pb-28 flex flex-col gap-5">
        <div>
          <label className="t-meta block mb-2 ml-1">공간 이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={40} />
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">공간 유형</label>
          <select value={type} onChange={(e) => setType(e.target.value as SpaceType)} className="input">
            {(['airbnb', 'partyroom', 'studio', 'unmanned_store', 'study_cafe', 'practice_room', 'gym', 'workspace', 'other'] as SpaceType[]).map((t) => (
              <option key={t} value={t}>{spaceTypeLabel(t)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="t-meta block mb-2 ml-1">도로명 주소</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="input pl-11" onBlur={handleGeocode} />
            </div>
            <button onClick={handleGeocode} className="btn btn-secondary !min-h-[56px] !px-4">
              {geoLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label className="t-meta block mb-2 ml-1">상세 주소</label>
          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} className="input" />
        </div>

        <div>
          <label htmlFor="edit-ical" className="t-meta block mb-2 ml-1">예약 캘린더 연동 (선택)</label>
          <input
            id="edit-ical"
            type="url"
            inputMode="url"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.co.kr/calendar/ical/…ics"
            className="input"
          />
          <p className="text-[13.5px] text-text-soft font-medium mt-1.5 ml-1 leading-snug">
            에어비앤비 앱 → 달력 → 설정 → 캘린더 내보내기 주소. 등록하면 청소 요청 시 체크아웃 일정이 표시돼요.
          </p>
        </div>
        {coords && (
          <div>
            <NaverMap
              height={180}
              center={coords}
              markers={[{ lat: coords.lat, lng: coords.lng, title: name, tone: 'brand' }]}
              interactive
              onMapClick={(lat, lng) => setCoords({ lat, lng })}
            />
            <p className="text-[13.5px] font-bold text-text-soft mt-1.5 ml-1">📍 핀이 틀리면 지도를 눌러 옮겨주세요.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="t-meta block mb-2 ml-1">평수</label>
            <input type="number" value={sizePyeong} onChange={(e) => setSizePyeong(e.target.value)} className="input" />
          </div>
          <div>
            <label className="t-meta block mb-2 ml-1">기본 가격</label>
            <input type="number" step={1000} value={basePrice} onChange={(e) => setBasePrice(parseInt(e.target.value) || 0)} className="input" />
          </div>
        </div>

        {/* 출입 비밀번호 */}
        <div>
          <label className="t-meta block mb-2 ml-1">🔑 출입 비밀번호</label>
          <AccessCodesEditor codes={accessCodes} onChange={setAccessCodes} />
        </div>

        {/* 주의사항 */}
        <div>
          <label className="t-meta block mb-2 ml-1">⚠️ 주의사항</label>
          <textarea value={cautionNotes} onChange={(e) => setCautionNotes(e.target.value)} className="input min-h-[80px]" rows={2} placeholder="예) 반려동물 있음, 특정 가구 손대지 말 것 등" />
        </div>

        <ImageUploader bucket="spaces" folder="photos" value={photos} onChange={setPhotos} max={6} label="공간 사진" />
        <ImageUploader bucket="spaces" folder="reference" value={referencePhotos} onChange={setReferencePhotos} max={4} label="참고 사진 (완료 예시)" />

        <div>
          <label className="t-meta block mb-2 ml-1">🚶 현장 진입 방법 <span className="text-text-faint font-normal">(선택)</span></label>
          <textarea
            value={accessGuide}
            onChange={(e) => setAccessGuide(e.target.value)}
            className="input min-h-[100px]"
            rows={3}
            placeholder={"예) 주차장 왼쪽 계단으로 올라오시면 입구가 있습니다.\n7층에서 내리신 후 오른쪽 계단으로 한 층 더 올라오세요."}
          />
          <p className="text-[13px] text-text-faint font-medium mt-1.5 ml-1">
            출발 전·도착 시 클린파트너에게 자동 표시됩니다.
          </p>
        </div>
        <div>
          <label className="t-meta block mb-2 ml-1">청소도구 위치</label>
          <textarea value={toolLocation} onChange={(e) => setToolLocation(e.target.value)} className="input min-h-[80px]" rows={2} />
        </div>
        <div>
          <label className="t-meta block mb-2 ml-1">주차 안내</label>
          <textarea value={parkingGuide} onChange={(e) => setParkingGuide(e.target.value)} className="input min-h-[80px]" rows={2} />
        </div>
        <div>
          <label className="t-meta block mb-2 ml-1">쓰레기 분리</label>
          <textarea value={trashGuide} onChange={(e) => setTrashGuide(e.target.value)} className="input min-h-[80px]" rows={2} />
        </div>

        {err && <div className="p-3 bg-danger-soft rounded-xl text-[15px] font-bold text-danger">{err}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>저장 <Check size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
