import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import winston from 'winston';
import basicAuth from 'express-basic-auth';
import { config } from './config.js';
import { database } from './database.js';

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'homeeye-web' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(express.json());

// Basic authentication
let authMiddleware = (req, res, next) => next(); // No-op by default
if (config.AUTH_ENABLED) {
  authMiddleware = basicAuth({
    users: { [config.AUTH_USERNAME]: config.AUTH_PASSWORD },
    challenge: true,
    realm: 'HomeEye'
  });
  logger.info('Authentication enabled', { username: config.AUTH_USERNAME });
}

// Static UI (with auth)
const uiDir = path.join(__dirname, '..', 'ui');
app.use('/', authMiddleware, express.static(uiDir));

// Health check (no auth required)
app.get('/healthz', (req, res) => {
  try {
    res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      clients: wss.clients.size,
      auth: config.AUTH_ENABLED
    });
    logger.info('Health check requested', { ip: req.ip });
  } catch (err) {
    logger.error('Health check error', { error: err.message });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Config for client (requires auth)
app.get('/config.json', authMiddleware, (req, res) => {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || `${req.hostname}:${config.WEB_PORT}`;
    const hostname = String(host).split(':')[0];
    const streamUrl = `${req.protocol}://${hostname}:${config.MJPEG_PORT}/stream.mjpg`.replace('https://', 'http://');
    res.json({ streamUrl, theme: config.THEME_DEFAULT });
    logger.debug('Config requested', { hostname, streamUrl, user: req.auth?.user });
  } catch (err) {
    logger.error('Config endpoint error', { error: err.message });
    res.status(500).json({ error: 'Configuration error' });
  }
});

// Events API (requires auth)
app.get('/api/events', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = database.getRecentEvents(limit);
    const motionEvents = database.getMotionEvents(limit);
    res.json({
      events,
      motionEvents,
      total: events.length + motionEvents.length
    });
    logger.debug('Events requested', { limit, user: req.auth?.user });
  } catch (err) {
    logger.error('Events API error', { error: err.message });
    res.status(500).json({ error: 'Database error' });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });
  ws.on('error', (err) => {
    logger.error('WebSocket error', { error: err.message });
  });
  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// WebSocket: send placeholder boxes every few seconds (simulated)
function randomBoxes() {
  const n = Math.random() < 0.6 ? 0 : (1 + Math.floor(Math.random() * 3));
  const boxes = Array.from({ length: n }, (_, i) => {
    const w = 0.1 + Math.random() * 0.2;
    const h = 0.1 + Math.random() * 0.2;
    const x = Math.random() * (1 - w);
    const y = Math.random() * (1 - h);
    return {
      id: `sim-${Date.now()}-${i}`,
      x, y, w, h,
      label: 'motion',
      conf: 0.4 + Math.random() * 0.5
    };
  });
  return boxes;
}

// Send placeholder motion boxes periodically
setInterval(() => {
  try {
    const boxes = randomBoxes();
    if (boxes.length > 0) {
      const msg = JSON.stringify({ type: 'boxes', boxes });
      let sent = 0;
      wss.clients.forEach(c => {
        try {
          if (c.readyState === 1) {
            c.send(msg);
            sent++;
          }
        } catch (err) {
          logger.warn('Failed to send WS message', { error: err.message });
        }
      });
      if (sent > 0) {
        logger.debug(`Sent motion boxes to ${sent} clients`, { boxCount: boxes.length });
      }
    }
  } catch (err) {
    logger.error('Error in motion box broadcast', { error: err.message });
  }
}, 4000);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(config.WEB_PORT, () => {
  logger.info(`HomeEye web server listening on port ${config.WEB_PORT}`, {
    port: config.WEB_PORT,
    theme: config.THEME_DEFAULT
  });
});
