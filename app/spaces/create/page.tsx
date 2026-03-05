'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SpaceType } from '@/lib/types'

const SPACE_TYPES: { value: SpaceType; label: string; icon: string }[] = [
    { value: 'airbnb', label: '에어비앤비', icon: '🏠' },
    { value: 'partyroom', label: '파티룸', icon: '🎉' },
    { value: 'studio', label: '스튜디오', icon: '📸' },
    { value: 'gym', label: '헬스장', icon: '💪' },
    { value: 'unmanned_store', label: '무인매장', icon: '🏪' },
    { value: 'study_cafe', label: '스터디카페', icon: '📚' },
    { value: 'practice_room', label: '연습실', icon: '🎤' },
    { value: 'workspace', label: '작업실', icon: '🎨' },
    { value: 'other', label: '기타', icon: '🏢' },
]

const DEFAULT_CHECKLISTS: Record<string, { id: string; label: string; required: boolean }[]> = {
    airbnb: [
        { id: '1', label: '침구 교체 및 정리', required: true },
        { id: '2', label: '화장실 청소 (변기·세면대·샤워기)', required: true },
        { id: '3', label: '주방 설거지 및 싱크대 닦기', required: true },
        { id: '4', label: '바닥 청소기 + 걸레질', required: true },
        { id: '5', label: '쓰레기 분리수거', required: true },
        { id: '6', label: '어메니티 보충', required: false },
        { id: '7', label: '냉장고 정리', required: false },
    ],
    partyroom: [
        { id: '1', label: '쓰레기 전체 수거', required: true },
        { id: '2', label: '테이블·의자 닦기', required: true },
        { id: '3', label: '바닥 청소기 + 걸레질', required: true },
        { id: '4', label: '화장실 청소', required: true },
        { id: '5', label: '주방 설거지', required: true },
        { id: '6', label: '파손 여부 점검 사진 촬영', required: true },
        { id: '7', label: '환기', required: false },
    ],
    studio: [
        { id: '1', label: '바닥 청소 (먼지·머리카락)', required: true },
        { id: '2', label: '거울·유리 닦기', required: true },
        { id: '3', label: '화장실 청소', required: true },
        { id: '4', label: '쓰레기 수거', required: true },
        { id: '5', label: '소품 제자리 정리', required: false },
    ],
    practice_room: [
        { id: '1', label: '바닥 머리카락/먼지 제거 (거울 앞 집중)', required: true },
        { id: '2', label: '전면 거울 지문 닦기', required: true },
        { id: '3', label: '방음문/손잡이 소독', required: false },
        { id: '4', label: '쓰레기 수거 및 환기', required: true },
    ],
    workspace: [
        { id: '1', label: '데스크 및 의자 정돈/닦기', required: true },
        { id: '2', label: '바닥 청소 및 전선 정리', required: true },
        { id: '3', label: '분리수거 및 쓰레기 수거', required: true },
        { id: '4', label: '공용 탕비실/화장실 닦기', required: true },
    ],
}

