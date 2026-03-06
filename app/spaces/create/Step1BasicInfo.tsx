import React from 'react';
import { SpaceType } from '@/lib/types';

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

export default function Step1BasicInfo({ form, setForm, handleAddressSearch, mapLocation, mapRef, recommendedPrice }: any) {
    const commonInputClass = "flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 focus:ring-1 focus:ring-primary border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-slate-100 h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-colors";

    return (
        <div className="flex flex-col gap-6 px-5 mt-4">
            <div className="mb-2">
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-1">기본 정보 입력</h2>
                <p className="text-secondary text-sm">공간의 이름과 위치를 알려주세요.</p>
            </div>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">공간 이름</p>
                <input
                    className={commonInputClass}
                    placeholder="예: 무인 스튜디오 A동"
                    value={form.name}
                    onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                />
            </label>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">공간 유형</p>
                <div className="relative">
                    <select
                        className="form-select flex w-full min-w-0 flex-1 appearance-none rounded-lg text-slate-900 focus:outline-0 focus:ring-1 focus:ring-primary border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-slate-100 h-14 p-[15px] text-base font-normal leading-normal transition-colors cursor-pointer"
                        value={form.type}
                        onChange={e => {
                            const type = e.target.value;
                            setForm((f: any) => ({ ...f, type }));
                        }}
                    >
                        <option disabled value="">Select space type</option>
                        {SPACE_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                </div>
            </label>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">주소</p>
                <div className="flex gap-2 mb-2">
                    <div
                        className={`${commonInputClass} cursor-pointer flex items-center bg-gray-50 dark:bg-gray-800/50`}
                        onClick={handleAddressSearch}
                    >
                        <span className={form.address ? "text-slate-900 dark:text-slate-100" : "text-gray-500"}>
                            {form.address || "주소를 검색해주세요"}
                        </span>
                    </div>
                    <button
                        className="px-4 border border-primary text-primary dark:text-primary-light rounded-lg bg-primary/5 text-sm font-bold shrink-0 hover:bg-primary/10 transition h-14"
                        onClick={handleAddressSearch}
                    >
                        주소 검색
                    </button>
                </div>
                <input
                    className={commonInputClass}
                    placeholder="상세 주소 (선택)"
                    value={form.address_detail}
                    onChange={e => setForm((f: any) => ({ ...f, address_detail: e.target.value }))}
                />
                <div ref={mapRef} className={`w-full overflow-hidden transition-all duration-300 rounded-lg border-gray-300 dark:border-gray-700 ${mapLocation ? 'h-40 mt-3 border' : 'h-0'}`} />
            </label>

            <div className="flex gap-3">
                <label className="flex flex-col flex-1">
                    <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">면적 (㎡)</p>
                    <input
                        type="number"
                        className={commonInputClass}
                        placeholder="0"
                        value={form.size_sqm}
                        onChange={e => {
                            const sqm = e.target.value;
                            const pyeong = sqm ? (parseFloat(sqm) / 3.305785).toFixed(1) : '';
                            setForm((f: any) => ({ ...f, size_sqm: sqm, size_pyeong: pyeong }));
                        }}
                    />
                </label>
                <label className="flex flex-col flex-1">
                    <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">면적 (평)</p>
                    <input
                        type="number"
                        className={commonInputClass}
                        placeholder="0"
                        value={form.size_pyeong || ''}
                        onChange={e => {
                            const pyeong = e.target.value;
                            const sqm = pyeong ? Math.round(parseFloat(pyeong) * 3.305785).toString() : '';
                            setForm((f: any) => ({ ...f, size_pyeong: pyeong, size_sqm: sqm }));
                        }}
                    />
                </label>
                <label className="flex flex-col flex-1">
                    <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">소요 시간(분)</p>
                    <input type="number" className={commonInputClass} placeholder="60" value={form.estimated_duration} onChange={e => setForm((f: any) => ({ ...f, estimated_duration: e.target.value }))} />
                </label>
            </div>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">기본 1회 청소 비용 (원)</p>
                <input type="number" className={commonInputClass} value={form.base_price} onChange={e => setForm((f: any) => ({ ...f, base_price: e.target.value }))} />
                <div className="mt-3 p-4 bg-primary-light/20 dark:bg-primary/20 border border-primary-light/50 dark:border-primary/50 rounded-xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-primary bg-white dark:bg-slate-800 px-2 py-0.5 rounded px-1.5 mb-1.5 inline-block">AI 추천 단가</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">현재 공간 기준 적정가는 <strong className="text-primary dark:text-primary-light">₩{recommendedPrice.toLocaleString()}</strong> 입니다.</p>
                    </div>
                    <button className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg shrink-0" onClick={() => setForm((f: any) => ({ ...f, base_price: recommendedPrice.toString() }))}>적용</button>
                </div>
            </label>
        </div>
    );
}
