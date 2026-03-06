import React from 'react';

export default function Step3Checklist({ checklist, setChecklist, photoPreviewUrls, removePhoto, handlePhotoChange }: any) {
    return (
        <div className="flex flex-col gap-6 px-5 mt-4">
            <div className="mb-2">
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-1">상태 기준 사진 및 체크리스트</h2>
                <p className="text-secondary text-sm">가장 깨끗한 상태의 사진을 올려주세요.</p>
            </div>

            <div className="flex flex-col pb-4">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100 flex items-center gap-1">📸 공간 사진 등록 (최대 10장)</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                    {photoPreviewUrls.map((url: string, i: number) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                            <button className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" onClick={() => removePhoto(i)}>✕</button>
                        </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        <span className="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                        <span className="text-[10px] font-bold">사진 추가</span>
                    </label>
                </div>
            </div>

            <div className="flex flex-col border-t border-gray-100 dark:border-gray-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-base font-medium leading-normal text-slate-900 dark:text-slate-100 flex items-center gap-1">✅ 청소 체크리스트 편집</p>
                    <span className="text-xs bg-primary-light/20 text-primary px-2 py-1 rounded-md font-bold">기본 제공 양식</span>
                </div>

                <div className="flex flex-col gap-3">
                    {checklist.map((item: any, idx: number) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <input
                                className="flex-1 bg-transparent border-none text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-0 p-0"
                                value={item.label}
                                onChange={e => {
                                    const next = [...checklist];
                                    next[idx] = { ...next[idx], label: e.target.value };
                                    setChecklist(next);
                                }}
                            />
                            <button
                                className={`text-[10px] font-bold px-2 py-1.5 rounded-md shrink-0 transition-colors ${item.required ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                                onClick={() => {
                                    const next = [...checklist];
                                    next[idx] = { ...next[idx], required: !item.required };
                                    setChecklist(next);
                                }}
                            >
                                {item.required ? '필수' : '선택'}
                            </button>
                            <button className="text-gray-400 hover:text-red-500 shrink-0 ml-1 transition" onClick={() => setChecklist(checklist.filter((_: any, i: number) => i !== idx))}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    ))}

                    <button
                        className="mt-2 text-sm font-bold text-primary flex items-center justify-center gap-1 p-3 border border-dashed border-primary/30 rounded-xl hover:bg-primary-light/10 transition-colors"
                        onClick={() => setChecklist([...checklist, { id: Date.now().toString(), label: '', required: false }])}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span> 항목 추가하기
                    </button>
                </div>
            </div>
        </div>
    );
}
