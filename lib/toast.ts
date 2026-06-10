/**
 * 전역 토스트 — 스크롤 위치와 무관하게 항상 보이는 알림.
 * 페이지 하단 err 박스는 화면 밖이면 안 보여서, 비동기 저장 실패처럼
 * "지금 한 행동이 실패했음"을 알릴 때는 토스트를 쓴다.
 */
export type ToastKind = 'error' | 'success' | 'info'

export const TOAST_EVENT = 'sseuksak:toast'

export type ToastPayload = { message: string; kind: ToastKind }

export function toast(message: string, kind: ToastKind = 'info') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, kind } }))
}
