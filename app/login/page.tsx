'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
    return (
        <div className="login-v2">
            <div className="login-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="login-header"
                >
                    <div className="logo-sparkle-large">✨</div>
                    <h1 className="login-title">반가워요!<br />지금 바로 시작할까요?</h1>
                    <p className="login-desc">30초면 가입하고 서비스를 이용할 수 있어요.</p>
                </motion.div>

                <div className="login-actions">
                    <button className="btn-kakao-v2 btn-full">
                        <span className="icon">💬</span> 카카오로 로그인
                    </button>
                    <button className="btn-google-v2 btn-full">
                        <span className="icon">G</span> 구글로 로그인
                    </button>
                </div>

                <div className="login-footer">
                    <p>로그인 시 <Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보처리방침</Link>에 동의하게 됩니다.</p>
                </div>
            </div>

            <style jsx>{`
        .login-v2 {
          min-height: 100vh;
          background: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .login-container {
          width: 100%;
          max-width: var(--max-width-app);
          text-align: center;
        }
        .logo-sparkle-large {
          font-size: 64px;
          margin-bottom: 24px;
        }
        .login-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.3;
          margin-bottom: 12px;
        }
        .login-desc {
          font-size: 16px;
          color: var(--color-text-secondary);
          margin-bottom: 48px;
        }
        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 48px;
        }
        .btn-kakao-v2 {
          background: #FEE500;
          color: #3C1E1E;
          height: 58px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(254, 229, 0, 0.2);
        }
        .btn-google-v2 {
          background: #FFFFFF;
          color: var(--color-text-primary);
          height: 58px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--color-border-light);
          box-shadow: var(--shadow-sm);
        }
        .btn-kakao-v2:active, .btn-google-v2:active {
          transform: scale(0.97);
        }
        .login-footer {
          font-size: 13px;
          color: var(--color-text-tertiary);
          line-height: 1.5;
        }
        .login-footer a {
          text-decoration: underline;
        }
      `}</style>
        </div>
    );
}
