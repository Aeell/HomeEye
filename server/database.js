import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'homeeye.db');

// Create database directory if it doesn't exist
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS motion_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence REAL,
    boxes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_motion_timestamp ON motion_events(timestamp);
`);

// Prepared statements
const insertEventStmt = db.prepare(`
  INSERT INTO events (type, data) VALUES (?, ?)
`);

const insertMotionEventStmt = db.prepare(`
  INSERT INTO motion_events (confidence, boxes) VALUES (?, ?)
`);

const getRecentEventsStmt = db.prepare(`
  SELECT * FROM events
  WHERE timestamp >= datetime('now', '-24 hours')
  ORDER BY timestamp DESC
  LIMIT ?
`);

const getMotionEventsStmt = db.prepare(`
  SELECT * FROM motion_events
  WHERE timestamp >= datetime('now', '-24 hours')
  ORDER BY timestamp DESC
  LIMIT ?
`);

export const database = {
  // Event logging
  logEvent: (type, data) => {
    try {
      insertEventStmt.run(type, JSON.stringify(data));
    } catch (err) {
      console.error('Database error logging event:', err);
    }
  },

  // Motion detection events
  logMotion: (confidence, boxes) => {
    try {
      insertMotionEventStmt.run(confidence, JSON.stringify(boxes));
    } catch (err) {
      console.error('Database error logging motion:', err);
    }
  },

  // Get recent events
  getRecentEvents: (limit = 100) => {
    try {
      return getRecentEventsStmt.all(limit);
    } catch (err) {
      console.error('Database error getting events:', err);
      return [];
    }
  },

  // Get recent motion events
  getMotionEvents: (limit = 100) => {
    try {
      return getMotionEventsStmt.all(limit);
    } catch (err) {
      console.error('Database error getting motion events:', err);
      return [];
    }
  },

  // Close database
  close: () => {
    db.close();
  }
};