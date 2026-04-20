'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Plus, X } from 'lucide-react'
import { uploadImage, type StorageBucket } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'

type Props = {
  bucket: StorageBucket
  folder?: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  aspect?: 'square' | '4/3' | '16/9'
  label?: string
  hint?: string
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
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
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
    } catch (e) {
      setErr(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeAt = (idx: number) => {
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`${aspectCls} rounded-xl border-2 border-dashed border-line-strong bg-surface-muted flex flex-col items-center justify-center text-text-muted hover:bg-brand-softer hover:text-brand-dark hover:border-brand transition active:scale-95`}
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
      {hint && <p className="text-[11px] text-text-faint font-medium mt-2 ml-1">{hint}</p>}
      {err && <p className="text-[12px] font-bold text-danger mt-2">{err}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
