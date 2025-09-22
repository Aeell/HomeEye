# HomeEye - Raspberry Pi Home Camera Surveillance System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-5-red.svg)](https://www.raspberrypi.com/)

A complete, production-ready home surveillance system for Raspberry Pi 5 with real-time MJPEG streaming, motion detection, web interface, and comprehensive monitoring capabilities.

## ✨ Features

- **Real-time Camera Streaming**: MJPEG streaming using libcamera-vid with configurable resolution and FPS
- **Motion Detection**: Built-in motion detection with configurable sensitivity and cooldown
- **Web Interface**: Modern, responsive web UI with dark/light themes
- **Authentication**: Optional HTTP basic authentication for secure access
- **Event Logging**: SQLite database for storing motion events and system logs
- **Health Monitoring**: Comprehensive health checks and system monitoring
- **REST API**: Full REST API for integration with other systems
- **Cross-platform Deployment**: Automated deployment scripts for Linux/macOS/Windows
- **Testing Suite**: Jest-based testing framework with API and integration tests

## 🚀 Quick Start

### Prerequisites

- **Hardware**: Raspberry Pi 5 with Camera Module 3
- **Software**: Raspberry Pi OS (Bookworm, 64-bit recommended)
- **Node.js**: Version 18 or higher
- **Camera**: libcamera-apps installed and camera enabled

### One-Command Installation

```bash
# Clone the repository
git clone https://github.com/Aeell/HomeEye.git
cd HomeEye

# Run the automated installation script
./scripts/deploy.sh
```

