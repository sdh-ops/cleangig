import Link from 'next/link'

/**
 * 한국 전자상거래법 Article 10 - 통신판매중개자 정보 표시 의무
 */
export default function LegalFooter() {
  return (
    <footer className="px-5 py-6 border-t border-line-soft bg-surface-muted text-[11px] text-text-soft font-medium leading-relaxed">
      <p className="mb-2 font-extrabold text-ink">쓱싹 (Sseuksak)</p>
      <div className="space-y-0.5">
        <p>상호: 주식회사 쓱싹 · 대표: (미정)</p>
        <p>사업자등록번호: 000-00-00000 | 통신판매업: 제0000-서울마포-0000호</p>
        <p>주소: 서울특별시 마포구 OO로 XX (우: 04048)</p>
        <p>고객센터: 1533-0000 · 이메일: help@sseuksak.com</p>
        <p className="pt-1 font-bold text-text-muted">
          쓱싹은 통신판매중개자로서 개별 거래의 당사자가 아니며,
          <br />
          공간 파트너와 클린 파트너 간 거래에 대한 책임은 해당 당사자에게 있습니다.
        </p>
      </div>
      <div className="mt-4 flex items-center flex-wrap gap-x-3 gap-y-1.5 text-text-muted">
        <Link href="/terms" className="font-bold hover:text-ink">이용약관</Link>
        <span className="text-text-faint">·</span>
        <Link href="/privacy" className="font-extrabold text-ink hover:text-brand-dark">개인정보처리방침</Link>
        <span className="text-text-faint">·</span>
        <Link href="/support" className="font-bold hover:text-ink">고객지원</Link>
        <span className="text-text-faint">·</span>
        <Link href="/notices" className="font-bold hover:text-ink">공지사항</Link>
      </div>
      <p className="mt-4 text-[10px] text-text-faint">
        © {new Date().getFullYear()} 쓱싹. All rights reserved.
      </p>
    </footer>
  )
}
