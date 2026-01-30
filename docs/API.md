# API Documentation

Complete API reference for the SENTINEL Deepfake Detection & Authenticity Verification System.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Scans](#scans)
- [Users](#users)
- [Admin](#admin)
- [Notifications](#notifications)
- [Reports](#reports)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

### Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

### Request Headers

All protected endpoints require a JWT token:

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

For file uploads:
```
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

### Response Format

All responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2026-01-30T12:00:00.000Z"
  }
}
```

---

## Authentication

### Login

**POST** `/api/auth/login`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "operativeId": "GHOST_001",
      "role": "operative",
      "metadata": {
        "firstName": "John",
        "lastName": "Doe",
        "department": "Investigation",
        "clearanceLevel": "CONFIDENTIAL"
      }
    }
  }
}
```

**Error Responses:**
- `400`: Invalid email or password format
- `401`: Invalid credentials
- `403`: Account is deactivated

---

### Register

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "email": "newuser@example.com",
      "operativeId": "GHOST_002",
      "role": "operative"
    }
  },
  "message": "User registered successfully"
}
```

---

### Google OAuth

**POST** `/api/auth/google`

Authenticate with Google OAuth token.

**Request Body:**
```json
{
  "credential": "google_id_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439013",
      "email": "user@gmail.com",
      "authProvider": "google",
      "role": "operative"
    },
    "isNewUser": false
  }
}
```

---

### Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "operativeId": "GHOST_001",
    "role": "operative",
    "isActive": true,
    "authProvider": "local",
    "lastLogin": "2026-01-30T10:00:00.000Z",
    "metadata": {
      "firstName": "John",
      "lastName": "Doe",
      "department": "Investigation",
      "clearanceLevel": "CONFIDENTIAL"
    },
    "notificationPreferences": {
      "email": true,
      "inApp": true,
      "deepfakeAlerts": true
    },
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Scans

### Upload Single File

**POST** `/api/scans/upload`

Upload a media file for deepfake detection analysis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): Media file (max 500MB)
- `tags` (optional): Comma-separated tags

**Supported File Types:**
- Images: JPEG, PNG
- Videos: MP4, AVI, MOV, WebM
- Audio: MP3, WAV

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "scanId": "SCAN_ABC123DEF456",
    "status": "PENDING",
    "fileName": "video.mp4",
    "fileSize": 10485760,
    "mediaType": "VIDEO",
    "hash": "sha256:abc123def456...",
    "createdAt": "2026-01-30T12:00:00.000Z"
  },
  "message": "Scan queued for processing"
}
```

**Processing Flow:**
1. File uploaded and validated
2. Scan record created with status `PENDING`
3. Processing begins asynchronously
4. Real-time updates via WebSocket
5. Final result when status becomes `COMPLETED`

---

### Upload Batch

**POST** `/api/scans/batch`

Upload multiple files for batch analysis (max 50 files).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `files` (required): Multiple media files
- `tags` (optional): Tags applied to all files

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "batchId": "BATCH_XYZ789",
    "totalFiles": 5,
    "scans": [
      {
        "scanId": "SCAN_001",
        "fileName": "image1.jpg",
        "status": "PENDING"
      },
      {
        "scanId": "SCAN_002",
        "fileName": "video1.mp4",
        "status": "PENDING"
      }
    ]
  },
  "message": "Batch queued for processing"
}
```

---

### Get Scan History

**GET** `/api/scans/history`

Retrieve paginated scan history with filtering and search.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | - | Full-text search query |
| `status` | string | - | Filter: PENDING, PROCESSING, COMPLETED, FAILED |
| `mediaType` | string | - | Filter: VIDEO, IMAGE, AUDIO |
| `verdict` | string | - | Filter: DEEPFAKE, SUSPICIOUS, AUTHENTIC |
| `startDate` | ISO date | - | Filter scans after this date |
| `endDate` | ISO date | - | Filter scans before this date |
| `sortBy` | string | date | Sort field: date, confidence, riskScore, fileName |
| `sortOrder` | string | desc | Sort order: asc, desc |
| `tags` | string | - | Filter by tag (comma-separated) |

