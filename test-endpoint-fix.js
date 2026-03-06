const https = require('https');

const clientId = 'fspa2h01ox';
const clientSecret = 'svhZBCE9gJEmj4VAuglcDvV1nf94nkpUJuLno5Pz';
const query = encodeURIComponent('서울시 마포구 양화로 12길 16');

const callApi = (hostname, path) => {
    return new Promise((resolve) => {
        console.log(`\nTESTING: https://${hostname}${path}`);
        const options = {
            hostname: hostname,
            path: path,
            method: 'GET',
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret,
                'Accept': 'application/json'
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
    // Current (failing) endpoint
    await callApi('naveropenapi.apigw.ntruss.com', `/map-geocode/v2/geocode?query=${query}`);

    // Documented (correct) endpoint for Maps
    await callApi('maps.apigw.ntruss.com', `/map-geocode/v2/geocode?query=${query}`);
}

run();
