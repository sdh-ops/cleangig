import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET; // This should be a server-side env var

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Naver API credentials missing' }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
            {
                headers: {
                    'X-NCP-APIGW-API-KEY-ID': clientId,
                    'X-NCP-APIGW-API-KEY': clientSecret,
                },
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Naver API error:', errorBody);
            return NextResponse.json({ error: 'Failed to fetch from Naver API' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
