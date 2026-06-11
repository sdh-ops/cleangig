/**
 * 쓱싹 Pricing & Payment Engine (한국 법 기준)
 *
 * 수수료 구조 (2026-06 개편):
 *   - 공간파트너(호스트): 12%
 *   - 클린파트너(워커):   6% (스타터 기준, 등급별 6→3%)
 *   - 플랫폼 총 수익:     18%
 *
 * 구조:
 *   - Host Payment (공간 운영자 결제액, 부가세 포함 가능)
 *   - Host Fee (플랫폼 매출, 12%)
 *   - Worker Fee (플랫폼 매출, 6%→3%)
 *   - Withholding Tax (원천징수, 프리랜서 3.3%: 소득세 3% + 지방세 0.3%)
 *   - Worker Payout (작업자 실 수령액)
 *
 * 세금 유형:
 *   - FREELANCER: 개인 프리랜서 → 3.3% 원천징수 후 정산
 *   - INDIVIDUAL_BUSINESS: 간이/일반 개인사업자 → 원천징수 없음, 본인이 부가세 신고
 *   - BUSINESS: 법인 → 원천징수 없음, 세금계산서 발행
 */
import type { SpaceType } from './types'

// 공간 유형별 기본 단가 (20평 기준, 워커 최저 수령 35k+ 보장 위해 시장현실 반영)
export const BASE_PRICE_BY_TYPE: Record<SpaceType, number> = {
  airbnb:         45000, // 에어비앤비: 린넨·침구 포함, 체크리스트 많음
  partyroom:      40000, // 파티룸: 음식·주류 오염 잦음
  studio:         40000, // 촬영스튜디오: 바닥·배경지 주의
  gym:            55000, // 헬스장: 운동기구·샤워실 포함
  unmanned_store: 30000, // 무인매장: 규모 작고 체크리스트 단순
  study_cafe:     35000, // 스터디카페: 책상·개인공간 많음
  practice_room:  30000, // 연습실: 비교적 단순
  workspace:      35000, // 공유오피스: 사무기기 주의
  other:          35000,
}

// 면적 구간별 추가 금액 (20평 기준 0원, 10평마다 구간 상승)
export function getAreaBonus(pyeong: number): number {
  if (pyeong <= 10) return -5000
  if (pyeong <= 20) return 0
  if (pyeong <= 30) return 10000
  if (pyeong <= 40) return 20000
  if (pyeong <= 50) return 32000
  return 32000 + Math.round((pyeong - 50) * 800 / 1000) * 1000
}

// 난이도 배율
// 한글·영문 키 모두 허용 — 공간 등록은 한글('보통'), 스키마 기본값은 영문('NORMAL')이라 혼용됨
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  '쉬움':  0.85,
  '보통':  1.0,
  '어려움': 1.2,
  EASY:    0.85,
  NORMAL:  1.0,
  HARD:    1.2,
}

/**
 * 공간 등록 시 추천 가격 자동 계산.
 * 운영자는 이 값을 기준으로 ±조정 가능.
 */
export function suggestBasePrice(
  spaceType: SpaceType,
  pyeong: number | null | undefined,
  difficulty: string = '보통',
): number {
  const base = BASE_PRICE_BY_TYPE[spaceType] ?? 35000
  const areaBonus = pyeong ? getAreaBonus(pyeong) : 0
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0
  const raw = (base + areaBonus) * multiplier
  return Math.max(25000, Math.round(raw / 1000) * 1000)
}

export type TaxType = 'FREELANCER' | 'INDIVIDUAL_BUSINESS' | 'BUSINESS'

export type FeeSettings = {
  host_fee_rate: number       // 0.05
  worker_fee_rate: number     // 0.15
  withholding_tax_rate: number // 0.033 (소득세 3% + 지방세 0.3%)
  vat_rate: number             // 0.10
}

export const DEFAULT_FEES: FeeSettings = {
  host_fee_rate: 0.12,
  worker_fee_rate: 0.06, // STARTER 기준 기본 워커 수수료 (등급별 차등: 6→3%)
  withholding_tax_rate: 0.033,
  vat_rate: 0.10,
}

/** 등급별 워커 수수료율 (2026-06 개편 — 실차등) */
export const WORKER_FEE_RATE_BY_TIER: Record<string, number> = {
  STARTER: 0.06,
  SILVER: 0.05,
  GOLD: 0.04,
  MASTER: 0.03,
}

