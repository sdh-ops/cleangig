import React from 'react';

export default function Step4BizInfo({ form, setForm, bizRegPhotoUrl, bizRegPhoto, setBizRegPhoto, setBizRegPhotoUrl, handleBizRegPhotoChange }: any) {
    const commonInputClass = "flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 focus:outline-0 focus:ring-1 focus:ring-primary border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-slate-100 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-colors";

    return (
        <div className="flex flex-col gap-6 px-5 mt-4">
            <div className="mb-2">
                <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-1">정산/세무 증빙 정보</h2>
                <p className="text-secondary text-sm">플랫폼 수익 정산을 위해 필요합니다.</p>
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <button
                    className={`flex-1 text-sm font-bold py-3 rounded-lg transition-all ${form.biz_type === 'INDIVIDUAL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    onClick={() => setForm((f: any) => ({ ...f, biz_type: 'INDIVIDUAL' }))}
                >
                    개인 사업자 미등록
                </button>
                <button
                    className={`flex-1 text-sm font-bold py-3 rounded-lg transition-all ${form.biz_type === 'BUSINESS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    onClick={() => setForm((f: any) => ({ ...f, biz_type: 'BUSINESS' }))}
                >
                    사업자 등록 완료
                </button>
            </div>

            {form.biz_type === 'INDIVIDUAL' ? (
                <div className="flex flex-col gap-4 mt-2">
                    <label className="flex flex-col flex-1">
                        <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">현금영수증 발급용 휴대폰 번호</p>
                        <input
                            className={`${commonInputClass} h-14`}
                            placeholder="010-0000-0000"
                            value={form.cash_receipt_number}
                            onChange={e => setForm((f: any) => ({ ...f, cash_receipt_number: e.target.value }))}
                        />
                    </label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            <span className="material-symbols-outlined text-[16px] align-middle mr-1">info</span>
                            개인 회원의 경우 서비스 이용요금에 대한 현금영수증(소득공제용)이 자동 발행됩니다.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-5 mt-2">
                    <label className="flex flex-col flex-1">
                        <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">사업자 등록번호</p>
                        <input
                            className={`${commonInputClass} h-14`}
                            placeholder="000-00-00000"
                            value={form.biz_reg_number}
                            onChange={e => setForm((f: any) => ({ ...f, biz_reg_number: e.target.value }))}
                        />
                    </label>

                    <label className="flex flex-col flex-1">
                        <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">전자세금계산서 수신 이메일</p>
                        <input
                            className={`${commonInputClass} h-14`}
                            placeholder="example@biz.com"
                            type="email"
                            value={form.biz_email}
                            onChange={e => setForm((f: any) => ({ ...f, biz_email: e.target.value }))}
                        />
                    </label>

                    <div className="flex flex-col flex-1">
                        <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-100">사업자등록증 첨부 (선택)</p>
                        {bizRegPhotoUrl ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <img src={bizRegPhotoUrl} alt="Biz Reg" className="w-full h-full object-contain" />
                                <button className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition" onClick={() => { setBizRegPhoto(null); setBizRegPhotoUrl(''); }}>삭제</button>
                            </div>
                        ) : (
                            <label className="h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <input type="file" accept="image/*" onChange={handleBizRegPhotoChange} className="hidden" />
                                <span className="material-symbols-outlined text-2xl mb-1">upload_file</span>
                                <span className="text-[11px] font-bold">이미지 업로드</span>
                            </label>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
