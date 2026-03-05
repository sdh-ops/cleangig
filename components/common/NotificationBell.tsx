'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'

export interface Notification {
    id: string
    title: string
    message: string
    url?: string
    is_read: boolean
    created_at: string
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchNotifications()

        const supabase = createClient()
        let userId: string

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            userId = user.id

            const channel = supabase.channel('user-notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    const newNoti = payload.new as Notification
                    setNotifications(prev => [newNoti, ...prev])
                    setUnreadCount(prev => prev + 1)

                    // Web Push API (권한이 허용된 경우)
                    if (Notification.permission === 'granted') {
                        new Notification(newNoti.title, {
                            body: newNoti.message,
                            icon: '/icons/icon-192x192.png'
                        })
                    }
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
        setupRealtime()

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.is_read).length)
        }
    }

    const handleOpen = async () => {
        setIsOpen(!isOpen)
        if (!isOpen && unreadCount > 0) {
            // 읽음 처리
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false)
                setUnreadCount(0)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            }
        }
    }

    const handleClickLink = (url?: string) => {
        setIsOpen(false)
        if (url) {
            router.push(url)
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button
                onClick={handleOpen}
                style={{
                    background: 'transparent',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-primary)'
                }}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#EF4444',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 'bold',
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: 320,
                    maxHeight: 400,
                    overflowY: 'auto',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 16,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    marginTop: 8
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-light)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>알림 센터</span>
                        {/* 권한 요청 버튼 (권한이 없는 경우만 표시) */}
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                            <button
                                onClick={() => Notification.requestPermission()}
                                style={{ fontSize: 11, background: 'var(--color-bg)', padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                            >
                                푸시 알림 켜기
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                            새로운 알림이 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {notifications.map(noti => (
                                <div
                                    key={noti.id}
                                    onClick={() => handleClickLink(noti.url)}
                                    style={{
                                        padding: 16,
                                        borderBottom: '1px solid var(--color-border-light)',
                                        cursor: noti.url ? 'pointer' : 'default',
                                        background: noti.is_read ? 'transparent' : 'var(--color-primary-light)',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--color-text-primary)' }}>{noti.title}</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{noti.message}</div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                                        {new Date(noti.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
