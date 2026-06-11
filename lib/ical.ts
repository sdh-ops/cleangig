import 'server-only'

/**
 * 경량 iCalendar(.ics) 파서 — 에어비앤비/부킹닷컴 예약 캘린더 연동용.
 *
 * 외부 라이브러리 없이 VEVENT의 DTSTART/DTEND/SUMMARY만 추출한다.
 * 에어비앤비 내보내기 캘린더는 VALUE=DATE 형식(YYYYMMDD)이며
 * DTEND가 체크아웃 날짜다 (iCal 규약상 DTEND는 exclusive — 그날 손님이 나감).
 */

export type IcalEvent = {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD (체크아웃 날짜)
  summary: string
}

/** ical 본문 → 이벤트 배열. 파싱 불가 라인은 무시 (관대한 파서) */
export function parseIcal(text: string): IcalEvent[] {
  // RFC 5545 line unfolding: 줄바꿈 후 공백/탭으로 시작하면 이전 줄에 이어붙임
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const events: IcalEvent[] = []
  let cur: Partial<IcalEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur?.start && cur?.end) {
        events.push({ start: cur.start, end: cur.end, summary: cur.summary ?? '' })
      }
      cur = null
      continue
    }
    if (!cur) continue

    const colon = line.indexOf(':')
    if (colon < 0) continue
    const keyPart = line.slice(0, colon)     // e.g. "DTSTART;VALUE=DATE"
    const value = line.slice(colon + 1)
    const key = keyPart.split(';')[0]

    if (key === 'DTSTART') cur.start = toDateString(value)
    else if (key === 'DTEND') cur.end = toDateString(value)
    else if (key === 'SUMMARY') cur.summary = value.trim()
  }
  return events
}

/** YYYYMMDD 또는 YYYYMMDDTHHMMSS(Z) → YYYY-MM-DD */
function toDateString(v: string): string {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}`
}

export type Checkout = {
  date: string    // 체크아웃 날짜 (청소 가능일)
  summary: string
  nights: number  // 숙박일수 (참고용)
}

/** 오늘 이후 daysAhead일 이내 체크아웃 목록 (날짜 오름차순, 중복 제거) */
export function upcomingCheckouts(events: IcalEvent[], daysAhead = 30): Checkout[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = new Date(today)
  limit.setDate(limit.getDate() + daysAhead)

  const seen = new Set<string>()
  return events
    .filter((e) => e.start && e.end)
    .map((e) => ({
      date: e.end,
      summary: e.summary,
      nights: Math.max(1, Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 86400000)),
    }))
    .filter((c) => {
      const d = new Date(`${c.date}T00:00:00`)
      if (d < today || d > limit) return false
      if (seen.has(c.date)) return false
      seen.add(c.date)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))
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
  // IP 리터럴 차단 (IPv4/IPv6)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return false
  return true
}
