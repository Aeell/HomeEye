import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { config } from './config.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });


// Static UI
const uiDir = path.join(__dirname, '..', 'ui');
app.use(express.static(uiDir));


// Health
app.get('/healthz', (req, res) => res.json({ ok: true }));


// Config for client
app.get('/config.json', (req, res) => {
const host = req.headers['x-forwarded-host'] || req.headers.host || `${req.hostname}:${config.WEB_PORT}`;
const hostname = String(host).split(':')[0];
const streamUrl = `${req.protocol}://${hostname}:${config.MJPEG_PORT}/stream.mjpg`.replace('https://', 'http://');
res.json({ streamUrl, theme: config.THEME_DEFAULT });
});


// WebSocket: send placeholder boxes every few seconds (simulated)
function randomBoxes(){
const n = Math.random() < 0.6 ? 0 : (1 + Math.floor(Math.random()*3));
const boxes = Array.from({length:n}, (_,i) => {
const w = 0.1 + Math.random()*0.2;
const h = 0.1 + Math.random()*0.2;
const x = Math.random()*(1-w);
const y = Math.random()*(1-h);
return { id:`sim-${Date.now()}-${i}`, x, y, w, h, label:'motion', conf: 0.4 + Math.random()*0.5 };
});
return boxes;
}


setInterval(() => {
const msg = JSON.stringify({ type: 'boxes', boxes: randomBoxes() });
wss.clients.forEach(c => { try { if (c.readyState === 1) c.send(msg); } catch {} });
}, 4000);


server.listen(config.WEB_PORT, () => {
console.log(`[homeeye-web] listening on ${config.WEB_PORT}`);
});