/** 등급 → 워커 수수료율 (미상 시 STARTER) */
export function workerFeeRateForTier(tier?: string | null): number {
  return WORKER_FEE_RATE_BY_TIER[tier ?? 'STARTER'] ?? 0.06
}

/** 첫 2건 프로모션: total_jobs < 2이면 워커 수수료 2% */
export function workerFeeRateWithPromo(tier?: string | null, totalJobs?: number | null): number {
  if ((totalJobs ?? 99) < 2) return 0.02
  return workerFeeRateForTier(tier)
}

/** 등급별 에스크로 보류일 (정산 속도 차등). GOLD↑ 익일 정산 */
export function settlementHoldDaysForTier(tier?: string | null): number {
  if (tier === 'MASTER' || tier === 'GOLD') return 1
  return 3
}

export type PriceOptions = {
  base_price?: number
  space_type: SpaceType
  size_sqm?: number
  scheduled_at: string
  is_urgent?: boolean
  extra_trash?: boolean
  has_heavy_soil?: boolean
  night_premium?: boolean
  recurring_discount?: boolean
  fees?: FeeSettings
}

export type PriceBreakdown = {
  base: number
  size_adjust: number
  night_surcharge: number
  urgent_fee: number
  extra_trash: number
  heavy_soil: number
  recurring_discount: number
  total: number                  // 공간 운영자 결제액 (VAT 포함 가정)
  host_fee: number                // 호스트 수수료 (플랫폼 매출)
  worker_fee: number              // 워커 수수료 (플랫폼 매출)
  platform_revenue: number        // host_fee + worker_fee
  worker_subtotal: number         // 원천징수 전 워커 기준 금액
  estimated_withholding: number   // 예상 원천징수 (프리랜서 기준)
  estimated_worker_payout: number // 예상 워커 실 수령 (프리랜서 기준)
  worker_payout_if_business: number // 사업자일 경우 실 수령
  items: { label: string; amount: number; kind: 'add' | 'sub' | 'base' }[]
}

/**
 * 요청 생성 시 가격 계산 (워커 미확정 상태)
 */
export function calculatePrice(opts: PriceOptions): PriceBreakdown {
  const fees = opts.fees ?? DEFAULT_FEES
  const base = opts.base_price ?? BASE_PRICE_BY_TYPE[opts.space_type] ?? 30000
  const items: PriceBreakdown['items'] = [{ label: '기본 청소', amount: base, kind: 'base' }]

  let total = base

  let size_adjust = 0
  if (opts.size_sqm && opts.size_sqm > 33) {
    const extra = Math.ceil((opts.size_sqm - 33) / 3.3) * 2000
    size_adjust = extra
    total += extra
    items.push({ label: '공간 크기 할증', amount: extra, kind: 'add' })
  }

  let night_surcharge = 0
  try {
    // KST 고정 — 서버(UTC)·클라(KST) 어디서 실행돼도 동일한 할증 판정
    const hour = (new Date(opts.scheduled_at).getUTCHours() + 9) % 24
    if (opts.night_premium ?? (hour >= 22 || hour < 6)) {
      night_surcharge = Math.round(total * 0.2)
      total += night_surcharge
      items.push({ label: '심야 할증 (22~06시)', amount: night_surcharge, kind: 'add' })
    }
  } catch {}

  let urgent_fee = 0
  if (opts.is_urgent) {
    urgent_fee = 10000
    total += urgent_fee
    items.push({ label: '긴급 요청', amount: urgent_fee, kind: 'add' })
  }

  let extra_trash = 0
  if (opts.extra_trash) {
    extra_trash = 10000
    total += extra_trash
    items.push({ label: '쓰레기 다량', amount: extra_trash, kind: 'add' })
  }

  let heavy_soil = 0
  if (opts.has_heavy_soil) {
    heavy_soil = 15000
    total += heavy_soil
    items.push({ label: '심한 오염', amount: heavy_soil, kind: 'add' })
  }

  let recurring_discount = 0
  if (opts.recurring_discount) {
    recurring_discount = Math.round(total * 0.05)
    total -= recurring_discount
    items.push({ label: '정기 청소 할인 (5%)', amount: -recurring_discount, kind: 'sub' })
  }

  total = Math.round(total / 100) * 100

  const host_fee = Math.round(total * fees.host_fee_rate)
  const worker_fee = Math.round(total * fees.worker_fee_rate)
  const platform_revenue = host_fee + worker_fee
  const worker_subtotal = total - host_fee - worker_fee
  const estimated_withholding = Math.round(worker_subtotal * fees.withholding_tax_rate)
  const estimated_worker_payout = worker_subtotal - estimated_withholding
  const worker_payout_if_business = worker_subtotal

  return {
    base,
    size_adjust,
    night_surcharge,
    urgent_fee,
    extra_trash,
    heavy_soil,
    recurring_discount,
    total,
    host_fee,
    worker_fee,
    platform_revenue,
    worker_subtotal,
    estimated_withholding,
    estimated_worker_payout,
    worker_payout_if_business,
    items,
  }
}

