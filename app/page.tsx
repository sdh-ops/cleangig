'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'operator' | 'worker'>('operator')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      {/* 헤더 */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-header-inner">
          <div className="logo">
            <span className="logo-icon">🧹</span>
            <span className="logo-text">CleanGig</span>
          </div>
          <Link href="/login" className="btn btn-primary btn-sm">
            시작하기
          </Link>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">공간사업자 특화 청소 플랫폼 🎯</div>
          <h1 className="hero-title">
            청소 걱정 없이<br />
            <span className="hero-highlight">공간을 운영하세요</span>
          </h1>
          <p className="hero-desc">
            에어비앤비·파티룸·무인매장 공간파트너와 검증된 클린파트너를<br />
            AI가 실시간으로 연결합니다
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">5분</span>
              <span className="stat-label">평균 매칭 시간</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">4.9★</span>
              <span className="stat-label">평균 청소 만족도</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">100%</span>
              <span className="stat-label">에스크로 결제 보호</span>
            </div>
          </div>

          <div className="hero-cta">
            <Link href="/login?role=operator" className="btn btn-primary btn-lg">
              공간파트너로 시작 →
            </Link>
            <Link href="/login?role=worker" className="btn btn-secondary btn-lg">
              클린파트너로 시작
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="mockup-header">
                <span>오늘의 청소 🧹</span>
                <span className="mockup-badge">3건</span>
              </div>
              {[
                { name: '합정 파티룸', price: '25,000', time: '14:00', status: '진행 중', color: '#00C471' },
                { name: '성수 에어비앤비', price: '35,000', time: '17:00', status: '예정', color: '#3B82F6' },
                { name: '홍대 스튜디오', price: '40,000', time: '19:30', status: '예정', color: '#3B82F6' },
              ].map((job, i) => (
                <div className="mockup-card" key={i}>
                  <div className="mockup-card-left">
                    <div className="mockup-dot" style={{ background: job.color }} />
                    <div>
                      <div className="mockup-name">{job.name}</div>
                      <div className="mockup-time">⏰ {job.time}</div>
                    </div>
                  </div>
                  <div className="mockup-price">₩{job.price}</div>
                </div>
              ))}
              <div className="mockup-earning">
                <span>오늘 예상 수익</span>
                <span className="mockup-earn-amount">₩100,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 탭 섹션: 공간파트너 vs 클린파트너 */}
      <section className="tab-section">
        <div className="section-inner">
          <div className="tab-toggle">
            <button
              className={`tab-btn ${activeTab === 'operator' ? 'active' : ''}`}
              onClick={() => setActiveTab('operator')}
            >
              🏠 공간파트너
            </button>
            <button
              className={`tab-btn ${activeTab === 'worker' ? 'active' : ''}`}
              onClick={() => setActiveTab('worker')}
            >
              🧹 클린파트너
            </button>
          </div>

          {activeTab === 'operator' ? (
            <div className="features-grid">
              {[
                { icon: '⚡', title: '5분 안에 매칭', desc: 'AI가 주변 검증된 클린파트너를 즉시 찾아드립니다' },
                { icon: '📸', title: 'AI 사진 검수', desc: '청소 전/후 사진을 AI가 자동으로 품질 검증합니다' },
                { icon: '🔒', title: '에스크로 결제', desc: '청소 완료 후 자동 정산. 불만족 시 전액 환불' },
                { icon: '🔄', title: '예약 자동 연동', desc: '에어비앤비 체크아웃 시 청소 자동 요청' },
                { icon: '📊', title: '운영 리포트', desc: '월별 청소 비용·이력을 한눈에 확인' },
                { icon: '⭐', title: '단골 클린파트너', desc: '만족한 클린파트너를 즐겨찾기해서 계속 이용' },
              ].map((f, i) => (
                <div className="feature-card card" key={i}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="features-grid">
              {[
                { icon: '📍', title: '가까운 청소 먼저', desc: '현재 위치 기준 가장 가까운 청소를 추천' },
                { icon: '🕐', title: '원하는 시간에만', desc: '강제 배정 없음. 원하는 청소만 골라서 수락' },
                { icon: '💰', title: '빠른 정산', desc: '작업 완료 즉시 정산 계산, 주 1회 자동 입금' },
                { icon: '📈', title: '등급제 혜택', desc: '경험 쌓을수록 수수료 할인 + 우선 매칭' },
                { icon: '📋', title: '체크리스트 가이드', desc: '공간별 상세 체크리스트로 실수 없이 청소' },
                { icon: '🛡️', title: '분쟁 보호', desc: 'AI 자동 판정으로 억울한 클레임 방지' },
              ].map((f, i) => (
                <div className="feature-card card" key={i}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 신뢰 섹션 */}
      <section className="trust-section">
        <div className="section-inner">
          <h2 className="section-title">왜 CleanGig인가요?</h2>
          <div className="trust-grid">
            {[
              { num: '10만+', label: '잠재 공간 수', sub: '에어비앤비·파티룸·무인매장' },
              { num: '25,000원~', label: '평균 청소 단가', sub: '부업으로 시간당 ~2만원' },
              { num: '70%', label: 'AI 자동 검수', sub: '공간파트너 검수 시간 70% 절감' },
              { num: '3.3%', label: '원천징수 처리', sub: '세금 신고 자동 계산' },
            ].map((t, i) => (
              <div className="trust-item" key={i}>
                <div className="trust-num">{t.num}</div>
                <div className="trust-label">{t.label}</div>
                <div className="trust-sub">{t.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="cta-section">
        <div className="section-inner cta-inner">
          <h2 className="cta-title">지금 바로 시작하세요</h2>
          <p className="cta-desc">카카오 로그인 하나로 30초 안에 시작</p>
          <Link href="/login" className="btn btn-primary btn-lg btn-full" style={{ maxWidth: 320 }}>
            🍊 카카오로 무료 시작
          </Link>
          <p className="cta-note">서비스 이용 수수료 0% (MVP 기간)</p>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="logo" style={{ marginBottom: 8 }}>
            <span className="logo-icon">🧹</span>
            <span className="logo-text">CleanGig</span>
          </div>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-sm)' }}>
            통신판매중개업자 · 거래 당사자 아님
          </p>
          <div className="footer-links">
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
            <a href="#">고객센터</a>
          </div>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-xs)', marginTop: 8 }}>
            © 2026 CleanGig. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
