'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpaceType } from '@/lib/types';
import Step1BasicInfo from './Step1BasicInfo';
import Step2Guide from './Step2Guide';
import Step3Checklist from './Step3Checklist';
import Step4BizInfo from './Step4BizInfo';

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
        { id: '6', label: '환기 및 냄새 제거', required: false },
    ],
    studio: [
        { id: '1', label: '촬영 소품 제자리 배치', required: true },
        { id: '2', label: '바닥 먼지 제거 (찍찍이/청소기)', required: true },
        { id: '3', label: '거울 및 유리창 얼룩 제거', required: true },
        { id: '4', label: '쓰레기 수거', required: true },
        { id: '5', label: '탈의실 정리', required: false },
    ],
    gym: [
        { id: '1', label: '운동 기구 기구 소독 및 닦기', required: true },
        { id: '2', label: '바닥 청소기 + 살균 걸레질', required: true },
        { id: '3', label: '샤워실 및 탈의실 청소', required: true },
        { id: '4', label: '정수기 및 공용 공간 정리', required: true },
        { id: '5', label: '수건 수거 및 세탁 준비', required: false },
    ],
    unmanned_store: [
        { id: '1', label: '매대 먼지 닦기', required: true },
        { id: '2', label: '진열대 상품 열 맞추기', required: true },
        { id: '3', label: '바닥 청소 및 얼룩 제거', required: true },
        { id: '4', label: '키오스크 지문 닦기', required: true },
        { id: '5', label: '쓰레기통 비우기', required: true },
    ],
    study_cafe: [
        { id: '1', label: '개인 좌석 테이블 닦기', required: true },
        { id: '2', label: '바닥 소음 없는 청소 (정숙)', required: true },
        { id: '3', label: '휴게실 커피머신 주변 정리', required: true },
        { id: '4', label: '사물함 먼지 제거', required: false },
        { id: '5', label: '분리수거 및 분쇄기 비우기', required: true },
    ],
    practice_room: [
        { id: '1', label: '거울 지문 및 습기 제거', required: true },
        { id: '2', label: '바닥 송진/먼지 청소', required: true },
        { id: '3', label: '앰프 및 전자기기 주변 정리', required: true },
        { id: '4', label: '의자 및 악보대 정돈', required: true },
        { id: '5', label: '쓰레기 수거', required: true },
    ],
    workspace: [
        { id: '1', label: '개별 데스크 위 먼지 제거', required: true },
        { id: '2', label: '바닥 청소기 + 물걸레', required: true },
        { id: '3', label: '공용 탕비실 정리', required: true },
        { id: '4', label: '화이트보드 지우기', required: false },
        { id: '5', label: '쓰레기 비우기', required: true },
    ],
    other: [
        { id: '1', label: '바닥 청소', required: true },
        { id: '2', label: '창틀 및 선반 먼지 제거', required: true },
        { id: '3', label: '화장실 청소', required: true },
        { id: '4', label: '쓰레기 배출', required: true },
    ]
};

