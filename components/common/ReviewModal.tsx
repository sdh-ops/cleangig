'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type ReviewType = 'operator_to_worker' | 'worker_to_operator'

const CATS_BY_TYPE: Record<ReviewType, { key: string; label: string }[]> = {
  operator_to_worker: [
    { key: 'cleanliness', label: '청결도' },
    { key: 'communication', label: '소통' },
    { key: 'punctuality', label: '시간 준수' },
  ],
  worker_to_operator: [
    { key: 'guide_accuracy', label: '안내 정확도' },
    { key: 'communication', label: '소통' },
    { key: 'work_environment', label: '작업 환경' },
  ],
}

const DEFAULT_BREAKDOWN = (reviewType: ReviewType) =>
  Object.fromEntries(CATS_BY_TYPE[reviewType].map((c) => [c.key, 5]))

type Props = {
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
  jobId: string
  revieweeId: string
  revieweeName?: string
  title?: string
  reviewType?: ReviewType
}

export default function ReviewModal({
  open,
  onClose,
  onSubmitted,
  jobId,
  revieweeId,
  revieweeName,
  title,
  reviewType = 'operator_to_worker',
}: Props) {
  const supabase = createClient()
  const cats = CATS_BY_TYPE[reviewType]
  const [breakdown, setBreakdown] = useState<Record<string, number>>(DEFAULT_BREAKDOWN(reviewType))
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const avg = cats.reduce((sum, c) => sum + (breakdown[c.key] ?? 5), 0) / cats.length
  const displayRating = Math.round(avg * 10) / 10

  const updateBreakdown = (key: string, val: number) => {
    setBreakdown((b) => ({ ...b, [key]: val }))
  }

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요해요')

      const { error } = await supabase.from('reviews').insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating: displayRating,
        rating_breakdown: breakdown,
        comment: comment || null,
        is_public: true,
        review_type: reviewType,
      })
      if (error) throw error
      onSubmitted?.()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '리뷰 등록 실패')
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
            transition={{ type: 'spring', stiffness: 250, damping: 24 }}
            className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="h-section text-ink">
                {title || (revieweeName ? `${revieweeName}님과의 경험` : '리뷰 작성')}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <p className="t-caption mb-5">
              {reviewType === 'worker_to_operator'
                ? '안내·소통·환경을 솔직하게 평가해주세요.'
                : '별점이 매너 온도와 티어에 반영돼요.'}
            </p>

            {cats.map((cat) => (
              <div key={cat.key} className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-extrabold text-ink">{cat.label}</span>
                  <span className="text-[14.5px] font-bold text-brand-dark">
                    {(breakdown[cat.key] ?? 5).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateBreakdown(cat.key, n)}
                      className="w-9 h-9 flex items-center justify-center"
                      aria-label={`${n}점`}
                    >
                      <Star
                        size={24}
                        className={n <= (breakdown[cat.key] ?? 5) ? 'text-sun' : 'text-line-strong'}
                        fill={n <= (breakdown[cat.key] ?? 5) ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mb-4">
              <label className="t-meta block mb-2 ml-1">한 줄 후기 (선택)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="어떤 점이 좋았나요?"
                className="input min-h-[90px]"
                rows={3}
                maxLength={300}
              />
            </div>

            {err && (
              <div className="mb-3 p-2.5 bg-danger-soft rounded-xl text-[14.5px] font-bold text-danger">
                {err}
              </div>
            )}

            <button onClick={submit} disabled={submitting} className="btn btn-primary w-full">
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                `${displayRating.toFixed(1)}점 등록`
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
