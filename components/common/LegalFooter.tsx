import Link from 'next/link'

/**
 * 한국 전자상거래법 제10조 — 통신판매중개자 정보 표시 의무
 *
 * TODO 런칭 전 업데이트 필요:
 *  - phone: 실제 고객센터 전화번호로 교체
 *  - mailOrderNo: 통신판매업 신고 완료 후 신고번호 기재
 *    예) "제2026-서울마포-XXXX호"
 */
const BUSINESS = {
  serviceName: '쓱싹',
  company: '디스퀘어',
  ceo: '신동현',
  regNo: '102-07-08646',
  address: '서울특별시 마포구 양화로12길 16, 7층 (서교동, 더난빌딩)',
  email: 'sdh@thenanbiz.com',
  phone: '(고객센터 번호 추가 예정)',
  mailOrderNo: '(통신판매업 신고 후 기재)',
}

export default function LegalFooter() {
  return (
    <footer className="px-5 py-6 border-t border-line-soft bg-surface-muted text-[11px] text-text-soft font-medium leading-relaxed">
      <p className="mb-2 font-extrabold text-ink">{BUSINESS.serviceName}</p>
      <div className="space-y-0.5">
        <p>운영사: {BUSINESS.company} · 대표: {BUSINESS.ceo}</p>
        <p>사업자등록번호: {BUSINESS.regNo}</p>
        <p>통신판매업 신고번호: {BUSINESS.mailOrderNo}</p>
        <p>주소: {BUSINESS.address}</p>
        <p>고객센터: {BUSINESS.phone} · 이메일: {BUSINESS.email}</p>
        <p className="pt-1 font-bold text-text-muted">
          쓱싹은 통신판매중개자로서 개별 거래의 당사자가 아니며,
          <br />
          공간파트너와 클린파트너 간 거래에 대한 책임은 해당 당사자에게 있습니다.
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
        © {new Date().getFullYear()} {BUSINESS.company}. All rights reserved.
      </p>
    </footer>
  )
}
