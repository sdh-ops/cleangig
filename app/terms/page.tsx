import Header from '@/components/common/Header'

export const metadata = { title: '이용약관' }

export default function TermsPage() {
  return (
    <div className="sseuksak-shell">
      <Header title="이용약관" showBack />
      <div className="flex-1 px-6 py-6 pb-16">
        <article className="prose prose-sm max-w-none text-ink-soft">
          <h2 className="h-section text-ink mb-2">쓱싹 서비스 이용약관</h2>
          <p className="t-caption mb-6">시행일: 2026년 4월 20일</p>

          <Section title="제1조 (목적)">
            본 약관은 주식회사 쓱싹(이하 &ldquo;회사&rdquo;)이 운영하는 공간 운영 인프라 플랫폼 &ldquo;쓱싹&rdquo;(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </Section>

          <Section title="제2조 (정의)">
            <ol className="list-decimal pl-5">
              <li>&ldquo;이용자&rdquo;란 회사가 제공하는 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 공간 파트너 및 클린 파트너를 말합니다.</li>
              <li>&ldquo;공간 파트너(Host)&rdquo;란 본인이 운영하는 공간의 청소/점검/보충 작업을 요청하는 이용자입니다.</li>
              <li>&ldquo;클린 파트너(Worker)&rdquo;란 청소 작업 등을 수행하고 보수를 받는 이용자입니다.</li>
              <li>&ldquo;작업&rdquo;이란 서비스를 통해 매칭되는 청소/점검/보충 등의 단위 용역을 말합니다.</li>
            </ol>
          </Section>

          <Section title="제3조 (플랫폼의 지위)">
            회사는 공간 파트너와 클린 파트너 간의 거래를 중개하는 온라인 중개 플랫폼 사업자로서, 거래 당사자가 아닙니다. 클린 파트너는 개인사업자 또는 프리랜서로서 독립적으로 용역을 제공합니다.
          </Section>

          <Section title="제4조 (회원가입)">
            <ol className="list-decimal pl-5">
              <li>이용자는 회사가 정한 양식에 따라 회원 정보를 기입한 후 본 약관에 동의한다는 의사를 표시함으로써 회원가입을 신청합니다.</li>
              <li>회사는 허위 정보를 등록한 경우, 미성년자가 법정대리인 동의 없이 가입한 경우 등 약관에서 정한 사유가 있을 때 가입을 거부할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제5조 (서비스 이용)">
            <ol className="list-decimal pl-5">
              <li>서비스는 연중무휴 24시간 이용할 수 있음을 원칙으로 합니다. 다만, 시스템 점검 등 부득이한 경우 일시 중단될 수 있습니다.</li>
              <li>이용자는 서비스를 관련 법령, 본 약관, 서비스 공지사항 등을 준수하여 이용해야 합니다.</li>
            </ol>
          </Section>

          <Section title="제6조 (결제 및 정산)">
            <ol className="list-decimal pl-5">
              <li>공간 파트너가 작업 요청과 함께 결제한 금액은 에스크로 방식으로 보관됩니다.</li>
              <li>작업 승인 후 플랫폼 수수료(최대 15%)를 공제한 금액이 클린 파트너에게 정산됩니다.</li>
              <li>정산 주기는 주 1회를 원칙으로 하며, 세무 관련 사항은 관계 법령에 따릅니다.</li>
            </ol>
          </Section>

          <Section title="제7조 (취소 및 환불)">
            <ul className="list-disc pl-5">
              <li>24시간 전 취소: 전액 환불</li>
              <li>3시간 전 취소: 30% 취소 수수료</li>
              <li>1시간 전 취소: 50% 취소 수수료</li>
              <li>1시간 이내: 환불 불가</li>
            </ul>
          </Section>

          <Section title="제8조 (이용자의 의무)">
            <ul className="list-disc pl-5">
              <li>타인의 정보 도용, 허위 정보 기재 금지</li>
              <li>플랫폼 우회 거래 금지</li>
              <li>타인의 명예를 훼손하거나 업무를 방해하는 행위 금지</li>
              <li>청소 작업 수행 시 본인의 장비와 기술로 성실히 임할 것</li>
            </ul>
          </Section>

          <Section title="제9조 (회사의 면책)">
            회사는 중개 플랫폼으로서 이용자 간 거래와 관련된 분쟁에 대해 직접적인 책임을 지지 않으며, 선량한 관리자의 주의의무로 분쟁 조정에 협조합니다.
          </Section>

          <Section title="제10조 (분쟁 해결)">
            서비스 이용과 관련한 분쟁은 회사와 이용자 간의 성실한 협의로 해결함을 원칙으로 하며, 협의가 이루어지지 않을 경우 관할 법원에 소를 제기할 수 있습니다.
          </Section>

          <p className="t-caption mt-10 pt-5 border-t border-line-soft">
            본 약관의 전문 및 개정 이력은 회사 고객센터를 통해 확인하실 수 있습니다.
          </p>
        </article>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[14px] font-black text-ink mb-2">{title}</h3>
      <div className="text-[13.5px] leading-relaxed text-text-muted">{children}</div>
    </section>
  )
}
