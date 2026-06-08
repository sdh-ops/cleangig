'use client'

import { Plus, X, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { rid } from '@/lib/utils'

export type AccessCode = { id: string; label: string; value: string }

const PRESET_LABELS = ['공동현관', '출입문', '청소도구함'] as const
const CUSTOM = '__custom__'

export function makeAccessCode(label = '공동현관', value = ''): AccessCode {
  return { id: rid('ac'), label, value }
}

type Props = {
  codes: AccessCode[]
  onChange: (next: AccessCode[]) => void
}

/**
 * 공간 출입 비밀번호 가변 편집기.
 * 드롭다운(공동현관/출입문/청소도구함/직접 입력) + 비밀번호 입력 + ＋ 추가.
 */
export default function AccessCodesEditor({ codes, onChange }: Props) {
  const [revealed, setRevealed] = useState(false)

  const update = (id: string, patch: Partial<AccessCode>) =>
    onChange(codes.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const remove = (id: string) => onChange(codes.filter((c) => c.id !== id))

  const add = () => onChange([...codes, makeAccessCode('', '')])

  return (
    <div className="flex flex-col gap-2.5">
      {codes.map((code) => {
        const isPreset = (PRESET_LABELS as readonly string[]).includes(code.label)
        const selectValue = isPreset ? code.label : CUSTOM
        return (
          <div key={code.id} className="rounded-2xl border-2 border-line-soft bg-surface p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-softer text-brand-dark flex items-center justify-center shrink-0">
                <Lock size={15} />
              </div>
              <select
                value={selectValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === CUSTOM) update(code.id, { label: '' })
                  else update(code.id, { label: v })
                }}
                className="input !min-h-[44px] !py-2 flex-1 text-[14px]"
              >
                {PRESET_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
                <option value={CUSTOM}>직접 입력</option>
              </select>
              <button
                type="button"
                onClick={() => remove(code.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-faint hover:text-danger hover:bg-danger-soft transition shrink-0"
                aria-label="삭제"
              >
                <X size={16} />
              </button>
            </div>

            {/* 직접 입력 라벨 */}
            {!isPreset && (
              <input
                value={code.label}
                onChange={(e) => update(code.id, { label: e.target.value })}
                placeholder="장소 이름 (예: 옥상 키박스)"
                className="input !min-h-[44px] !py-2 text-[14px]"
                maxLength={20}
              />
            )}

            {/* 비밀번호 */}
            <div className="relative">
              <input
                type={revealed ? 'text' : 'password'}
                value={code.value}
                onChange={(e) => update(code.id, { value: e.target.value })}
                placeholder="비밀번호 / 출입 방법"
                className="input !min-h-[44px] !py-2 pr-10 text-[14px]"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-ink"
                aria-label={revealed ? '숨기기' : '보기'}
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 h-11 rounded-2xl border-2 border-dashed border-line text-text-soft font-extrabold text-[13.5px] hover:border-brand hover:text-brand-dark transition"
      >
        <Plus size={17} /> 비밀번호 추가
      </button>
    </div>
  )
}
