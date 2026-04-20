/**
 * 쓱싹 Pricing Engine
 * 공간 유형 / 크기 / 시간대 / 긴급도 / 옵션 기반 가격 계산
 */
import type { SpaceType } from './types'

export const BASE_PRICE_BY_TYPE: Record<SpaceType, number> = {
  airbnb: 35000,
  partyroom: 35000,
  studio: 30000,
  gym: 45000,
  unmanned_store: 25000,
  study_cafe: 30000,
  practice_room: 25000,
  workspace: 35000,
  other: 30000,
}

export type PriceOptions = {
  base_price?: number
  space_type: SpaceType
  size_sqm?: number
  scheduled_at: string // ISO
  is_urgent?: boolean
  extra_trash?: boolean
  has_heavy_soil?: boolean
  night_premium?: boolean
  recurring_discount?: boolean
}

export type PriceBreakdown = {
  base: number
  size_adjust: number
  night_surcharge: number
  urgent_fee: number
  extra_trash: number
  heavy_soil: number
  recurring_discount: number
  total: number
  worker_payout: number
  platform_fee: number
  host_fee: number
  items: { label: string; amount: number; kind: 'add' | 'sub' | 'base' }[]
}

const PLATFORM_TAKE_RATE = 0.12 // 12% (Phase 1, may go to 15% later)

/**
 * 가격 계산 메인
 */
export function calculatePrice(opts: PriceOptions): PriceBreakdown {
  const base = opts.base_price ?? BASE_PRICE_BY_TYPE[opts.space_type] ?? 30000
  const items: PriceBreakdown['items'] = [{ label: '기본 청소', amount: base, kind: 'base' }]

  let total = base

  // 크기 할증 (33㎡ 초과 시 평당 500원 가산 - 단순 모델)
  let size_adjust = 0
  if (opts.size_sqm && opts.size_sqm > 33) {
    const extra = Math.ceil((opts.size_sqm - 33) / 3.3) * 2000
    size_adjust = extra
    total += extra
    items.push({ label: '공간 크기 할증', amount: extra, kind: 'add' })
  }

  // 심야 할증 (22시~06시 요청 시 +20%)
  let night_surcharge = 0
  try {
    const hour = new Date(opts.scheduled_at).getHours()
    if (opts.night_premium ?? (hour >= 22 || hour < 6)) {
      night_surcharge = Math.round(total * 0.2)
      total += night_surcharge
      items.push({ label: '심야 할증 (22시~06시)', amount: night_surcharge, kind: 'add' })
    }
  } catch {}

  // 긴급 요청 (3시간 이내): +10,000원
  let urgent_fee = 0
  if (opts.is_urgent) {
    urgent_fee = 10000
    total += urgent_fee
    items.push({ label: '긴급 요청', amount: urgent_fee, kind: 'add' })
  }

  // 쓰레기 다량
  let extra_trash = 0
  if (opts.extra_trash) {
    extra_trash = 10000
    total += extra_trash
    items.push({ label: '쓰레기 다량', amount: extra_trash, kind: 'add' })
  }

  // 심한 오염
  let heavy_soil = 0
  if (opts.has_heavy_soil) {
    heavy_soil = 15000
    total += heavy_soil
    items.push({ label: '심한 오염', amount: heavy_soil, kind: 'add' })
  }

  // 고정 청소 할인 (-5%)
  let recurring_discount = 0
  if (opts.recurring_discount) {
    recurring_discount = Math.round(total * 0.05)
    total -= recurring_discount
    items.push({ label: '정기 청소 할인 (5%)', amount: -recurring_discount, kind: 'sub' })
  }

  // 라운드 (100원 단위)
  total = Math.round(total / 100) * 100

  const platform_fee = Math.round(total * PLATFORM_TAKE_RATE)
  const worker_payout = total - platform_fee
  // 우선은 수수료 전액 플랫폼이 가져가는 단일 모델 (추후 Host/Worker split 가능)
  const host_fee = 0

  return {
    base,
    size_adjust,
    night_surcharge,
    urgent_fee,
    extra_trash,
    heavy_soil,
    recurring_discount,
    total,
    worker_payout,
    platform_fee,
    host_fee,
    items,
  }
}

/**
 * 취소 환불 정책
 */
export function cancelRefundRate(scheduledAt: string, now: Date = new Date()): {
  rate: number
  label: string
} {
  const scheduled = new Date(scheduledAt)
  const hoursLeft = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursLeft >= 24) return { rate: 1.0, label: '무료 취소' }
  if (hoursLeft >= 3) return { rate: 0.7, label: '30% 취소 수수료' }
  if (hoursLeft >= 1) return { rate: 0.5, label: '50% 취소 수수료' }
  return { rate: 0, label: '환불 불가' }
}
