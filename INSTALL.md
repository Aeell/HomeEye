# HomeEye Installation Guide

This guide provides detailed installation instructions for the HomeEye Raspberry Pi surveillance system.

## Table of Contents

- [System Requirements](#system-requirements)
- [Raspberry Pi Setup](#raspberry-pi-setup)
- [Automated Installation](#automated-installation)
- [Manual Installation](#manual-installation)
- [Post-Installation](#post-installation)
- [Verification](#verification)
- [Uninstallation](#uninstallation)

## System Requirements

### Hardware Requirements

- **Raspberry Pi**: Model 5 (recommended) or 4 Model B
- **Camera**: Raspberry Pi Camera Module 3 (or compatible USB webcam)
- **Storage**: MicroSD card (32GB minimum, Class 10 recommended)
- **Power Supply**: Official Raspberry Pi 5 power supply (27W USB-C)
- **Network**: Ethernet cable or WiFi connectivity

### Software Requirements

- **Operating System**: Raspberry Pi OS Bookworm (64-bit)
- **Node.js**: Version 18.0.0 or higher
- **NPM**: Latest version (comes with Node.js)
- **Git**: For cloning the repository

### System Resources

- **RAM**: 2GB minimum (4GB recommended for Pi 4, 8GB for Pi 5)
- **CPU**: Quad-core ARM Cortex-A76 @ 2.4GHz (Pi 5) or Cortex-A72 @ 1.8GHz (Pi 4)
- **Storage**: 2GB free space for installation + logs/database

## Raspberry Pi Setup

### 1. Install Raspberry Pi OS

1. Download the Raspberry Pi Imager from [raspberrypi.com/software](https://www.raspberrypi.com/software/)
2. Insert your microSD card into your computer
3. Open Raspberry Pi Imager
4. Select **Raspberry Pi OS (64-bit)** as the operating system
5. Choose your microSD card as the storage
6. Click the settings icon (gear) and configure:
   - Hostname: `homeeye` (or your preference)
   - Username: `pi` (or your preference)
   - Password: Set a strong password
   - WiFi: Configure if using wireless
   - Enable SSH
   - Set locale settings
7. Write the image to the microSD card

### 2. Initial Boot and Configuration

1. Insert the microSD card into your Raspberry Pi
2. Power on the Pi (connect power supply)
3. Wait for the system to boot (first boot takes longer)
4. Connect via SSH: `ssh pi@raspberrypi.local` (or use IP address)

### 3. System Update

```bash
# Update package lists
sudo apt update

# Upgrade system packages
sudo apt full-upgrade -y

# Clean up
sudo apt autoremove -y
sudo apt autoclean
```

### 4. Install Required Software

```bash
# Install Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install camera software
sudo apt install -y libcamera-apps

# Install Git
sudo apt install -y git

# Install build tools (for native modules)
sudo apt install -y build-essential python3-dev

# Verify installations
node --version
npm --version
libcamera-hello --version
git --version
```

### 5. Enable Camera

```bash
# Use raspi-config
sudo raspi-config

# Navigate to: Interfacing Options > Camera > Enable
# Select "Yes" to enable camera interface
# Reboot when prompted
```

### 6. Test Camera

```bash
# Test camera with preview
libcamera-hello

# Test video recording
libcamera-vid -t 5000 -o test.h264

# Clean up test file
rm test.h264
```

## Automated Installation

### Using the Deployment Script

The easiest way to install HomeEye is using the automated deployment script.

#### Prerequisites for Automated Installation

1. SSH access to your Raspberry Pi from your development machine
2. Git installed on your development machine
3. SSH key-based authentication (recommended) or password authentication

#### Run Automated Installation

```bash
# On your development machine (Linux/macOS/Windows with Git Bash)

# Clone the repository
git clone https://github.com/Aeell/HomeEye.git
cd HomeEye

# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment with your Pi's details
./scripts/deploy.sh -u pi -h 192.168.1.100

# Or with custom options
./scripts/deploy.sh \
  -u pi \
  -h 192.168.1.100 \
  -r https://github.com/Aeell/HomeEye.git \
  --web-port 8420 \
  --mjpeg-port 8421
```

#### What the Script Does

1. **SSH Connection**: Tests SSH connection to your Pi
2. **Directory Creation**: Creates `/home/pi/homeeye` on the Pi
3. **File Transfer**: Copies all project files to the Pi
4. **Dependency Installation**: Runs `npm install` for all components
5. **Environment Setup**: Copies and configures `.env` file
6. **Service Installation**: Installs systemd service files
7. **Service Activation**: Enables and starts the services
8. **Verification**: Checks service status and provides access URLs

### Windows Deployment (Legacy)

If you're on Windows, you can use the PowerShell deployment scripts:

```powershell
# Run bootstrap script
.\scripts\wave_bootstrap.ps1 -User pi -PiHost 192.168.1.100 -RepoName HomeEye

# Deploy from GitHub
.\scripts\wave_deploy_from_github.ps1 -User pi -PiHost 192.168.1.100 -WebPort 8420 -MjpegPort 8421

# Check deployment
.\scripts\wave_check.ps1 -User pi -PiHost 192.168.1.100
```

## Manual Installation

If automated installation doesn't work, follow these manual steps.

### 1. Clone Repository on Pi

```bash
# SSH into your Raspberry Pi
ssh pi@192.168.1.100

# Create project directory
mkdir -p ~/homeeye
cd ~/homeeye

# Clone repository
git clone https://github.com/Aeell/HomeEye.git .
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install camera service dependencies
cd ../Raspi5/camera
npm install

# Return to project root
cd ../..
```

### 3. Configure Environment

```bash
# Copy environment template
cp Raspi5/.env.template Raspi5/.env

# Edit configuration (use nano or your preferred editor)
nano Raspi5/.env

# Example configuration:
# PI_USER=pi
# PI_PATH=/home/pi/homeeye
# WEB_PORT=8420
# MJPEG_PORT=8421
# CAMERA_WIDTH=1920
# CAMERA_HEIGHT=1080
# CAMERA_FPS=30
# THEME_DEFAULT=dark
# AUTH_ENABLED=false
# MOCK_CAMERA=false
```

### 4. Install System Services

```bash
# Copy service files
sudo cp Raspi5/services/*.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable homeeye-camera.service
sudo systemctl enable homeeye-web.service
```

### 5. Start Services

```bash
# Start camera service
sudo systemctl start homeeye-camera.service

# Start web service
sudo systemctl start homeeye-web.service

# Check status
sudo systemctl status homeeye-camera.service
sudo systemctl status homeeye-web.service
```

## Post-Installation

### Configure Network Access

1. **Static IP (Recommended)**:
   ```bash
   # Edit dhcpcd configuration
   sudo nano /etc/dhcpcd.conf

   # Add at the end:
   interface eth0
   static ip_address=192.168.1.100/24
   static routers=192.168.1.1
   static domain_name_servers=8.8.8.8 8.8.4.4
   ```

2. **Port Forwarding (Optional)**:
   If you want external access, configure port forwarding on your router:
   - External Port 8420 → Internal IP 192.168.1.100:8420
   - External Port 8421 → Internal IP 192.168.1.100:8421

### Security Hardening

1. **Change Default Password**:
   ```bash
   sudo passwd pi
   ```

2. **Enable Firewall**:
   ```bash
   sudo apt install ufw
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 8420
   sudo ufw allow 8421
   ```

3. **Enable Authentication** (Optional):
   ```bash
   # Edit .env file
   nano Raspi5/.env
   # Set AUTH_ENABLED=true
   # Set AUTH_USERNAME and AUTH_PASSWORD

   # Restart services
   sudo systemctl restart homeeye-camera.service homeeye-web.service
   ```

### Performance Optimization

1. **GPU Memory**:
   ```bash
   sudo nano /boot/firmware/config.txt
   # Add: gpu_mem=256
   ```

2. **Disable Unnecessary Services**:
   ```bash
   sudo systemctl disable bluetooth.service
   sudo systemctl disable avahi-daemon.service
   ```

## Verification

### Check Service Status

```bash
# Check if services are running
sudo systemctl status homeeye-camera.service
sudo systemctl status homeeye-web.service

# Check service logs
sudo journalctl -u homeeye-camera.service -f
sudo journalctl -u homeeye-web.service -f
```

### Test Web Interface

1. Open a web browser
2. Navigate to `http://192.168.1.100:8420`
3. You should see the HomeEye web interface
4. Test camera streaming and controls

### Test API Endpoints

```bash
# Health check
curl http://192.168.1.100:8420/healthz

# Configuration
curl http://192.168.1.100:8420/config.json

# Events API
curl "http://192.168.1.100:8420/api/events?limit=5"
```

### Test Camera Stream

```bash
# Direct MJPEG stream
curl -I http://192.168.1.100:8421/stream.mjpg

# Snapshot endpoint
curl -o snapshot.jpg http://192.168.1.100:8421/snapshot.jpg
```

## Uninstallation

### Automated Uninstallation

```bash
# Run the uninstall script
./Raspi5/scripts/uninstall.sh
```

### Manual Uninstallation

```bash
# Stop and disable services
sudo systemctl stop homeeye-camera.service homeeye-web.service
sudo systemctl disable homeeye-camera.service homeeye-web.service

# Remove service files
sudo rm /etc/systemd/system/homeeye-camera.service
sudo rm /etc/systemd/system/homeeye-web.service
sudo systemctl daemon-reload

# Remove project files
rm -rf ~/homeeye

# Remove dependencies (optional)
# npm uninstall -g
# sudo apt remove nodejs npm
```

## Troubleshooting Installation

### Common Installation Issues

1. **Camera Not Detected**:
   ```bash
   # Check camera hardware
   vcgencmd get_camera

   # Re-enable camera in raspi-config
   sudo raspi-config
   ```

2. **Node.js Installation Failed**:
   ```bash
   # Try alternative Node.js installation
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

3. **Permission Issues**:
   ```bash
   # Fix ownership
   sudo chown -R pi:pi ~/homeeye

   # Fix permissions
   chmod +x ~/homeeye/scripts/*.sh
   ```

4. **Service Start Failed**:
   ```bash
   # Check service logs
   sudo journalctl -u homeeye-camera.service -n 50
   sudo journalctl -u homeeye-web.service -n 50

   # Check if ports are available
   sudo netstat -tulpn | grep :842[01]
   ```

### Getting Help

- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review service logs: `sudo journalctl -u homeeye-*`
- Check application logs: `tail -f ~/homeeye/logs/*.log`
- Open an issue on [GitHub](https://github.com/Aeell/HomeEye/issues)

## Next Steps

After successful installation:

1. **Access Web Interface**: Visit `http://your-pi-ip:8420`
2. **Configure Settings**: Edit `Raspi5/.env` for your preferences
3. **Set Up Monitoring**: Configure motion detection sensitivity
4. **Enable Security**: Set up authentication if needed
5. **Regular Maintenance**: Keep system updated and monitor logs

For detailed usage instructions, see the [README](README.md).