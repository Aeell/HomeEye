// CommonJS MJPEG streamer for Raspberry Pi (fallback to placeholder)
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.MJPEG_PORT || process.env.PORT || '8421', 10);
const BOUNDARY = 'homeeye';

let latestFrame = null;
let camProc = null;

if (process.env.MOCK_CAMERA) {
  camProc = null;
} else {
  try {
    camProc = spawn('libcamera-vid', ['--inline', '--framerate', process.env.CAMERA_FPS || '15', '--width', process.env.CAMERA_WIDTH || '1280', '--height', process.env.CAMERA_HEIGHT || '720', '-o', '-']);
    camProc.on('error', (err) => { camProc = null; console.warn('libcamera-vid not available:', err.message); });
  } catch (e) { camProc = null; }
}

const clients = new Set();

function writeFrame(res, frame){
  try {
    res.write(`--${BOUNDARY}\r\n`);
    res.write('Content-Type: image/jpeg\r\n');
    res.write(`Content-Length: ${frame.length}\r\n\r\n`);
    res.write(frame);
    res.write('\r\n');
  } catch (e) { }
}

function broadcastFrame(frame){
  for (const res of clients) writeFrame(res, frame);
}

const server = http.createServer((req, res) => {
  if (req.url === '/stream.mjpg') {
    res.writeHead(200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Connection': 'close',
      'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`
    });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    if (latestFrame) writeFrame(res, latestFrame);
  } else if (req.url === '/snapshot.jpg') {
    if (!latestFrame) { res.writeHead(503); res.end('no frame'); return; }
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
    res.end(latestFrame);
  } else if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok:true, clients: clients.size, libcamera: !!camProc }));
  } else {
    res.writeHead(404); res.end('not found');
  }
});

if (camProc && camProc.stdout) {
  let buf = Buffer.alloc(0);
  const SOI = Buffer.from([0xff,0xd8]);
  const EOI = Buffer.from([0xff,0xd9]);
  camProc.stdout.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const start = buf.indexOf(SOI);
      if (start === -1) { if (buf.length > 1024*1024) buf = Buffer.alloc(0); break; }
      const end = buf.indexOf(EOI, start+2);
      if (end === -1) { if (start > 0) buf = buf.slice(start); break; }
      const frame = buf.slice(start, end+2);
      latestFrame = frame;
      broadcastFrame(frame);
      buf = buf.slice(end+2);
    }
  });
  camProc.on('close', (code) => { console.warn('libcamera-vid exited', code); camProc = null; });
} else {
  // fallback to placeholder.jpg if exists, or generate minimal placeholder
  const placeholderPath = path.join(__dirname, 'placeholder.jpg');
  try {
    latestFrame = fs.readFileSync(placeholderPath);
    console.warn('[camera] serving placeholder.jpg repeatedly');
  } catch (e) {
    // minimal 1x1 black JPEG
    latestFrame = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0x00, 0xff, 0xd9]);
    console.warn('[camera] using generated minimal placeholder');
  }
  setInterval(() => { if (latestFrame) broadcastFrame(latestFrame); }, 1000);
}

server.listen(PORT, () => console.log(`[homeeye-camera] listening on ${PORT}`));
