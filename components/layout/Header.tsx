'use client';

import React from 'react';
import Link from 'next/link';
import NotificationBell from '../common/NotificationBell';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showBack }) => {
  return (
    <header className="header">
      <div className="header-left">
        {showBack ? (
          <button onClick={() => window.history.back()} className="back-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        ) : (
          <Link href="/" className="logo">
            <img src="/logo_en.png" alt="CleanGig" className="h-8 w-auto object-contain" />
          </Link>
        )}
      </div>

      {title && <h1 className="header-title">{title}</h1>}

      <div className="header-right">
        <NotificationBell />
        <Link href="/profile" className="profile-btn">
          <div className="avatar-circle">B</div>
        </Link>
      </div>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          height: 64px;
          background: rgba(247, 248, 240, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 900;
          border-bottom: 1px solid var(--color-border-light);
        }
        .logo {
          font-size: 20px;
          font-weight: 800;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--color-primary-soft);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          border: 1.5px solid var(--color-primary-light);
        }
        .back-btn {
          color: var(--color-text-primary);
        }
      `}</style>
    </header>
  );
};

export default Header;
