# HomeEye Configuration Guide

This guide explains all configuration options available in HomeEye and how to customize the system for your needs.

## Table of Contents

- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [System Configuration](#system-configuration)
- [Camera Configuration](#camera-configuration)
- [Network Configuration](#network-configuration)
- [Security Configuration](#security-configuration)
- [UI Configuration](#ui-configuration)
- [Database Configuration](#database-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Examples](#configuration-examples)

## Configuration Files

HomeEye uses environment-based configuration with `.env` files:

- **`.env.template`**: Template with all available options and defaults
- **`.env`**: Your actual configuration file (created from template)

### Creating Configuration File

```bash
# Copy template to create your configuration
cp Raspi5/.env.template Raspi5/.env

# Edit with your settings
nano Raspi5/.env
```

### Configuration Priority

1. Environment variables (highest priority)
2. `.env` file values
3. Default values in code (lowest priority)

## Environment Variables

### System Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_USER` | `pi` | Raspberry Pi username |
| `PI_PATH` | `/home/pi/homeeye` | Installation directory path |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | `8420` | Port for web interface and API |
| `MJPEG_PORT` | `8421` | Port for MJPEG camera stream |

### Camera Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMERA_WIDTH` | `1920` | Camera resolution width (pixels) |
| `CAMERA_HEIGHT` | `1080` | Camera resolution height (pixels) |
| `CAMERA_FPS` | `30` | Camera frame rate (frames per second) |
| `CAMERA_EXTRA_OPTS` | `""` | Additional libcamera-vid options |
| `MOCK_CAMERA` | `false` | Use mock camera for testing (true/false) |

### UI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `THEME_DEFAULT` | `dark` | Default UI theme (dark/light) |
| `SHOW_GRID_DEFAULT` | `true` | Show 4×4 grid overlay by default |
| `SHOW_TIMESTAMP_DEFAULT` | `true` | Show timestamp overlay by default |

### Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `false` | Enable HTTP basic authentication |
| `AUTH_USERNAME` | `admin` | Authentication username |
| `AUTH_PASSWORD` | `homeeye` | Authentication password |

## System Configuration

### User and Path Settings

```bash
# Raspberry Pi username (must exist on system)
PI_USER=pi

# Full path to HomeEye installation
PI_PATH=/home/pi/homeeye
```

**Notes:**
- `PI_USER` must be an existing system user
- `PI_PATH` should be writable by the user
- Default values work for standard Raspbian installations

### Service Configuration

Systemd services are configured in `Raspi5/services/`:

- `homeeye-web.service`: Web server and API
- `homeeye-camera.service`: Camera streaming service

Service files contain:
- User and group settings
- Working directory
- Environment file location
- Start/stop commands
- Restart policies

## Camera Configuration

### Resolution and Performance

```bash
# High quality (default) - best image quality
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30

# Medium quality - balanced performance
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=25

# Low quality - best performance
CAMERA_WIDTH=640
CAMERA_HEIGHT=480
CAMERA_FPS=15
```

**Performance Guidelines:**
- **High Quality**: Best for detailed monitoring, requires good network
- **Medium Quality**: Good balance for most use cases
- **Low Quality**: Best for slow networks or low-power devices

### Camera Module 3 Specific Settings

```bash
# HDR mode (Camera Module 3 only)
CAMERA_EXTRA_OPTS="--hdr"

# Night mode with long exposure
CAMERA_EXTRA_OPTS="--shutter 1000000 --gain 4"

# Custom white balance
CAMERA_EXTRA_OPTS="--awb greyworld"

# Denoise settings
CAMERA_EXTRA_OPTS="--denoise cdn_off"
```

### Advanced Camera Options

```bash
# Multiple options (space-separated)
CAMERA_EXTRA_OPTS="--hdr --denoise cdn_off --brightness 0.1"

# High frame rate mode
CAMERA_WIDTH=1012
CAMERA_HEIGHT=760
CAMERA_FPS=120
CAMERA_EXTRA_OPTS="--framerate 120"
```

### Mock Camera for Development

```bash
# Enable mock camera (no hardware required)
MOCK_CAMERA=true

# Mock camera generates static test pattern
# Useful for development and testing
```

## Network Configuration

### Port Configuration

```bash
# Web interface and API
WEB_PORT=8420

# MJPEG camera stream
MJPEG_PORT=8421
```

**Port Considerations:**
- Ports below 1024 require root privileges
- Avoid common ports (80, 443, 22, etc.)
- Ensure ports are not used by other services
- Update firewall rules when changing ports

### Firewall Configuration

HomeEye requires these ports to be open:

```bash
# UFW firewall rules
sudo ufw allow 8420/tcp  # Web interface
sudo ufw allow 8421/tcp  # Camera stream
```

### Static IP Configuration

For reliable access, configure static IP:

```bash
# Edit dhcpcd.conf
sudo nano /etc/dhcpcd.conf

# Add static IP configuration
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

## Security Configuration

### Authentication Setup

```bash
# Enable authentication
AUTH_ENABLED=true

# Set credentials
AUTH_USERNAME=myusername
AUTH_PASSWORD=mysecurepassword123!
```

**Security Best Practices:**
- Use strong, unique passwords
- Change default credentials immediately
- Use HTTPS in production (requires reverse proxy)
- Consider certificate-based authentication for higher security

### Network Security

```bash
# Restrict access to local network only
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 8420
sudo ufw allow from 192.168.1.0/24 to any port 8421
```

### Service Security

Services run with limited privileges:
- Execute as `pi` user (not root)
- Access only required directories
- No network access beyond configured ports

## UI Configuration

### Theme Settings

```bash
# Default theme
THEME_DEFAULT=dark  # Options: dark, light

# Default overlay settings
SHOW_GRID_DEFAULT=true
SHOW_TIMESTAMP_DEFAULT=true
```

### Customizing UI

The web interface can be customized by modifying:
- `ui/index.html`: Page structure
- `ui/styles.css`: Appearance and themes
- `ui/app.js`: Functionality and behavior

### Adding Custom Overlays

To add custom overlays, modify `ui/app.js`:

```javascript
// Add custom overlay drawing
function drawCustomOverlay() {
  const ctx = el.cv.getContext('2d');
  // Your custom drawing code here
}

// Call in draw() function
function draw() {
  // ... existing code ...
  drawCustomOverlay();
}
```

## Database Configuration

### Database Location

Database is automatically created at:
```
~/homeeye/data/homeeye.db
```

### Database Schema

**Events Table:**
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  data TEXT
);
```

**Motion Events Table:**
```sql
CREATE TABLE motion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  confidence REAL,
  boxes TEXT
);
```

### Database Maintenance

```bash
# Backup database
cp ~/homeeye/data/homeeye.db ~/homeeye/data/homeeye.db.backup

# Check database integrity
sqlite3 ~/homeeye/data/homeeye.db "PRAGMA integrity_check;"

# Vacuum database (reduce file size)
sqlite3 ~/homeeye/data/homeeye.db "VACUUM;"

# View recent events
sqlite3 ~/homeeye/data/homeeye.db "SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;"
```

## Advanced Configuration

### Logging Configuration

Logs are stored in `~/homeeye/logs/`:
- `combined.log`: All log levels
- `error.log`: Error level only

Log levels: `error`, `warn`, `info`, `debug`

### Performance Tuning

```bash
# Optimize for performance
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=20

# Reduce logging in production
# Edit server/config.js to change log level
```

### Custom Motion Detection

Modify motion detection sensitivity in `Raspi5/camera/streamer.js`:

```javascript
// Adjust motion threshold (0.0-1.0)
const motionThreshold = 0.05; // 5% change threshold

// Adjust cooldown period
const motionCooldown = 30; // Frames to wait between detections
```

### Systemd Service Customization

Modify service files in `Raspi5/services/`:

```ini
# Add environment variables
Environment=NODE_ENV=production

# Change restart policy
Restart=always
RestartSec=5

# Add dependencies
After=network.target
Requires=network.target
```

## Configuration Examples

### Basic Home Surveillance

```bash
# Basic configuration for home use
WEB_PORT=8420
MJPEG_PORT=8421
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30
THEME_DEFAULT=dark
AUTH_ENABLED=true
AUTH_USERNAME=home
AUTH_PASSWORD=securepassword
MOCK_CAMERA=false
```

### Low-Power Setup

```bash
# Configuration for Raspberry Pi Zero or low-power scenarios
WEB_PORT=8420
MJPEG_PORT=8421
CAMERA_WIDTH=640
CAMERA_HEIGHT=480
CAMERA_FPS=10
THEME_DEFAULT=light
AUTH_ENABLED=false
MOCK_CAMERA=false
```

### Development Setup

```bash
# Configuration for development and testing
WEB_PORT=8420
MJPEG_PORT=8421
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=15
THEME_DEFAULT=dark
AUTH_ENABLED=false
MOCK_CAMERA=true
```

### High-Security Setup

```bash
# Configuration with maximum security
WEB_PORT=8443
MJPEG_PORT=8444
CAMERA_WIDTH=1920
CAMERA_HEIGHT=1080
CAMERA_FPS=30
THEME_DEFAULT=dark
AUTH_ENABLED=true
AUTH_USERNAME=admin
AUTH_PASSWORD=VeryStrongPassword123!
MOCK_CAMERA=false
```

### Remote Access Setup

```bash
# Configuration for remote access (use with VPN/reverse proxy)
WEB_PORT=80
MJPEG_PORT=81
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=20
THEME_DEFAULT=dark
AUTH_ENABLED=true
AUTH_USERNAME=remote
AUTH_PASSWORD=RemoteAccessPassword456!
MOCK_CAMERA=false
```

## Configuration Validation

### Checking Configuration

```bash
# Validate .env file syntax
node -e "require('dotenv').config({path:'Raspi5/.env'}); console.log('Configuration loaded successfully');"

# Test camera configuration
libcamera-vid --width $CAMERA_WIDTH --height $CAMERA_HEIGHT --framerate $CAMERA_FPS --timeout 1000

# Test service configuration
sudo systemctl show homeeye-web.service
sudo systemctl show homeeye-camera.service
```

### Configuration Reload

After changing configuration:

```bash
# Reload environment variables
source Raspi5/.env

# Restart services
sudo systemctl restart homeeye-web.service
sudo systemctl restart homeeye-camera.service

# Check service status
sudo systemctl status homeeye-*
```

### Backup Configuration

```bash
# Backup configuration
cp Raspi5/.env Raspi5/.env.backup

# Restore configuration
cp Raspi5/.env.backup Raspi5/.env
```

This configuration guide covers all aspects of customizing HomeEye for your specific needs. Start with the basic configuration and gradually add advanced features as needed. Always test configuration changes in a development environment before applying to production systems.