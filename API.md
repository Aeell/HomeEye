# HomeEye API Documentation

This document provides comprehensive documentation for the HomeEye REST API and WebSocket interfaces.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [REST API](#rest-api)
  - [Health Check](#health-check)
  - [Configuration](#configuration)
  - [Events](#events)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

HomeEye provides both REST API endpoints and WebSocket connections for real-time communication. The API is designed to be simple, consistent, and well-documented.

### Base URL
```
http://your-pi-ip:8420
```

### Content Types
- **Request**: `application/json` (for POST/PUT requests)
- **Response**: `application/json` (for all responses)

### HTTP Status Codes
- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Authentication failed
- `404 Not Found` - Endpoint not found
- `500 Internal Server Error` - Server error

## Authentication

HomeEye supports optional HTTP Basic Authentication. When enabled, all API endpoints require authentication.

### Basic Authentication

Include the `Authorization` header with your requests:

```
Authorization: Basic <base64-encoded-credentials>
```

Where `<base64-encoded-credentials>` is the base64 encoding of `username:password`.

### Example

```bash
# Using curl with authentication
curl -u username:password http://192.168.1.100:8420/healthz

# Or manually encode credentials
echo -n 'username:password' | base64
# Output: dXNlcm5hbWU6cGFzc3dvcmQ=
curl -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" http://192.168.1.100:8420/healthz
```

### Authentication Configuration

Authentication is configured via environment variables:
- `AUTH_ENABLED=true` - Enable authentication
- `AUTH_USERNAME=your_username` - Set username
- `AUTH_PASSWORD=your_password` - Set password

## REST API

### Health Check

Get system health status and basic information.

**Endpoint:** `GET /healthz`

**Authentication:** Not required

**Response:**
```json
{
  "ok": true,
  "uptime": 3600.5,
  "timestamp": "2025-01-22T10:30:00.000Z",
  "clients": 2,
  "auth": false
}
```

**Response Fields:**
- `ok` (boolean): System health status
- `uptime` (number): System uptime in seconds
- `timestamp` (string): Current server timestamp in ISO 8601 format
- `clients` (number): Number of connected WebSocket clients
- `auth` (boolean): Whether authentication is enabled

**Example:**
```bash
curl http://192.168.1.100:8420/healthz
```

### Configuration

Get client configuration including stream URL and UI settings.

**Endpoint:** `GET /config.json`

**Authentication:** Required (if enabled)

**Response:**
```json
{
  "streamUrl": "http://192.168.1.100:8421/stream.mjpg",
  "theme": "dark"
}
```

**Response Fields:**
- `streamUrl` (string): MJPEG stream URL for camera feed
- `theme` (string): Default UI theme ("dark" or "light")

**Example:**
```bash
curl -u username:password http://192.168.1.100:8420/config.json
```

### Events

Retrieve recent system events and motion detections from the database.

**Endpoint:** `GET /api/events`

**Authentication:** Required (if enabled)

**Query Parameters:**
- `limit` (number, optional): Maximum number of events to return (default: 50, max: 1000)

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "type": "server_start",
      "timestamp": "2025-01-22T10:00:00.000Z",
      "data": "{\"port\":8420,\"theme\":\"dark\"}"
    },
    {
      "id": 2,
      "type": "motion_detected",
      "timestamp": "2025-01-22T10:05:30.000Z",
      "data": "{\"confidence\":0.85,\"boxes\":1}"
    }
  ],
  "motionEvents": [
    {
      "id": 1,
      "timestamp": "2025-01-22T10:05:30.000Z",
      "confidence": 0.85,
      "boxes": "[{\"id\":\"motion-1234567890\",\"x\":0.3,\"y\":0.3,\"w\":0.4,\"h\":0.4,\"label\":\"motion\",\"conf\":0.85}]"
    }
  ],
  "total": 3
}
```

**Response Fields:**
- `events` (array): General system events
  - `id` (number): Event ID
  - `type` (string): Event type (e.g., "server_start", "motion_detected")
  - `timestamp` (string): Event timestamp in ISO 8601 format
  - `data` (string): JSON-encoded event data
- `motionEvents` (array): Motion detection events
  - `id` (number): Motion event ID
  - `timestamp` (string): Detection timestamp
  - `confidence` (number): Detection confidence (0.0-1.0)
  - `boxes` (string): JSON-encoded bounding boxes array
- `total` (number): Total number of events returned

**Examples:**
```bash
# Get last 10 events
curl -u username:password "http://192.168.1.100:8420/api/events?limit=10"

# Get default 50 events
curl -u username:password http://192.168.1.100:8420/api/events
```

## WebSocket API

HomeEye provides real-time updates via WebSocket connections for motion detection events.

### Connection

**URL:** `ws://your-pi-ip:8420/ws`

**Authentication:** Required if HTTP auth is enabled (same credentials)

### Messages

#### Motion Detection Message

Sent when motion is detected in the camera feed.

```json
{
  "type": "boxes",
  "boxes": [
    {
      "id": "motion-1642758930000-1",
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

**Message Fields:**
- `type` (string): Always "boxes" for motion detection
- `boxes` (array): Array of detected motion bounding boxes
  - `id` (string): Unique box identifier
  - `x` (number): X coordinate (0.0-1.0, relative to image width)
  - `y` (number): Y coordinate (0.0-1.0, relative to image height)
  - `w` (number): Width (0.0-1.0, relative to image width)
  - `h` (number): Height (0.0-1.0, relative to image height)
  - `label` (string): Detection label (always "motion")
  - `conf` (number): Confidence score (0.0-1.0)

### Connection States

- **Connecting**: Establishing WebSocket connection
- **Connected**: Successfully connected, receiving updates
- **Disconnected**: Connection lost, automatic reconnection attempted
- **Error**: Connection failed, will retry

### JavaScript Example

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://192.168.1.100:8420/ws');

// Handle connection open
ws.onopen = function(event) {
  console.log('Connected to HomeEye WebSocket');
};

// Handle incoming messages
ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  if (message.type === 'boxes') {
    console.log('Motion detected:', message.boxes);
    // Update UI with motion boxes
    updateMotionBoxes(message.boxes);
  }
};

// Handle connection close
ws.onclose = function(event) {
  console.log('WebSocket connection closed, reconnecting...');
  // Automatic reconnection logic
  setTimeout(() => connectWebSocket(), 2000);
};

// Handle errors
ws.onerror = function(error) {
  console.error('WebSocket error:', error);
};
```

## Error Handling

### HTTP Error Responses

All API errors return JSON with the following structure:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error information"
}
```

### Common Error Codes

- `INVALID_REQUEST`: Malformed request parameters
- `UNAUTHORIZED`: Authentication required or failed
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Requested resource not found
- `DATABASE_ERROR`: Database operation failed
- `CAMERA_ERROR`: Camera-related error
- `INTERNAL_ERROR`: Unexpected server error

### WebSocket Error Handling

WebSocket connections may fail due to:
- Network connectivity issues
- Server restarts
- Authentication failures
- Browser compatibility issues

Implement automatic reconnection with exponential backoff:

```javascript
function connectWebSocket(retryCount = 0) {
  const ws = new WebSocket('ws://192.168.1.100:8420/ws');

  ws.onopen = () => {
    console.log('WebSocket connected');
    retryCount = 0; // Reset retry count on successful connection
  };

  ws.onclose = () => {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`WebSocket disconnected, retrying in ${delay}ms...`);
    setTimeout(() => connectWebSocket(retryCount + 1), delay);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}
