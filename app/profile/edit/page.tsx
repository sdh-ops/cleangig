'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Check, Loader2, User, Phone, Camera } from 'lucide-react'
import { uploadImage } from '@/lib/storage'

export default function ProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [business, setBusiness] = useState('')
  const [role, setRole] = useState<'operator' | 'worker' | 'admin'>('operator')
  const [image, setImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setName(data.name || '')
        setPhone(data.phone || '')
        setBio(data.bio || '')
        setBusiness(data.business_name || '')
        setImage(data.profile_image || null)
        setRole(data.role || 'operator')
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleImage = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage('profiles', userId, file, { folder: 'avatar' })
      setImage(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim() || null,
        business_name: role === 'operator' ? business.trim() || null : null,
        profile_image: image,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    router.replace('/profile')
  }

  if (loading) {
    return (
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-extrabold">프로필 수정</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-5 pt-6 pb-28">
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center font-black text-3xl overflow-hidden">
              {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : name.charAt(0) || '?'}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shadow-brand-sm">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} strokeWidth={2.5} />}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="t-meta block mb-2 ml-1">이름</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
              <input value={name} onChange={(e) => setName(e.target.value)} className="input pl-11" />
            </div>
          </div>
          <div>
            <label className="t-meta block mb-2 ml-1">연락처</label>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9\-+]/g, ''))} className="input pl-11" inputMode="tel" />
            </div>
          </div>
          {role === 'operator' && (
            <div>
              <label className="t-meta block mb-2 ml-1">사업체명 (선택)</label>
              <input value={business} onChange={(e) => setBusiness(e.target.value)} className="input" />
            </div>
          )}
          <div>
            <label className="t-meta block mb-2 ml-1">한 줄 소개</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input min-h-[80px]" rows={2} maxLength={120} placeholder="예) 홍대 일대 파티룸 · 에어비앤비 청소 전문" />
          </div>
          {err && <div className="p-3 bg-danger-soft rounded-xl text-[13px] font-bold text-danger">{err}</div>}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary w-full">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>저장 <Check size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
