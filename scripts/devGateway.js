const http = require('http');

const gatewayPort = Number(process.env.GATEWAY_PORT || 8080);
const webPort = Number(process.env.WEB_PORT || 3000);
const botPort = Number(process.env.BOT_PORT || process.env.PORT || 3001);

function pickTarget(pathname) {
    if (pathname.startsWith('/webhook/')) {
        return { port: botPort, name: 'bot' };
    }

    return { port: webPort, name: 'web' };
}

const server = http.createServer((request, response) => {
    const target = pickTarget(new URL(request.url, 'http://localhost').pathname);

    const proxyRequest = http.request({
        hostname: '127.0.0.1',
        port: target.port,
        path: request.url,
        method: request.method,
        headers: request.headers
    }, (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(response);
    });

    proxyRequest.on('error', (error) => {
        response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            success: false,
            message: `Gateway gagal meneruskan request ke ${target.name} port ${target.port}: ${error.message}`
        }));
    });

    request.pipe(proxyRequest);
});

server.listen(gatewayPort, () => {
    console.log(`Dev gateway siap: http://localhost:${gatewayPort}`);
    console.log(`- /webhook/* -> bot http://localhost:${botPort}`);
    console.log(`- lainnya -> web http://localhost:${webPort}`);
});
