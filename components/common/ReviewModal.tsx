'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type ReviewType = 'operator_to_worker' | 'worker_to_operator'

const MIN_TAGS = 2

const TAGS_BY_TYPE: Record<ReviewType, { key: string; emoji: string; label: string }[]> = {
  operator_to_worker: [
    { key: 'clean',     emoji: '✨', label: '깔끔해요' },
    { key: 'thorough',  emoji: '🔍', label: '꼼꼼해요' },
    { key: 'punctual',  emoji: '⏰', label: '시간을 잘 지켜요' },
    { key: 'comm',      emoji: '💬', label: '소통이 잘 돼요' },
    { key: 'kind',      emoji: '😊', label: '친절해요' },
    { key: 'pro',       emoji: '👔', label: '전문적이에요' },
    { key: 'again',     emoji: '🔄', label: '또 부탁하고 싶어요' },
  ],
  worker_to_operator: [
    { key: 'guide',       emoji: '📋', label: '안내가 명확해요' },
    { key: 'access',      emoji: '🔑', label: '출입이 편해요' },
    { key: 'fast_reply',  emoji: '⚡', label: '빠르게 답해줘요' },
    { key: 'clean_space', emoji: '🏠', label: '공간이 깔끔했어요' },
    { key: 'kind',        emoji: '😊', label: '친절해요' },
    { key: 'fair',        emoji: '💰', label: '합리적인 가격이에요' },
    { key: 'again',       emoji: '🔄', label: '또 가고 싶어요' },
  ],
}

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
  const tags = TAGS_BY_TYPE[reviewType]

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggleTag = (key: string) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const canSubmit = selectedTags.length >= MIN_TAGS

  const submit = async () => {
    if (!canSubmit) {
      setErr(`태그를 ${MIN_TAGS}개 이상 선택해주세요.`)
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요해요')

      const { error } = await supabase.from('reviews').insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        rating_breakdown: {},
        tags: selectedTags,
        comment: comment.trim() || null,
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

  const displayRating = hoverRating || rating

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
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-1">
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
                ? '솔직한 후기가 더 좋은 매칭을 만들어요.'
                : '별점과 태그가 매너 온도와 티어에 반영돼요.'}
            </p>

            {/* 별점 */}
            <div className="flex flex-col items-center mb-5">
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${n}점`}
                    className="w-11 h-11 flex items-center justify-center"
                  >
                    <Star
                      size={32}
                      className={n <= displayRating ? 'text-sun' : 'text-line-strong'}
                      fill={n <= displayRating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[14px] font-bold text-text-soft">
                {rating === 5 ? '아주 좋았어요!' : rating === 4 ? '좋았어요' : rating === 3 ? '보통이에요' : rating === 2 ? '아쉬웠어요' : '별로였어요'}
              </span>
            </div>

            {/* 태그 선택 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[14px] font-extrabold text-ink">어떤 점이 좋았나요?</span>
                <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${
                  selectedTags.length >= MIN_TAGS
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-text-faint bg-surface-muted'
                }`}>
                  {selectedTags.length}/{tags.length} (최소 {MIN_TAGS}개)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTags.includes(tag.key)
                  return (
                    <button
                      key={tag.key}
                      onClick={() => toggleTag(tag.key)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-bold border-2 transition ${
                        active
                          ? 'border-brand bg-brand-softer text-brand-dark'
                          : 'border-line-soft bg-surface text-text-soft hover:border-brand/40'
                      }`}
                    >
                      <span>{tag.emoji}</span>
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 한 줄 후기 (선택) */}
            <div className="mb-4">
              <label className="t-meta block mb-2 ml-1">한 줄 후기 (선택)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="추가로 남기고 싶은 말이 있나요?"
                className="input min-h-[80px]"
                rows={3}
                maxLength={300}
              />
            </div>

            {err && (
              <div className="mb-3 p-2.5 bg-danger-soft rounded-xl text-[14.5px] font-bold text-danger">
                {err}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                `${rating}점으로 등록`
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
