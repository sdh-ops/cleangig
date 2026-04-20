import Link from 'next/link'
import { Search, Home } from 'lucide-react'
import Logo from '@/components/common/Logo'

export default function NotFound() {
  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-6"><Logo size="md" /></div>
        <div className="w-20 h-20 rounded-full bg-surface-muted text-text-faint flex items-center justify-center mb-5">
          <Search size={32} />
        </div>
        <h1 className="text-5xl font-black text-gradient-brand mb-2">404</h1>
        <h2 className="h-section text-ink">페이지를 찾을 수 없어요</h2>
        <p className="t-caption mt-2 max-w-[300px]">
          주소가 잘못되었거나, 페이지가 이동/삭제되었을 수 있어요.
        </p>
        <Link href="/" className="btn btn-primary mt-8 w-full max-w-[220px]">
          <Home size={16} /> 홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
