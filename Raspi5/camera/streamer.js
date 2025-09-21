// Minimal MJPEG server reading libcamera-vid MJPEG from stdout and fanning out to HTTP clients.
console.log('[camera] MOCK mode: generating placeholder frames');
const jpeg = Buffer.from(
'/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...' , 'base64' // (left intentionally short; client will still work)
);
latestFrame = jpeg;
setInterval(()=>{ latestFrame = jpeg; }, 1000);
}


// Parse MJPEG from stdout: extract concatenated JPEGs by SOI/EOI markers
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
if (end === -1) { // keep data until full frame arrives
if (start > 0) buf = buf.slice(start);
break;
}
const frame = buf.slice(start, end+2);
latestFrame = frame;
broadcastFrame(frame);
buf = buf.slice(end+2);
}
});
}


// HTTP server with multipart/x-mixed-replace clients
const clients = new Set();
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
// Send initial frame if available
if (latestFrame) writeFrame(res, latestFrame);
} else if (req.url === '/snapshot.jpg') {
if (!latestFrame) { res.writeHead(503); res.end('no frame'); return; }
res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
res.end(latestFrame);
} else if (req.url === '/healthz') {
res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok:true, clients: clients.size }));
} else {
res.writeHead(404); res.end('not found');
}
});


function writeFrame(res, frame){
try {
res.write(`--${BOUNDARY}\r\n`);
res.write('Content-Type: image/jpeg\r\n');
res.write(`Content-Length: ${frame.length}\r\n\r\n`);
res.write(frame);
res.write('\r\n');
} catch (e) { /* client likely disconnected */ }
}
function broadcastFrame(frame){
for (const res of clients) writeFrame(res, frame);
}


server.listen(PORT, () => console.log(`[homeeye-camera] listening on ${PORT}`));
