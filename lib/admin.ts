/**
 * 플랫폼 관리자 권한을 가진 이메일 목록 (하드코딩된 최상위 관리자)
 * 이 배열에 포함된 이메일 주소는 DB의 role과 상관없이 항상 운영자 페이지(/admin)에 접근할 수 있습니다.
 */
export const ADMIN_EMAILS = [
    'admin@cleangig.com', // 기본 관리자
    'brianshin0815@gmail.com', // 사용자 관리자 계정
];

/**
 * 특정 유저가 플랫폼 관리자인지 확인하는 헬퍼 함수
 * 1. 하드코딩된 이메일 목록(ADMIN_EMAILS)에 포함되어 있거나
 * 2. DB 상의 역할(role)이 'admin'인 경우 true를 반환합니다.
 */
export const isPlatformAdmin = (email?: string | null, role?: string | null) => {
    // 1. 이메일 기반 화이트리스트 체크
    if (email && ADMIN_EMAILS.includes(email)) return true;

    // 2. DB 역할 기반 체크
    if (role === 'admin') return true;

    return false;
};
