'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import JobsMap from './JobsMap';

interface Job {
    id: string;
    status: string;
    price: number;
    scheduled_at: string;
    estimated_duration: number;
    is_urgent: boolean;
    matching_score: number;
    spaces?: { name: string; address: string; type: string; reference_photos?: string[]; lat?: number; lng?: number };
}

const SPACE_TYPE_ICON: Record<string, string> = {
    airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
    unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
};

export default function JobsListPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'nearby'>('nearby');
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    useEffect(() => {
        fetchJobs();
        const supabase = createClient();
        const channel = supabase.channel('open-jobs-v2')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' },
                (payload) => { if (payload.new.status === 'OPEN') fetchJobs(); })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' },
                () => fetchJobs())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchJobs = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('jobs')
            .select('*, spaces(name, address, type, reference_photos, lat, lng)')
            .eq('status', 'OPEN')
            .gte('scheduled_at', new Date().toISOString())
            .or(`targeted_worker_id.is.null,targeted_worker_id.eq.${user.id}`)
            .order('is_urgent', { ascending: false })
            .order('scheduled_at')
            .limit(50);
        setJobs((data as any[]) || []);
        setLoading(false);
    };

    const filtered = jobs.filter(j => {
        if (filter === 'urgent') return j.is_urgent;
        if (searchText) {
            const txt = searchText.toLowerCase();
            return (j.spaces?.name || '').toLowerCase().includes(txt)
                || (j.spaces?.address || '').toLowerCase().includes(txt);
        }
        return true;
    });

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                <section className="search-header">
                    <div className="search-bar-v2 card">
                        <span className="search-icon">🔍</span>
                        <input
                            placeholder="일감 이름이나 지역 검색"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>

                    <div className="filter-controls">
                        <div className="tabs">
                            <button
                                className={`tab-chip ${filter === 'nearby' ? 'active' : ''}`}
                                onClick={() => setFilter('nearby')}
                            >📍 가까운 순</button>
                            <button
                                className={`tab-chip ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >전체</button>
                            <button
                                className={`tab-chip ${filter === 'urgent' ? 'active' : ''}`}
                                onClick={() => setFilter('urgent')}
                            >🔥 긴급</button>
                        </div>

                        <div className="view-toggle">
                            <button
                                className={viewMode === 'list' ? 'active' : ''}
                                onClick={() => setViewMode('list')}
                            >목록</button>
                            <button
                                className={viewMode === 'map' ? 'active' : ''}
                                onClick={() => setViewMode('map')}
                            >지도</button>
                        </div>
                    </div>
                </section>

                <section className="jobs-list-section">
                    <div className="status-indicator-bar">
                        <span className="dot pulse" />
                        <span className="text">실시간 신규 일감 업데이트 중 ({filtered.length})</span>
                    </div>

                    {loading ? (
                        <div className="skeleton-list">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton-job-card" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-jobs card">
                            <div className="icon">🔍</div>
                            <h3>현재 조건에 맞는 일감이 없습니다</h3>
                            <p>필터를 변경하거나 조금만 기다려 주세요!</p>
                        </div>
                    ) : viewMode === 'map' ? (
                        <div className="map-view-container card">
                            <JobsMap jobs={filtered} />
                        </div>
                    ) : (
                        <div className="job-stack">
                            {filtered.map((job: any) => {
                                const space = job.spaces;
                                const when = new Date(job.scheduled_at);
                                const timeStr = when.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                                return (
                                    <Link href={`/clean/job/${job.id}`} key={job.id} className="job-card-premium card">
                                        <div className="card-top">
                                            <div className="space-info">
                                                {space?.reference_photos?.[0] ? (
                                                    <img src={space.reference_photos[0]} alt="" className="thumb" />
                                                ) : (
                                                    <div className="thumb-placeholder">{SPACE_TYPE_ICON[space?.type] || '🏢'}</div>
                                                )}
                                                <div className="text-info">
                                                    <div className="name-row">
                                                        <h4 className="space-name">{space?.name}</h4>
                                                        {job.is_urgent && <span className="urgent-badge">긴급</span>}
                                                    </div>
                                                    <p className="address text-tertiary">{space?.address}</p>
                                                </div>
                                            </div>
                                            <div className="price-tag">
                                                <span className="amount">₩{job.price.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="card-bottom">
                                            <div className="meta">
                                                <span className="meta-item">⏰ {timeStr}</span>
                                                <span className="meta-item">⏱ {job.estimated_duration}분</span>
                                            </div>
                                            <div className="hourly-rate">
                                                시급 {Math.round(job.price / (job.estimated_duration / 60)).toLocaleString()}원
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <BottomNav />

            <style jsx>{`
        .bg-premium-v2 {
          background-color: var(--color-bg);
          min-height: 100vh;
        }
        .page-content {
          padding: 20px 20px 120px;
        }
        .search-header {
           margin-bottom: 24px;
        }
        .search-bar-v2 {
          display: flex;
          align-items: center;
          padding: 0 20px;
          height: 56px;
          gap: 12px;
          margin-bottom: 16px;
          background: #FFFFFF;
        }
        .search-bar-v2 input {
          flex: 1;
          border: none;
          font-size: 16px;
          font-weight: 600;
          outline: none;
          background: transparent;
        }
        .filter-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tabs {
          display: flex;
          gap: 8px;
        }
        .tab-chip {
           padding: 8px 16px;
           border-radius: 12px;
           font-size: 13px;
           font-weight: 700;
           background: #FFFFFF;
           color: var(--color-text-tertiary);
           border: 1px solid var(--color-border-light);
        }
        .tab-chip.active {
          background: var(--color-primary);
          color: #FFFFFF;
          border-color: var(--color-primary);
        }
        .view-toggle {
          background: #E9ECEF;
          padding: 3px;
          border-radius: 10px;
          display: flex;
        }
        .view-toggle button {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 800;
          border-radius: 8px;
          border: none;
          color: #8B95A1;
          background: transparent;
        }
        .view-toggle button.active {
          background: #FFFFFF;
          color: #000;
          box-shadow: var(--shadow-sm);
        }
        .status-indicator-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          padding: 4px 0;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: var(--color-primary);
          border-radius: 50%;
        }
        .pulse {
          animation: pulse-ani 2s infinite;
        }
        @keyframes pulse-ani {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .status-indicator-bar .text {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-primary);
        }
        .job-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .job-card-premium {
          padding: 24px;
          text-decoration: none;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .space-info {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .thumb, .thumb-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          object-fit: cover;
          border: 1px solid var(--color-border-light);
        }
        .thumb-placeholder {
          background: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }
        .space-name {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .urgent-badge {
          background: #FFF1F2;
          color: #E11D48;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .address {
          font-size: 13px;
          font-weight: 500;
        }
        .amount {
          font-size: 19px;
          font-weight: 900;
          color: var(--color-primary);
        }
        .card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--color-border-light);
        }
        .meta {
          display: flex;
          gap: 12px;
        }
        .meta-item {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 700;
        }
        .hourly-rate {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-primary-medium);
        }
        .map-view-container {
           height: 500px;
           overflow: hidden;
           padding: 0;
           border: 1px solid var(--color-border-light);
        }
        .empty-jobs {
          padding: 60px 24px;
          text-align: center;
        }
        .empty-jobs h3 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .empty-jobs p {
          font-size: 14px;
          color: var(--color-text-tertiary);
        }
      `}</style>
        </div>
    );
}
