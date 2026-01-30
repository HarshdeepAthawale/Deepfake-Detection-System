# SENTINEL - Deepfake Detection & Authenticity Verification System

A full-stack AI-powered platform for detecting deepfake media using machine learning and agentic AI orchestration. Analyzes images, videos, and audio to identify AI-generated or manipulated content with confidence scores, detailed explanations, and forensic evidence.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Agentic AI Pipeline](#agentic-ai-pipeline)
- [ML Model](#ml-model)
- [Security](#security)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Core Detection Capabilities
- **4-Agent AI Pipeline**: Perception, Detection, Compression, and Cognitive agents for comprehensive analysis
- **Real ML Integration**: EfficientNet-B0 model trained on FaceForensics++ dataset (93.3% AUC)
- **Multi-Modal Analysis**: Supports images (JPEG, PNG), videos (MP4, AVI, MOV, WebM), and audio (MP3, WAV)
- **Batch Processing**: Upload and analyze up to 50 files simultaneously
- **Real-time Progress**: WebSocket-based live scan updates and progress tracking

### Analysis Metrics
- **Risk Score**: Overall manipulation probability (0-100%)
- **Confidence Score**: Model certainty in prediction
- **GAN Fingerprint Detection**: Identifies GAN-generated artifacts
- **Temporal Consistency**: Frame-to-frame coherence analysis for videos
- **Compression Artifact Analysis**: Detects suspicious encoding patterns
- **GPS/EXIF Extraction**: Extracts location metadata from images

### Platform Features
- **RBAC Authentication**: JWT-based auth with Admin, Operative, and Analyst roles
- **Evidence Vault**: Secure storage with SHA-256 integrity verification
- **Export Options**: PDF reports, JSON data export, CSV bulk export
- **Audit Logging**: Complete action trail for compliance
- **Real-time Dashboard**: Live analytics, scan statistics, and system monitoring
- **Admin Panel**: User management, ML health monitoring, system configuration

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Socket.IO Client |
| **Backend** | Node.js, Express.js, MongoDB, JWT, FFmpeg, Winston, Bull (Queue) |
| **ML Service** | Python 3.10+, PyTorch, Flask, EfficientNet-B0, Pillow, OpenCV |
| **Infrastructure** | Docker, Docker Compose, Redis (Cache/Queue), Nginx |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Next.js Frontend (Port 3002)                    │   │
│  │         React 19 + TypeScript + Tailwind CSS                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    HTTP REST + WebSocket
                                │
┌─────────────────────────────────────────────────────────────────────┐
│                          API Layer                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            Express.js Backend (Port 3001)                    │   │
│  │              REST API + Socket.IO Server                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   4-Agent AI Pipeline                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐    │  │
│  │  │Perception│→ │Detection │→ │Compression│→ │Cognitive │    │  │
│  │  │  Agent   │  │  Agent   │  │   Agent   │  │  Agent   │    │  │
│  │  └──────────┘  └──────────┘  └───────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          HTTP REST
                                │
┌─────────────────────────────────────────────────────────────────────┐
│                         ML Layer                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            Flask ML Service (Port 5000)                      │   │
│  │    EfficientNet-B0 | PyTorch | FaceForensics++ Trained       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │   MongoDB     │  │    Redis      │  │    File Storage       │   │
│  │  (Port 27017) │  │  (Port 6379)  │  │     (./uploads)       │   │
│  │  Scans, Users │  │ Cache, Queue  │  │  Media, Frames, Audio │   │
│  └───────────────┘  └───────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Communication Flow

```
User Upload → Frontend → Backend API → Perception Agent (extract frames/metadata)
                                     → Detection Agent (ML inference)
                                     → Compression Agent (quality analysis)
                                     → Cognitive Agent (generate verdict)
                                     → Save Results → WebSocket Update → Frontend
```

---

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/deepfake-detection-system.git
cd deepfake-detection-system

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3002
# Backend API: http://localhost:3001
# ML Service: http://localhost:5001
```

### Default Credentials

After seeding the database (`docker-compose exec backend npm run seed`):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sentinel.com | admin123 |
| Operative | operative@sentinel.com | operative123 |
| Analyst | analyst@sentinel.com | analyst123 |

---

## Installation

### Prerequisites

- **Node.js** 18+ (ES Modules support)
- **Python** 3.10+
- **MongoDB** 7.0+ (local or Atlas)
- **Redis** 7+ (optional, for caching/queue)
- **FFmpeg** (for media processing)
- **Docker** (optional, recommended)

### Manual Installation

#### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

#### 3. ML Service Setup

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
```

#### 4. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
```bash
choco install ffmpeg
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# ===========================================
# Server Configuration
# ===========================================
PORT=3001
NODE_ENV=development

# ===========================================
# Database
# ===========================================
MONGODB_URI=mongodb://localhost:27017/deepfake-detection
DB_NAME=deepfake-detection

# ===========================================
# JWT Authentication
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# File Upload
# ===========================================
MAX_FILE_SIZE=500000000
UPLOAD_PATH=./uploads
ALLOWED_MIME_TYPES=video/mp4,video/avi,video/mov,video/webm,audio/mpeg,audio/wav,audio/mp3,image/jpeg,image/png

# ===========================================
# Security
# ===========================================
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=your-32-character-encryption-key
ENCRYPTION_IV=your-16-character-iv

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# ===========================================
# Rate Limiting
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# ML Service
# ===========================================
ML_SERVICE_URL=http://localhost:5000
ML_SERVICE_ENABLED=true
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_RETRIES=3
ML_MODEL_VERSION=v1

# ===========================================
# Redis (Optional)
# ===========================================
REDIS_URL=redis://localhost:6379

# ===========================================
# Frontend
# ===========================================
FRONTEND_URL=http://localhost:3002

# ===========================================
# Google OAuth (Optional)
# ===========================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ===========================================
# Email Service (Optional)
# ===========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@sentinel-x.com
```

### Generate Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -base64 32 | cut -c1-32

# Generate ENCRYPTION_IV (16 characters)
openssl rand -base64 16 | cut -c1-16
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/google` | Google OAuth login |
| GET | `/api/auth/me` | Get current user |

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scans/upload` | Upload single file for analysis |
| POST | `/api/scans/batch` | Upload multiple files (max 50) |
| GET | `/api/scans/history` | Get paginated scan history |
| GET | `/api/scans/:id` | Get scan details |
| DELETE | `/api/scans/:id` | Delete scan (admin only) |
| PATCH | `/api/scans/:id/tags` | Update scan tags |
| POST | `/api/scans/:id/share` | Share scan with users |
| POST | `/api/scans/:id/comments` | Add comment to scan |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | System statistics |
| GET | `/api/admin/audit` | Audit logs |
| GET | `/api/admin/ml/health` | ML service health |
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/scans/:id/pdf` | Export scan as PDF |
| GET | `/api/reports/scans/:id/json` | Export scan as JSON |
| GET | `/api/reports/scans/csv` | Bulk CSV export |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |
| GET | `ML_SERVICE_URL/health` | ML service health check |

For complete API documentation with request/response examples, see [docs/API.md](docs/API.md).

---

## Agentic AI Pipeline

The system uses a 4-agent pipeline for comprehensive deepfake analysis:

### 1. Perception Agent
**Purpose**: Media preprocessing and feature extraction

- Extracts frames from video (4fps, max 60 frames)
- Extracts audio tracks (PCM 16-bit, 44.1kHz stereo)
- Generates SHA-256 file hash for integrity
- Extracts media metadata (codec, bitrate, resolution, duration)
- Extracts GPS coordinates from EXIF data (images)

### 2. Detection Agent
**Purpose**: ML inference and score calculation

- Calls ML service for frame/image analysis
- Aggregates predictions using statistical methods:
  - **P90**: 90th percentile (robust to outliers)
  - **Peak Risk**: Maximum probability across frames
  - **Mean Risk**: Average probability
- Calculates uncertainty estimation from variance
- Weighted score aggregation based on confidence

### 3. Compression Agent
**Purpose**: Quality analysis and score adjustment

- Analyzes media quality (bitrate, resolution, bits-per-pixel)
- Detects compression artifacts and unusual codecs
- Adjusts risk scores based on quality indicators
- Reduces confidence for poor quality media

### 4. Cognitive Agent
**Purpose**: Human-readable report generation

- Converts raw scores to intelligence report
- Calculates dynamic thresholds based on context
- Generates detailed explanations (6 categories):
  - Facial manipulation indicators
  - Localized deepfake segments
  - Synthetic voice patterns
  - GAN-generated artifacts
  - Temporal inconsistencies
  - Compression artifacts

### Final Verdict

| Verdict | Risk Score | Description |
|---------|-----------|-------------|
| **DEEPFAKE** | ≥ 75% | High probability of manipulation |
| **SUSPICIOUS** | 40-74% | Moderate manipulation indicators |
| **AUTHENTIC** | < 40% | Likely genuine media |

---

## ML Model

### Model Specifications

| Property | Value |
|----------|-------|
| Architecture | EfficientNet-B0 |
| Training Dataset | FaceForensics++ C23 |
| Input Size | 224×224 RGB |
| Output | 2-class (Real/Fake) |
| Frame-Level AUC | 0.933 |
| Frame-Level Accuracy | 0.852 |
| Frame-Level F1-Score | 0.843 |

### Inference Pipeline

1. **Preprocessing**: Resize to 224×224, convert to RGB tensor
2. **Inference**: Forward pass through EfficientNet-B0
3. **Postprocessing**: Softmax probabilities, score aggregation
4. **Video Processing**: Up to 30 frames sampled from extracted frames

### Model Location

The trained model is located at:
```
ml-service/efficientnet_b0_ffpp_c23/efficientnet_b0_ffpp_c23.pth
```

---

## Security

### Authentication & Authorization

- **JWT Authentication**: Tokens with 24h expiry, refresh tokens with 7d expiry
- **Password Hashing**: bcrypt with 12 rounds
- **Google OAuth 2.0**: Optional social login
- **Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, ML monitoring |
| **Operative** | Upload scans, view own scans |
| **Analyst** | View all scans, generate reports, export data |

### Data Protection

- **File Hashing**: SHA-256 integrity verification
- **Encryption**: AES-256 for sensitive data
- **Rate Limiting**: 100 requests per 15 minutes
- **Security Headers**: Helmet.js (CSP, HSTS, XSS protection)
- **Input Validation**: Zod schemas for all inputs
- **CORS**: Configurable origin restrictions
- **Audit Trail**: Complete action logging

---

## Deployment

### Docker Compose (Development/Production)

```bash
# Start all services
docker-compose up -d

# View service status
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Checklist

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Enable MongoDB authentication
- [ ] Set up regular database backups
- [ ] Configure rate limiting
- [ ] Enable security headers (Helmet)
- [ ] Review CORS settings
- [ ] Set up monitoring and alerts
- [ ] Configure log rotation
- [ ] Disable debug mode (`NODE_ENV=production`)

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Project Structure

```
deepfake-detection-system/
├── app/                          # Next.js pages (App Router)
│   ├── dashboard/                # User dashboard
│   ├── scanner/                  # Media scanner interface
│   ├── vault/                    # Evidence vault
│   ├── analytics/                # Analytics dashboard
│   └── admin/                    # Admin panel
│       └── ml/                   # ML service monitoring
├── backend/                      # Express.js backend
│   └── src/
│       ├── agents/               # 4-Agent AI pipeline
│       │   ├── perception.agent.js
│       │   ├── detection.agent.js
│       │   ├── compression.agent.js
│       │   └── cognitive.agent.js
│       ├── auth/                 # Authentication module
│       ├── scans/                # Scan management
│       ├── users/                # User management
│       ├── admin/                # Admin routes
│       ├── audit/                # Audit logging
│       ├── reports/              # Report generation
│       ├── notifications/        # Notification system
│       ├── ml/                   # ML service client
│       ├── security/             # Security utilities
│       ├── utils/                # FFmpeg, logging, etc.
│       └── config/               # Environment config
├── ml-service/                   # Python ML service
│   ├── app.py                    # Flask application
│   ├── model_loader.py           # Model loading
│   ├── preprocessing.py          # Image preprocessing
│   ├── face_detection.py         # Face detection
│   └── efficientnet_b0_ffpp_c23/ # Trained model
├── components/                   # Reusable React components
├── lib/                          # Frontend utilities
│   └── api.ts                    # API client
├── contexts/                     # React context providers
├── docs/                         # Documentation
│   ├── API.md                    # API reference
│   ├── ARCHITECTURE.md           # System architecture
│   └── DEPLOYMENT.md             # Deployment guide
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Frontend Dockerfile
└── package.json                  # Frontend dependencies
```

---

## WebSocket Events

Real-time scan updates via Socket.IO:

```javascript
// Connect with authentication
const socket = io('http://localhost:3001', {
  auth: { token: 'your_jwt_token' }
});

// Listen for progress updates
socket.on('scan:progress', (data) => {
  // { scanId, progress, stage }
});

// Listen for completion
socket.on('scan:complete', (data) => {
  // { scanId, result, riskScore, confidence }
});

// Listen for errors
socket.on('scan:error', (data) => {
  // { scanId, error }
});
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint/Prettier configurations
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | Complete API documentation |
| [Architecture](docs/ARCHITECTURE.md) | System architecture diagrams |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |
| [Docker Setup](DOCKER_SETUP.md) | Docker configuration guide |
| [Backend README](backend/README.md) | Backend-specific documentation |
| [ML Service README](ml-service/README.md) | ML service documentation |

---

## Troubleshooting

### Common Issues

**MongoDB connection failed:**
```bash
# Check MongoDB is running
docker-compose ps mongodb
docker-compose logs mongodb
```

**ML service unavailable:**
```bash
# Check ML service health
curl http://localhost:5001/health
docker-compose logs ml-service
```

**FFmpeg not found:**
- Ensure FFmpeg is installed: `ffmpeg -version`
- Set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env` if not in PATH

**File upload fails:**
- Check file size limit (`MAX_FILE_SIZE`)
- Verify MIME type is allowed
- Ensure uploads directory exists and is writable

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/deepfake-detection-system/issues)
- **Documentation**: [docs/](docs/)

---

**Built for tactical field deployment. No shortcuts taken.**
