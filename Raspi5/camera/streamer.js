// Minimal MJPEG server reading libcamera-vid MJPEG from stdout and fanning out to HTTP clients.
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'homeeye-camera' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/camera-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/camera.log' })
  ]
});

const PORT = parseInt(process.env.MJPEG_PORT || '8421', 10);
const BOUNDARY = 'frame';
let latestFrame = null;
let camProc = null;

// Camera configuration
const CAMERA_WIDTH = parseInt(process.env.CAMERA_WIDTH || '1280', 10);
const CAMERA_HEIGHT = parseInt(process.env.CAMERA_HEIGHT || '720', 10);
const CAMERA_FPS = parseInt(process.env.CAMERA_FPS || '15', 10);
const CAMERA_EXTRA_OPTS = process.env.CAMERA_EXTRA_OPTS || '';
const MOCK_CAMERA = process.env.MOCK_CAMERA === 'true';

// Start camera process or mock
if (MOCK_CAMERA) {
  logger.info('Starting in MOCK mode: generating placeholder frames', {
    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT,
    fps: CAMERA_FPS
  });
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/vAA=' , 'base64'
  );
  latestFrame = jpeg;
  setInterval(() => { latestFrame = jpeg; }, 1000);
} else {
  logger.info('Starting libcamera-vid process', {
    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT,
    fps: CAMERA_FPS,
    extraOpts: CAMERA_EXTRA_OPTS
  });
  try {
    const args = [
      '--codec', 'mjpeg',
      '--width', CAMERA_WIDTH.toString(),
      '--height', CAMERA_HEIGHT.toString(),
      '--framerate', CAMERA_FPS.toString(),
      '--output', '-',
      '--nopreview',
      '--timeout', '0'
    ];
    if (CAMERA_EXTRA_OPTS) {
      args.push(...CAMERA_EXTRA_OPTS.split(' '));
    }
    camProc = spawn('libcamera-vid', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    camProc.on('error', (err) => {
      logger.error('Failed to start libcamera-vid process', { error: err.message });
      process.exit(1);
    });
    camProc.on('exit', (code) => {
      logger.info('libcamera-vid process exited', { code });
      process.exit(code);
    });
  } catch (err) {
    logger.error('Error spawning camera process', { error: err.message });
    process.exit(1);
  }
}

// Parse MJPEG from stdout: extract concatenated JPEGs by SOI/EOI markers
if (camProc && camProc.stdout) {
  let buf = Buffer.alloc(0);
  let frameCount = 0;
  const SOI = Buffer.from([0xff, 0xd8]);
  const EOI = Buffer.from([0xff, 0xd9]);
  camProc.stdout.on('data', (chunk) => {
    try {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        const start = buf.indexOf(SOI);
        if (start === -1) {
          if (buf.length > 1024 * 1024) {
            logger.warn('MJPEG buffer overflow, resetting', { bufferSize: buf.length });
            buf = Buffer.alloc(0);
          }
          break;
        }
        const end = buf.indexOf(EOI, start + 2);
        if (end === -1) { // keep data until full frame arrives
          if (start > 0) buf = buf.slice(start);
          break;
        }
        const frame = buf.slice(start, end + 2);
        if (frame.length > 0) {
          latestFrame = frame;
          frameCount++;
          broadcastFrame(frame);
          if (frameCount % 100 === 0) {
            logger.info('Frames processed', { count: frameCount });
          }
        }
        buf = buf.slice(end + 2);
      }
    } catch (err) {
      logger.error('Error parsing MJPEG data', { error: err.message });
      buf = Buffer.alloc(0);
    }
  });
}

// HTTP server with multipart/x-mixed-replace clients
const clients = new Set();
const server = http.createServer((req, res) => {
  try {
    logger.debug('HTTP request', { method: req.method, url: req.url, ip: req.socket.remoteAddress });

    if (req.url === '/stream.mjpg') {
      res.writeHead(200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Connection': 'close',
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`
      });
      clients.add(res);
      logger.info('MJPEG client connected', { totalClients: clients.size });
      req.on('close', () => {
        clients.delete(res);
        logger.info('MJPEG client disconnected', { totalClients: clients.size });
      });
      // Send initial frame if available
      if (latestFrame) writeFrame(res, latestFrame);
    } else if (req.url === '/snapshot.jpg') {
      if (!latestFrame) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('No frame available');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
      res.end(latestFrame);
      logger.debug('Snapshot served');
    } else if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        clients: clients.size,
        hasFrame: !!latestFrame,
        mock: MOCK_CAMERA,
        uptime: process.uptime()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (err) {
    logger.error('HTTP server error', { error: err.message, url: req.url });
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    } catch (e) {
      // Response might already be sent
    }
  }
});

function writeFrame(res, frame) {
  try {
    res.write(`--${BOUNDARY}\r\n`);
    res.write('Content-Type: image/jpeg\r\n');
    res.write(`Content-Length: ${frame.length}\r\n\r\n`);
    res.write(frame);
    res.write('\r\n');
  } catch (e) {
    logger.warn('Failed to write frame to client', { error: e.message });
    clients.delete(res);
  }
}

function broadcastFrame(frame) {
  let sent = 0;
  for (const res of clients) {
    try {
      writeFrame(res, frame);
      sent++;
    } catch (err) {
      logger.warn('Failed to broadcast frame', { error: err.message });
      clients.delete(res);
    }
  }
  if (sent > 0) {
    logger.debug(`Broadcasted frame to ${sent} clients`);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Camera server closed');
    if (camProc) camProc.kill();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Camera server closed');
    if (camProc) camProc.kill();
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info('HomeEye camera server listening', {
    port: PORT,
    mock: MOCK_CAMERA,
    camera: MOCK_CAMERA ? 'mock' : 'libcamera-vid'
  });
});