export default function CreateSpacePage() {
    const router = useRouter()
    const [form, setForm] = useState({
        name: '',
        type: 'airbnb' as SpaceType,
        address: '',
        address_detail: '',
        entry_code: '',
        cleaning_tool_location: '',
        parking_guide: '',
        trash_guide: '',
        caution_notes: '',
        size_sqm: '',
        base_price: '30000',
        estimated_duration: '60',
        description: '',
        is_parking_available: false,
        cleaning_difficulty: '보통',
        biz_type: 'INDIVIDUAL' as 'BUSINESS' | 'INDIVIDUAL',
        biz_reg_number: '',
        biz_email: '',
        cash_receipt_number: '',
    })
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLISTS['airbnb'])
    const [referencePhotos, setReferencePhotos] = useState<File[]>([])
    const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
    const [bizRegPhoto, setBizRegPhoto] = useState<File | null>(null)
    const [bizRegPhotoUrl, setBizRegPhotoUrl] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: 기본정보, 2: 가이드, 3: 체크리스트, 4: 정산정보

    const [mapLocation, setMapLocation] = useState<{ lat: number, lng: number } | null>(null)
    const mapRef = useRef<HTMLDivElement>(null)

    // AI 단가 계산 공식 (시급 15000원 + 10평당 2000원) * 난이도 가중치
    const calculateRecommendedPrice = () => {
        const duration = parseInt(form.estimated_duration) || 60
        const sqm = parseInt(form.size_sqm) || 30
        const diffRate = form.cleaning_difficulty === '특수' ? 1.5 : form.cleaning_difficulty === '어려움' ? 1.2 : form.cleaning_difficulty === '쉬움' ? 0.9 : 1.0

        const hourlyBase = 15000 * (duration / 60)
        const sizeBase = (sqm / 33) * 2000 // 33sqm ~= 10평

        const rawPrice = (hourlyBase + sizeBase) * diffRate
        return Math.round(rawPrice / 1000) * 1000 // 1000원 단위 반올림
    }
    const recommendedPrice = calculateRecommendedPrice()

    const handleTypeChange = (type: SpaceType) => {
        setForm(f => ({ ...f, type }))
        setChecklist(DEFAULT_CHECKLISTS[type] || DEFAULT_CHECKLISTS['airbnb'])
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)
        setReferencePhotos(prev => [...prev, ...files])

        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => setPhotoPreviewUrls(prev => [...prev, e.target?.result as string])
            reader.readAsDataURL(file)
        })
    }

    const removePhoto = (index: number) => {
        setReferencePhotos(prev => prev.filter((_, i) => i !== index))
        setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index))
    }

    const handleAddressCheck = async () => {
        if (!form.address) return alert('주소를 먼저 입력해주세요.')
        try {
            const naver = (window as any).naver
            if (naver && naver.maps && naver.maps.Service) {
                naver.maps.Service.geocode({ query: form.address }, (status: any, response: any) => {
                    if (status === naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                        const lat = parseFloat(response.v2.addresses[0].y)
                        const lng = parseFloat(response.v2.addresses[0].x)
                        setMapLocation({ lat, lng })

                        setTimeout(() => {
                            if (mapRef.current) {
                                const map = new naver.maps.Map(mapRef.current, { center: new naver.maps.LatLng(lat, lng), zoom: 16 })
                                new naver.maps.Marker({ position: new naver.maps.LatLng(lat, lng), map })
                            }
                        }, 100)
                    } else {
                        alert('정확한 주소를 찾을 수 없습니다. 도로명 주소로 다시 시도해보세요.')
                    }
                })
            }
        } catch (e) { console.error('Geocoding failed', e) }
    }

    const handleBizRegPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return
        const file = e.target.files[0]
        setBizRegPhoto(file)
        const reader = new FileReader()
        reader.onload = (e) => setBizRegPhotoUrl(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.address) return
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        // 사진 업로드
        const uploadedPhotoUrls: string[] = []
        for (const file of referencePhotos) {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
            const filePath = `${user.id}/${fileName}`
            const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file)
            if (!uploadError) {
                uploadedPhotoUrls.push(filePath)
            }
        }

        // 사업자등록증 첨부
        let uploadedBizRegUrl = null
        if (bizRegPhoto) {
            const fileExt = bizRegPhoto.name.split('.').pop()
            const fileName = `biz_${Date.now()}_${Math.random()}.${fileExt}`
            const filePath = `${user.id}/${fileName}`
            const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, bizRegPhoto)
            if (!uploadError) {
                uploadedBizRegUrl = filePath
            }
        }

        const { data, error } = await supabase.from('spaces').insert({
            operator_id: user.id,
            name: form.name,
            type: form.type,
            address: form.address,
            address_detail: form.address_detail,
            entry_code: form.entry_code,
            cleaning_tool_location: form.cleaning_tool_location,
            parking_guide: form.parking_guide,
            trash_guide: form.trash_guide,
            caution_notes: form.caution_notes,
            size_sqm: form.size_sqm ? parseInt(form.size_sqm) : null,
            base_price: parseInt(form.base_price),
            estimated_duration: parseInt(form.estimated_duration),
            description: form.description,
            is_parking_available: form.is_parking_available,
            cleaning_difficulty: form.cleaning_difficulty,
            checklist_template: checklist,
            reference_photos: uploadedPhotoUrls,
            is_active: true,
            biz_type: form.biz_type,
            biz_reg_number: form.biz_type === 'BUSINESS' ? form.biz_reg_number : null,
            biz_email: form.biz_type === 'BUSINESS' ? form.biz_email : null,
            biz_reg_image: form.biz_type === 'BUSINESS' ? uploadedBizRegUrl : null,
            cash_receipt_number: form.biz_type === 'INDIVIDUAL' ? form.cash_receipt_number : null,
            lat: mapLocation?.lat || null,
            lng: mapLocation?.lng || null
        }).select().single()

        if (!error && data) {
            router.push(`/spaces/${data.id}?created=1`)
        } else {
            alert('공간 등록에 실패했어요. 다시 시도해주세요.')
            setLoading(false)
        }
    }

    return (
        <div className="page-container">
            {/* 헤더 */}
            <header className="form-header">
                <button onClick={() => step === 1 ? router.back() : setStep(1)} className="back-btn">←</button>
                <h1 className="form-title">{step === 1 ? '공간 등록' : '체크리스트 설정'}</h1>
                <div style={{ width: 40 }} />
            </header>

            {/* 진행률 */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
            </div>

            <div className="page-content">
                {step === 1 && (
                    <>
                        {/* 공간 유형 */}
                        <div className="form-group">
                            <label className="form-label">공간 유형 *</label>
                            <div className="type-grid">
                                {SPACE_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        className={`type-btn ${form.type === t.value ? 'selected' : ''}`}
                                        onClick={() => handleTypeChange(t.value)}
                                        id={`type-${t.value}`}
                                    >
                                        <span className="type-icon">{t.icon}</span>
                                        <span className="type-label">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 공간명 */}
                        <div className="form-group">
                            <label className="form-label">공간 이름 *</label>
                            <input className="form-input" placeholder="예: 합정 파티룸 A호"
                                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={50} />
                        </div>

                        {/* 주소 */}
                        <div className="form-group">
                            <label className="form-label">주소 *</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" placeholder="예: 서울 마포구 합정동 123-4"
                                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                                <button className="btn btn-secondary" style={{ flexShrink: 0, width: 100 }} onClick={handleAddressCheck}>지도 확인</button>
                            </div>
                            <input className="form-input mt-sm" placeholder="상세주소 (동·호수 등)"
                                value={form.address_detail} onChange={e => setForm(f => ({ ...f, address_detail: e.target.value }))} />
                        </div>

                        {/* 지도 미리보기 영역 */}
                        <div
                            ref={mapRef}
                            style={{
                                width: '100%',
                                height: mapLocation ? 200 : 0,
                                borderRadius: 16,
                                marginTop: mapLocation ? 8 : 0,
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}
                        />

                        {/* 규모 & 난이도 */}
                        <div className="form-group mt-xl">
                            <label className="form-label">면적 (㎡) *</label>
                            <input className="form-input" type="number" placeholder="예: 50 (약 15평)"
                                value={form.size_sqm} onChange={e => setForm(f => ({ ...f, size_sqm: e.target.value }))} />
                            {form.size_sqm && <p className="form-hint" style={{ color: 'var(--color-primary)' }}>💡 환산 시 약 {Math.round(parseInt(form.size_sqm) * 0.3025)}평</p>}
                        </div>

                        <div className="form-row mt-md">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">예상 소요 시간 (분)</label>
                                <input className="form-input" type="number" placeholder="60"
                                    value={form.estimated_duration} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">청소 난이도</label>
                                <select className="form-input" value={form.cleaning_difficulty} onChange={e => setForm(f => ({ ...f, cleaning_difficulty: e.target.value }))}>
                                    <option value="쉬움">쉬움</option>
                                    <option value="보통">보통 (일반 퇴실)</option>
                                    <option value="어려움">어려움 (넓은 공간/세밀함)</option>
                                    <option value="특수">🚨 특수 (파티룸 야간/대형 쓰레기 - 단가 1.5배)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">기본 청소 단가 (원)</label>
                            <input className="form-input" type="number" placeholder="30000"
                                value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />

                            <div style={{ marginTop: 8, padding: '10px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>✨ AI 스마트 추천 단가</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>면적, 소요시간, 난이도 기반 산출</div>
                                </div>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: '#0284C7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}
                                    onClick={() => setForm(f => ({ ...f, base_price: recommendedPrice.toString() }))}
                                >
                                    {recommendedPrice.toLocaleString()}원 적용
                                </button>
                            </div>

                            <p className="form-hint mt-xs">클린파트너 기준 단가입니다. 예약 결제 시 플랫폼 수수료 10%가 추가됩니다.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">공간 설명 (선택)</label>
                            <textarea className="form-input" placeholder="특이사항, 주차 정보, 주의사항 등을 입력하세요"
                                rows={3} value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={() => setStep(2)}
                            disabled={!form.name || !form.address}
                        >
                            다음: 현장 가이드 작성 →
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        {/* 출입 정보 */}
                        <div className="form-group">
                            <label className="form-label">출입 방법 및 비밀번호 *</label>
                            <input className="form-input" placeholder="예: 공동현관 1234*, 도어락 5678*"
                                value={form.entry_code} onChange={e => setForm(f => ({ ...f, entry_code: e.target.value }))} />
                            <p className="form-hint" style={{ color: '#D97706', fontWeight: 500 }}>🔒 보호될 식별 정보: 배정된 클린파트너에게만 안전하게 공개됩니다.</p>
                        </div>

                        {/* 청소 도구 위치 */}
                        <div className="form-group">
                            <label className="form-label">청소 도구 및 세제 보관 위치 *</label>
                            <input className="form-input" placeholder="예: 화장실 거울장 안쪽, 싱크대 하부장 우측"
                                value={form.cleaning_tool_location} onChange={e => setForm(f => ({ ...f, cleaning_tool_location: e.target.value }))} />
                            <p className="form-hint">작업 지연을 막는 가장 중요한 정보입니다.</p>
                        </div>

                        {/* 쓰레기 처리 가이드 */}
                        <div className="form-group">
                            <label className="form-label">쓰레기 배출 안내 *</label>
                            <textarea className="form-input" placeholder="예: 종량제 봉투는 신발장 안에 있습니다. 쓰레기는 건물 1층 우측 분리수거장에 버려주세요."
                                rows={2} value={form.trash_guide}
                                onChange={e => setForm(f => ({ ...f, trash_guide: e.target.value }))} />
                        </div>

                        {/* 주차 가이드 */}
                        <div className="form-group">
                            <label className="form-label">주차 안내</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                                <input type="checkbox" checked={form.is_parking_available} onChange={e => setForm(f => ({ ...f, is_parking_available: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
                                주차 가능
                            </label>
                            <input className="form-input" placeholder="주차 안내사항을 적어주세요 (예: 1대 배정, 공영주차장 위치)"
                                value={form.parking_guide} onChange={e => setForm(f => ({ ...f, parking_guide: e.target.value }))}
                                style={{ display: form.is_parking_available ? 'block' : 'none' }} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">기타 주의사항 (선택)</label>
                            <textarea className="form-input" placeholder="소음 주의, 특정 물건 건드리지 말 것 등"
                                rows={2} value={form.caution_notes}
                                onChange={e => setForm(f => ({ ...f, caution_notes: e.target.value }))} />
                        </div>

                        <div className="form-row mt-xl">
                            <button className="btn btn-secondary btn-full btn-lg" onClick={() => setStep(1)}>← 이전</button>
                            <button
                                className="btn btn-primary btn-full btn-lg"
                                onClick={() => setStep(3)}
                                disabled={!form.entry_code || !form.cleaning_tool_location || !form.trash_guide}
                            >
                                다음: 상태 기준 등록 →
                            </button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <div className="mb-md">
                            <h3 className="section-title">가장 완벽한 상태의 기준 사진 업로드</h3>
                            <p className="form-hint mt-xs">클린파트너가 최종 목표로 삼을 수 있는 깨끗할 때의 사진을 공유해주세요.</p>

                            <div className="photo-upload-area mt-sm">
                                {photoPreviewUrls.map((url, i) => (
                                    <div key={i} className="photo-preview">
                                        <img src={url} alt={`Preview ${i}`} />
                                        <button className="photo-delete" onClick={() => removePhoto(i)}>✕</button>
                                    </div>
                                ))}
                                <label className="photo-add-btn">
                                    <input type="file" multiple accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                                    <span className="add-icon">+</span>
                                </label>
                            </div>
                        </div>

                        <h3 className="section-title mt-xl mb-sm">체크리스트 상세 설정</h3>
                        <p className="text-secondary text-sm mb-md">
                            클린파트너가 완료해야 할 항목을 설정하세요.<br />
                            <strong>{SPACE_TYPES.find(t => t.value === form.type)?.icon} {form.type}</strong> 기본 체크리스트가 설정되어 있어요.
                        </p>

                        <div className="checklist-editor">
                            {checklist.map((item, idx) => (
                                <div key={item.id} className="checklist-item-row">
                                    <span className="checklist-drag">⠿</span>
                                    <input
                                        className="form-input checklist-input"
                                        value={item.label}
                                        onChange={e => {
                                            const next = [...checklist]
                                            next[idx] = { ...next[idx], label: e.target.value }
                                            setChecklist(next)
                                        }}
                                    />
                                    <button
                                        className={`required-btn ${item.required ? 'required' : ''}`}
                                        onClick={() => {
                                            const next = [...checklist]
                                            next[idx] = { ...next[idx], required: !item.required }
                                            setChecklist(next)
                                        }}
                                        title={item.required ? '필수 항목' : '선택 항목'}
                                    >
                                        {item.required ? '필수' : '선택'}
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                                    >✕</button>
                                </div>
                            ))}
                        </div>

                        <button
                            className="btn btn-secondary btn-full btn-sm mt-md"
                            onClick={() => setChecklist([...checklist, {
                                id: Date.now().toString(), label: '', required: false
                            }])}
                        >
                            + 항목 추가
                        </button>

                        <div className="divider" />

                        <div className="form-row mt-xl">
                            <button className="btn btn-secondary btn-full btn-lg" onClick={() => setStep(2)}>← 이전</button>
                            <button
                                className="btn btn-primary btn-full btn-lg"
                                onClick={() => setStep(4)}
                                disabled={checklist.length === 0}
                            >
                                다음: 정산 설정 →
                            </button>
                        </div>
                    </>
                )}

                {step === 4 && (
                    <>
                        <div className="mb-md">
                            <h3 className="section-title">스마트 매입 증빙 💸</h3>
                            <p className="form-hint mt-xs">복잡한 세금계산서, 현금영수증 발급을 플랫폼이 알아서 처리해드립니다. 사업자 여부를 선택해주세요.</p>
                        </div>

                        <div className="form-group mt-lg">
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    className={`btn btn-full ${form.biz_type === 'INDIVIDUAL' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setForm(f => ({ ...f, biz_type: 'INDIVIDUAL' }))}
                                >개인 (현금영수증)</button>
                                <button
                                    className={`btn btn-full ${form.biz_type === 'BUSINESS' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setForm(f => ({ ...f, biz_type: 'BUSINESS' }))}
                                >사업자 (세금계산서)</button>
                            </div>
                        </div>

                        {form.biz_type === 'INDIVIDUAL' ? (
                            <div className="form-group mt-lg" style={{ background: '#F0F9FF', padding: 'var(--spacing-md)', borderRadius: 16, border: '1px solid #BAE6FD' }}>
                                <label className="form-label" style={{ color: '#0369A1' }}>휴대폰 번호 (소득공제용)</label>
                                <input className="form-input" placeholder="010-0000-0000"
                                    value={form.cash_receipt_number} onChange={e => setForm(f => ({ ...f, cash_receipt_number: e.target.value }))} />
                                <p className="form-hint" style={{ color: '#0284C7', marginTop: 8 }}>입력해주신 번호로 매 결제 시 플랫폼 수수료에 대한 현금영수증이 자동 발급됩니다.</p>
                            </div>
                        ) : (
                            <div className="mt-lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">사업자등록번호</label>
                                    <input className="form-input" placeholder="000-00-00000"
                                        value={form.biz_reg_number} onChange={e => setForm(f => ({ ...f, biz_reg_number: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">세금계산서 수신 이메일</label>
                                    <input className="form-input" placeholder="admin@example.com"
                                        value={form.biz_email} onChange={e => setForm(f => ({ ...f, biz_email: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">사업자등록증 사진 첨부</label>
                                    {bizRegPhotoUrl ? (
                                        <div className="photo-preview" style={{ width: '100%', height: 160 }}>
                                            <img src={bizRegPhotoUrl} alt="사업자등록증 미리보기" style={{ objectFit: 'contain' }} />
                                            <button className="photo-delete" onClick={() => { setBizRegPhoto(null); setBizRegPhotoUrl('') }}>✕</button>
                                        </div>
                                    ) : (
                                        <label className="photo-add-btn" style={{ width: '100%', height: 160 }}>
                                            <input type="file" accept="image/*" onChange={handleBizRegPhotoChange} style={{ display: 'none' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                <span className="add-icon">+</span>
                                                <span style={{ fontSize: 'var(--font-sm)' }}>사진 첨부하기</span>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="form-row mt-xl">
                            <button className="btn btn-secondary btn-full btn-lg" onClick={() => setStep(3)}>← 이전</button>
                            <button
                                className="btn btn-primary btn-full btn-lg"
                                onClick={handleSubmit}
                                disabled={loading || (form.biz_type === 'BUSINESS' && (!form.biz_reg_number || !bizRegPhotoUrl))}
                            >
                                {loading ? <span className="spinner" /> : '🏠 최종 공간 등록 완료'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
        .form-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--spacing-md);
          padding-top: calc(var(--spacing-md) + env(safe-area-inset-top, 0));
          border-bottom: 1px solid var(--color-border-light);
          background: var(--color-surface);
          position: sticky; top: 0; z-index: 10;
        }
        .back-btn { font-size: 22px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--color-text-primary); }
        .back-btn:hover { background: var(--color-bg); }
        .form-title { font-size: var(--font-lg); font-weight: 700; }
        .section-title { font-size: var(--font-md); font-weight: 700; color: var(--color-text-primary); }
        .progress-bar { height: 3px; background: var(--color-border-light); }
        .progress-fill { height: 100%; background: var(--color-primary); transition: width var(--transition-slow); }
        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-sm); }
        .type-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: var(--spacing-sm); border-radius: 12px;
          border: 2px solid var(--color-border);
          background: var(--color-surface); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .type-btn.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
        .type-icon { font-size: 24px; }
        .type-label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); }
        .type-btn.selected .type-label { color: var(--color-primary-dark); }
        .form-row { display: flex; gap: var(--spacing-md); }
        .form-hint { font-size: var(--font-xs); color: var(--color-text-tertiary); margin-top: 4px; }
        .checklist-editor { display: flex; flex-direction: column; gap: var(--spacing-sm); }
        .checklist-item-row { display: flex; align-items: center; gap: var(--spacing-sm); }
        .checklist-drag { color: var(--color-text-tertiary); font-size: 18px; cursor: grab; }
        .checklist-input { flex: 1; min-height: 44px; font-size: var(--font-sm); }
        .required-btn {
          flex-shrink: 0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
          border: 1.5px solid var(--color-border); color: var(--color-text-tertiary);
          cursor: pointer; white-space: nowrap;
        }
        .required-btn.required { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
        .delete-btn { color: var(--color-text-tertiary); font-size: 16px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .delete-btn:hover { background: var(--color-red-light); color: var(--color-red); }
        .photo-upload-area { display: flex; flex-wrap: wrap; gap: 8px; }
        .photo-add-btn { width: 80px; height: 80px; border-radius: 12px; border: 2px dashed var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); font-size: 24px; cursor: pointer; transition: all .2s; }
        .photo-add-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
        .photo-preview { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; position: relative; border: 1px solid var(--color-border-light); }
        .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
        .photo-delete { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; }
      `}</style>
        </div>
    )
}
