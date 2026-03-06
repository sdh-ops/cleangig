const https = require('https');

// Credentials from .env.local
const clientId = 'fspa2h01ox';
const clientSecret = 'svhZBCE9gJEmj4VAuglcDvV1nf94nkpUJuLno5Pz';

const callApi = (path) => {
    return new Promise((resolve) => {
        console.log(`\nTESTING: ${path}`);
        const options = {
            hostname: 'naveropenapi.apigw.ntruss.com',
            path: path,
            method: 'GET',
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret,
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log(`Response: ${JSON.stringify(parsed, null, 2)}`);
                } catch (e) {
                    console.log(`Raw Response: ${data}`);
                }
                resolve();
            });
        });
        req.on('error', (e) => {
            console.error(`Request Error: ${e.message}`);
            resolve();
        });
        req.end();
    });
};

async function run() {
    // 1. Geocoding
    await callApi(`/map-geocode/v2/geocode?query=${encodeURIComponent('서울시 마포구 양화로 12길 16')}`);

    // 2. Reverse Geocoding
    await callApi(`/map-reversegeocode/v2/gc?coords=126.9783881,37.5666102&output=json`);

    // 3. Static Map (Simple check if it returns 200 or 401)
    await callApi(`/map-static/v2/raster?w=300&h=300&center=126.9783881,37.5666102&level=16`);
}

run();
