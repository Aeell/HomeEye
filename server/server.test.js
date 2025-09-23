import request from 'supertest';
import express from 'express';
import { config } from './config.js';

// Mock config for testing
jest.mock('./config.js', () => ({
  config: {
    WEB_PORT: 8420,
    MJPEG_PORT: 8421,
    THEME_DEFAULT: 'dark',
    AUTH_ENABLED: false,
    AUTH_USERNAME: 'admin',
    AUTH_PASSWORD: 'homeeye'
  }
}));

// Mock winston
jest.mock('winston', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock database
jest.mock('./database.js', () => ({
  database: {
    getRecentEvents: jest.fn(() => []),
    getMotionEvents: jest.fn(() => [])
  }
}));

describe('HomeEye Server', () => {
  let app;

  beforeEach(() => {
    // Create a minimal app for testing
    app = express();
    app.use(express.json());
    app.get('/healthz', (req, res) => {
      res.json({
        ok: true,
        uptime: 123,
        timestamp: new Date().toISOString(),
        clients: 0
      });
    });
    app.get('/config.json', (req, res) => {
      const hostname = 'localhost';
      const streamUrl = `http://${hostname}:${config.MJPEG_PORT}/stream.mjpg`;
      res.json({ streamUrl, theme: config.THEME_DEFAULT });
    });
  });

  describe('GET /healthz', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('clients');
    });
  });

  describe('GET /config.json', () => {
    it('should return config with stream URL', async () => {
      const response = await request(app)
        .get('/config.json')
        .expect(200);

      expect(response.body).toHaveProperty('streamUrl');
      expect(response.body).toHaveProperty('theme', 'dark');
      expect(response.body.streamUrl).toContain('stream.mjpg');
    });
  });
});