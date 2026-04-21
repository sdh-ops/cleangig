'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X, Image as ImageIcon } from 'lucide-react'
import { uploadImage, type StorageBucket } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/haptic'

type Props = {
  bucket: StorageBucket
  folder?: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  aspect?: 'square' | '4/3' | '16/9'
  label?: string
  hint?: string
  /** 바로 카메라를 열고 싶을 때 (모바일) */
  allowCamera?: boolean
}

export default function ImageUploader({
  bucket,
  folder,
  value,
  onChange,
  max = 6,
  aspect = '4/3',
  label,
  hint,
  allowCamera = true,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const aspectCls = aspect === 'square' ? 'aspect-square' : aspect === '16/9' ? 'aspect-video' : 'aspect-[4/3]'

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setErr(null)
    try {
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')
      const remaining = max - value.length
      const toUpload = Array.from(files).slice(0, remaining)
      const results = await Promise.all(
        toUpload.map((f) => uploadImage(bucket, user.id, f, { folder })),
      )
      onChange([...value, ...results.map((r) => r.url)])
      haptic.success()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '업로드 실패')
      haptic.error()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  const removeAt = (idx: number) => {
    haptic.tick()
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {label && <label className="t-meta block mb-2 ml-1">{label}</label>}
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, idx) => (
          <div key={idx} className={`relative ${aspectCls} rounded-xl overflow-hidden bg-surface-muted border border-line-soft`}>
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="삭제"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <div className={`${aspectCls} relative`}>
            {allowCamera ? (
              <div className="w-full h-full grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border-2 border-dashed border-line-strong bg-surface-muted flex flex-col items-center justify-center text-text-muted hover:bg-brand-softer hover:text-brand-dark hover:border-brand transition active:scale-95"
                  aria-label="카메라로 촬영"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Camera size={16} />
                      <span className="text-[10px] font-bold mt-1">촬영</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border-2 border-dashed border-line-strong bg-surface-muted flex flex-col items-center justify-center text-text-muted hover:bg-brand-softer hover:text-brand-dark hover:border-brand transition active:scale-95"
                  aria-label="사진 선택"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <ImageIcon size={16} />
                      <span className="text-[10px] font-bold mt-1">앨범</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-full rounded-xl border-2 border-dashed border-line-strong bg-surface-muted flex flex-col items-center justify-center text-text-muted hover:bg-brand-softer hover:text-brand-dark hover:border-brand transition active:scale-95"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span className="text-[10.5px] font-bold mt-1">{value.length}/{max}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-text-faint font-medium mt-2 ml-1">{hint}</p>}
      {err && <p className="text-[12px] font-bold text-danger mt-2">{err}</p>}

      {/* Gallery picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {/* Camera capture (mobile opens camera directly) */}
      {allowCamera && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}
    </div>
  )
}
