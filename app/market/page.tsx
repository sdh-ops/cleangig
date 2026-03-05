'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COUPANG_LINKS = [
    { id: 1, title: '대용량 롤 휴지', q: '업소용 화장지', icon: '🧻', desc: '자주 쓰이는 대용량 3겹 롤휴지' },
    { id: 2, title: '종량제 봉투', q: '종량제 봉투 75L', icon: '🗑️', desc: '공간 파트너 필수 대용량 봉투' },
    { id: 3, title: '다목적 세정제', q: '다목적 세정제 대용량', icon: '🧴', desc: '바닥부터 화장실까지 하나로' },
    { id: 4, title: '청소용 물티슈', q: '청소용 물티슈', icon: '🧽', desc: '찌든 때와 먼지를 쉽게 닦는 물티슈' },
    { id: 5, title: '무선 청소기', q: '가성비 무선 청소기', icon: '🧹', desc: '잔고장 없고 흡입력 좋은 청소기' },
    { id: 6, title: '섬유 탈취제', q: '실내 섬유 탈취제 대용량', icon: '🌿', desc: '공간의 첫인상을 결정하는 향기' },
]

export default function MarketPage() {
    const router = useRouter()

    const handleSearchCoupang = (query: string) => {
        const encoded = encodeURIComponent(query)
        window.open(`https://www.coupang.com/np/search?component=&q=${encoded}&channel=user`, '_blank')
    }

    return (
        <div className="page-container">
            {/* 헤더 */}
            <header className="header">
                <button className="btn btn-icon" onClick={() => router.back()}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <div className="header-title">비품 마켓</div>
                <div style={{ width: 40 }} />
            </header>

            <div className="page-content">
                <div className="card mb-md" style={{ background: 'linear-gradient(135deg, #FFF0F0 0%, #FFE4E4 100%)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <span className="badge-approved mb-sm inline-block" style={{ background: '#E11D48', color: '#fff' }}>로켓배송 파트너십</span>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#9F1239', marginBottom: '8px' }}>
                                사업자용 필수 비품<br />
                                로켓배송으로 내일 바로 받으세요
                            </h2>
                            <p style={{ fontSize: '13px', color: '#BE123C', opacity: 0.9 }}>
                                쿠팡 연동으로 가장 저렴하고 빠른 상품들을 모았습니다.
                            </p>
                        </div>
                        <div style={{ fontSize: '48px', opacity: 0.8 }}>📦</div>
                    </div>
                </div>

                <div className="market-grid">
                    {COUPANG_LINKS.map(item => (
                        <div key={item.id} className="market-item card" onClick={() => handleSearchCoupang(item.q)}>
                            <div className="market-icon">{item.icon}</div>
                            <h3 className="market-title">{item.title}</h3>
                            <p className="market-desc">{item.desc}</p>
                            <div className="coupang-link-btn">쿠팡 최저가 보기 →</div>
                        </div>
                    ))}
                </div>

                <div className="mt-xl text-center" style={{ padding: '24px 0', borderTop: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px' }}>
                        원하는 상품이 없으신가요?
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => window.open('https://www.coupang.com', '_blank')}
                    >
                        쿠팡 기본 홈으로 이동
                    </button>
                </div>
            </div>

            <style jsx>{`
                .market-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                .market-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 24px 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .market-item:active {
                    transform: scale(0.98);
                }
                .market-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }
                .market-title {
                    font-weight: 700;
                    font-size: 15px;
                    margin-bottom: 8px;
                    color: #1E293B;
                }
                .market-desc {
                    font-size: 12px;
                    color: #64748B;
                    margin-bottom: 16px;
                    line-height: 1.4;
                }
                .coupang-link-btn {
                    margin-top: auto;
                    font-size: 12px;
                    font-weight: 700;
                    color: #E11D48;
                    background: #FEF2F2;
                    padding: 6px 12px;
                    border-radius: 4px;
                    width: 100%;
                }
            `}</style>
        </div>
    )
}