**Example Request:**
```
GET /api/scans/history?page=1&limit=10&verdict=DEEPFAKE&sortBy=riskScore&sortOrder=desc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "SCAN_ABC123",
      "fileName": "suspicious_video.mp4",
      "mediaType": "VIDEO",
      "status": "COMPLETED",
      "result": {
        "verdict": "DEEPFAKE",
        "confidence": 92,
        "riskScore": 85
      },
      "hash": "sha256:abc123...",
      "tags": ["investigation", "case-001"],
      "createdAt": "2026-01-30T10:00:00.000Z",
      "operative": "GHOST_001"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "pages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Scan Details

**GET** `/api/scans/:id`

Retrieve detailed information about a specific scan.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "SCAN_ABC123DEF456",
    "scanId": "SCAN_ABC123DEF456",
    "fileName": "video.mp4",
    "fileSize": 10485760,
    "mediaType": "VIDEO",
    "status": "COMPLETED",
    "hash": "sha256:abc123def456789...",
    "result": {
      "verdict": "DEEPFAKE",
      "confidence": 92,
      "riskScore": 85,
      "videoScore": 88,
      "audioScore": 0,
      "ganFingerprint": 85,
      "temporalConsistency": 72,
      "peakRisk": 95,
      "meanRisk": 78,
      "variance": 0.15,
      "uncertainty": "low",
      "explanations": [
        {
          "type": "facial",
          "severity": "high",
          "description": "Facial manipulation detected with 88% probability",
          "details": "Inconsistent facial boundaries and texture anomalies detected"
        },
        {
          "type": "gan",
          "severity": "high",
          "description": "GAN-generated artifacts identified",
          "details": "Characteristic GAN fingerprint patterns found in 85% of analyzed frames"
        },
        {
          "type": "temporal",
          "severity": "medium",
          "description": "Temporal inconsistencies detected",
          "details": "Frame-to-frame coherence score of 72% indicates potential manipulation"
        }
      ]
    },
    "metadata": {
      "codec": "h264",
      "bitrate": "5000000",
      "resolution": "1920x1080",
      "duration": 30.5,
      "fps": 30,
      "channels": 2,
      "sampleRate": 44100
    },
    "gpsCoordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "processingData": {
      "frameCount": 60,
      "processedFrames": 30,
      "inferenceTime": 2450,
      "modelVersion": "v1"
    },
    "tags": ["investigation", "case-001"],
    "comments": [],
    "assignedTo": null,
    "caseId": null,
    "operative": "GHOST_001",
    "createdAt": "2026-01-30T10:00:00.000Z",
    "updatedAt": "2026-01-30T10:02:30.000Z"
  }
}
```

---

### Delete Scan

**DELETE** `/api/scans/:id`

Delete a scan (admin only or scan owner).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Scan deleted successfully"
}
```

---

### Update Scan Tags

**PATCH** `/api/scans/:id/tags`

Update tags for a scan.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tags": ["investigation", "priority-high", "case-002"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "SCAN_ABC123",
    "tags": ["investigation", "priority-high", "case-002"]
  }
}
```

---

### Share Scan

**POST** `/api/scans/:id/share`

Share a scan with other users.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "message": "Please review this scan"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Scan shared with 2 users"
}
```

---

### Add Comment

**POST** `/api/scans/:id/comments`

Add a comment to a scan.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "This appears to be a face-swap deepfake"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "comment_123",
    "content": "This appears to be a face-swap deepfake",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "operativeId": "GHOST_001"
    },
    "createdAt": "2026-01-30T12:00:00.000Z"
  }
}
```

---

### Assign Scan

**POST** `/api/scans/:id/assign`

Assign a scan to a user for review.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439012"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "SCAN_ABC123",
    "assignedTo": {
      "id": "507f1f77bcf86cd799439012",
      "operativeId": "GHOST_002"
    }
  }
}
```

---

## Users

### List Users (Admin)

**GET** `/api/users`

Get all users with pagination (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `role` (string): Filter by role
- `isActive` (boolean): Filter by status
- `search` (string): Search by email or name

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "operativeId": "GHOST_001",
      "role": "operative",
      "isActive": true,
      "lastLogin": "2026-01-30T10:00:00.000Z",
      "metadata": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### Get User by ID (Admin)

**GET** `/api/users/:id`

Get a specific user's details (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "operativeId": "GHOST_001",
    "role": "operative",
    "isActive": true,
    "authProvider": "local",
    "lastLogin": "2026-01-30T10:00:00.000Z",
    "metadata": {
      "firstName": "John",
      "lastName": "Doe",
      "department": "Investigation",
      "clearanceLevel": "CONFIDENTIAL"
    },
    "stats": {
      "totalScans": 45,
      "deepfakesDetected": 12,
      "lastScan": "2026-01-29T15:00:00.000Z"
    }
  }
}
```

