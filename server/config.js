import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'Raspi5', '.env') });

export const config = {
  WEB_PORT: parseInt(process.env.WEB_PORT || '8420', 10),
  MJPEG_PORT: parseInt(process.env.MJPEG_PORT || '8421', 10),
  THEME_DEFAULT: process.env.THEME_DEFAULT || 'dark',
  AUTH_ENABLED: process.env.AUTH_ENABLED === 'true',
  AUTH_USERNAME: process.env.AUTH_USERNAME || 'admin',
  AUTH_PASSWORD: process.env.AUTH_PASSWORD || 'homeeye'
};