```

## Rate Limiting

The API implements basic rate limiting to prevent abuse:

- **Health Check**: 100 requests per minute per IP
- **Configuration**: 50 requests per minute per authenticated user
- **Events API**: 20 requests per minute per authenticated user
- **WebSocket**: Unlimited (but connections are pooled)

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642759200
```

## Examples

### Complete JavaScript Client

```javascript
class HomeEyeClient {
  constructor(baseUrl = 'http://192.168.1.100:8420', credentials = null) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.ws = null;
  }

  // Helper for authenticated requests
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };

    if (this.credentials) {
      headers['Authorization'] = `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`;
    }

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Health check
  async getHealth() {
    return this.request('/healthz');
  }

  // Get configuration
  async getConfig() {
    return this.request('/config.json');
  }

  // Get events
  async getEvents(limit = 50) {
    return this.request(`/api/events?limit=${limit}`);
  }

  // Connect to WebSocket
  connectWebSocket(onMotionDetected) {
    const wsUrl = `ws://${this.baseUrl.split('://')[1]}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'boxes' && onMotionDetected) {
        onMotionDetected(message.boxes);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Implement reconnection logic
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  // Disconnect WebSocket
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage example
const client = new HomeEyeClient('http://192.168.1.100:8420', {
  username: 'admin',
  password: 'password'
});

// Get health status
client.getHealth().then(health => console.log('Health:', health));

// Get configuration
client.getConfig().then(config => console.log('Config:', config));

// Get recent events
client.getEvents(10).then(events => console.log('Events:', events));

// Connect for real-time updates
client.connectWebSocket((boxes) => {
  console.log('Motion detected:', boxes);
  // Update UI with motion boxes
});
```

### Python Client Example

```python
import requests
import websocket
import json
import base64
from typing import Optional, Dict, Any

class HomeEyeAPI:
    def __init__(self, base_url: str = "http://192.168.1.100:8420",
                 username: Optional[str] = None, password: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.auth = None
        if username and password:
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            self.auth = f"Basic {credentials}"

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.auth:
            headers["Authorization"] = self.auth
        return headers

    def get_health(self) -> Dict[str, Any]:
        """Get system health status."""
        response = requests.get(f"{self.base_url}/healthz")
        response.raise_for_status()
        return response.json()

    def get_config(self) -> Dict[str, Any]:
        """Get client configuration."""
        response = requests.get(f"{self.base_url}/config.json", headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def get_events(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent events."""
        response = requests.get(f"{self.base_url}/api/events",
                              params={"limit": limit},
                              headers=self._get_headers())
        response.raise_for_status()
        return response.json()

# Usage
api = HomeEyeAPI("http://192.168.1.100:8420", "admin", "password")

try:
    health = api.get_health()
    print(f"System healthy: {health['ok']}")

    config = api.get_config()
    print(f"Stream URL: {config['streamUrl']}")

    events = api.get_events(5)
    print(f"Found {events['total']} events")

except requests.exceptions.RequestException as e:
    print(f"API request failed: {e}")
```

### Command Line Examples

```bash
# Health check
curl http://192.168.1.100:8420/healthz

# Get configuration with auth
curl -u admin:password http://192.168.1.100:8420/config.json

# Get events
curl -u admin:password "http://192.168.1.100:8420/api/events?limit=10"

# Test MJPEG stream
curl -I http://192.168.1.100:8421/stream.mjpg

# Get snapshot
curl -u admin:password -o snapshot.jpg http://192.168.1.100:8421/snapshot.jpg
```

This API documentation provides everything needed to integrate with HomeEye programmatically. For additional help, check the [main README](README.md) or open an issue on GitHub.