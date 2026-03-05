'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SpaceType } from '@/lib/types';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

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
];

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
};

export default function CreateSpacePage() {
    const router = useRouter();
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
    });
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLISTS['airbnb']);
    const [referencePhotos, setReferencePhotos] = useState<File[]>([]);
    const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
    const [bizRegPhoto, setBizRegPhoto] = useState<File | null>(null);
    const [bizRegPhotoUrl, setBizRegPhotoUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: 기본정보, 2: 가이드, 3: 체크리스트, 4: 정산정보

    const [mapLocation, setMapLocation] = useState<{ lat: number, lng: number } | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    const calculateRecommendedPrice = () => {
        const duration = parseInt(form.estimated_duration) || 60;
        const sqm = parseInt(form.size_sqm) || 30;
        const diffRate = form.cleaning_difficulty === '특수' ? 1.5 : form.cleaning_difficulty === '어려움' ? 1.2 : form.cleaning_difficulty === '쉬움' ? 0.9 : 1.0;
        const hourlyBase = 15000 * (duration / 60);
        const sizeBase = (sqm / 33) * 2000;
        const rawPrice = (hourlyBase + sizeBase) * diffRate;
        return Math.round(rawPrice / 1000) * 1000;
    };
    const recommendedPrice = calculateRecommendedPrice();

    const handleTypeChange = (type: SpaceType) => {
        setForm(f => ({ ...f, type }));
        setChecklist(DEFAULT_CHECKLISTS[type] || DEFAULT_CHECKLISTS['airbnb']);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setReferencePhotos(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => setPhotoPreviewUrls(prev => [...prev, e.target?.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index: number) => {
        setReferencePhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddressCheck = async () => {
        if (!form.address) return alert('주소를 먼저 입력해주세요.');
        try {
            const naver = (window as any).naver;
            if (naver && naver.maps && naver.maps.Service) {
                naver.maps.Service.geocode({ query: form.address }, (status: any, response: any) => {
                    if (status === naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                        const lat = parseFloat(response.v2.addresses[0].y);
                        const lng = parseFloat(response.v2.addresses[0].x);
                        setMapLocation({ lat, lng });
                        setTimeout(() => {
                            if (mapRef.current) {
                                const map = new naver.maps.Map(mapRef.current, { center: new naver.maps.LatLng(lat, lng), zoom: 16 });
                                new naver.maps.Marker({ position: new naver.maps.LatLng(lat, lng), map });
                            }
                        }, 100);
                    } else {
                        alert('주소를 찾을 수 없습니다. 도로명 주소로 입력해보세요.');
                    }
                });
            }
        } catch (e) { console.error(e); }
    };

    const handleBizRegPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setBizRegPhoto(file);
        const reader = new FileReader();
        reader.onload = (e) => setBizRegPhotoUrl(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.address) return;
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const uploadedPhotoUrls: string[] = [];
        for (const file of referencePhotos) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file);
            if (!uploadError) uploadedPhotoUrls.push(filePath);
        }

        let uploadedBizRegUrl = null;
        if (bizRegPhoto) {
            const fileExt = bizRegPhoto.name.split('.').pop();
            const fileName = `biz_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, bizRegPhoto);
            if (!uploadError) uploadedBizRegUrl = filePath;
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
        }).select().single();

        if (!error && data) {
            router.push(`/spaces/${data.id}?created=1`);
        } else {
            alert('공간 등록에 실패했어요.');
            setLoading(false);
        }
    };

    return (
        <div className="page-container bg-premium-v2">
            <header className="form-header">
                <button className="back-btn" onClick={() => step === 1 ? router.back() : setStep(step - 1)}>←</button>
                <div className="step-info">
                    <h1 className="form-title">공간 등록</h1>
                    <p className="step-count">{step} / 4 단계</p>
                </div>
                <div className="placeholder" />
            </header>

            <div className="progress-bar">
                <div className="bar-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            <main className="page-content">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.section key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="section-intro mb-xl">
                                <h2 className="section-title">기본 정보를 입력해 주세요</h2>
                                <p className="section-desc">공간의 이름과 위치를 알려주세요.</p>
                            </div>

                            <div className="form-stack">
                                <div className="input-group">
                                    <label>공간 유형</label>
                                    <div className="type-grid">
                                        {SPACE_TYPES.map(t => (
                                            <button key={t.value} className={`type-chip ${form.type === t.value ? 'active' : ''}`} onClick={() => handleTypeChange(t.value)}>
                                                <span className="icon">{t.icon}</span>
                                                <span className="label">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>공간 이름</label>
                                    <input placeholder="예: 무인 스튜디오 A동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>

                                <div className="input-group">
                                    <label>주소</label>
                                    <div className="flex gap-sm mb-xs">
                                        <input placeholder="도로명 주소 입력" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                                        <button className="btn-secondary" onClick={handleAddressCheck}>지도찾기</button>
                                    </div>
                                    <input placeholder="상세 주소 (선택)" value={form.address_detail} onChange={e => setForm(f => ({ ...f, address_detail: e.target.value }))} />
                                    <div ref={mapRef} className={`map-preview ${mapLocation ? 'show' : ''}`} />
                                </div>

                                <div className="grid-2-col">
                                    <div className="input-group">
                                        <label>면적 (㎡)</label>
                                        <input type="number" placeholder="0" value={form.size_sqm} onChange={e => setForm(f => ({ ...f, size_sqm: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>소요 시간 (분)</label>
                                        <input type="number" placeholder="60" value={form.estimated_duration} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>기본 1회 청소 비용 (원)</label>
                                    <input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />
                                    <div className="smart-price-card">
                                        <div className="text">
                                            <span className="ai-tag">AI 스마트 추천</span>
                                            <p>현재 설정 기준 적정가는 <strong>₩{recommendedPrice.toLocaleString()}</strong> 입니다.</p>
                                        </div>
                                        <button className="apply-btn" onClick={() => setForm(f => ({ ...f, base_price: recommendedPrice.toString() }))}>적용</button>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {step === 2 && (
                        <motion.section key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="section-intro mb-xl">
                                <h2 className="section-title">현장 가이드를 작성하세요</h2>
                                <p className="section-desc">클린 파트너가 헤매지 않도록 꼼꼼히 적어주세요.</p>
                            </div>

                            <div className="form-stack">
                                <div className="input-group">
                                    <label>🔑 출입 비밀번호 및 방법</label>
                                    <input placeholder="예: 공동현관 1234, 도어락 5678*" value={form.entry_code} onChange={e => setForm(f => ({ ...f, entry_code: e.target.value }))} />
                                    <p className="hint">안전하게 보관되며 파트너에게만 공개됩니다.</p>
                                </div>

                                <div className="input-group">
                                    <label>🧽 도구 보관 위치</label>
                                    <input placeholder="예: 신발장 바로 옆 다용도실" value={form.cleaning_tool_location} onChange={e => setForm(f => ({ ...f, cleaning_tool_location: e.target.value }))} />
                                </div>

                                <div className="input-group">
                                    <label>🗑 쓰레기 배출 가이드</label>
                                    <textarea placeholder="예: 종량제에 담아 건물 1층 우측 배출" value={form.trash_guide} onChange={e => setForm(f => ({ ...f, trash_guide: e.target.value }))} rows={2} />
                                </div>

                                <div className="input-group">
                                    <div className="flex justify-between items-center mb-sm">
                                        <label>🚗 주차 안내</label>
                                        <label className="switch-label">
                                            <input type="checkbox" checked={form.is_parking_available} onChange={e => setForm(f => ({ ...f, is_parking_available: e.target.checked }))} />
                                            <span>주차 가능</span>
                                        </label>
                                    </div>
                                    {form.is_parking_available && (
                                        <input placeholder="예: 지하 1층 201호 전용 칸" value={form.parking_guide} onChange={e => setForm(f => ({ ...f, parking_guide: e.target.value }))} />
                                    )}
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {step === 3 && (
                        <motion.section key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="section-intro mb-xl">
                                <h2 className="section-title">상태 기준 사진 및 체크리스트</h2>
                                <p className="section-desc">가장 깨끗한 상태의 사진을 올려주세요.</p>
                            </div>

                            <div className="photo-section mb-xl">
                                <div className="photo-grid">
                                    {photoPreviewUrls.map((url, i) => (
                                        <div key={i} className="preview-box card">
                                            <img src={url} alt="Preview" />
                                            <button className="del" onClick={() => removePhoto(i)}>✕</button>
                                        </div>
                                    ))}
                                    <label className="add-photo-btn card">
                                        <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                        <span className="plus">+</span>
                                        <span className="txt">사진 추가</span>
                                    </label>
                                </div>
                            </div>

                            <div className="checklist-builder mb-xl">
                                <h3 className="sub-title-sm mb-md">체크리스트 편집</h3>
                                <div className="check-stack">
                                    {checklist.map((item, idx) => (
                                        <div key={item.id} className="check-row card-soft">
                                            <input className="label-input" value={item.label} onChange={e => {
                                                const next = [...checklist];
                                                next[idx] = { ...next[idx], label: e.target.value };
                                                setChecklist(next);
                                            }} />
                                            <button className={`req-toggle ${item.required ? 'active' : ''}`} onClick={() => {
                                                const next = [...checklist];
                                                next[idx] = { ...next[idx], required: !item.required };
                                                setChecklist(next);
                                            }}>{item.required ? '필수' : '선택'}</button>
                                            <button className="del-btn" onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}>✕</button>
                                        </div>
                                    ))}
                                    <button className="add-item-btn" onClick={() => setChecklist([...checklist, { id: Date.now().toString(), label: '', required: false }])}>
                                        + 새 항목 추가
                                    </button>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {step === 4 && (
                        <motion.section key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="section-intro mb-xl">
                                <h2 className="section-title">정산 및 세무 증빙 정보</h2>
                                <p className="section-desc">플랫폼 수익 정산을 위해 필요합니다.</p>
                            </div>

                            <div className="form-stack">
                                <div className="type-toggle mb-lg">
                                    <button className={form.biz_type === 'INDIVIDUAL' ? 'active' : ''} onClick={() => setForm(f => ({ ...f, biz_type: 'INDIVIDUAL' }))}>개인</button>
                                    <button className={form.biz_type === 'BUSINESS' ? 'active' : ''} onClick={() => setForm(f => ({ ...f, biz_type: 'BUSINESS' }))}>사업자</button>
                                </div>

                                {form.biz_type === 'INDIVIDUAL' ? (
                                    <div className="input-group card-soft">
                                        <label>현금영수증 휴대폰 번호</label>
                                        <input placeholder="010-0000-0000" value={form.cash_receipt_number} onChange={e => setForm(f => ({ ...f, cash_receipt_number: e.target.value }))} />
                                    </div>
                                ) : (
                                    <div className="biz-form-stack card-soft p-lg">
                                        <div className="input-group mb-md">
                                            <label>사업자 번호</label>
                                            <input placeholder="000-00-00000" value={form.biz_reg_number} onChange={e => setForm(f => ({ ...f, biz_reg_number: e.target.value }))} />
                                        </div>
                                        <div className="input-group mb-md">
                                            <label>이메일 (전자세금계산서)</label>
                                            <input placeholder="example@biz.com" value={form.biz_email} onChange={e => setForm(f => ({ ...f, biz_email: e.target.value }))} />
                                        </div>
                                        <div className="input-group">
                                            <label>사업자등록증 첨부</label>
                                            {bizRegPhotoUrl ? (
                                                <div className="biz-photo-preview card">
                                                    <img src={bizRegPhotoUrl} alt="Biz" />
                                                    <button onClick={() => { setBizRegPhoto(null); setBizRegPhotoUrl(''); }}>삭제</button>
                                                </div>
                                            ) : (
                                                <label className="biz-upload-btn card">
                                                    <input type="file" accept="image/*" onChange={handleBizRegPhotoChange} className="hidden" />
                                                    <span className="plus">+</span>
                                                    <span>사업자등록증 업로드</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </main>

            <div className="footer-actions">
                {step < 4 ? (
                    <button className="next-btn" onClick={() => setStep(step + 1)}>다음 단계로 →</button>
                ) : (
                    <button className="submit-btn" onClick={handleSubmit} disabled={loading}>{loading ? '등록 중...' : '공간 등록 완료'}</button>
                )}
            </div>

            <style jsx>{`
        .bg-premium-v2 { background: var(--color-bg); min-height: 100vh; }
        .form-header {
          position: sticky; top: 0; z-index: 100;
          background: #FFFFFF; padding: 20px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--color-border-light);
        }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: #F8F9FA; border: none; font-size: 20px; }
        .step-info { text-align: center; }
        .form-title { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
        .step-count { font-size: 12px; font-weight: 700; color: var(--color-primary); }
        .placeholder { width: 40px; }
        
        .progress-bar { height: 4px; background: #E9ECEF; width: 100%; }
        .bar-fill { height: 100%; background: var(--color-primary); transition: width 0.4s ease; }
        
        .page-content { padding: 32px 20px 120px; }
        .section-title { font-size: 24px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 6px; }
        .section-desc { font-size: 15px; color: var(--color-text-tertiary); }
        
        .form-stack { display: flex; flexDirection: column; gap: 24px; }
        .input-group label { display: block; font-size: 13px; font-weight: 800; margin-bottom: 10px; color: #191F28; }
        .input-group input, .input-group textarea { width: 100%; padding: 16px; border-radius: 16px; border: 1.5px solid var(--color-border-light); font-size: 15px; font-weight: 600; outline: none; background: #FFFFFF; }
        .input-group input:focus { border-color: var(--color-primary); }
        
        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .type-chip { padding: 14px 8px; border-radius: 16px; border: 1.5px solid var(--color-border-light); background: #fff; display: flex; flexDirection: column; gap: 6px; align-items: center; }
        .type-chip.active { border-color: var(--color-primary); background: var(--color-primary-soft); }
        .type-chip .icon { font-size: 20px; }
        .type-chip .label { font-size: 11px; font-weight: 800; color: #4E5968; }
        .type-chip.active .label { color: var(--color-primary); }
        
        .btn-secondary { padding: 0 16px; height: 52px; border-radius: 16px; border: 1.5px solid var(--color-border-light); background: #fff; font-weight: 800; font-size: 13px; }
        .map-preview { height: 0; background: #E9ECEF; border-radius: 16px; transition: all 0.3s; margin-top: 0; overflow: hidden; }
        .map-preview.show { height: 200px; margin-top: 12px; border: 1px solid var(--color-border-light); }
        
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .smart-price-card { background: #EBF3FF; border: 1px solid #D0E6FF; border-radius: 14px; padding: 16px; margin-top: 10px; display: flex; align-items: center; justify-content: space-between; }
        .ai-tag { font-size: 10px; font-weight: 900; color: var(--color-primary); background: #fff; padding: 2px 6px; border-radius: 6px; margin-bottom: 4px; display: inline-block; }
        .smart-price-card p { font-size: 12px; line-height: 1.4; color: #191F28; }
        .apply-btn { font-size: 12px; font-weight: 900; color: #fff; background: var(--color-primary); border: none; padding: 8px 14px; border-radius: 10px; }
        
        .hint { font-size: 11px; color: var(--color-text-tertiary); margin-top: 6px; font-weight: 600; }
        .switch-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: var(--color-text-secondary); }
        
        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .preview-box, .add-photo-btn { height: 100px; border-radius: 16px; overflow: hidden; position: relative; }
        .add-photo-btn { border: 2px dashed #D1D8E0; display: flex; flexDirection: column; alignItems: center; justifyContent: center; color: #8B95A1; }
        .add-photo-btn .plus { font-size: 24px; font-weight: 300; }
        .add-photo-btn .txt { font-size: 10px; font-weight: 800; }
        .preview-box img { width: 100%; height: 100%; object-fit: cover; }
        .delete-btn { position: absolute; top: 4px; right: 4px; }
        
        .check-stack { display: flex; flexDirection: column; gap: 10px; }
        .check-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; }
        .label-input { flex: 1; border: none; background: transparent; font-size: 14px; font-weight: 700; outline: none; }
        .req-toggle { font-size: 11px; font-weight: 900; color: #8B95A1; background: #F1F3F5; border: none; padding: 4px 8px; border-radius: 6px; }
        .req-toggle.active { background: #FFF1F2; color: #E11D48; }
        .del-btn { color: #8B95A1; border: none; background: none; font-size: 16px; }
        .add-item-btn { padding: 14px; border: 1.5px dashed #D1D8E0; border-radius: 16px; background: #fff; font-size: 13px; font-weight: 800; color: #8B95A1; cursor: pointer; }
        
        .type-toggle { display: flex; gap: 6px; background: #E9ECEF; padding: 4px; border-radius: 14px; }
        .type-toggle button { flex: 1; height: 44px; border-radius: 11px; border: none; font-weight: 800; color: #8B95A1; background: transparent; }
        .type-toggle button.active { background: #fff; color: #000; box-shadow: var(--shadow-sm); }
        
        .biz-upload-btn { height: 120px; border: 2px dashed #D1D8E0; display: flex; flexDirection: column; alignItems: center; justifyContent: center; gap: 8px; color: #8B95A1; font-weight: 700; font-size: 13px; }
        .biz-photo-preview img { width: 100%; height: 140px; objectFit: contain; border-radius: 12px; }
        
        .footer-actions { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: #fff; border-top: 1px solid var(--color-border-light); z-index: 200; }
        .next-btn, .submit-btn { width: 100%; height: 60px; border-radius: 20px; border: none; background: var(--color-primary); color: #fff; font-size: 17px; font-weight: 900; box-shadow: 0 10px 20px rgba(49, 130, 246, 0.25); }
        .hidden { display: none; }
      `}</style>
        </div>
    );
}