---

### Create User (Admin)

**POST** `/api/users`

Create a new user (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "role": "analyst",
  "metadata": {
    "firstName": "Jane",
    "lastName": "Smith",
    "department": "Analysis",
    "clearanceLevel": "SECRET"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "email": "newuser@example.com",
    "operativeId": "GHOST_003",
    "role": "analyst"
  },
  "message": "User created successfully"
}
```

---

### Update User (Admin)

**PUT** `/api/users/:id`

Update a user's information (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "analyst",
  "isActive": true,
  "metadata": {
    "department": "Senior Analysis",
    "clearanceLevel": "TOP_SECRET"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "analyst",
    "isActive": true
  },
  "message": "User updated successfully"
}
```

---

### Delete User (Admin)

**DELETE** `/api/users/:id`

Delete a user (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### Get User Statistics (Admin)

**GET** `/api/users/stats`

Get user statistics (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 45,
    "inactive": 5,
    "byRole": {
      "admin": 2,
      "operative": 30,
      "analyst": 18
    },
    "newLast24h": 3,
    "newLast7d": 8,
    "newLast30d": 15
  }
}
```

---

## Admin

### Get System Statistics

**GET** `/api/admin/stats`

Get system-wide statistics (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 50,
      "active": 45,
      "inactive": 5,
      "byRole": {
        "admin": 2,
        "operative": 30,
        "analyst": 18
      },
      "newLast24h": 3
    },
    "scans": {
      "total": 1000,
      "completed": 950,
      "pending": 20,
      "processing": 10,
      "failed": 20,
      "byVerdict": {
        "DEEPFAKE": 200,
        "SUSPICIOUS": 150,
        "AUTHENTIC": 600
      },
      "byMediaType": {
        "VIDEO": 700,
        "IMAGE": 250,
        "AUDIO": 50
      },
      "newLast24h": 50,
      "avgProcessingTime": 2450
    },
    "system": {
      "health": "operational",
      "uptime": 86400,
      "mlServiceStatus": "healthy",
      "databaseStatus": "connected",
      "cacheStatus": "connected"
    }
  }
}
```

---

### Get Audit Logs

**GET** `/api/admin/audit`

Get system audit logs (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `action` (string): Filter by action type
- `userId` (string): Filter by user
- `startDate` (ISO date): Filter after date
- `endDate` (ISO date): Filter before date

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit_123",
      "userId": "507f1f77bcf86cd799439011",
      "operativeId": "GHOST_001",
      "action": "SCAN_UPLOAD",
      "resourceType": "scan",
      "resourceId": "SCAN_ABC123",
      "details": {
        "fileName": "video.mp4",
        "fileSize": 10485760
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "timestamp": "2026-01-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5000,
    "page": 1,
    "limit": 50,
    "pages": 100
  }
}
```

---

### Get ML Service Health

**GET** `/api/admin/ml/health`

Get ML service health status (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "deepfake-detection-ml-service",
    "version": "1.0.0",
    "modelStatus": "loaded",
    "modelVersion": "v1",
    "usingFallback": false,
    "lastHealthCheck": "2026-01-30T12:00:00.000Z",
    "metrics": {
      "totalInferences": 1500,
      "avgInferenceTime": 1234,
      "successRate": 99.5
    }
  }
}
```

---

### Get ML Configuration

**GET** `/api/admin/ml/config`

