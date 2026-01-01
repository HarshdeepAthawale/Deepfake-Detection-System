# 🚀 Deepfake Detection Backend

**Agentic Deepfake Detection & Authenticity Verification Backend**

A secure, offline-first Node.js backend for deepfake detection with agentic AI orchestration, RBAC, and comprehensive security features.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Agentic Pipeline](#agentic-pipeline)
- [Security](#security)
- [Development](#development)

---

## ✨ Features

- 🔐 **JWT Authentication** with role-based access control (RBAC)
- 🤖 **Agentic AI Pipeline** with 4 specialized agents:
  - Perception Agent (media preprocessing)
  - Detection Agent (deepfake inference)
  - Compression Agent (artifact analysis)
  - Cognitive Agent (human-readable explanations)
- 📁 **File Upload** with integrity verification
- 🔒 **Security Features**:
  - Encrypted storage
  - SHA-256 file hashing
  - Rate limiting
  - Helmet security headers
  - Input validation
- 📊 **MongoDB** for persistent storage
- 📝 **Comprehensive Logging** with Winston
- 🎬 **FFmpeg Integration** for media processing

---

## 🛠 Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Media Processing**: FFmpeg (fluent-ffmpeg)
- **Security**: Helmet, bcryptjs, crypto
- **Logging**: Winston
- **Validation**: express-validator

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/              # Authentication module
│   │   ├── auth.controller.js
│   │   ├── auth.middleware.js
│   │   ├── auth.routes.js
│   │   └── auth.service.js
│   ├── users/             # User management
│   │   └── user.model.js
│   ├── scans/             # Scan management
│   │   ├── scan.controller.js
│   │   ├── scan.routes.js
│   │   ├── scan.service.js
│   │   └── scan.model.js
│   ├── agents/            # Agentic AI pipeline
│   │   ├── perception.agent.js
│   │   ├── detection.agent.js
│   │   ├── compression.agent.js
│   │   └── cognitive.agent.js
│   ├── security/          # Security modules
│   │   ├── rbac.js
│   │   ├── encryption.js
│   │   └── integrity.js
│   ├── utils/             # Utilities
│   │   ├── logger.js
│   │   └── ffmpeg.js
│   ├── config/            # Configuration
│   │   ├── db.js
│   │   └── env.js
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── uploads/               # Uploaded files
├── logs/                  # Log files
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

---

## 🚀 Setup

### Prerequisites

- Node.js 18+ (with ES Modules support)
- MongoDB (local or remote)
- FFmpeg installed on system

### Installation

1. **Install dependencies:**

```bash
cd backend
npm install
```

2. **Install FFmpeg:**

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

3. **Configure environment:**

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration)).

4. **Start MongoDB:**

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
```

5. **Start the server:**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/deepfake-detection

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=500000000  # 500MB
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=your-32-character-encryption-key
ENCRYPTION_IV=your-16-character-iv
```

**⚠️ Important:** Change all secrets in production!

---

## 📡 API Endpoints

### Authentication

#### `POST /api/auth/login`
Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "operativeId": "GHOST_1",
      "role": "operative"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `GET /api/auth/me`
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

---

### Scans

#### `POST /api/scans/upload`
Upload media file for deepfake detection.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `file`: Media file (video/audio/image)

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": "SCAN_ABC123",
    "status": "PENDING",
    "fileName": "video.mp4",
    "mediaType": "VIDEO",
    "hash": "sha256:..."
  }
}
```

#### `GET /api/scans/history`
Get paginated scan history.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional)
- `mediaType` (optional)
- `verdict` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "SCAN_ABC123",
      "timestamp": "2025-01-15T10:30:00Z",
      "type": "VIDEO",
      "result": "DEEPFAKE",
      "score": 94,
      "hash": "sha256:...",
      "operative": "GHOST_1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### `GET /api/scans/:id`
Get scan details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "SCAN_ABC123",
    "timestamp": "2025-01-15T10:30:00Z",
    "verdict": "DEEPFAKE",
    "confidence": 94,
    "riskScore": 88,
    "explanations": [
      "GAN-generated artifacts identified",
      "Lip-sync inconsistency detected"
    ],
    "metadata": {
      "facialMatch": 2,
      "audioMatch": 42,
      "ganFingerprint": 94,
      "temporalConsistency": 88
    },
    "hash": "sha256:..."
  }
}
```

---

## 🤖 Agentic Pipeline

The backend uses a 4-agent pipeline for deepfake detection:

### 1. Perception Agent
- Extracts frames from video
- Extracts audio tracks
- Generates media metadata
- Creates SHA-256 hash

### 2. Detection Agent
- Analyzes facial biometrics
- Detects audio anomalies
- Identifies GAN fingerprints
- Calculates temporal consistency

### 3. Compression Agent
- Analyzes compression artifacts
- Adjusts risk scores based on codec/bitrate
- Detects recompression patterns

### 4. Cognitive Agent
- Converts raw scores to human explanations
- Determines final verdict (DEEPFAKE/SUSPICIOUS/AUTHENTIC)
- Generates confidence percentage

**Note:** Currently uses mock/deterministic logic. Replace with real ML models in production.

---

## 🔒 Security

### Authentication & Authorization

- **JWT-based authentication** with configurable expiry
- **Role-Based Access Control (RBAC)**:
  - `admin`: Full access
  - `operative`: Upload and view own scans
  - `analyst`: View all scans, export data

### Security Features

- **Password hashing** with bcrypt (12 rounds)
- **File encryption** for sensitive storage
- **SHA-256 integrity checks** for uploaded files
- **Rate limiting** (100 requests per 15 minutes)
- **Helmet** security headers
- **Input validation** and sanitization
- **CORS** protection

---

## 👥 User Roles

### Admin
- Full system access
- User management
- View all scans
- System administration

### Operative
- Upload scans
- View own scans
- Export own data

### Analyst
- View all scans
- Export all data
- Generate reports

---

## 🧪 Creating Test Users

You can create users directly in MongoDB or via a script:

```javascript
// Example user creation script
import User from './src/users/user.model.js';
import { connectDB } from './src/config/db.js';

await connectDB();

const admin = new User({
  email: 'admin@example.com',
  password: 'admin123',
  operativeId: 'ADMIN_1',
  role: 'admin',
});

await admin.save();
```

---

## 📝 Logging

Logs are written to:
- **Console** (development)
- `logs/app.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

---

## 🐛 Troubleshooting

### FFmpeg not found
- Ensure FFmpeg is installed and in PATH
- Or set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env`

### MongoDB connection failed
- Check MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Check network/firewall settings

### File upload fails
- Check file size limits
- Verify `UPLOAD_PATH` directory exists
- Check file type is allowed

---

## 🚧 Future Enhancements

- [ ] Real ML model integration (Python/TensorFlow)
- [ ] WebSocket support for real-time scan updates
- [ ] Docker containerization
- [ ] Kubernetes deployment configs
- [ ] Federated learning support
- [ ] Advanced analytics dashboard
- [ ] Export to PDF/JSON
- [ ] Batch processing
- [ ] Cloud storage integration (S3, etc.)

---

## 📄 License

MIT

---

## 👤 Author

Built for Agentic Deepfake Detection Platform

---

**🔥 Ready for tactical field deployment. No shortcuts taken.**

