import React from 'react';

export default function Step2Guide({ form, setForm }: any) {
    const commonInputClass = "flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 focus:ring-1 focus:ring-primary border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-slate-100 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-colors";

    return (
        <div className="flex flex-col gap-6 px-5 mt-4">
            <div className="mb-2">
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-1">현장 가이드 작성</h2>
                <p className="text-secondary text-sm">클린 파트너가 헤매지 않도록 작성해 주세요.</p>
            </div>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100 flex items-center gap-1">🔑 출입 비밀번호 및 방법</p>
                <input
                    className={`${commonInputClass} h-14`}
                    placeholder="예: 공동현관 1234, 도어락 5678*"
                    value={form.entry_code}
                    onChange={e => setForm((f: any) => ({ ...f, entry_code: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">안전하게 보관되며 파트너에게만 공개됩니다.</p>
            </label>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100 flex items-center gap-1">🧽 도구 보관 위치</p>
                <input
                    className={`${commonInputClass} h-14`}
                    placeholder="예: 신발장 바로 옆 다용도실"
                    value={form.cleaning_tool_location}
                    onChange={e => setForm((f: any) => ({ ...f, cleaning_tool_location: e.target.value }))}
                />
            </label>

            <label className="flex flex-col flex-1">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100 flex items-center gap-1">🗑 쓰레기 배출 가이드</p>
                <textarea
                    className={`${commonInputClass} min-h-[100px] resize-y`}
                    placeholder="예: 종량제에 담아 건물 1층 우측 배출"
                    value={form.trash_guide}
                    onChange={e => setForm((f: any) => ({ ...f, trash_guide: e.target.value }))}
                />
            </label>

            <label className="flex flex-col flex-1 mt-2">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">주의사항 및 세부 가이드 (선택)</p>
                <textarea
                    className={`${commonInputClass} min-h-[120px] resize-y`}
                    placeholder="Any specific instructions for the cleaning partners?"
                    value={form.caution_notes}
                    onChange={e => setForm((f: any) => ({ ...f, caution_notes: e.target.value }))}
                />
            </label>

            <div className="flex flex-col flex-1 mt-4">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-base font-medium leading-normal text-slate-900 dark:text-slate-100 flex items-center gap-1">🚗 주차 안내</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.is_parking_available} onChange={e => setForm((f: any) => ({ ...f, is_parking_available: e.target.checked }))} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">주차 가능</span>
                    </label>
                </div>
                {form.is_parking_available && (
                    <input
                        className={`${commonInputClass} h-14`}
                        placeholder="예: 지하 1층 201호 전용 칸"
                        value={form.parking_guide}
                        onChange={e => setForm((f: any) => ({ ...f, parking_guide: e.target.value }))}
                    />
                )}
            </div>
        </div>
    );
}
