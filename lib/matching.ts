/**
 * 쓱싹 Matching Engine
 * Worker × Job 매칭 스코어 계산
 */
import type { User, Job } from './types'
import { haversineKm } from './utils'

export type MatchInputs = {
  worker: Pick<User, 'id' | 'tier' | 'avg_rating' | 'total_jobs' | 'sparkle_score'>
  worker_lat: number
  worker_lng: number
  space_lat: number
  space_lng: number
  job: Pick<Job, 'price' | 'is_urgent' | 'scheduled_at' | 'preferred_worker_id' | 'targeting_worker_id' | 'is_recurring'>
  is_favorite?: boolean
}

export type MatchScore = {
  total: number        // 0-100
  distance_km: number
  breakdown: {
    distance: number        // 30점
    rating: number          // 25점
    experience: number      // 15점
    sparkle: number         // 10점
    favorite_bonus: number  // 10점
    urgency_bonus: number   // 5점
    preferred_bonus: number // 5점
  }
  tags: string[]
}

const TIER_WEIGHT: Record<string, number> = {
  STARTER: 0.4,
  SILVER: 0.7,
  GOLD: 0.9,
  MASTER: 1.0,
}

/**
 * 거리 점수 (0km=30, 5km=15, 10km=0)
 */
function distanceScore(km: number): number {
  if (km <= 1) return 30
  if (km >= 10) return 0
  return Math.round(30 - (km - 1) * (30 / 9))
}

/**
 * 평점 점수 (4.8~5.0=25, 4.0=15, 3.0=0)
 */
function ratingScore(rating?: number): number {
  if (!rating) return 12
  if (rating >= 4.8) return 25
  if (rating >= 4.5) return 22
  if (rating >= 4.0) return 15
  if (rating >= 3.5) return 8
  return 0
}

/**
 * 경험 점수 (1000건+=15, 100건=12, 30건=8, 0건=3)
 */
function experienceScore(total_jobs?: number): number {
  const n = total_jobs ?? 0
  if (n >= 1000) return 15
  if (n >= 300) return 13
  if (n >= 100) return 12
  if (n >= 30) return 8
  if (n >= 5) return 5
  return 3
}

/**
 * Sparkle 점수 (플랫폼 활동 0-100 → 0-10점)
 */
function sparkleScore(sparkle?: number): number {
  const s = sparkle ?? 0
  return Math.round((Math.min(s, 100) / 100) * 10)
}

/**
 * 매칭 스코어 계산
 */
export function computeMatchScore(inp: MatchInputs): MatchScore {
  const distance_km = haversineKm(inp.worker_lat, inp.worker_lng, inp.space_lat, inp.space_lng)

  const distance = distanceScore(distance_km)
  const rating = ratingScore(inp.worker.avg_rating)
  const experience = experienceScore(inp.worker.total_jobs)
  const sparkle = sparkleScore(inp.worker.sparkle_score)
  const tier_mult = TIER_WEIGHT[inp.worker.tier ?? 'STARTER'] ?? 0.5

  const favorite_bonus = inp.is_favorite ? 10 : 0
  const preferred_bonus =
    inp.job.preferred_worker_id === inp.worker.id || inp.job.targeting_worker_id === inp.worker.id
      ? 5
      : 0
  const urgency_bonus = inp.job.is_urgent ? 5 : 0

  const raw = distance + rating + experience + sparkle + favorite_bonus + urgency_bonus + preferred_bonus
  const total = Math.round(Math.min(100, raw * tier_mult + raw * (1 - tier_mult) * 0.9))

  const tags: string[] = []
  if (distance_km <= 2) tags.push('근거리')
  if ((inp.worker.avg_rating ?? 0) >= 4.8) tags.push('평점 최상')
  if ((inp.worker.total_jobs ?? 0) >= 100) tags.push('100건 이상')
  if (inp.is_favorite) tags.push('단골')
  if (preferred_bonus > 0) tags.push('추천 작업자')
  if (inp.worker.tier === 'MASTER') tags.push('마스터')
  else if (inp.worker.tier === 'GOLD') tags.push('골드')

  return {
    total,
    distance_km,
    breakdown: {
      distance,
      rating,
      experience,
      sparkle,
      favorite_bonus,
      urgency_bonus,
      preferred_bonus,
    },
    tags,
  }
}

/**
 * 작업자 Tier 계산
 *
 * 플랫폼 초기 현실성 반영 — 신규 파트너도 단기간에 Silver 도달 가능하도록 설계.
 * STARTER → SILVER: 10건 이상 + 4.0점
 * SILVER  → GOLD:   50건 이상 + 4.5점
 * GOLD    → MASTER: 150건 이상 + 4.8점
 */
export function computeWorkerTier(stats: { total_jobs: number; avg_rating: number }):
  'STARTER' | 'SILVER' | 'GOLD' | 'MASTER' {
  if (stats.total_jobs >= 150 && stats.avg_rating >= 4.8) return 'MASTER'
  if (stats.total_jobs >= 50 && stats.avg_rating >= 4.5) return 'GOLD'
  if (stats.total_jobs >= 10 && stats.avg_rating >= 4.0) return 'SILVER'
  return 'STARTER'
}

/**
 * 티어별 혜택
 *
 * fee_rate: 플랫폼 수수료율 (작업 수익에서 차감)
 * fee_discount: 스타터(15%) 대비 절감율
 * priority: 매칭 우선순위 (높을수록 우선)
 */
export const TIER_BENEFITS: Record<string, {
  fee_rate: number       // 실제 수수료율 (예: 0.15 = 15%)
  fee_discount: number   // 스타터 대비 절감 (예: 0.04 = 4%p 절감)
  priority: number
  label: string
  color: string
  badge: string          // 표시용 뱃지 텍스트
  perks: string[]        // 혜택 요약
}> = {
  STARTER: {
    fee_rate: 0.15, fee_discount: 0, priority: 0,
    label: '스타터', color: '#94A3B8', badge: 'STARTER',
    perks: ['수수료 15%', '기본 매칭'],
  },
  SILVER: {
    fee_rate: 0.13, fee_discount: 0.02, priority: 1,
    label: '실버', color: '#64748B', badge: 'SILVER',
    perks: ['수수료 13% (-2%p)', '매칭 우선순위 ↑', '실버 배지'],
  },
  GOLD: {
    fee_rate: 0.11, fee_discount: 0.04, priority: 2,
    label: '골드', color: '#F59E0B', badge: 'GOLD',
    perks: ['수수료 11% (-4%p)', '매칭 최우선', '골드 배지', '주간 정산 가능'],
  },
  MASTER: {
    fee_rate: 0.09, fee_discount: 0.06, priority: 3,
    label: '마스터', color: '#0EA5E9', badge: 'MASTER',
    perks: ['수수료 9% (-6%p)', '단독 공간 제안', '마스터 배지', '전담 매니저'],
  },
}
