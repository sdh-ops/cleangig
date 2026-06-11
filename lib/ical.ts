import 'server-only'

/**
 * 경량 iCalendar(.ics) 파서 — 예약 캘린더 연동용.
 *
 * 두 형식을 모두 지원한다:
 *  - 에어비앤비/부킹닷컴: VALUE=DATE (YYYYMMDD), DTEND가 체크아웃 날짜(exclusive)
 *  - 스페이스클라우드/파티룸: DATETIME (YYYYMMDDTHHMMSS), 시간대 단위 예약
 *
 * 청소는 "예약이 끝난 직후"에 필요하므로 DTEND(날짜+시간)를 청소 슬롯의 기준으로 쓴다.
 */

export type IcalEvent = {
  startDate: string        // YYYY-MM-DD
  startTime: string | null // HH:MM (날짜형이면 null)
  endDate: string          // YYYY-MM-DD
  endTime: string | null   // HH:MM
  summary: string
}

export function parseIcal(text: string): IcalEvent[] {
  // RFC 5545 line unfolding
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const events: IcalEvent[] = []
  let cur: Partial<IcalEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur?.startDate && cur?.endDate) {
        events.push({
          startDate: cur.startDate,
          startTime: cur.startTime ?? null,
          endDate: cur.endDate,
          endTime: cur.endTime ?? null,
          summary: cur.summary ?? '',
        })
      }
      cur = null
      continue
    }
    if (!cur) continue

    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).split(';')[0]
    const value = line.slice(colon + 1)

    if (key === 'DTSTART') { cur.startDate = icalDate(value); cur.startTime = icalTime(value) }
    else if (key === 'DTEND') { cur.endDate = icalDate(value); cur.endTime = icalTime(value) }
    else if (key === 'SUMMARY') cur.summary = value.trim()
  }
  return events
}

function icalDate(v: string): string {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}
function icalTime(v: string): string | null {
  const m = v.match(/T(\d{2})(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}

export type CleaningSlot = {
  date: string         // 청소 가능일 (예약 종료 날짜)
  time: string | null  // 예약 종료 시각 (시간제 예약). 날짜형(체크아웃)이면 null
  summary: string
  dateOnly: boolean    // true=체크아웃형(시간 없음), false=시간대 예약
}

/**
 * 다가오는 "예약 종료 후 청소 슬롯" 목록.
 * - 시간제 예약: 종료 시각(date+time)이 지금 이후
 * - 날짜형 체크아웃: 종료 날짜가 오늘 이후
 * 날짜+시간 오름차순, 중복 제거.
 *
 * @param nowMs  기준 시각 (ms) — 테스트·재현성 위해 주입
 */
export function upcomingCleaningSlots(events: IcalEvent[], daysAhead = 45, nowMs = Date.now()): CleaningSlot[] {
  const now = new Date(nowMs)
  const todayStr = toLocalDateStr(now)
  const limitMs = nowMs + daysAhead * 86400000

  const seen = new Set<string>()
  const slots: { slot: CleaningSlot; sortMs: number }[] = []

  for (const e of events) {
    if (!e.endDate) continue
    const dateOnly = !e.endTime
    // 정렬·필터 기준 시각: 시간제는 종료 시각, 날짜형은 그날 오전 (체크아웃 후 청소 시작 가정)
    const refMs = new Date(`${e.endDate}T${e.endTime ?? '11:00'}:00`).getTime()
    if (!Number.isFinite(refMs)) continue

    if (dateOnly) {
      if (e.endDate < todayStr) continue
    } else if (refMs <= nowMs) continue

    if (refMs > limitMs) continue

    const dedup = `${e.endDate}T${e.endTime ?? ''}`
    if (seen.has(dedup)) continue
    seen.add(dedup)

    slots.push({
      slot: { date: e.endDate, time: e.endTime, summary: e.summary, dateOnly },
      sortMs: refMs,
    })
  }

  return slots.sort((a, b) => a.sortMs - b.sortMs).map((s) => s.slot)
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** iCal URL 안전성 검증 — https 강제, 내부망/IP 직접 접근 차단 (SSRF 방지) */
export function isSafeIcalUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return false
  return true
}