export default function CreateSpacePage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '', type: 'airbnb' as SpaceType, address: '', address_detail: '',
        entry_code: '', cleaning_tool_location: '', parking_guide: '', trash_guide: '',
        caution_notes: '', size_sqm: '', size_pyeong: '', base_price: '30000', estimated_duration: '60',
        description: '', is_parking_available: false, cleaning_difficulty: '보통',
        biz_type: 'INDIVIDUAL' as 'BUSINESS' | 'INDIVIDUAL', biz_reg_number: '', biz_email: '', cash_receipt_number: '',
    });
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLISTS['airbnb']);

    // 공간 유형 변경 시 체크리스트 자동 업데이트
    React.useEffect(() => {
        if (DEFAULT_CHECKLISTS[form.type]) {
            setChecklist(DEFAULT_CHECKLISTS[form.type]);
        }
    }, [form.type]);
    const [referencePhotos, setReferencePhotos] = useState<File[]>([]);
    const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
    const [bizRegPhoto, setBizRegPhoto] = useState<File | null>(null);
    const [bizRegPhotoUrl, setBizRegPhotoUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

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

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setReferencePhotos(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoPreviewUrls(prev => [...prev, ev.target?.result as string]);
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
            const res = await fetch(`/api/geocode?query=${encodeURIComponent(form.address)}`);
            const data = await res.json();

            if (data && data.addresses && data.addresses.length > 0) {
                const addr = data.addresses[0];
                const lat = parseFloat(addr.y);
                const lng = parseFloat(addr.x);
                setMapLocation({ lat, lng });
                setForm(f => ({ ...f, address: addr.roadAddress || addr.jibunAddress }));

                // 지도 표시 (SDK가 로드된 경우에만)
                const naver = (window as any).naver;
                if (naver && naver.maps && mapRef.current) {
                    const map = new naver.maps.Map(mapRef.current, {
                        center: new naver.maps.LatLng(lat, lng),
                        zoom: 16
                    });
                    new naver.maps.Marker({
                        position: new naver.maps.LatLng(lat, lng),
                        map: map
                    });
                }
            } else {
                // SDK fallback (API route fails or no results)
                const naver = (window as any).naver;
                if (naver && naver.maps && naver.maps.Service) {
                    naver.maps.Service.geocode({ query: form.address }, (status: any, response: any) => {
                        if (status === naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                            const addr = response.v2.addresses[0];
                            const lat = parseFloat(addr.y);
                            const lng = parseFloat(addr.x);
                            setMapLocation({ lat, lng });
                            setForm(f => ({ ...f, address: addr.roadAddress || addr.jibunAddress }));
                        }
                    });
                } else {
                    alert('주소 검색에 실패했습니다. 도로명 주소를 정확히 입력해주세요.');
                }
            }
        } catch (e) {
            console.error('Geocode fallback error:', e);
        }
    };

    const handleBizRegPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setBizRegPhoto(file);
        const reader = new FileReader();
        reader.onload = (ev) => setBizRegPhotoUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.address) { alert('이름과 주소를 확인해주세요.'); return; }
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
            if (!uploadError) {
                const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
                uploadedPhotoUrls.push(data.publicUrl);
            }
        }

        let uploadedBizRegUrl = null;
        if (bizRegPhoto) {
            const fileExt = bizRegPhoto.name.split('.').pop();
            const fileName = `biz_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, bizRegPhoto);
            if (!uploadError) {
                const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
                uploadedBizRegUrl = data.publicUrl;
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
            size_pyeong: form.size_pyeong ? parseFloat(form.size_pyeong) : null,
            base_price: parseInt(form.base_price),
            estimated_duration: parseInt(form.estimated_duration),
            description: form.description,
            is_parking_available: form.is_parking_available,
            cleaning_difficulty: form.cleaning_difficulty,
            checklist_template: checklist,
            reference_photos: uploadedPhotoUrls,
            photos: uploadedPhotoUrls, // Ensure both are populated for safety
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
            console.error('Space creation error:', error);
            alert(`공간 등록에 실패했어요: ${error?.message || '알 수 없는 오류'}`);
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-gray-900 shadow-md">

                {/* Top App Bar */}
                <div className="flex items-center p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20">
                    <button className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 cursor-pointer" onClick={() => step === 1 ? router.back() : setStep(step - 1)}>
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">새 공간 등록</h2>
                </div>

                {/* Progress Indicator */}
                <div className="flex w-full flex-row items-center justify-center gap-3 py-6 relative z-10 px-5 bg-white dark:bg-gray-900">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-2 transition-all duration-300 rounded-full ${step === i ? 'w-8 bg-primary-light dark:bg-primary' : step > i ? 'w-2 bg-primary' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}></div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-x-hidden pb-32">
                    <div className="transition-all duration-300 transform" key={step}>
                        {step === 1 && <Step1BasicInfo form={form} setForm={setForm} handleAddressCheck={handleAddressCheck} mapLocation={mapLocation} mapRef={mapRef} recommendedPrice={recommendedPrice} />}
                        {step === 2 && <Step2Guide form={form} setForm={setForm} />}
                        {step === 3 && <Step3Checklist checklist={checklist} setChecklist={setChecklist} photoPreviewUrls={photoPreviewUrls} removePhoto={removePhoto} handlePhotoChange={handlePhotoChange} />}
                        {step === 4 && <Step4BizInfo form={form} setForm={setForm} bizRegPhotoUrl={bizRegPhotoUrl} bizRegPhoto={bizRegPhoto} setBizRegPhoto={setBizRegPhoto} setBizRegPhotoUrl={setBizRegPhotoUrl} handleBizRegPhotoChange={handleBizRegPhotoChange} />}
                    </div>
                </div>

                {/* Bottom Button */}
                <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-[env(safe-area-inset-bottom,20px)] z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    {step < 4 ? (
                        <button className="w-full flex h-14 items-center justify-center rounded-xl bg-primary text-white text-[17px] font-bold leading-normal tracking-wide active:scale-[0.98] transition-transform shadow-md" onClick={() => setStep(step + 1)}>
                            다음 단계
                        </button>
                    ) : (
                        <button className="w-full flex h-14 items-center justify-center rounded-xl bg-primary text-white text-[17px] font-bold leading-normal tracking-wide active:scale-[0.98] transition-transform shadow-md" onClick={handleSubmit} disabled={loading}>
                            {loading ? '등록 처리 중...' : '공간 저장 완료하기'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
