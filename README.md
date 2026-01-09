# Deepfake Detection & Authenticity Verification System

Full-stack AI-powered platform for detecting deepfake media using machine learning and agentic AI orchestration. Analyzes images and videos to identify AI-generated or manipulated content with confidence scores and explanations.

## Features

- **4-Agent AI Pipeline**: Perception, Detection, Compression, and Cognitive agents for comprehensive analysis
- **ML Integration**: ResNet50/EfficientNet models trained on FaceForensics++ dataset
- **RBAC**: JWT authentication with admin, operative, and analyst roles
- **Media Processing**: Image/video uploads with frame extraction, audio analysis, metadata extraction
- **Evidence Vault**: Secure storage with SHA-256 integrity verification
- **Real-time Dashboard**: Live scan results, GPS coordinates, analytics
- **Multi-Modal**: Supports images, videos, and audio files

## Technology Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI  
**Backend:** Node.js, Express.js, MongoDB, JWT, FFmpeg, Winston  
**ML:** Python, TensorFlow/Keras, ResNet50/EfficientNet, Flask API  
**DevOps:** Docker, Docker Compose

## Architecture

```
Frontend (Next.js:3000) → Backend (Express:3001) → MongoDB (27017) + ML API (Flask:5000)
```

## Agentic AI Pipeline

**1. Perception Agent**
- Extracts frames, audio tracks, metadata (codec, bitrate, resolution)
- Generates SHA-256 hash, extracts GPS from EXIF data

**2. Detection Agent**
- ML inference via ResNet50/EfficientNet models
- Analyzes facial biometrics, audio anomalies, GAN fingerprints, temporal consistency
- Weighted risk scores: video 40%, audio 30%, GAN 20%, temporal 10%

**3. Compression Agent**
- Analyzes compression artifacts (bitrate, codec)
- Adjusts risk scores based on compression quality indicators

**4. Cognitive Agent**
- Converts ML scores to human-readable explanations
- Final verdict: DEEPFAKE (≥75), SUSPICIOUS (40-74), AUTHENTIC (<40)

**Pipeline Flow:** Media Upload → Perception → Detection → Compression → Cognitive → Result

## API Endpoints

**Authentication:**
- `POST /api/auth/login` - Login, returns JWT token
- `GET /api/auth/me` - Get current user (requires Bearer token)

**Scans:**
- `POST /api/scans/upload` - Upload media file (multipart/form-data, requires Bearer token)
- `GET /api/scans/history` - Get paginated scan history (query: page, limit, status, mediaType, verdict)
- `GET /api/scans/:id` - Get scan details
- `DELETE /api/scans/:id` - Delete scan (admin only)

**Health:**
- `GET /health` - Server health status

## Project Structure

```
deepfake-detection-system/
├── app/              # Next.js app (admin, dashboard, scanner, vault)
├── backend/          # Node.js API
│   ├── src/
│   │   ├── agents/   # AI pipeline agents
│   │   ├── auth/     # Authentication
│   │   ├── scans/    # Scan management
│   │   ├── users/    # User management
│   │   └── security/ # Security utilities
├── components/       # React components
├── lib/             # Utility libraries
├── ml-training/      # ML training pipeline
└── docker-compose.yml
```

## Security

- **Authentication:** JWT with bcrypt (12 rounds)
- **Authorization:** RBAC (admin, operative, analyst)
- **Data:** SHA-256 file hashing, encryption support
- **API:** Rate limiting (100/15min), Helmet headers, CORS, input validation

## License

MIT License

## Documentation

- [Backend README](backend/README.md)
- [Backend Project Summary](backend/PROJECT_SUMMARY.md)
- [Docker Setup](DOCKER_SETUP.md)
- [MongoDB Setup](MONGODB_SETUP.md)
