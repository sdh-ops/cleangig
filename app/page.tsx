'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="landing-v2">
      {/* Hero Section */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-content"
        >
          <div className="brand-badge">Premium Cleaning Service</div>
          <h1 className="hero-title">
            공간의 가치를 높이는<br />
            <span className="text-gradient">프리미엄 클리닝, 클린긱</span>
          </h1>
          <p className="hero-subtitle">
            검증된 파트너와 함께하는<br />
            맞춤형 청소 서비스를 경험해보세요.
          </p>

          <div className="hero-cta">
            <Link href="/login" className="btn-premium btn-full">
              시작하기
            </Link>
          </div>
        </motion.div>

        <div className="hero-visual">
          {/* Stitch 디자인의 추상적 그래픽 또는 고퀄리티 이미지 영역 */}
          <div className="visual-circle circle-1"></div>
          <div className="visual-circle circle-2"></div>
        </div>
      </section>

      {/* Quick Stats or Features */}
      <section className="features">
        <div className="feature-card-v2">
          <span className="feature-icon">✨</span>
          <div className="feature-info">
            <h3>AI 추천 매칭</h3>
            <p>가장 적합한 파트너를 5분 내 매칭</p>
          </div>
        </div>
        <div className="feature-card-v2">
          <span className="feature-icon">🛡️</span>
          <div className="feature-info">
            <h3>에스크로 보호</h3>
            <p>작업 완료 확인 후 안전한 정산</p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .landing-v2 {
          min-height: 100vh;
          background: var(--color-bg);
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-x: hidden;
        }
        .hero {
          width: 100%;
          max-width: var(--max-width-app);
          padding-top: 80px;
          padding-bottom: 40px;
          position: relative;
        }
        .brand-badge {
          display: inline-block;
          padding: 6px 14px;
          background: var(--color-primary-soft);
          color: var(--color-primary);
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.3;
          color: var(--color-text-primary);
          margin-bottom: 20px;
        }
        .hero-subtitle {
          font-size: 18px;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: 40px;
        }
        .hero-cta {
          margin-top: 20px;
        }
        .hero-visual {
          position: absolute;
          top: -20px;
          right: -100px;
          z-index: -1;
        }
        .visual-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
        }
        .circle-1 {
          width: 300px;
          height: 300px;
          background: var(--color-primary-light);
          top: 0;
          right: 0;
        }
        .circle-2 {
          width: 200px;
          height: 200px;
          background: #FFD400;
          top: 150px;
          right: 120px;
        }
        .features {
          width: 100%;
          max-width: var(--max-width-app);
          display: grid;
          gap: 16px;
          margin-top: 20px;
        }
        .feature-card-v2 {
          background: var(--color-surface);
          padding: 24px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-sm);
        }
        .feature-icon {
          font-size: 32px;
        }
        .feature-info h3 {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .feature-info p {
          font-size: 14px;
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  );
}
