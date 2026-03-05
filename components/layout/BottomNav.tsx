'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        {
            label: '홈',
            path: '/clean', // 이 경로는 현재 사용자 역할에 따라 동적으로 바뀔 수 있음
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            )
        },
        {
            label: '일감찾기',
            path: '/clean/jobs',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            )
        },
        {
            label: '일정',
            path: '/chat', // 채팅 또는 일정으로 연결 가능
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            )
        },
        {
            label: '마이',
            path: '/profile',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            )
        }
    ];

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        {item.icon(isActive)}
                        <span>{item.label}</span>
                    </Link>
                );
            })}
            <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: var(--max-width-app);
          height: var(--nav-height-bottom);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding-bottom: env(safe-area-inset-bottom, 12px);
          border-top: 1px solid var(--color-border-light);
          z-index: 1000;
          box-shadow: 0 -4px 20px rgba(53, 88, 114, 0.05);
        }
        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--color-text-tertiary);
          text-decoration: none;
          transition: all 0.2s ease;
          flex: 1;
        }
        .bottom-nav-item span {
          font-size: 11px;
          font-weight: 600;
        }
        .bottom-nav-item.active {
          color: var(--color-primary);
        }
        .bottom-nav-item:active {
          transform: scale(0.92);
        }
      `}</style>
        </nav>
    );
};

export default BottomNav;
