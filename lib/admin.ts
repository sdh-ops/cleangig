/**
 * 플랫폼 관리자 권한을 가진 이메일 목록
 * 이 배열에 포함된 이메일 주소만 운영자 페이지(/admin)에 접근할 수 있습니다.
 */
export const ADMIN_EMAILS = [
    'admin@cleangig.com', // 기본 관리자
    // 여기에 사용자님의 이메일을 추가하세요.
];

/**
 * 특정 이메일이 관리자인지 확인하는 헬퍼 함수
 */
export const isPlatformAdmin = (email?: string | null) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
};
