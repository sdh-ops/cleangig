/**
 * 주소 마스킹 처리
 */
export function maskAddress(address: string): string {
  if (!address) return ''
  const parts = address.split(' ')
  if (parts.length <= 2) return address + ' ***'
  return parts.slice(0, -1).join(' ') + ' ***'
}

/**
 * 이름 마스킹 (김*수)
 */
export function maskName(name: string): string {
  if (!name) return ''
  if (name.length <= 1) return '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

/**
 * 원화 포맷 (15000 → "15,000원")
 */
export function formatKRW(n: number, opts?: { short?: boolean; withUnit?: boolean }): string {
  const short = opts?.short ?? false
  const withUnit = opts?.withUnit ?? true
  if (short && n >= 10000) {
    const man = n / 10000
    const fixed = man >= 100 ? 0 : man >= 10 ? 1 : 1
    return `${man.toFixed(fixed)}만${withUnit ? '원' : ''}`
  }
  const formatted = new Intl.NumberFormat('ko-KR').format(n)
  return withUnit ? `${formatted}원` : formatted
}

/**
 * 상대 시간 (2시간 전, 방금)
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  if (day < 30) return `${Math.floor(day / 7)}주 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

/**
 * 예약 시간 포맷 (4/20(일) 오후 3:00)
 */
export function formatScheduled(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const WEEK = ['일', '월', '화', '수', '목', '금', '토']
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEK[d.getDay()]
  const h = d.getHours()
  const min = d.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  const mm = min.toString().padStart(2, '0')
  return `${m}/${day}(${w}) ${ampm} ${hh}:${mm}`
}

/**
 * 두 좌표 사이 거리 (km, Haversine)
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 공간 유형 한글 라벨
 */
export function spaceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    airbnb: '에어비앤비',
    partyroom: '파티룸',
    studio: '촬영 스튜디오',
    gym: '소형 헬스장',
    unmanned_store: '무인매장',
    study_cafe: '스터디카페',
    practice_room: '연습실',
    workspace: '공유오피스',
    other: '기타 공간',
  }
  return map[type] || type
}

/**
 * 무작위 ID (nanoid-like)
 */
export function rid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * className merger (clsx mini)
 */
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ')
}
