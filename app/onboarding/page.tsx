'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
    return (
        <div className="onboarding-v2">
            <div className="content">
                <header className="onboarding-header">
                    <h1 className="title">어떤 파트너로<br />활동하실 계획인가요?</h1>
                    <p className="desc">역할에 따라 맞춤형 기능을 제공해 드려요.</p>
                </header>

                <div className="roles">
                    <Link href="/clean" className="role-card">
                        <div className="role-icon">🧹</div>
                        <div className="role-text">
                            <h3>클린 파트너</h3>
                            <p>청소 일감을 찾고 수익을 창출해요</p>
                        </div>
                        <div className="arrow">→</div>
                    </Link>

                    <Link href="/dashboard" className="role-card">
                        <div className="role-icon">🏠</div>
                        <div className="role-text">
                            <h3>공간 파트너</h3>
                            <p>공간을 등록하고 청소를 요청해요</p>
                        </div>
                        <div className="arrow">→</div>
                    </Link>
                </div>
            </div>

            <style jsx>{`
        .onboarding-v2 {
          min-height: 100vh;
          background: var(--color-bg);
          padding: 40px 24px;
        }
        .content {
          max-width: var(--max-width-app);
          margin: 0 auto;
        }
        .onboarding-header {
          margin-bottom: 48px;
        }
        .title {
          font-size: 28px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.3;
          margin-bottom: 12px;
        }
        .desc {
          font-size: 16px;
          color: var(--color-text-secondary);
        }
        .roles {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .role-card {
          background: var(--color-surface);
          padding: 32px 24px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          text-decoration: none;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s var(--spring);
          border: 1px solid transparent;
        }
        .role-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-light);
        }
        .role-card:active {
          transform: scale(0.97);
        }
        .role-icon {
          font-size: 40px;
        }
        .role-text {
          flex: 1;
        }
        .role-text h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 4px;
        }
        .role-text p {
          font-size: 14px;
          color: var(--color-text-tertiary);
        }
        .arrow {
          font-size: 24px;
          color: var(--color-primary-medium);
          opacity: 0.5;
        }
      `}</style>
        </div>
    );
}
