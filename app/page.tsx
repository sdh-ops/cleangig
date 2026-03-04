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
            에어비앤비·파티룸·무인매장 운영자와 검증된 청소 작업자를<br />
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
              공간 운영자로 시작 →
            </Link>
            <Link href="/login?role=worker" className="btn btn-secondary btn-lg">
              청소 작업자로 시작
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

      {/* 탭 섹션: 운영자 vs 작업자 */}
      <section className="tab-section">
        <div className="section-inner">
          <div className="tab-toggle">
            <button
              className={`tab-btn ${activeTab === 'operator' ? 'active' : ''}`}
              onClick={() => setActiveTab('operator')}
            >
              🏠 공간 운영자
            </button>
            <button
              className={`tab-btn ${activeTab === 'worker' ? 'active' : ''}`}
              onClick={() => setActiveTab('worker')}
            >
              🧹 청소 작업자
            </button>
          </div>

          {activeTab === 'operator' ? (
            <div className="features-grid">
              {[
                { icon: '⚡', title: '5분 안에 매칭', desc: 'AI가 주변 검증된 작업자를 즉시 찾아드립니다' },
                { icon: '📸', title: 'AI 사진 검수', desc: '청소 전/후 사진을 AI가 자동으로 품질 검증합니다' },
                { icon: '🔒', title: '에스크로 결제', desc: '청소 완료 후 자동 정산. 불만족 시 전액 환불' },
                { icon: '🔄', title: '예약 자동 연동', desc: '에어비앤비 체크아웃 시 청소 자동 요청' },
                { icon: '📊', title: '운영 리포트', desc: '월별 청소 비용·이력을 한눈에 확인' },
                { icon: '⭐', title: '단골 작업자', desc: '만족한 작업자를 즐겨찾기해서 계속 이용' },
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
                { icon: '📍', title: '가까운 일감 먼저', desc: '현재 위치 기준 가장 가까운 청소를 추천' },
                { icon: '🕐', title: '원하는 시간에만', desc: '강제 배정 없음. 원하는 일감만 골라서 수락' },
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
              { num: '70%', label: 'AI 자동 검수', sub: '운영자 검수 시간 70% 절감' },
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

      <style jsx>{`
        .landing { min-height: 100dvh; background: #fff; }

        /* 헤더 */
        .landing-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background var(--transition-fast), box-shadow var(--transition-fast);
          padding: 0 var(--spacing-md);
        }
        .landing-header.scrolled {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow-sm);
        }
        .landing-header-inner {
          max-width: 1200px; margin: 0 auto;
          height: 64px; display: flex; align-items: center; justify-content: space-between;
        }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { font-size: 28px; }
        .logo-text { font-size: 22px; font-weight: 800; color: var(--color-text-primary); letter-spacing: -0.03em; }

        /* 히어로 */
        .hero {
          min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 80px var(--spacing-md) var(--spacing-3xl);
          background: linear-gradient(160deg, #F0FDF7 0%, #FFFFFF 60%);
          gap: var(--spacing-3xl);
          flex-wrap: wrap;
        }
        .hero-inner { flex: 1; min-width: 280px; max-width: 560px; }
        .hero-badge {
          display: inline-flex; align-items: center;
          background: var(--color-primary-light); color: var(--color-primary-dark);
          padding: 6px 14px; border-radius: 999px;
          font-size: var(--font-sm); font-weight: 600;
          margin-bottom: var(--spacing-md);
        }
        .hero-title {
          font-size: clamp(32px, 7vw, 52px);
          font-weight: 800; letter-spacing: -0.03em;
          line-height: 1.15; margin-bottom: var(--spacing-md);
        }
        .hero-highlight {
          background: linear-gradient(135deg, #00C471, #00A85E);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: var(--font-md); color: var(--color-text-secondary);
          line-height: 1.7; margin-bottom: var(--spacing-xl);
        }
        .hero-stats {
          display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
        }
        .stat-item { display: flex; flex-direction: column; gap: 2px; }
        .stat-num { font-size: var(--font-xl); font-weight: 800; color: var(--color-primary); }
        .stat-label { font-size: var(--font-xs); color: var(--color-text-tertiary); }
        .stat-divider { width: 1px; background: var(--color-border); align-self: stretch; }
        .hero-cta { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }

        /* 폰 목업 */
        .hero-visual { flex: 1; min-width: 260px; max-width: 320px; display: flex; justify-content: center; }
        .phone-mockup {
          width: 280px;
          background: #1A1A1A;
          border-radius: 40px;
          padding: 16px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1);
        }
        .phone-screen {
          background: var(--color-bg);
          border-radius: 28px;
          padding: 20px 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .mockup-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 15px; }
        .mockup-badge { background: var(--color-primary); color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
        .mockup-card {
          background: #fff; border-radius: 12px; padding: 12px;
          display: flex; justify-content: space-between; align-items: center;
          box-shadow: var(--shadow-xs);
        }
        .mockup-card-left { display: flex; gap: 10px; align-items: center; }
        .mockup-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .mockup-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
        .mockup-time { font-size: 11px; color: var(--color-text-tertiary); }
        .mockup-price { font-size: 13px; font-weight: 700; color: var(--color-primary); }
        .mockup-earning {
          background: var(--color-primary); color: #fff;
          border-radius: 12px; padding: 12px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px;
        }
        .mockup-earn-amount { font-weight: 800; font-size: 16px; }

        /* 섹션 공통 */
        .section-inner { max-width: 1200px; margin: 0 auto; padding: 0 var(--spacing-md); }
        .section-title {
          text-align: center; font-size: var(--font-2xl); font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: var(--spacing-xl);
        }

        /* 탭 섹션 */
        .tab-section { padding: var(--spacing-3xl) 0; background: var(--color-bg); }
        .tab-toggle {
          display: flex; background: var(--color-surface);
          border-radius: 999px; padding: 4px;
          margin: 0 auto var(--spacing-xl);
          max-width: 320px;
          border: 1px solid var(--color-border);
        }
        .tab-btn {
          flex: 1; padding: 10px; border-radius: 999px;
          font-size: var(--font-sm); font-weight: 600;
          color: var(--color-text-tertiary);
          transition: all var(--transition-fast);
        }
        .tab-btn.active { background: var(--color-primary); color: #fff; box-shadow: var(--shadow-sm); }
        .features-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--spacing-md);
        }
        .feature-card { padding: var(--spacing-lg); }
        .feature-icon { font-size: 32px; margin-bottom: var(--spacing-sm); }
        .feature-title { font-size: var(--font-md); font-weight: 700; margin-bottom: 6px; }
        .feature-desc { font-size: var(--font-sm); color: var(--color-text-secondary); line-height: 1.6; }

        /* 신뢰 섹션 */
        .trust-section { padding: var(--spacing-3xl) 0; }
        .trust-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--spacing-md);
        }
        .trust-item {
          text-align: center; padding: var(--spacing-lg);
          background: var(--color-primary-light); border-radius: 20px;
        }
        .trust-num { font-size: var(--font-2xl); font-weight: 800; color: var(--color-primary); margin-bottom: 4px; }
        .trust-label { font-size: var(--font-sm); font-weight: 700; margin-bottom: 4px; }
        .trust-sub { font-size: var(--font-xs); color: var(--color-text-secondary); }

        /* CTA */
        .cta-section { padding: var(--spacing-3xl) 0; background: linear-gradient(160deg, #F0FDF7, #E8FBF2); }
        .cta-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md); }
        .cta-title { font-size: var(--font-2xl); font-weight: 800; letter-spacing: -0.02em; }
        .cta-desc { color: var(--color-text-secondary); font-size: var(--font-md); }
        .cta-note { font-size: var(--font-xs); color: var(--color-text-tertiary); }

        /* 푸터 */
        .landing-footer { padding: var(--spacing-xl) var(--spacing-md); border-top: 1px solid var(--color-border-light); }
        .footer-inner { max-width: 1200px; margin: 0 auto; text-align: center; }
        .footer-links { display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-md); }
        .footer-links a { font-size: var(--font-sm); color: var(--color-text-secondary); }
        .footer-links a:hover { color: var(--color-primary); }
      `}</style>
    </div>
  )
}
