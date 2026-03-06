'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BottomNav = () => {
    const pathname = usePathname();
    const [role, setRole] = useState<'operator' | 'worker' | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
                if (data?.role) setRole(data.role as 'operator' | 'worker');
            }
        };
        fetchRole();
    }, []);

    // 호스트 뷰
    const hostNavItems = [
        {
            label: '홈',
            path: '/dashboard',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>home</span>
        },
        {
            label: '내공간',
            path: '/spaces',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>door_open</span>
        },
        {
            label: '요청내역',
            path: '/requests',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>assignment</span>
        },
        {
            label: '마이',
            path: '/profile',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>person</span>
        }
    ];

    // 파트너 뷰
    const workerNavItems = [
        {
            label: '홈',
            path: '/clean',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>home</span>
        },
        {
            label: '요청찾기',
            path: '/clean/jobs',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>work</span>
        },
        {
            label: '청소일정',
            path: '/clean/jobs/active',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>calendar_month</span>
        },
        {
            label: '마이',
            path: '/profile',
            icon: (active: boolean) => <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>person</span>
        }
    ];

    if (!role) return null; // 로딩 중이거나 알 수 없을 때 렌더링 방지
    const navItems = role === 'operator' ? hostNavItems : workerNavItems;

    return (
        <nav className="fixed bottom-0 w-full max-w-md flex border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 pb-[env(safe-area-inset-bottom,20px)] pt-2 z-50 left-1/2 -translate-x-1/2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="pb-2 w-full flex">
                {navItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && item.path !== '/dashboard' && item.path !== '/clean' && pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors ${isActive ? 'text-primary dark:text-primary-light' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary'}`}
                        >
                            {item.icon(isActive)}
                            <p className="text-[10px] font-bold leading-normal tracking-[0.015em]">{item.label}</p>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
