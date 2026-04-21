'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Loader2, Camera } from 'lucide-react'
import ImageUploader from './ImageUploader'
import { haptic } from '@/lib/haptic'

const CATEGORIES = [
  { key: 'quality', label: '청소 품질 미흡' },
  { key: 'noshow', label: '노쇼 / 지각' },
  { key: 'damage', label: '파손 / 분실' },
  { key: 'safety', label: '안전 / 매너 문제' },
  { key: 'payment', label: '결제 / 정산 오류' },
  { key: 'other', label: '기타' },
]

type Props = {
  open: boolean
  onClose: () => void
  jobId: string
  onSubmitted?: () => void
}

export default function DisputeModal({ open, onClose, jobId, onSubmitted }: Props) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!category) { setErr('신고 유형을 선택해주세요.'); return }
    if (description.trim().length < 10) { setErr('상황을 10자 이상 설명해주세요.'); return }
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, category, description: description.trim(), evidence_urls: evidence }),
      })
      const data = await res.json()
      if (!data?.ok) throw new Error(data?.error || '신고 실패')
      haptic.success()
      onSubmitted?.()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '신고 실패')
      haptic.error()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-danger" />
                <h3 className="h-section text-ink">문제 신고</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="t-caption mb-5">관리자가 24시간 내 검토하여 처리합니다. 허위 신고 시 계정 이용 제한이 있을 수 있어요.</p>

            <div className="mb-4">
              <label className="t-meta block mb-2 ml-1">신고 유형 *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`rounded-xl border-2 p-3 text-[12.5px] font-extrabold text-left transition ${
                      category === c.key ? 'border-danger bg-danger-soft text-danger' : 'border-line-soft bg-surface text-ink'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="t-meta block mb-2 ml-1">상세 설명 * (최소 10자)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어떤 상황이었나요? 시간, 장소, 당사자 언행을 구체적으로 적어주세요."
                className="input min-h-[120px]"
                rows={4}
                maxLength={1000}
              />
              <p className="text-[11px] text-text-faint font-medium mt-1 ml-1">{description.length}/1000</p>
            </div>

            <div className="mb-5">
              <label className="t-meta block mb-2 ml-1 flex items-center gap-1.5">
                <Camera size={12} /> 증거 사진 (최대 4장)
              </label>
              <ImageUploader bucket="photos" folder="disputes" value={evidence} onChange={setEvidence} max={4} aspect="square" />
            </div>

            {err && <div className="mb-3 p-3 rounded-xl bg-danger-soft text-[13px] font-bold text-danger">{err}</div>}

            <div className="flex gap-2">
              <button onClick={onClose} disabled={submitting} className="flex-1 btn btn-ghost">취소</button>
              <button onClick={submit} disabled={submitting} className="flex-1 btn btn-primary !bg-danger">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : '신고 접수'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