For manual installation, see the [Installation Guide](#installation) below.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
  - [Raspberry Pi Setup](#raspberry-pi-setup)
  - [Automated Deployment](#automated-deployment)
  - [Manual Installation](#manual-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠️ Installation

### Raspberry Pi Setup

1. **Install Raspberry Pi OS** (Bookworm, 64-bit):
   ```bash
   # Download and flash Raspberry Pi OS Bookworm 64-bit to SD card
   # Boot the Pi and complete initial setup
   ```

2. **Enable Camera**:
   ```bash
   sudo raspi-config
   # Navigate to: Interfacing Options > Camera > Enable
   ```

3. **Install Dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm libcamera-apps git
   ```

4. **Verify Camera**:
   ```bash
   libcamera-hello
   # You should see a camera preview
   ```

### Automated Deployment

Use the provided deployment script for one-click installation:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment (replace with your Pi's details)
./scripts/deploy.sh -u pi -h 192.168.1.100 -r https://github.com/Aeell/HomeEye.git
```

**Script Options:**
- `-u, --user`: Pi username (default: pi)
- `-h, --host`: Pi IP address (required)
- `-r, --repo`: Git repository URL
- `-b, --branch`: Git branch (default: main)
- `--web-port`: Web server port (default: 8420)
- `--mjpeg-port`: MJPEG stream port (default: 8421)

### Manual Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Aeell/HomeEye.git
   cd HomeEye
   ```

2. **Install Dependencies**:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install camera service dependencies
   cd ../Raspi5/camera
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cd ../..
   cp Raspi5/.env.template Raspi5/.env
   # Edit Raspi5/.env with your settings
   ```

4. **Install System Services**:
   ```bash
   sudo cp Raspi5/services/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable homeeye-camera.service homeeye-web.service
   ```

5. **Start Services**:
   ```bash
   sudo systemctl start homeeye-camera.service
   sudo systemctl start homeeye-web.service
   ```

6. **Verify Installation**:
   ```bash
   # Check service status
   sudo systemctl status homeeye-camera.service
   sudo systemctl status homeeye-web.service

   # Check health endpoint
   curl http://localhost:8420/healthz
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `Raspi5/` directory:

```bash
# System Configuration
PI_USER=pi
PI_PATH=/home/pi/homeeye

# Server Ports
WEB_PORT=8420
MJPEG_PORT=8421

# Camera Settings
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30
CAMERA_EXTRA_OPTS=

# UI Settings
THEME_DEFAULT=dark
SHOW_GRID_DEFAULT=true
SHOW_TIMESTAMP_DEFAULT=true

# Security
AUTH_ENABLED=false
AUTH_USERNAME=admin
AUTH_PASSWORD=homeeye

# Development
MOCK_CAMERA=false
```

### Camera Configuration

The system uses `libcamera-vid` for camera streaming. Common configuration options:

- **Resolution**: `CAMERA_WIDTH` × `CAMERA_HEIGHT` (max 4608×2592 for Camera Module 3)
- **Frame Rate**: `CAMERA_FPS` (max 30 FPS)
- **Extra Options**: `CAMERA_EXTRA_OPTS` (e.g., `--denoise cdn_off --brightness 0.05`)

### Security Configuration

Enable authentication by setting:
```bash
AUTH_ENABLED=true
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_secure_password
```

## 🎯 Usage

### Web Interface

Access the web interface at `http://your-pi-ip:8420`:

- **Live Stream**: Real-time MJPEG video feed
- **Grid Overlay**: 4×4 alignment grid (toggleable)
- **Timestamp**: Current time overlay (toggleable)
- **Motion Boxes**: Visual indicators for detected motion
- **Snapshot**: Download current frame as JPEG
- **Theme Toggle**: Switch between dark/light themes

### API Endpoints

#### Health Check
```bash
GET /healthz
```
Returns system health status including uptime, client count, and authentication status.

#### Configuration
```bash
GET /config.json
```
Returns client configuration including stream URL and theme settings.

#### Events API
```bash
GET /api/events?limit=50
```
Returns recent events and motion detections from the database.

### Command Line Usage

#### Start Services Manually
```bash
# Start camera streaming service
cd Raspi5/camera
npm start

# Start web server (in another terminal)
cd ../../server
npm start
```

#### Check Logs
```bash
# System service logs
sudo journalctl -u homeeye-camera.service -f
sudo journalctl -u homeeye-web.service -f

# Application logs
tail -f logs/camera.log
tail -f logs/combined.log
```

## 📚 API Documentation

### REST API Endpoints

#### `GET /healthz`
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "uptime": 3600,
  "timestamp": "2025-01-22T10:00:00.000Z",
  "clients": 2,
  "auth": false
}
```

#### `GET /config.json`
Client configuration.

**Response:**
```json
{
  "streamUrl": "http://192.168.1.100:8421/stream.mjpg",
  "theme": "dark"
}
```

#### `GET /api/events`
Event history.

**Query Parameters:**
- `limit` (number): Maximum events to return (default: 50)

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "type": "server_start",
      "timestamp": "2025-01-22T10:00:00.000Z",
      "data": "{\"port\":8420,\"theme\":\"dark\"}"
    }
  ],
  "motionEvents": [
    {
      "id": 1,
      "timestamp": "2025-01-22T10:05:00.000Z",
      "confidence": 0.85,
      "boxes": "[{\"x\":0.3,\"y\":0.3,\"w\":0.4,\"h\":0.4,\"label\":\"motion\",\"conf\":0.85}]"
    }
  ],
  "total": 2
}
```

### WebSocket API

Connect to `ws://your-pi-ip:8420/ws` for real-time updates.

**Motion Detection Message:**
```json
{
  "type": "boxes",
  "boxes": [
    {
      "id": "motion-1234567890",
      "x": 0.3,
      "y": 0.3,
      "w": 0.4,
      "h": 0.4,
      "label": "motion",
      "conf": 0.85
    }
  ]
}
```

## 🧪 Testing

### Run Test Suite

```bash
cd server
npm test
npm run test:watch  # Watch mode
```

### API Testing

```bash
# Test health endpoint
curl http://localhost:8420/healthz

# Test configuration endpoint
curl http://localhost:8420/config.json

# Test events API
curl "http://localhost:8420/api/events?limit=10"
```

### Manual Testing

1. **Camera Stream**: Visit `http://localhost:8421/stream.mjpg` in a browser
2. **Web Interface**: Visit `http://localhost:8420`
3. **Motion Detection**: Move in front of camera and check WebSocket messages

## 🔧 Development

### Development Setup

```bash
# Clone repository
git clone https://github.com/Aeell/HomeEye.git
cd HomeEye

# Install all dependencies
npm install  # Root dependencies
cd server && npm install
cd ../Raspi5/camera && npm install

# Start development servers
cd server && npm run dev  # Auto-restart on changes
# In another terminal: cd ../Raspi5/camera && npm run dev
```

### Project Structure

```
HomeEye/
├── server/                 # Web server and API
│   ├── server.js          # Main Express server
│   ├── config.js          # Configuration management
│   ├── database.js        # SQLite database operations
│   ├── server.test.js     # API tests
│   └── package.json
├── Raspi5/                # Raspberry Pi specific code
│   ├── camera/            # MJPEG streaming service
│   │   ├── streamer.js    # Camera streaming logic
│   │   └── package.json
│   ├── services/          # Systemd service files
│   └── .env.template      # Environment template
├── ui/                    # Web interface
│   ├── index.html         # Main HTML page
│   ├── app.js            # Frontend JavaScript
│   └── styles.css        # CSS styles
├── scripts/               # Deployment and utility scripts
│   ├── deploy.sh          # Linux/macOS deployment
│   └── wave_*.ps1         # Windows deployment (legacy)
└── README.md             # This file
```

### Code Style

- **JavaScript**: ES6+ modules, async/await
- **Linting**: ESLint configuration recommended
- **Testing**: Jest framework
- **Logging**: Winston structured logging
- **Database**: SQLite with prepared statements

## 🐛 Troubleshooting

### Common Issues

#### Camera Not Working
```bash
# Check camera is enabled
vcgencmd get_camera

# Test camera manually
libcamera-hello

# Check camera permissions
ls -la /dev/video*
```

#### Services Not Starting
```bash
# Check service status
sudo systemctl status homeeye-camera.service
sudo systemctl status homeeye-web.service

# View service logs
sudo journalctl -u homeeye-camera.service -f
sudo journalctl -u homeeye-web.service -f
```

#### Port Conflicts
```bash
# Check what's using ports
sudo netstat -tulpn | grep :8420
sudo netstat -tulpn | grep :8421

# Change ports in .env file
WEB_PORT=8422
MJPEG_PORT=8423
```

#### Permission Issues
```bash
# Fix permissions for SSH directory
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Fix permissions for project directory
sudo chown -R pi:pi /home/pi/homeeye
```

#### Database Issues
```bash
# Reset database
rm -f data/homeeye.db
# Restart services to recreate database
```

### Performance Tuning

#### Camera Settings
- Lower resolution for better performance: `CAMERA_WIDTH=1280`, `CAMERA_HEIGHT=720`
- Reduce FPS: `CAMERA_FPS=15`
- Enable hardware encoding: `CAMERA_EXTRA_OPTS="--codec mjpeg"`

#### System Optimization
```bash
# Disable unnecessary services
sudo systemctl disable bluetooth.service
sudo systemctl disable avahi-daemon.service

# Configure GPU memory
# Add to /boot/firmware/config.txt: gpu_mem=256
```

### Logs and Debugging

#### Enable Debug Logging
```bash
# Set log level to debug
export DEBUG=homeeye:*
```

#### Log Locations
- **Application Logs**: `logs/` directory
- **System Logs**: `sudo journalctl -u homeeye-*`
- **Camera Logs**: `logs/camera.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Test on actual Raspberry Pi hardware
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Raspberry Pi Foundation for the excellent hardware platform
- libcamera project for camera support
- Node.js community for the runtime environment
- All contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Aeell/HomeEye/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Aeell/HomeEye/discussions)
- **Documentation**: This README and project wiki

---

**Happy monitoring! 📹🔒**
