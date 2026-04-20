import Logo from '@/components/common/Logo'

export default function Loading() {
  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" style={{ animationDelay: '160ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" style={{ animationDelay: '320ms' }} />
        </div>
        <p className="text-[13px] font-bold text-text-soft">잠시만 기다려주세요</p>
      </div>
    </div>
  )
}