Get ML service configuration (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "serviceUrl": "http://ml-service:5000",
    "enabled": true,
    "timeout": 30000,
    "retries": 3,
    "modelVersion": "v1",
    "healthCheckInterval": 60000
  }
}
```

---

## Notifications

### Get Notifications

**GET** `/api/notifications`

Get user notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `unreadOnly` (boolean, default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "DEEPFAKE_DETECTED",
      "title": "Deepfake Detected",
      "message": "High-confidence deepfake detected in scan SCAN_ABC123",
      "data": {
        "scanId": "SCAN_ABC123",
        "confidence": 92
      },
      "read": false,
      "priority": "high",
      "createdAt": "2026-01-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

---

### Get Unread Count

**GET** `/api/notifications/unread/count`

Get count of unread notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### Mark as Read

**PATCH** `/api/notifications/:id/read`

Mark a notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Mark All as Read

**PATCH** `/api/notifications/read-all`

Mark all notifications as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### Delete Notification

**DELETE** `/api/notifications/:id`

Delete a notification.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## Reports

### Export Scan as PDF

**GET** `/api/reports/scans/:id/pdf`

Export a scan report as PDF.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="scan_report_SCAN_ABC123.pdf"`

---

### Export Scan as JSON

**GET** `/api/reports/scans/:id/json`

Export scan data as JSON.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exportDate": "2026-01-30T12:00:00.000Z",
    "scan": { ... },
    "metadata": { ... },
    "results": { ... }
  }
}
```

---

### Bulk CSV Export

**GET** `/api/reports/scans/csv`

Export multiple scans as CSV.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (ISO date): Filter scans after date
- `endDate` (ISO date): Filter scans before date
- `verdict` (string): Filter by verdict
- `mediaType` (string): Filter by media type

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="scans_export_2026-01-30.csv"`

---

## WebSocket Events

### Connection

Connect with JWT authentication:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### `scan:progress`

Emitted during scan processing with progress updates.

```javascript
socket.on('scan:progress', (data) => {
  console.log(data);
  // {
  //   scanId: 'SCAN_ABC123',
  //   progress: 50,
  //   stage: 'detection',
  //   message: 'Running ML inference...'
  // }
});
```

**Progress Stages:**
- `perception` (10%): Extracting frames and metadata
- `detection` (25-75%): Running ML inference
- `compression` (80%): Analyzing compression artifacts
- `cognitive` (90%): Generating explanations
- `complete` (100%): Processing finished

#### `scan:complete`

Emitted when scan processing is completed.

```javascript
socket.on('scan:complete', (data) => {
  console.log(data);
  // {
  //   scanId: 'SCAN_ABC123',
  //   result: 'DEEPFAKE',
  //   riskScore: 85,
  //   confidence: 92
  // }
});
```

#### `scan:error`

Emitted when scan processing fails.

```javascript
socket.on('scan:error', (data) => {
  console.log(data);
  // {
  //   scanId: 'SCAN_ABC123',
  //   error: 'ML service unavailable',
  //   code: 'ML_SERVICE_ERROR'
  // }
});
```

#### `notification`

Emitted when a new notification is created.

```javascript
socket.on('notification', (data) => {
  console.log(data);
  // {
  //   id: 'notif_123',
  //   type: 'DEEPFAKE_DETECTED',
  //   title: 'Deepfake Detected',
  //   message: '...',
  //   priority: 'high'
  // }
});
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2026-01-30T12:00:00.000Z",
    "details": { ... }
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 400 | `INVALID_FILE_TYPE` | Unsupported file type |
| 400 | `FILE_TOO_LARGE` | File exceeds size limit |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | JWT token has expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 403 | `ACCOUNT_DISABLED` | User account is deactivated |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 413 | `PAYLOAD_TOO_LARGE` | Request body too large |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `ML_SERVICE_ERROR` | ML service unavailable |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse.

### Limits

- **Default**: 100 requests per 15 minutes per IP
- **File Upload**: 10 uploads per minute per user
- **Authentication**: 5 login attempts per 15 minutes per IP

### Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706617200
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "retryAfter": 900
  }
}
```

---

## Health Check

### Backend Health

**GET** `/health`

```json
{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "cache": "connected",
    "mlService": "healthy"
  }
}
```

### ML Service Health

**GET** `http://localhost:5000/health`

```json
{
  "status": "healthy",
  "service": "deepfake-detection-ml-service",
  "version": "1.0.0",
  "model_status": "loaded",
  "using_fallback": false,
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```
