/**
 * 주소 마스킹 처리: 상세 주소(동, 호수 등)를 별표(*)로 숨깁니다.
 * 예: "서울 강남구 역삼동 123-45" -> "서울 강남구 역삼동 ***"
 */
export function maskAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(' ');
    if (parts.length <= 2) return address + ' ***';

    // 마지막 부분을 마스킹하거나, 너무 짧으면 전체적으로 끝을 마스킹
    return parts.slice(0, -1).join(' ') + ' ***';
}

/**
 * 일반적인 텍스트 마스킹 (이름 등)
 */
export function maskName(name: string): string {
    if (!name) return '';
    if (name.length <= 1) return '*';
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}