/**
 * 정산 처리 시 실제 지급액 계산 (워커 확정 + 세금 유형 반영)
 */
export type SettlementBreakdown = {
  gross_amount: number
  host_fee: number
  host_fee_rate: number
  worker_fee: number
  worker_fee_rate: number
  worker_subtotal: number
  withholding_tax: number
  withholding_tax_rate: number
  worker_tax_type: TaxType | null
  worker_payout: number
  platform_revenue: number
}

/**
 * 정산 계산.
 *
 * 정책(2026-06 개편):
 *  - 워커 수수료는 등급별 차등 (workerFeeRate로 주입, 기본 STARTER 6%)
 *  - 긴급·심야 할증(premium)에는 플랫폼 수수료를 매기지 않고 100% 워커에게 귀속
 *    → 기피 시간대 매칭 유인. commissionable = gross − premium 에만 수수료 부과
 */
export function calculateSettlement(
  gross_amount: number,
  opts?: { taxType?: TaxType | null; fees?: FeeSettings; workerFeeRate?: number; premium?: number },
): SettlementBreakdown {
  const fees = opts?.fees ?? DEFAULT_FEES
  const taxType = opts?.taxType ?? null
  const workerRate = opts?.workerFeeRate ?? fees.worker_fee_rate
  const premium = Math.max(0, Math.min(opts?.premium ?? 0, gross_amount)) // 할증분 (수수료 면제)
  const commissionable = gross_amount - premium

  const host_fee = Math.round(commissionable * fees.host_fee_rate)
  const worker_fee = Math.round(commissionable * workerRate)
  // 워커 기준액 = (수수료 부과분 − 수수료) + 할증 전액
  const worker_subtotal = commissionable - host_fee - worker_fee + premium

  const shouldWithhold = taxType === 'FREELANCER'
  const withholding_tax = shouldWithhold
    ? Math.floor(worker_subtotal * fees.withholding_tax_rate / 10) * 10 // 10원 단위 절사
    : 0

  const worker_payout = worker_subtotal - withholding_tax
  const platform_revenue = host_fee + worker_fee

  return {
    gross_amount,
    host_fee,
    host_fee_rate: fees.host_fee_rate,
    worker_fee,
    worker_fee_rate: workerRate,
    worker_subtotal,
    withholding_tax,
    withholding_tax_rate: shouldWithhold ? fees.withholding_tax_rate : 0,
    worker_tax_type: taxType,
    worker_payout,
    platform_revenue,
  }
}

/**
 * price_breakdown에서 수수료 면제 대상 할증액(긴급+심야) 합산.
 */
export function premiumFromBreakdown(pb: { urgent_fee?: number; night_surcharge?: number } | null | undefined): number {
  if (!pb) return 0
  return (pb.urgent_fee ?? 0) + (pb.night_surcharge ?? 0)
}

/**
 * 워커 예상 실수령액 (프리랜서·STARTER 기준, 세금 3.3% 차감 후).
 * 작업 카드·목록·상세에서 동일 금액을 보여주기 위한 단일 소스 — 보수적(가장 낮은) 추정.
 * 실제 정산은 워커 등급·세금유형·할증을 반영해 더 높을 수 있음.
 */
export function estimateWorkerPayout(grossPrice: number): number {
  return calculateSettlement(grossPrice, { taxType: 'FREELANCER' }).worker_payout
}

/**
 * 취소 정책
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
