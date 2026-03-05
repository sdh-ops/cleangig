import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const protectedPaths = ['/dashboard', '/clean', '/earnings', '/spaces', '/requests', '/admin']
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    // 로그인하지 않은 사용자가 보호된 경로에 접근할 때
    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 이미 로그인한 사용자가 / 또는 /login에 접근할 때
    if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login')) {
        const requestedRole = request.nextUrl.searchParams.get('role')

        // 유저 정보 가져와서 역할 확인
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const url = request.nextUrl.clone()

        // 1. URL에 role 파라미터가 있고, 현재 DB 역할과 다를 경우 -> DB 업데이트 후 이동
        if (requestedRole && requestedRole !== profile?.role) {
            await supabase
                .from('users')
                .update({ role: requestedRole })
                .eq('id', user.id)
            url.pathname = requestedRole === 'operator' ? '/dashboard' : '/clean'
        } else {
            // 2. 파라미터가 없거나 현재 역할과 같을 경우
            if (profile?.role === 'worker') {
                url.pathname = '/clean'
            } else {
                url.pathname = '/dashboard'
            }
        }

        url.search = '' // 쿼리 스트링 제거
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/webhooks).*)'],
}
