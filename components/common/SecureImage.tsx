'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
    srcOrPath: string
    bucket?: string
}

export default function SecureImage({ srcOrPath, bucket = 'photos', ...props }: Props) {
    const [imgSrc, setImgSrc] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const fetchSignedUrl = async () => {
            if (!srcOrPath) {
                setLoading(false)
                return
            }

            // 이미 풀 URL(http)이거나 Data URI인 경우 그대로 사용
            if (srcOrPath.startsWith('http') || srcOrPath.startsWith('data:')) {
                setImgSrc(srcOrPath)
                setLoading(false)
                return
            }

            // Path인 경우 Signed URL 발급 (1시간 만료)
            const supabase = createClient()
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(srcOrPath, 60 * 60)

            if (!error && data?.signedUrl) {
                if (isMounted) setImgSrc(data.signedUrl)
            } else {
                console.error('Failed to get signed URL', error)
            }
            if (isMounted) setLoading(false)
        }

        fetchSignedUrl()
        return () => { isMounted = false }
    }, [srcOrPath, bucket])

    if (loading) {
        return <div style={{ width: '100%', height: '100%', background: '#F1F5F9', animation: 'pulse 2s infinite', borderRadius: props.style?.borderRadius || 0 }} />
    }

    if (!imgSrc) {
        return <div style={{ width: '100%', height: '100%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>엑세스 거부됨</div>
    }

    return <img src={imgSrc} {...props} />
}
