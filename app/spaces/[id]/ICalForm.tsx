'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ICalForm({ spaceId, initialUrl }: { spaceId: string, initialUrl: string | null }) {
    const [url, setUrl] = useState(initialUrl || '')
    const [loading, setLoading] = useState(false)
    const [isLinked, setIsLinked] = useState(!!initialUrl)

    const handleSave = async () => {
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.from('spaces').update({ ical_url: url }).eq('id', spaceId)
        if (!error) {
            setIsLinked(!!url)
            alert('iCal 연동 정보가 저장되었습니다.')
        } else {
            alert('저장에 실패했습니다.')
        }
        setLoading(false)
    }

    return (
        <div className="card p-md mb-md" style={{ border: '1px solid var(--color-primary-light)' }}>
            <h3 className="font-bold text-md mb-xs flex items-center gap-xs">
                <span>📅</span> 스마트 일정(iCal) 연동
            </h3>
            <p className="text-sm text-secondary mb-md">
                에어비앤비/스페이스클라우드 예약 캘린더를 연동하면, 일정표에 고객 예약이 표시되고 비어있는 공실 시간에 대해 최적의 <strong className="text-primary">청소 타이밍을 스마트하게 제안</strong>해 드립니다.
            </p>
            <div className="flex gap-sm">
                <input
                    className="form-input"
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="https://www.airbnb.co.kr/calendar/ical/..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <button
                    className={`btn text-sm px-md flex-shrink-0 ${isLinked ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleSave}
                    disabled={loading}
                    style={isLinked ? { border: '1px solid var(--color-border)' } : {}}
                >
                    {loading ? '저장 중...' : (isLinked ? '변경' : '연동')}
                </button>
            </div>
            {isLinked && (
                <p className="text-xs mt-sm font-medium" style={{ color: 'var(--color-green)' }}>
                    ✅ 정상적으로 연동되어 스마트 일정 관리가 활성화되었습니다.
                </p>
            )}
        </div>
    )
}
