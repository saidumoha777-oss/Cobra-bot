const http = require('http');
require('./index.js'); // starts your actual bot

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cobra bot is running');
}).listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
});