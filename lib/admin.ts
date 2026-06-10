/**
 * 플랫폼 관리자 이메일 화이트리스트.
 *
 * 환경변수 ADMIN_EMAILS (콤마 구분)에서 읽는다. 미설정 시 빈 목록 —
 * 그 경우 DB role='admin'만으로 관리자 판정.
 * 소스코드 하드코딩 금지 (git 히스토리에 영구 노출됨).
 */
export const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * 특정 유저가 플랫폼 관리자인지 확인
 * 1. ADMIN_EMAILS 환경변수 화이트리스트에 포함되어 있거나
 * 2. DB 상의 역할(role)이 'admin'인 경우 true
 */
export const isPlatformAdmin = (email?: string | null, role?: string | null) => {
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return true;
    if (role === 'admin') return true;
    return false;
};
