# HomeEye Troubleshooting Guide

This guide helps you diagnose and resolve common issues with HomeEye.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Camera Issues](#camera-issues)
- [Network Issues](#network-issues)
- [Service Issues](#service-issues)
- [Web Interface Issues](#web-interface-issues)
- [Performance Issues](#performance-issues)
- [Database Issues](#database-issues)
- [Security Issues](#security-issues)
- [Getting Help](#getting-help)

## Quick Diagnosis

### System Health Check

Run this comprehensive diagnostic script:

```bash
#!/bin/bash
echo "=== HomeEye System Diagnostic ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""

echo "=== Service Status ==="
sudo systemctl status homeeye-camera.service --no-pager -l || echo "Camera service not found"
sudo systemctl status homeeye-web.service --no-pager -l || echo "Web service not found"
echo ""

echo "=== Network Status ==="
echo "Local IP: $(hostname -I)"
netstat -tulpn | grep :842[0-1] || echo "HomeEye ports not listening"
echo ""

echo "=== Camera Status ==="
vcgencmd get_camera || echo "Camera command failed"
libcamera-hello --timeout 1000 2>&1 | head -5 || echo "Camera test failed"
echo ""

echo "=== Disk Usage ==="
df -h / | tail -1
du -sh ~/homeeye 2>/dev/null || echo "HomeEye directory not found"
echo ""

echo "=== Log Files ==="
ls -la ~/homeeye/logs/ 2>/dev/null || echo "No log directory found"
echo ""

echo "=== Recent Errors ==="
sudo journalctl -u homeeye-* --since "1 hour ago" --no-pager | grep -i error | tail -5 || echo "No recent errors"
```

### Health API Check

```bash
# Check system health
curl -s http://localhost:8420/healthz | jq . 2>/dev/null || curl -s http://localhost:8420/healthz

# Check with authentication if enabled
curl -s -u username:password http://localhost:8420/healthz
```

## Camera Issues

### Camera Not Detected

**Symptoms:**
- Camera stream shows blank/black screen
- `libcamera-hello` fails
- `vcgencmd get_camera` shows "supported=0"

**Solutions:**

1. **Enable Camera in raspi-config**:
   ```bash
   sudo raspi-config
   # Navigate to: Interfacing Options > Camera > Enable
   # Reboot required
   ```

2. **Check Physical Connection**:
   - Ensure camera ribbon cable is properly seated
   - Verify cable is not damaged
   - Check camera module is securely attached

3. **Test Camera Hardware**:
   ```bash
   # Check camera detection
   vcgencmd get_camera

   # Should show: supported=1 detected=1

   # Test camera preview
   libcamera-hello --timeout 5000
   ```

4. **Update Firmware**:
   ```bash
   sudo apt update
   sudo apt install -y rpi-update
   sudo rpi-update
   sudo reboot
   ```

### Camera Stream Not Working

**Symptoms:**
- Web interface loads but no video
- MJPEG stream URL returns errors
- Camera service logs show errors

**Solutions:**

1. **Check Camera Service**:
   ```bash
   sudo systemctl status homeeye-camera.service
   sudo journalctl -u homeeye-camera.service -f
   ```

2. **Test MJPEG Stream Directly**:
   ```bash
   # Test stream endpoint
   curl -I http://localhost:8421/stream.mjpg

   # Should return 200 OK with proper headers
   ```

3. **Check Camera Permissions**:
   ```bash
   # Ensure user has camera access
   groups $USER | grep video || sudo usermod -a -G video $USER

   # Reboot or re-login required
   ```

4. **Adjust Camera Settings**:
   ```bash
   # Edit environment file
   nano ~/homeeye/Raspi5/.env

   # Try lower resolution/FPS
   CAMERA_WIDTH=1280
   CAMERA_HEIGHT=720
   CAMERA_FPS=15

   # Restart services
   sudo systemctl restart homeeye-camera.service
   ```

### Mock Camera Mode

For development/testing without camera hardware:

```bash
# Enable mock camera
echo "MOCK_CAMERA=true" >> ~/homeeye/Raspi5/.env

# Restart camera service
sudo systemctl restart homeeye-camera.service
```

## Network Issues

### Cannot Access Web Interface

**Symptoms:**
- Browser shows "connection refused"
- Cannot reach `http://raspberrypi.local:8420`

**Solutions:**

1. **Check Local IP**:
   ```bash
   hostname -I
   ip route show | grep default
   ```

2. **Test Local Access**:
   ```bash
   # Test on Pi itself
   curl http://localhost:8420/healthz

   # Test from another device on network
   curl http://192.168.1.xxx:8420/healthz
   ```

3. **Check Firewall**:
   ```bash
   sudo ufw status
   # Should allow ports 8420 and 8421

   # If using ufw, allow ports
   sudo ufw allow 8420
   sudo ufw allow 8421
   ```

4. **Check Service Binding**:
   ```bash
   # Ensure services bind to correct interfaces
   sudo netstat -tulpn | grep :842[0-1]
   ```

### Port Conflicts

**Symptoms:**
- Services fail to start with "port already in use" errors

**Solutions:**

1. **Find Conflicting Processes**:
   ```bash
   sudo netstat -tulpn | grep :842[0-1]
   sudo lsof -i :8420
   sudo lsof -i :8421
   ```

2. **Change Ports**:
   ```bash
   # Edit environment file
   nano ~/homeeye/Raspi5/.env

   # Change ports
   WEB_PORT=8422
   MJPEG_PORT=8423

   # Update firewall
   sudo ufw allow 8422
   sudo ufw allow 8423

   # Restart services
   sudo systemctl restart homeeye-camera.service homeeye-web.service
   ```

3. **Kill Conflicting Processes**:
   ```bash
   sudo kill -9 PID_NUMBER
   ```

## Service Issues

### Services Not Starting

**Symptoms:**
- `systemctl status` shows failed state
- Services don't start on boot

**Solutions:**

1. **Check Service Logs**:
   ```bash
   sudo journalctl -u homeeye-camera.service -n 50
   sudo journalctl -u homeeye-web.service -n 50
   ```

2. **Manual Service Start**:
   ```bash
   # Try starting manually
   cd ~/homeeye/server && npm start

   # Or camera service
   cd ~/homeeye/Raspi5/camera && npm start
   ```

3. **Check Dependencies**:
   ```bash
   # Ensure Node.js is installed
   node --version
   npm --version

   # Check file permissions
   ls -la ~/homeeye/
   ```

4. **Reinstall Services**:
   ```bash
   sudo systemctl stop homeeye-camera.service homeeye-web.service
   sudo rm /etc/systemd/system/homeeye-*.service
   sudo systemctl daemon-reload

   # Reinstall
   sudo cp ~/homeeye/Raspi5/services/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable homeeye-camera.service homeeye-web.service
   sudo systemctl start homeeye-camera.service homeeye-web.service
   ```

### Services Crashing

**Symptoms:**
- Services start but crash shortly after
- Logs show errors

**Solutions:**

1. **Check Error Logs**:
   ```bash
   tail -f ~/homeeye/logs/error.log
   tail -f ~/homeeye/logs/combined.log
   ```

2. **Memory Issues**:
   ```bash
   # Check memory usage
   free -h
   top -p $(pgrep -f "homeeye")

   # Increase swap if needed
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=1024
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

3. **Node.js Issues**:
   ```bash
   # Clear npm cache
   cd ~/homeeye/server && npm cache clean --force
   cd ~/homeeye/Raspi5/camera && npm cache clean --force

   # Reinstall dependencies
   cd ~/homeeye/server && rm -rf node_modules && npm install
   cd ~/homeeye/Raspi5/camera && rm -rf node_modules && npm install
   ```

## Web Interface Issues

### Interface Not Loading

**Symptoms:**
- Browser shows blank page or errors
- JavaScript console shows errors

**Solutions:**

1. **Check Web Service**:
   ```bash
   sudo systemctl status homeeye-web.service
   curl http://localhost:8420/
   ```

2. **Browser Console Errors**:
   - Open browser dev tools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed requests

3. **Clear Browser Cache**:
   - Hard refresh: Ctrl+F5 or Cmd+Shift+R
   - Clear browser cache for the site

4. **CORS Issues**:
   ```bash
   # Check if accessing from different domain
   # Ensure API calls use correct URLs
   ```

### Camera Stream Not Showing

**Symptoms:**
- Web interface loads but video area is blank
- Console shows stream errors

**Solutions:**

1. **Check Stream URL**:
   ```bash
   # Test stream URL
   curl -I http://localhost:8421/stream.mjpg
   ```

2. **Browser Network Tab**:
   - Check if MJPEG requests are failing
   - Verify CORS headers

3. **Stream Format Issues**:
   ```bash
   # Check if browser supports MJPEG
   # Some browsers may need different handling
   ```

### WebSocket Connection Issues

**Symptoms:**
- Real-time updates not working
- Motion detection not showing

**Solutions:**

1. **Check WebSocket Connection**:
   ```javascript
   // In browser console
   const ws = new WebSocket('ws://localhost:8420/ws');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (e) => console.error('Error:', e);
   ```

2. **Firewall Blocking WebSocket**:
   ```bash
   # WebSocket uses same port as HTTP (8420)
   sudo ufw status
   ```

3. **Authentication Issues**:
   ```bash
   # If auth enabled, WebSocket needs same credentials
   # Check browser sends proper auth headers
   ```

## Performance Issues

### High CPU Usage

**Symptoms:**
- System becomes slow or unresponsive
- High CPU usage by Node.js processes

**Solutions:**

1. **Monitor CPU Usage**:
   ```bash
   top -p $(pgrep -f "homeeye")
   htop  # If installed
   ```

2. **Optimize Camera Settings**:
   ```bash
   # Reduce resolution and FPS
   nano ~/homeeye/Raspi5/.env
   CAMERA_WIDTH=640
   CAMERA_HEIGHT=480
   CAMERA_FPS=10
   ```

3. **Disable Unnecessary Features**:
   ```bash
   # Disable motion detection if not needed
   # Reduce logging level
   ```

4. **Update Node.js**:
   ```bash
   # Use latest LTS version
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### High Memory Usage

**Symptoms:**
- System runs out of memory
- Services get killed by OOM killer

**Solutions:**

1. **Monitor Memory**:
   ```bash
   free -h
   vmstat 1 5
   ```

2. **Increase Swap**:
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=2048
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

3. **Optimize Application**:
   ```bash
   # Check for memory leaks
   # Reduce buffer sizes in camera streaming
   # Implement connection pooling
   ```

### Slow Stream Loading

**Symptoms:**
- Video takes long time to load
- Stream buffering issues

**Solutions:**

1. **Network Bandwidth**:
   ```bash
   # Test network speed
   speedtest-cli
   ```

2. **Optimize Stream Settings**:
   ```bash
   # Lower quality for faster loading
   CAMERA_WIDTH=800
   CAMERA_HEIGHT=600
   CAMERA_FPS=15
   ```

3. **Browser Issues**:
   - Try different browser
   - Clear browser cache
   - Check browser compatibility

## Database Issues

### Database Corruption

**Symptoms:**
- API calls fail with database errors
- Events not being stored

**Solutions:**

1. **Check Database File**:
   ```bash
   ls -la ~/homeeye/data/homeeye.db
   sqlite3 ~/homeeye/data/homeeye.db ".schema"
   ```

2. **Repair Database**:
   ```bash
   # Stop services
   sudo systemctl stop homeeye-web.service

   # Backup and recreate
   cp ~/homeeye/data/homeeye.db ~/homeeye/data/homeeye.db.backup
   rm ~/homeeye/data/homeeye.db

   # Restart service (will recreate database)
   sudo systemctl start homeeye-web.service
   ```

3. **Check Disk Space**:
   ```bash
   df -h
   du -sh ~/homeeye/data/
   ```

### Missing Events

**Symptoms:**
- Motion events not appearing in API

**Solutions:**

1. **Check Database Tables**:
   ```bash
   sqlite3 ~/homeeye/data/homeeye.db ".tables"
   sqlite3 ~/homeeye/data/homeeye.db "SELECT COUNT(*) FROM motion_events;"
   ```

2. **Verify Motion Detection**:
   ```bash
   # Check camera service logs
   tail -f ~/homeeye/logs/camera.log
   ```

3. **Test Motion Detection**:
   ```bash
   # Move in front of camera
   # Check WebSocket messages in browser console
   ```

## Security Issues

### Authentication Not Working

**Symptoms:**
- Can access interface without password
- Password prompt not appearing

**Solutions:**

1. **Check Configuration**:
   ```bash
   grep AUTH_ENABLED ~/homeeye/Raspi5/.env
   ```

2. **Enable Authentication**:
   ```bash
   nano ~/homeeye/Raspi5/.env
   # Add:
   AUTH_ENABLED=true
   AUTH_USERNAME=admin
   AUTH_PASSWORD=secure_password

   # Restart web service
   sudo systemctl restart homeeye-web.service
   ```

3. **Browser Cache Issues**:
   - Clear browser cache
   - Hard refresh page

### Unauthorized Access

**Symptoms:**
- Others can access your HomeEye instance

**Solutions:**

1. **Change Default Credentials**:
   ```bash
   # Use strong, unique password
   AUTH_PASSWORD=YourStrongPassword123!
   ```

2. **Network Security**:
   ```bash
   # Don't expose to internet without VPN
   # Use firewall rules
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow from 192.168.1.0/24 to any port 8420
   sudo ufw allow from 192.168.1.0/24 to any port 8421
   ```

3. **HTTPS Setup** (Advanced):
   ```bash
   # Install certbot for SSL
   sudo apt install certbot
   # Configure reverse proxy with SSL
   ```

## Getting Help

### Log Collection

Create a comprehensive log bundle for support:

```bash
#!/bin/bash
LOG_DIR="~/homeeye/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log bundle
tar -czf "homeeye_logs_${TIMESTAMP}.tar.gz" \
    ~/homeeye/logs/ \
    ~/homeeye/Raspi5/.env \
    <(sudo journalctl -u homeeye-* --since "24 hours ago") \
    <(ps aux | grep homeeye) \
    <(df -h) \
    <(free -h) \
    <(uname -a)

echo "Log bundle created: homeeye_logs_${TIMESTAMP}.tar.gz"
```

### Support Resources

1. **GitHub Issues**: [Report bugs and request features](https://github.com/Aeell/HomeEye/issues)
2. **Discussions**: [Ask questions and share solutions](https://github.com/Aeell/HomeEye/discussions)
3. **Documentation**: Check all `.md` files in the repository
4. **Community**: Raspberry Pi forums and Stack Overflow

### Diagnostic Information to Provide

When seeking help, include:

- **System Information**:
  ```bash
  uname -a
  lsb_release -a
  node --version
  npm --version
  ```

- **Service Status**:
  ```bash
  sudo systemctl status homeeye-*
  ```

- **Recent Logs**:
  ```bash
  sudo journalctl -u homeeye-* -n 20
  tail -20 ~/homeeye/logs/*.log
  ```

- **Configuration** (without passwords):
  ```bash
  grep -v PASSWORD ~/homeeye/Raspi5/.env
  ```

- **Error Messages**: Exact error messages and when they occur

### Emergency Recovery

If everything fails:

1. **Backup Configuration**:
   ```bash
   cp ~/homeeye/Raspi5/.env ~/homeeye/.env.backup
   ```

2. **Clean Reinstall**:
   ```bash
   # Stop services
   sudo systemctl stop homeeye-*

   # Remove everything
   rm -rf ~/homeeye

   # Fresh install
   git clone https://github.com/Aeell/HomeEye.git ~/homeeye
   cd ~/homeeye
   ./scripts/deploy.sh
   ```

3. **Restore Configuration**:
   ```bash
   cp ~/homeeye/.env.backup ~/homeeye/Raspi5/.env
   sudo systemctl restart homeeye-*
   ```

This troubleshooting guide covers the most common issues. Most problems can be resolved by checking logs, verifying configuration, and ensuring proper system setup. For persistent issues, provide detailed diagnostic information when seeking help.