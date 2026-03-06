const https = require('https');

const clientId = 'fspa2h01ox';
const clientSecret = 'svhZBCE9gJEmj4VAuglcDvV1nf94nkpUJuLno5Pz';
const query = encodeURIComponent('서울시 마포구 양화로 12길 16');

const test = (name, referer) => {
    return new Promise((resolve) => {
        console.log(`\n--- Testing ${name} ---`);
        const options = {
            hostname: 'naveropenapi.apigw.ntruss.com',
            path: `/map-geocode/v2/geocode?query=${query}`,
            method: 'GET',
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret,
            }
        };

        if (referer) {
            options.headers['Referer'] = referer;
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${data}`);
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (e) => {
            console.error(`Error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
};

async function run() {
    await test('Standard Request', null);
    await test('Request with Referer (localhost)', 'http://localhost:3000');
    await test('Request with Referer (Vercel)', 'https://cleangig.vercel.app');
}

run();
