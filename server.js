const http = require('http');
const { getLatestQR, requestPairingCode, isSockRegistered } = require('./index.js');

const PORT = process.env.PORT || 3000;

function homepage() {
  return `
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>COBRA-X MD</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #0a0014, #1a0a2e);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        box-sizing: border-box;
      }
      h1 {
        color: #b347ff;
        text-shadow: 0 0 15px #7b2ff7;
        margin-bottom: 5px;
      }
      p.sub {
        color: #4facfe;
        margin-top: 0;
        margin-bottom: 30px;
      }
      .card {
        background: rgba(255,255,255,0.05);
        border: 1px solid #7b2ff7;
        border-radius: 16px;
        padding: 25px;
        width: 100%;
        max-width: 350px;
        box-shadow: 0 0 25px rgba(123,47,247,0.3);
        text-align: center;
      }
      input {
        width: 100%;
        padding: 12px;
        margin-top: 15px;
        border-radius: 8px;
        border: 1px solid #4facfe;
        background: #0a0014;
        color: #fff;
        font-size: 16px;
        box-sizing: border-box;
      }
      button {
        width: 100%;
        margin-top: 15px;
        padding: 12px;
        border-radius: 8px;
        border: none;
        background: linear-gradient(90deg, #7b2ff7, #4facfe);
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      }
      #result {
        margin-top: 20px;
        font-size: 28px;
        letter-spacing: 4px;
        color: #4facfe;
        font-weight: bold;
      }
      a {
        color: #b347ff;
        display: block;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <h1>COBRA-X MD</h1>
    <p class="sub">Owned by LORD COBRA</p>
    <div class="card">
      <div>Enter your WhatsApp number to pair</div>
      <input id="phone" type="text" placeholder="e.g. 2348012345678" />
      <button onclick="getCode()">Get Pairing Code</button>
      <div id="result"></div>
    </div>
    <a href="/qr">Prefer to scan a QR code instead?</a>

    <script>
      async function getCode() {
        const phone = document.getElementById('phone').value.trim();
        const resultDiv = document.getElementById('result');
        resultDiv.innerText = 'Requesting...';
        try {
          const res = await fetch('/pair-code?number=' + encodeURIComponent(phone));
          const data = await res.json();
          if (data.code) {
            resultDiv.innerText = data.code;
          } else {
            resultDiv.innerText = data.error || 'Error getting code';
          }
        } catch (e) {
          resultDiv.innerText = 'Request failed';
        }
      }
    </script>
  </body>
  </html>
  `;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/pair-code') {
    const number = url.searchParams.get('number');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!number) {
      res.end(JSON.stringify({ error: 'No number provided' }));
      return;
    }
    if (isSockRegistered()) {
      res.end(JSON.stringify({ error: 'Already paired' }));
      return;
    }
    try {
      const code = await requestPairingCode(number);
      res.end(JSON.stringify({ code }));
    } catch (err) {
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/qr') {
    const qrImage = getLatestQR();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (!qrImage) {
      res.end('<h2 style="color:#fff;background:#0a0014;padding:40px;font-family:Arial;">No QR code yet. Refresh in a few seconds.</h2>');
      return;
    }
    res.end(`
      <html>
        <body style="background:#0a0014;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
          <img src="${qrImage}" style="width:300px;height:300px;" />
        </body>
      </html>
    `);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(homepage());
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});