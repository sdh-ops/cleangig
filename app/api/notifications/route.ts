import { NextRequest, NextResponse } from 'next/server'

// 솔라피 카카오 알림톡 발송 API
const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET
const SENDER_PHONE = process.env.SOLAPI_SENDER_PHONE

interface NotificationPayload {
    user_id: string
    phone: string
    template_code: string
    variables: Record<string, string>
    job_id?: string
}

export async function POST(req: NextRequest) {
    try {
        const body: NotificationPayload = await req.json()

        // SOLAPI가 없는 경우 (개발 환경) 로그만 출력
        if (!SOLAPI_API_KEY || SOLAPI_API_SECRET === 'YOUR_SOLAPI_API_KEY') {
            console.log('📱 [DEV] 알림톡 발송 시뮬레이션:', body)
            return NextResponse.json({ success: true, dev_mode: true })
        }

        // 솔라피 알림톡 발송
        const timestamp = Date.now().toString()
        const response = await fetch('https://api.solapi.com/messages/v4/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${new Date().toISOString()}, salt=${timestamp}, signature=TODO`,
            },
            body: JSON.stringify({
                message: {
                    to: body.phone,
                    from: SENDER_PHONE,
                    kakaoOptions: {
                        pfId: process.env.SOLAPI_PF_ID,
                        templateId: body.template_code,
                        variables: body.variables,
                    },
                },
            }),
        })

        const result = await response.json()
        return NextResponse.json({ success: response.ok, result })

    } catch (error) {
        console.error('Notification error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
