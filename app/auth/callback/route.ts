import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const origin = requestUrl.origin
    const searchParams = requestUrl.searchParams
    const code = searchParams.get('code')
    const role = searchParams.get('role') // operator | worker

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('❌ Auth Callback Error (exchangeCode):', error.message)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }

        if (data.user) {
            // users 테이블에 프로필 있는지 확인
            const { data: existingUser } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', data.user.id)
                .single()

            if (!existingUser) {
                // 신규 회원: users 테이블에 프로필 생성
                const userEmail = data.user.email || `${data.user.id}@kakao.user`
                const kakaoName = data.user.user_metadata?.full_name
                    || data.user.user_metadata?.name
                    || '사용자'

                await supabase.from('users').insert({
                    id: data.user.id,
                    email: userEmail,
                    name: kakaoName,
                    profile_image: data.user.user_metadata?.avatar_url,
                    role: (role as 'operator' | 'worker') || 'worker',
                    is_active: true,
                    is_verified: false,
                })

                // 온보딩으로 이동 (신규)
                return NextResponse.redirect(`${origin}/onboarding?role=${role || 'worker'}`)
            }

            // 기존 회원: URL에 role이 있고 DB와 다르면 업데이트
            const targetRole = (role as 'operator' | 'worker')
            if (targetRole && targetRole !== existingUser.role) {
                await supabase
                    .from('users')
                    .update({ role: targetRole })
                    .eq('id', data.user.id)

                // 업데이트된 역할로 리다이렉트
                return NextResponse.redirect(targetRole === 'operator' ? `${origin}/dashboard` : `${origin}/clean`)
            }

            // 기존 회원: 역할에 따라 라우팅
            if (existingUser.role === 'operator') {
                return NextResponse.redirect(`${origin}/dashboard`)
            } else if (existingUser.role === 'worker') {
                return NextResponse.redirect(`${origin}/clean`)
            } else {
                return NextResponse.redirect(`${origin}/admin`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
