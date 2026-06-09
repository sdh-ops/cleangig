/**
 * 쓱싹 Pricing & Payment Engine (한국 법 기준)
 *
 * 수수료 구조 (테스트 버전 — 단일 고정 수수료):
 *   - 공간파트너(호스트): 5%
 *   - 클린파트너(워커):   15%
 *   - 플랫폼 총 수익:     20%
 *
 * 구조:
 *   - Host Payment (공간 운영자 결제액, 부가세 포함 가능)
 *   - Host Fee (플랫폼 매출, 5%)
 *   - Worker Fee (플랫폼 매출, 15%)
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
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  '쉬움':  0.85,
  '보통':  1.0,
  '어려움': 1.2,
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
  return Math.max(15000, Math.round(raw / 1000) * 1000)
}

export type TaxType = 'FREELANCER' | 'INDIVIDUAL_BUSINESS' | 'BUSINESS'

export type FeeSettings = {
  host_fee_rate: number       // 0.05
  worker_fee_rate: number     // 0.15
  withholding_tax_rate: number // 0.033 (소득세 3% + 지방세 0.3%)
  vat_rate: number             // 0.10
}

export const DEFAULT_FEES: FeeSettings = {
  host_fee_rate: 0.05,
  worker_fee_rate: 0.15, // 테스트 버전: 고정 15% (총 수수료 20%)
  withholding_tax_rate: 0.033,
  vat_rate: 0.10,
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
    const hour = new Date(opts.scheduled_at).getHours()
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

export function calculateSettlement(
  gross_amount: number,
  opts?: { taxType?: TaxType | null; fees?: FeeSettings },
): SettlementBreakdown {
  const fees = opts?.fees ?? DEFAULT_FEES
  const taxType = opts?.taxType ?? null
  const host_fee = Math.round(gross_amount * fees.host_fee_rate)
  const worker_fee = Math.round(gross_amount * fees.worker_fee_rate)
  const worker_subtotal = gross_amount - host_fee - worker_fee

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
    worker_fee_rate: fees.worker_fee_rate,
    worker_subtotal,
    withholding_tax,
    withholding_tax_rate: shouldWithhold ? fees.withholding_tax_rate : 0,
    worker_tax_type: taxType,
    worker_payout,
    platform_revenue,
  }
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
