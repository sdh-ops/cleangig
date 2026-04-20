/**
 * 쓱싹 Storage Helpers
 * Supabase Storage 버킷 운영 유틸
 */
import { createClient } from './supabase/client'

export type StorageBucket = 'spaces' | 'profiles' | 'photos' | 'docs' | 'reviews'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export function isValidImage(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ACCEPTED.includes(file.type) && !file.type.startsWith('image/')) {
    return { ok: false, reason: '이미지 파일만 업로드할 수 있어요 (JPG/PNG/WebP)' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: '파일이 너무 커요. 10MB 이하로 업로드해주세요.' }
  }
  return { ok: true }
}

/**
 * 이미지 리사이즈 후 업로드 (JPEG로 변환, 최대 폭 1600)
 */
export async function uploadImage(
  bucket: StorageBucket,
  userId: string,
  file: File,
  opts?: { folder?: string; maxWidth?: number; quality?: number; makePublic?: boolean },
): Promise<{ url: string; path: string }> {
  const check = isValidImage(file)
  if (!check.ok) throw new Error(check.reason)

  const maxWidth = opts?.maxWidth ?? 1600
  const quality = opts?.quality ?? 0.85

  const compressed = await compressImage(file, maxWidth, quality)
  const supabase = createClient()
  const ts = Date.now()
  const rnd = Math.random().toString(36).slice(2, 8)
  const ext = compressed.type.split('/')[1] ?? 'jpg'
  const folder = opts?.folder ? `${opts.folder}/` : ''
  const path = `${userId}/${folder}${ts}-${rnd}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    upsert: false,
    contentType: compressed.type,
    cacheControl: '31536000',
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/**
 * 이미지를 Canvas로 압축
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  // HEIC 또는 미지원 format은 그대로 반환 (server-side 변환 필요하면 추가)
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') {
    return file
  }
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
    const scale = img.width > maxWidth ? maxWidth / img.width : 1
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    return blob ?? file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function deleteImage(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
