import 'server-only'
import crypto from 'crypto'

/**
 * 민감정보(주민등록번호 등) 양방향 암호화 — 서버 전용.
 *
 * 한국 개인정보보호법은 주민등록번호의 암호화 저장을 의무화한다.
 * AES-256-GCM 사용. 키는 ENCRYPTION_KEY 환경변수에서 파생(SHA-256 → 32 bytes)하므로
 * 임의 길이의 시크릿 문자열을 받아들인다. 운영 환경에서는 길고 무작위한 값을 사용할 것.
 *
 * 저장 형식: `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`
 */

const PREFIX = 'v1'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('[crypto] ENCRYPTION_KEY 환경변수가 설정되지 않았습니다 — 민감정보 암호화 불가')
  }
  return crypto.createHash('sha256').update(secret).digest() // 32 bytes
}

export function encryptSensitive(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // GCM 권장 96-bit nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':')
}

export function decryptSensitive(payload: string): string {
  const parts = payload.split(':')
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('[crypto] 잘못된 암호문 형식')
  }
  const [, ivB64, tagB64, ctB64] = parts
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8')
}

/** 이미 v1 형식으로 암호화된 값인지 판별 (마이그레이션·중복암호화 방지용) */
export function isEncrypted(value?: string | null): boolean {
  return !!value && value.startsWith(`${PREFIX}:`) && value.split(':').length === 4
}
