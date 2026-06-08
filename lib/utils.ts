/**
 * 주소 마스킹 처리 (상세 번지 숨김)
 */
export function maskAddress(address: string): string {
  if (!address) return ''
  const parts = address.split(' ')
  if (parts.length <= 2) return address + ' ***'
  return parts.slice(0, -1).join(' ') + ' ***'
}

/**
 * 청소 난이도 레이블 + 이모지
 */
export function difficultyLabel(val?: string | null): { label: string; emoji: string; color: string } {
  switch (val) {
    case '쉬움': return { label: '쉬움', emoji: '😊', color: 'text-success' }
    case '어려움': return { label: '어려움', emoji: '💪', color: 'text-danger' }
    default: return { label: '보통', emoji: '🧹', color: 'text-text-soft' }
  }
}

/**
 * 공개용 짧은 주소 — 시/도 + 구/군 + 동/읍/면 단위까지만 표시
 * "서울특별시 마포구 합정동 123-45" → "서울 마포구 합정동"
 * "서울 마포구 월드컵북로 90" → "서울 마포구"
 */
export function shortAddress(address: string): string {
  if (!address) return ''
  const parts = address.split(' ')
  // 시/도 축약 (서울특별시→서울, 경기도→경기 등)
  const city = parts[0]
    .replace('특별시', '')
    .replace('광역시', '')
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('도', (_, offset) => offset > 0 ? '' : '도') // 경기도는 유지
  const result = [city]
  if (parts[1]) result.push(parts[1]) // 구/군
  // 세 번째가 동/읍/면/로/길로 끝나면 동급만 포함
  if (parts[2] && /[동읍면리]$/.test(parts[2])) result.push(parts[2])
  return result.join(' ')
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
 * Supabase PostGIS geometry 컬럼을 파싱하여 { lat, lng } 반환
 * Supabase REST API는 geometry를 WKB hex 문자열로 반환함
 * (예: "0101000020E610000030D80DDB16BB5F4038B41204D9C64240")
 * 일반 GeoJSON 객체 { coordinates: [lng, lat] } 형태도 허용
 */
export function parseGeoPoint(
  location: unknown
): { lat: number; lng: number } | null {
  if (!location) return null

  // 이미 GeoJSON 좌표 배열 형태인 경우
  if (
    typeof location === 'object' &&
    location !== null &&
    'coordinates' in location
  ) {
    const coords = (location as { coordinates?: unknown[] }).coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0])
      const lat = Number(coords[1])
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }
    return null
  }

  // WKB hex 문자열 파싱
  if (typeof location !== 'string') return null
  try {
    const hex = location
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(h => parseInt(h, 16)))
    const view = new DataView(bytes.buffer)
    const isLE = view.getUint8(0) === 1
    const geomType = isLE ? view.getUint32(1, true) : view.getUint32(1, false)
    const hasSRID = (geomType & 0x20000000) !== 0
    const offset = 5 + (hasSRID ? 4 : 0)
    const lng = view.getFloat64(offset, isLE)
    const lat = view.getFloat64(offset + 8, isLE)
    if (isNaN(lat) || isNaN(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  } catch {
    return null
  }
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
