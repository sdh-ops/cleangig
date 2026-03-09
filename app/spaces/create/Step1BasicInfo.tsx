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

export default function Step1BasicInfo({ form, setForm, handleAddressSearch, mapLocation, mapRef }: any) {
    const [areaUnit, setAreaUnit] = React.useState<'sqm' | 'pyeong'>('sqm');
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

            <div className="flex flex-col gap-2">
                <p className="text-base font-medium leading-normal text-slate-900 dark:text-slate-100">공간 면적</p>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-1">
                    <button
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${areaUnit === 'sqm' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}
                        onClick={() => setAreaUnit('sqm')}
                    >
                        ㎡ (제곱미터)
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${areaUnit === 'pyeong' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500'}`}
                        onClick={() => setAreaUnit('pyeong')}
                    >
                        평
                    </button>
                </div>

                {areaUnit === 'sqm' ? (
                    <input
                        type="number"
                        className={commonInputClass}
                        placeholder="면적을 입력하세요 (㎡)"
                        value={form.size_sqm}
                        onChange={e => {
                            const sqm = e.target.value;
                            const pyeong = sqm ? (parseFloat(sqm) / 3.3).toFixed(1) : '';
                            setForm((f: any) => ({ ...f, size_sqm: sqm, size_pyeong: pyeong }));
                        }}
                    />
                ) : (
                    <input
                        type="number"
                        className={commonInputClass}
                        placeholder="면적을 입력하세요 (평)"
                        value={form.size_pyeong || ''}
                        onChange={e => {
                            const pyeong = e.target.value;
                            const sqm = pyeong ? Math.round(parseFloat(pyeong) * 3.3).toString() : '';
                            setForm((f: any) => ({ ...f, size_pyeong: pyeong, size_sqm: sqm }));
                        }}
                    />
                )}
                <p className="text-[11px] text-gray-500 px-1">
                    {areaUnit === 'sqm' && form.size_sqm ? `약 ${form.size_pyeong}평` : areaUnit === 'pyeong' && form.size_pyeong ? `약 ${form.size_sqm}㎡` : ''}
                </p>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">공간 세부 시설</p>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'has_toilet', label: '화장실 🚽', desc: '세면대/변기 청소' },
                        { id: 'has_kitchen', label: '주방 🍳', desc: '설거지/싱크대' },
                        { id: 'has_bed', label: '침대 🛏️', desc: '침구 교체/정리' },
                        { id: 'has_balcony', label: '테라스 🌿', desc: '창틀/바닥 먼지' },
                    ].map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all ${form[item.id] ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-gray-700'}`}
                            onClick={() => setForm((f: any) => ({ ...f, [item.id]: !f[item.id] }))}
                        >
                            <span className="text-sm font-bold mb-1">{item.label}</span>
                            <span className="text-[10px] text-gray-500">{item.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 mt-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-primary">info</span>
                    청소 비용과 소요 시간은 나중에 <strong>청소 요청을 생성할 때</strong> 각 상황에 맞춰 직접 입력하실 수 있습니다.
                </p>
            </div>
        </div>
    );
}
