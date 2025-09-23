# HomeEye Development Guide

This guide provides information for developers who want to contribute to or extend the HomeEye project.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Extending HomeEye](#extending-homeeye)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Git**: Latest version
- **Raspberry Pi**: For hardware testing (optional but recommended)
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - JavaScript/TypeScript support

### Local Development Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Aeell/HomeEye.git
   cd HomeEye
   ```

2. **Install Dependencies**:
   ```bash
   # Install all dependencies
   npm run install:all

   # Or install individually
   cd server && npm install
   cd ../Raspi5/camera && npm install
   ```

3. **Environment Configuration**:
   ```bash
   # Copy environment template
   cp Raspi5/.env.template Raspi5/.env

   # Edit for development
   nano Raspi5/.env
   # Set MOCK_CAMERA=true for development without hardware
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1: Start web server with auto-restart
   cd server && npm run dev

   # Terminal 2: Start camera service (if not mocked)
   cd ../Raspi5/camera && npm run dev

   # Or use mock camera for development
   cd ../Raspi5/camera && MOCK_CAMERA=true npm start
   ```

5. **Access Development Environment**:
   - Web Interface: http://localhost:8420
   - MJPEG Stream: http://localhost:8421/stream.mjpg
   - Health Check: http://localhost:8420/healthz

### Raspberry Pi Development Setup

For testing with actual hardware:

1. **Set up Raspberry Pi** (see [INSTALL.md](INSTALL.md))
2. **Enable SSH access** for remote development
3. **Mount project directory** via SSHFS or Samba
4. **Sync code changes** automatically using rsync/watch tools

Example SSHFS setup:
```bash
# On development machine
mkdir ~/homeeye-remote
sshfs pi@192.168.1.100:/home/pi/homeeye ~/homeeye-remote
```

## Project Structure

```
HomeEye/
├── server/                 # Main web server
│   ├── server.js          # Express server with WebSocket support
│   ├── config.js          # Configuration management
│   ├── database.js        # SQLite database operations
│   ├── server.test.js     # Unit and integration tests
│   └── package.json
├── Raspi5/                # Raspberry Pi specific components
│   ├── camera/            # MJPEG streaming service
│   │   ├── streamer.js    # Camera capture and streaming
│   │   └── package.json
│   ├── services/          # Systemd service definitions
│   └── .env.template      # Environment configuration template
├── ui/                    # Web interface (static files)
│   ├── index.html         # Main HTML page
│   ├── app.js            # Frontend JavaScript
│   └── styles.css        # CSS styles
├── scripts/               # Deployment and utility scripts
│   ├── deploy.sh          # Linux/macOS deployment
│   └── wave_*.ps1         # Windows deployment (legacy)
├── docs/                  # Documentation (generated)
└── *.md                   # Documentation files
```

### Key Components

- **Server (`server/`)**: Express.js web server handling HTTP API, WebSocket connections, and static file serving
- **Camera Service (`Raspi5/camera/`)**: Node.js service managing libcamera-vid process and MJPEG streaming
- **Web Interface (`ui/`)**: Vanilla JavaScript frontend with real-time updates
- **Database (`server/database.js`)**: SQLite-based event storage and retrieval
- **Configuration**: Environment-based configuration with `.env` files

## Development Workflow

### 1. Create Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/amazing-feature

# Or create from issue
git checkout -b issue-123-fix-bug
```

### 2. Make Changes

Follow the code style guidelines and ensure:
- All tests pass
- Code is well-documented
- Changes are backward compatible
- Security considerations are addressed

### 3. Test Changes

```bash
# Run all tests
cd server && npm test

# Run with coverage
npm run test:coverage

# Manual testing
# - Start development servers
# - Test web interface
# - Test API endpoints
# - Test camera streaming
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add amazing feature

- Add new API endpoint for feature
- Update frontend to support new functionality
- Add tests for new feature
- Update documentation

Closes #123"
```

### 5. Push and Create Pull Request

```bash
# Push branch
git push origin feature/amazing-feature

# Create pull request on GitHub
# Include description of changes and testing done
```

## Code Style Guidelines

### JavaScript/Node.js

- **ES6+ Features**: Use modern JavaScript features (async/await, destructuring, etc.)
- **Modules**: Use ES modules (`import`/`export`) instead of CommonJS
- **Error Handling**: Always handle errors appropriately with try/catch
- **Logging**: Use Winston for logging, not console.log in production code
- **Naming**: Use camelCase for variables/functions, PascalCase for classes
- **Documentation**: Add JSDoc comments for functions and classes

Example:
```javascript
/**
 * Processes motion detection events
 * @param {Array} boxes - Detected motion bounding boxes
 * @param {number} confidence - Detection confidence score
 * @returns {Promise<void>}
 */
async function processMotionEvent(boxes, confidence) {
  try {
    logger.info('Processing motion event', { boxCount: boxes.length, confidence });

    // Process boxes...
    await database.logMotion(confidence, boxes);

    // Broadcast to WebSocket clients...
    broadcastMotionBoxes(boxes);

  } catch (error) {
    logger.error('Failed to process motion event', { error: error.message });
    throw error;
  }
}
```

### HTML/CSS

- **Semantic HTML**: Use appropriate semantic elements
- **CSS Variables**: Use CSS custom properties for theming
- **Responsive Design**: Ensure mobile compatibility
- **Accessibility**: Include proper ARIA labels and keyboard navigation

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing changes
- `chore`: Maintenance tasks

## Testing

### Test Structure

Tests are located in `server/server.test.js` and follow Jest conventions:

```javascript
describe('API Endpoints', () => {
  describe('GET /healthz', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test server.test.js
```

### Test Coverage

Aim for high test coverage, especially for:
- API endpoints
- Error handling
- Database operations
- WebSocket communication

### Manual Testing Checklist

- [ ] Web interface loads correctly
- [ ] Camera stream displays
- [ ] Grid overlay toggles
- [ ] Timestamp overlay works
- [ ] Motion boxes appear (when motion detected)
- [ ] Snapshot download works
- [ ] Theme switching works
- [ ] API endpoints respond correctly
- [ ] Authentication works (if enabled)
- [ ] WebSocket connections work
- [ ] Database stores events
- [ ] Services start/stop correctly

## Debugging

### Logging

HomeEye uses Winston for structured logging. Logs are written to:

- **Console**: Real-time output with colors
- **Error Log**: `logs/error.log` (errors only)
- **Combined Log**: `logs/combined.log` (all logs)

Log levels: `error`, `warn`, `info`, `debug`

### Debug Mode

Enable debug logging:

```bash
# Environment variable
DEBUG=homeeye:* npm start

# Or in code
logger.level = 'debug';
```

### Common Debugging Techniques

1. **Check Service Status**:
   ```bash
   sudo systemctl status homeeye-*
   journalctl -u homeeye-camera.service -f
   ```

2. **Inspect Network Traffic**:
   ```bash
   # Monitor network connections
   sudo netstat -tulpn | grep :842[0-1]

   # Check firewall rules
   sudo ufw status
   ```

3. **Database Debugging**:
   ```bash
   # Connect to SQLite database
   sqlite3 data/homeeye.db
   .tables
   SELECT * FROM events LIMIT 5;
   ```

4. **Camera Debugging**:
   ```bash
   # Test camera directly
   libcamera-hello

   # Check camera logs
   tail -f logs/camera.log
   ```

### Browser Developer Tools

Use browser dev tools to debug the frontend:
- **Network tab**: Check API requests and WebSocket connections
- **Console tab**: View JavaScript errors and logs
- **Application tab**: Inspect local storage and session data

## Contributing

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes with tests
4. **Ensure** all tests pass
5. **Update** documentation if needed
6. **Commit** with conventional commit messages
7. **Push** to your fork
8. **Create** a Pull Request with description

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Backward compatibility maintained

### Issue Reporting

When reporting bugs:
- Include HomeEye version
- Describe steps to reproduce
- Include error messages/logs
- Specify Raspberry Pi model and OS version
- Include browser information (for UI issues)

## Extending HomeEye

### Adding New API Endpoints

1. **Define Route** in `server/server.js`:
   ```javascript
   app.get('/api/new-endpoint', authMiddleware, (req, res) => {
     // Implementation
   });
   ```

2. **Add Database Operations** if needed:
   ```javascript
   // In database.js
   export const getNewData = (params) => {
     // Database query
   };
   ```

3. **Add Tests** in `server.test.js`

### Adding New WebSocket Events

1. **Define Message Type**:
   ```javascript
   // Send from server
   wss.clients.forEach(client => {
     client.send(JSON.stringify({
       type: 'new_event',
       data: eventData
     }));
   });
   ```

2. **Handle in Frontend** (`ui/app.js`):
   ```javascript
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     if (message.type === 'new_event') {
       handleNewEvent(message.data);
     }
   };
   ```

### Adding Camera Features

1. **Modify Camera Arguments** in `Raspi5/camera/streamer.js`:
   ```javascript
   const args = [
     '--codec', 'mjpeg',
     // Add new camera options
     '--new-feature', value
   ];
   ```

2. **Update Configuration** in `.env.template`

### Custom Motion Detection

Replace the basic motion detection with advanced algorithms:

1. **Install Computer Vision Library**:
   ```bash
   npm install @u4/opencv4nodejs
   ```

2. **Implement Detection Algorithm**:
   ```javascript
   import cv from '@u4/opencv4nodejs';

   function detectMotionAdvanced(frame1, frame2) {
     // Advanced motion detection using OpenCV
     const diff = frame1.absdiff(frame2);
     const threshold = diff.threshold(25, 255, cv.THRESH_BINARY);
     // ... contour detection, etc.
   }
   ```

### Database Schema Extensions

Add new tables or columns:

```javascript
// In database.js
db.exec(`
  ALTER TABLE events ADD COLUMN metadata TEXT;
  CREATE TABLE recordings (
    id INTEGER PRIMARY KEY,
    filename TEXT,
    timestamp DATETIME,
    duration INTEGER
  );
`);
```

### UI Components

Add new UI controls:

1. **Update HTML** (`ui/index.html`)
2. **Add CSS** (`ui/styles.css`)
3. **Implement JavaScript** (`ui/app.js`)

### Systemd Services

Create new services in `Raspi5/services/`:
- Copy existing service file as template
- Modify ExecStart, WorkingDirectory, etc.
- Install with `sudo systemctl enable new-service.service`

This development guide provides the foundation for contributing to and extending HomeEye. Remember to always test changes thoroughly, especially when working with camera hardware and system services.