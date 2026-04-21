/**
 * 쓱싹 Platform Settings helper
 * DB의 platform_settings 테이블에서 값을 읽어오고, 실패 시 기본값으로 대체.
 */
import { createClient as createBrowserClient } from './supabase/client'
import { DEFAULT_FEES, type FeeSettings } from './pricing'

export type UrgencySettings = {
  urgent_fee: number
  night_multiplier: number
  night_start_hour: number
  night_end_hour: number
}

export type CancelPolicy = {
  free_hours: number
  light_rate: number
  heavy_rate: number
  heavy_hours: number
}

export const DEFAULT_URGENCY: UrgencySettings = {
  urgent_fee: 10000,
  night_multiplier: 0.2,
  night_start_hour: 22,
  night_end_hour: 6,
}

export const DEFAULT_CANCEL: CancelPolicy = {
  free_hours: 24,
  light_rate: 0.3,
  heavy_rate: 0.5,
  heavy_hours: 1,
}

let _feeCache: FeeSettings | null = null
let _feeCacheTs = 0
const TTL = 60 * 1000 // 1 min

export async function getFeeSettings(): Promise<FeeSettings> {
  if (_feeCache && Date.now() - _feeCacheTs < TTL) return _feeCache
  try {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'fees')
      .maybeSingle()
    if (data?.value) {
      _feeCache = { ...DEFAULT_FEES, ...(data.value as Partial<FeeSettings>) }
      _feeCacheTs = Date.now()
      return _feeCache
    }
  } catch {
    // fall through
  }
  _feeCache = DEFAULT_FEES
  _feeCacheTs = Date.now()
  return DEFAULT_FEES
}

export async function saveFeeSettings(
  newFees: FeeSettings,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: newFees, updated_at: new Date().toISOString() })
      .eq('key', 'fees')
    if (error) return { ok: false, error: error.message }
    _feeCache = newFees
    _feeCacheTs = Date.now()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export function invalidateFeeCache() {
  _feeCache = null
  _feeCacheTs = 0
}
