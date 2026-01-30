# ML Service - Deepfake Detection API

Python Flask service for deepfake detection using the Hugging Face Deepfake-Detect-Siglip2 model.

## Overview

This ML service provides inference endpoints for the deepfake detection system. It uses the **prithivMLmods/Deepfake-Detect-Siglip2** model from Hugging Face, which is based on SigLIP (Sigmoid Language-Image Pre-training) architecture optimized for deepfake detection.

## Model Details

- **Model**: [prithivMLmods/Deepfake-Detect-Siglip2](https://huggingface.co/prithivMLmods/Deepfake-Detect-Siglip2)
- **Architecture**: SigLIP-based image classification
- **Output**: Fake/Real classification with confidence scores
- **Framework**: Hugging Face Transformers

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Dependencies

- **transformers** (>=4.36.0) - Hugging Face Transformers
- **PyTorch** (>=2.0.0) - Deep learning framework
- **torchvision** (>=0.15.0) - Computer vision utilities
- **Flask** (>=2.3.0) - Web framework
- **Pillow** (>=10.0.0) - Image processing
- **NumPy** (>=1.24.0) - Numerical computing
- **OpenCV** (>=4.8.0) - Media processing
- **mediapipe** (>=0.10.0) - Face detection

## Running the Service

```bash
# Set environment variables (optional)
export PORT=5000

# Run the service
python app.py
```

The service will start on `http://localhost:5000` by default.

### Model Loading

The model is automatically downloaded from Hugging Face Hub on first startup. Subsequent runs use the cached model. The model is loaded as a pipeline for efficient inference.

## Endpoints

### Health Check

```
GET /health
```

Returns service health status and model loading state:

```json
{
  "status": "healthy",
  "service": "deepfake-detection-ml-service",
  "version": "2.0.0",
  "model": "prithivMLmods/Deepfake-Detect-Siglip2",
  "model_status": "loaded",
  "timestamp": "2026-01-30T12:00:00"
}
```

### Inference

```
POST /api/v1/inference
Content-Type: application/json
```

**Request Body:**
```json
{
  "hash": "sha256:...",
  "mediaType": "VIDEO|AUDIO|IMAGE",
  "metadata": {...},
  "extractedFrames": ["/path/to/frame1.jpg", "/path/to/frame2.jpg"],
  "extractedAudio": "/path/to/audio.wav",
  "modelVersion": "v2"
}
```

**Response:**
```json
{
  "video_score": 75.5,
  "peak_risk": 82.3,
  "mean_risk": 68.1,
  "audio_score": 0.0,
  "gan_fingerprint": 75.5,
  "temporal_consistency": 85.2,
  "risk_score": 68.3,
  "confidence": 92.1,
  "model_version": "v2",
  "inference_time": 1234
}
```

#### Score Descriptions

- **video_score** (0-100): 90th percentile fake probability across frames
- **peak_risk** (0-100): Maximum fake probability detected
- **mean_risk** (0-100): Average fake probability across frames
- **audio_score** (0-100): Audio analysis score (0 for image-based model)
- **gan_fingerprint** (0-100): GAN artifact detection score
- **temporal_consistency** (0-100): Frame-to-frame consistency for videos
- **risk_score** (0-100): Overall risk assessment (weighted combination)
- **confidence** (0-100): Model confidence in the prediction

## Model Inference Process

1. **Image Processing**:
   - Single image: Preprocessed and analyzed directly
   - Video: Multiple frames extracted and processed (max 30 frames)

2. **Face Detection** (optional):
   - Uses MediaPipe for face detection
   - Crops and focuses on detected faces for better accuracy

3. **Preprocessing**:
   - Convert to RGB
   - Hugging Face processor handles resizing and normalization

4. **Inference**:
   - Model classifies images as Fake or Real
   - Returns probability scores for each class

5. **Score Calculation**:
   - Frame-level predictions aggregated for videos
   - Uses 90th percentile for robust scoring
   - Temporal consistency calculated from frame variance

## Docker

Build and run with Docker:

```bash
# Build the image
docker build -t deepfake-ml-service .

# Run the container
docker run -p 5000:5000 deepfake-ml-service
```

The Dockerfile pre-downloads the model during build for faster startup.

## Environment Variables

- `PORT`: Service port (default: 5000)
- `FLASK_ENV`: Flask environment (development/production)

## Performance Considerations

- Model is loaded once at startup (singleton pattern)
- GPU acceleration if CUDA is available
- Frame sampling for videos (max 30 frames per video)
- Efficient pipeline-based inference using Hugging Face Transformers

## Development

### Testing

Test the service with:

```bash
# Health check
curl http://localhost:5000/health

# Inference (example)
curl -X POST http://localhost:5000/api/v1/inference \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "sha256:test123",
    "mediaType": "IMAGE",
    "extractedFrames": ["/path/to/image.jpg"],
    "modelVersion": "v2"
  }'
```

## Status

✅ **Fully implemented** with Hugging Face Deepfake-Detect-Siglip2 model integration.
