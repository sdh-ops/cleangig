const fs = require('fs');
const https = require('https');

https.get('https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzhlMTk4NTdmZmE1NDQwZWY5OTc5NWY5NzUyNTM1NWE3EgsSBxCFvZnWqgUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMTY5NzY1MjIzMTQ0MTQ2ODU2&filename=&opi=89354086', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => fs.writeFileSync('stitch_login.html', body));
});

https.get('https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2JjM2JkMzZkMjc1OTQ1ZGJiZjY2OGNhZDVkM2UwNDMyEgsSBxCFvZnWqgUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMTY5NzY1MjIzMTQ0MTQ2ODU2&filename=&opi=89354086', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => fs.writeFileSync('stitch_dashboard.html', body));
});
