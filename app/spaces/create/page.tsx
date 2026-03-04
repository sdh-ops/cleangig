'use client'

import { useState } from 'react'
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
        { id: '4', label: '쓰가기 수거', required: true },
        { id: '5', label: '소품 제자리 정리', required: false },
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
        caution_notes: '',
        size_sqm: '',
        base_price: '30000',
        estimated_duration: '60',
        description: '',
    })
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLISTS['airbnb'])
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: 기본정보, 2: 체크리스트

    const handleTypeChange = (type: SpaceType) => {
        setForm(f => ({ ...f, type }))
        setChecklist(DEFAULT_CHECKLISTS[type] || DEFAULT_CHECKLISTS['airbnb'])
    }

    const handleSubmit = async () => {
        if (!form.name || !form.address) return
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data, error } = await supabase.from('spaces').insert({
            operator_id: user.id,
            name: form.name,
            type: form.type,
            address: form.address,
            address_detail: form.address_detail,
            entry_code: form.entry_code,
            caution_notes: form.caution_notes,
            size_sqm: form.size_sqm ? parseInt(form.size_sqm) : null,
            base_price: parseInt(form.base_price),
            estimated_duration: parseInt(form.estimated_duration),
            description: form.description,
            checklist_template: checklist,
            is_active: true,
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
                            <input className="form-input" placeholder="예: 서울 마포구 합정동 123-4"
                                value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                            <input className="form-input mt-sm" placeholder="상세주소 (동·호수 등)"
                                value={form.address_detail} onChange={e => setForm(f => ({ ...f, address_detail: e.target.value }))} />
                        </div>

                        {/* 출입 정보 및 주의사항 (추가됨) */}
                        <div className="form-group">
                            <label className="form-label">출입 비밀번호 (작업자 매칭 시에만 공개)</label>
                            <input className="form-input" placeholder="예: *1234# 또는 공동현관문 포함"
                                value={form.entry_code} onChange={e => setForm(f => ({ ...f, entry_code: e.target.value }))} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">청소 시 주의사항 (작업자 매칭 시에만 공개)</label>
                            <textarea className="form-input" placeholder="예: 현관 옆 소독제 비치, 음식물 쓰레기는 문 앞에 등"
                                rows={2} value={form.caution_notes}
                                onChange={e => setForm(f => ({ ...f, caution_notes: e.target.value }))} />
                        </div>

                        {/* 규모 & 가격 */}
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">면적 (㎡)</label>
                                <input className="form-input" type="number" placeholder="50"
                                    value={form.size_sqm} onChange={e => setForm(f => ({ ...f, size_sqm: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">예상 시간 (분)</label>
                                <input className="form-input" type="number" placeholder="60"
                                    value={form.estimated_duration} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">기본 청소 단가 (원)</label>
                            <input className="form-input" type="number" placeholder="30000"
                                value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />
                            <p className="form-hint">작업자 기준 단가입니다. 플랫폼 수수료 10%가 추가됩니다.</p>
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
                            id="next-to-checklist"
                        >
                            다음: 체크리스트 설정 →
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="text-secondary text-sm mb-md">
                            청소 작업자가 완료해야 할 항목을 설정하세요.<br />
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

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleSubmit}
                            disabled={loading || checklist.length === 0}
                            id="submit-space"
                        >
                            {loading ? <span className="spinner" /> : '🏠 공간 등록 완료'}
                        </button>
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
      `}</style>
        </div>
    )
}
