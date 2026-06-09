/**
 * Solapi 문자/알림톡 발송 헬퍼 (서버 전용)
 *
 * 환경변수 미설정 시 조용히 skip — 개발·테스트 환경에서 실 발송 없이 작동.
 * 실서비스 전: Vercel 환경변수에 SOLAPI_API_KEY / SOLAPI_API_SECRET /
 * SOLAPI_SENDER_PHONE / SOLAPI_PF_ID 등록 필요.
 *
 * 사용처:
 *  - 워커 신규 작업 알림
 *  - 공간파트너 작업 제출 알림
 *  - 승인/정산 완료 알림
 */

const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET
const SOLAPI_SENDER = process.env.SOLAPI_SENDER_PHONE
const SOLAPI_PF_ID = process.env.SOLAPI_PF_ID  // 카카오 채널 프로필 ID

function isSolapiConfigured(): boolean {
  return !!(SOLAPI_API_KEY && SOLAPI_API_SECRET && SOLAPI_SENDER &&
    SOLAPI_API_KEY !== 'YOUR_SOLAPI_API_KEY')
}

/** HMAC-SHA256 서명 생성 */
async function makeSignature(date: string): Promise<string> {
  const salt = Math.random().toString(36).slice(2)
  const message = `${date}${salt}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SOLAPI_API_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${hex}`
}

interface SmsPayload {
  to: string    // 수신자 전화번호 (010-xxxx-xxxx)
  text: string  // SMS 내용 (90바이트 이내)
}

interface AlimtalkPayload {
  to: string          // 수신자 전화번호
  templateId: string  // 카카오 템플릿 코드
  variables: Record<string, string>  // #{변수명} 치환값
  fallbackText?: string  // 실패 시 SMS 대체 문구
}

/**
 * 단순 SMS 발송
 */
export async function sendSms(payload: SmsPayload): Promise<void> {
  if (!isSolapiConfigured()) {
    console.log(`[Solapi skip] SMS to ${payload.to}: ${payload.text}`)
    return
  }
  try {
    const date = new Date().toISOString()
    const auth = await makeSignature(date)
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          to: payload.to.replace(/-/g, ''),
          from: SOLAPI_SENDER!.replace(/-/g, ''),
          text: payload.text,
          type: 'SMS',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[Solapi] SMS 발송 실패', err)
    }
  } catch (e) {
    console.error('[Solapi] SMS 예외', e)
  }
}

/**
 * 카카오 알림톡 발송 (실패 시 SMS fallback)
 */
export async function sendAlimtalk(payload: AlimtalkPayload): Promise<void> {
  if (!isSolapiConfigured() || !SOLAPI_PF_ID) {
    console.log(`[Solapi skip] 알림톡 to ${payload.to} template=${payload.templateId}`)
    return
  }
  try {
    const date = new Date().toISOString()
    const auth = await makeSignature(date)
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          to: payload.to.replace(/-/g, ''),
          from: SOLAPI_SENDER!.replace(/-/g, ''),
          type: 'ATA',
          kakaoOptions: {
            pfId: SOLAPI_PF_ID,
            templateId: payload.templateId,
            variables: payload.variables,
            disableSms: !payload.fallbackText,
          },
          ...(payload.fallbackText ? { text: payload.fallbackText } : {}),
        },
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[Solapi] 알림톡 발송 실패', err)
    }
  } catch (e) {
    console.error('[Solapi] 알림톡 예외', e)
  }
}

// ─── 도메인별 발송 함수 ───────────────────────────────────────────────────────

/**
 * 워커에게 새 작업 알림 (매칭 가능 작업 등록)
 */
export async function notifyWorkerNewJob(opts: {
  phone: string
  spaceName: string
  scheduledAt: string
  price: number
  jobUrl: string
}): Promise<void> {
  const dateStr = new Date(opts.scheduledAt).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
  await sendSms({
    to: opts.phone,
    text: `[쓱싹] 새 작업 알림\n${opts.spaceName} / ${dateStr}\n${opts.price.toLocaleString()}원\n지금 수락하기: ${opts.jobUrl}`,
  })
}

/**
 * 공간파트너에게 작업 제출(완료 대기) 알림
 */
export async function notifyOperatorJobSubmitted(opts: {
  phone: string
  spaceName: string
  jobUrl: string
}): Promise<void> {
  await sendSms({
    to: opts.phone,
    text: `[쓱싹] 청소 완료 확인 요청\n${opts.spaceName} 청소가 완료되어 승인 대기 중입니다.\n확인 및 승인: ${opts.jobUrl}`,
  })
}

/**
 * 워커에게 정산 완료 알림
 */
export async function notifyWorkerPayout(opts: {
  phone: string
  workerPayout: number
}): Promise<void> {
  await sendSms({
    to: opts.phone,
    text: `[쓱싹] 정산 완료\n${opts.workerPayout.toLocaleString()}원이 등록하신 계좌로 입금 예정입니다.`,
  })
}
