const EXACT_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  'User already registered': '이미 가입된 이메일입니다.',
}

const FALLBACK_MESSAGE = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

/**
 * Supabase 등에서 내려오는 영문 에러 메시지를 사용자 친화적인 한글 문구로 변환한다.
 */
export function toKoreanErrorMessage(raw?: string | null): string {
  if (!raw) return FALLBACK_MESSAGE

  const exact = EXACT_MESSAGES[raw]
  if (exact) return exact

  if (raw.includes('duplicate key')) return '이미 등록된 정보입니다.'
  if (/network/i.test(raw)) return '네트워크 연결을 확인해주세요.'

  return FALLBACK_MESSAGE
}
