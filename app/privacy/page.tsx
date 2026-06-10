import Header from '@/components/common/Header'
import LegalFooter from '@/components/common/LegalFooter'

export const metadata = { title: '개인정보 처리방침' }

export default function PrivacyPage() {
  return (
    <div className="sseuksak-shell">
      <Header title="개인정보 처리방침" showBack />
      <div className="flex-1 px-6 py-6 pb-16">
        <article className="prose prose-sm max-w-none text-ink-soft">
          <h2 className="h-section text-ink mb-2">쓱싹 개인정보 처리방침</h2>
          <p className="t-caption mb-2 text-text-muted">운영사: 디스퀘어 (사업자등록번호: 102-07-08646)</p>
          <p className="t-caption mb-6">시행일: 2026년 4월 20일</p>

          <Section title="1. 수집하는 개인정보 항목">
            <ul className="list-disc pl-5">
              <li><b>필수</b>: 이메일, 휴대전화번호, 이름, 역할(파트너/클린파트너)</li>
              <li><b>선택</b>: 프로필 사진, 한 줄 소개, 사업자등록증, 정산 계좌</li>
              <li><b>자동</b>: 서비스 이용 기록, 접속 로그, 기기정보, 위치정보(동의 시)</li>
            </ul>
          </Section>

          <Section title="2. 개인정보 수집·이용 목적">
            <ul className="list-disc pl-5">
              <li>회원 가입, 본인 확인 및 계정 관리</li>
              <li>청소 작업 매칭, 결제·정산 처리</li>
              <li>플랫폼 품질 관리 및 분쟁 조정</li>
              <li>법령상 의무 이행 (세무, 노동, 전자상거래법 등)</li>
            </ul>
          </Section>

          <Section title="3. 개인정보 보유·이용 기간">
            <ul className="list-disc pl-5">
              <li>회원 정보: 회원 탈퇴 시까지 (관계 법령상 보존 기간 예외)</li>
              <li>거래 기록: 전자상거래법에 따라 5년</li>
              <li>접속 로그: 통신비밀보호법에 따라 3개월</li>
            </ul>
          </Section>

          <Section title="4. 개인정보의 제3자 제공">
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 작업 매칭의 목적으로 파트너와 클린파트너 간 필요한 최소한의 정보(이름, 연락처, 작업 주소 등)가 상호 공유됩니다.
          </Section>

          <Section title="5. 개인정보 처리 위탁">
            <div className="rounded-xl bg-surface-muted p-3 text-[14.5px]">
              <b>Supabase Inc.</b> · 데이터베이스·스토리지 호스팅<br />
              <b>Naver Cloud Platform</b> · 지도 API, SMS 발송<br />
              <b>토스페이먼츠</b> · 결제 대행 (추후 연동)<br />
              <b>Vercel Inc.</b> · 서비스 배포·인프라
            </div>
          </Section>

          <Section title="6. 위치정보 이용">
            <ul className="list-disc pl-5">
              <li><b>수집 근거</b>: 이용자의 별도 동의 (위치정보의 보호 및 이용 등에 관한 법률 준수)</li>
              <li><b>수집 목적</b>: 실시간 작업 매칭, 도착 확인, 경로 안내</li>
              <li><b>수집 항목</b>: GPS 기반 위도·경도, 수집 시각</li>
              <li><b>보유 기간</b>: 작업 완료 후 30일, 이후 자동 삭제</li>
              <li><b>동의 철회</b>: 앱 알림 설정 또는 기기 설정에서 언제든 철회 가능. 철회 시 클린파트너 도착 확인 기능이 제한됩니다.</li>
            </ul>
          </Section>

          <Section title="7. 마케팅 정보 수신">
            회원 가입 시 선택적으로 동의한 경우에 한하여 이메일·앱 푸시를 통해 할인·이벤트 정보를 발송합니다. 수신을 원치 않으시면 프로필 &gt; 알림 설정에서 언제든 거부할 수 있습니다.
          </Section>

          <Section title="8. 이용자의 권리">
            <ul className="list-disc pl-5">
              <li>개인정보 열람, 수정, 삭제, 처리정지를 언제든 요구할 수 있습니다.</li>
              <li>회사는 요청을 받은 날로부터 10일 이내에 조치합니다.</li>
              <li>만 14세 미만 아동의 가입은 법정대리인 동의가 필요합니다.</li>
              <li>요청: privacy@sseuksak.com 또는 고객센터</li>
            </ul>
          </Section>

          <Section title="9. 개인정보의 안전성 확보 조치">
            <ul className="list-disc pl-5">
              <li>개인정보 암호화 저장 (AES-256)</li>
              <li>접근 권한 최소화 및 접근 로그 기록</li>
              <li>해킹 방지 시스템 운영, 정기 보안 점검</li>
              <li>전 임직원 대상 개인정보보호 교육</li>
            </ul>
          </Section>

          <Section title="10. 개인정보 보호 책임자">
            <div className="rounded-xl bg-surface-muted p-3 text-[15px]">
              <b>개인정보 보호 책임자</b>: 신동현 (디스퀘어 대표)<br />
              <b>이메일</b>: sdh@thenanbiz.com<br />
              <b>전화</b>: (고객센터 번호 추가 예정, 평일 10:00–18:00)
            </div>
          </Section>

          <p className="t-caption mt-10 pt-5 border-t border-line-soft">
            본 방침은 관련 법령 및 내부 정책 변경 시 개정될 수 있으며, 변경 시 최소 7일 전 공지합니다.
          </p>
        </article>
      </div>
      <LegalFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[14px] font-black text-ink mb-2">{title}</h3>
      <div className="text-[15px] leading-relaxed text-text-muted">{children}</div>
    </section>
  )
}
