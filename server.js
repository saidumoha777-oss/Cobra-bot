const http = require('http');
const { getLatestQR } = require('./index.js');

const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  if (req.url === '/qr') {
    const qrImage = getLatestQR();
    if (!qrImage) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>No QR code yet. Refresh in a few seconds.</h2>');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
          <img src="${qrImage}" style="width:300px;height:300px;" />
        </body>
      </html>
    `);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cobra bot is running. Visit /qr to scan.');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});