/**
 * PostGIS geometry(Point) ↔ 좌표 변환 유틸.
 *
 * Supabase(PostgREST)는 geometry 컬럼을 **WKB hex 문자열**로 반환한다.
 * (예: "0101000020E61000000AD7A3703DBA5F406666666666C64240")
 * GeoJSON `{ coordinates: [lng, lat] }`를 기대하고 직접 접근하면 깨지므로
 * 읽기는 parseLocation(), 쓰기는 toEwkt()를 통해야 한다.
 *
 * 파싱 구현은 lib/utils.ts의 parseGeoPoint 단일 소스를 재사용한다.
 */

export { parseGeoPoint as parseLocation } from './utils'

export type LatLng = { lat: number; lng: number }

/** INSERT/UPDATE 시 geometry 컬럼에 넣을 EWKT 문자열 생성 (GeoJSON 객체는 parse error) */
export function toEwkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}
