require('dotenv').config({ path: __dirname + '/../.env' });

const express = require('express');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const app = express();
app.use(helmet());
const server = http.createServer(app);

const PORT = process.env.PORT || 8787;

// Serve built frontend (adjust if your build path differs)
app.use(express.static(path.join(__dirname, '../dist')));

// Example API
app.get('/api/health', (_, res) => res.json({ ok: true }));

// WebSocket example (motion boxes placeholder)
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
});

server.listen(PORT, () => {
  console.log(`HomeEye server on :${PORT}`);
});
