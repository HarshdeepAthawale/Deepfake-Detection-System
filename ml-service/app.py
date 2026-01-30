"""
ML Service - Flask API for Deepfake Detection
Python service for ML model inference using Hugging Face Deepfake-Detect-Siglip2

This service:
1. Loads the Hugging Face Deepfake-Detect-Siglip2 model
2. Preprocesses media files (frames, images)
3. Runs inference on the model
4. Returns detection scores

Installation:
    pip install -r requirements.txt

Run:
    python app.py
"""

import os
import time
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

# Import our modules
from model_loader import get_pipeline, is_model_loaded, load_model
from preprocessing import preprocess_image, preprocess_frames

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance (loaded on startup)
_model_loaded = False


def load_model_on_startup():
    """Load model when service starts"""
    global _model_loaded

    try:
        logger.info('[ML_SERVICE] Loading model on startup...')
        load_model()
        _model_loaded = True
        logger.info('[ML_SERVICE] Model loaded successfully')
    except Exception as e:
        logger.error(f'[ML_SERVICE] Failed to load model: {str(e)}', exc_info=True)
        _model_loaded = False


def run_model_inference(pipeline, images):
    """
    Run inference on preprocessed images using Hugging Face pipeline

    Args:
        pipeline: Loaded Hugging Face pipeline
        images: List of PIL Images

    Returns:
        List of predictions with label and score
    """
    try:
        # Run inference
        results = pipeline(images)

        # Handle single image case (pipeline returns dict instead of list)
        if isinstance(results, dict):
            results = [results]
        elif isinstance(results, list) and len(results) > 0 and isinstance(results[0], list):
            # Pipeline returns list of lists for batch
            pass
        else:
            # Wrap single result
            results = [results]

        return results

    except Exception as e:
        logger.error(f'[ML_SERVICE] Model inference error: {str(e)}', exc_info=True)
        raise


def extract_fake_probability(result):
    """
    Extract the fake probability from a pipeline result

    Args:
        result: Single prediction result from pipeline

    Returns:
        Float probability that the image is fake (0-1)
    """
    try:
        # Result is a list of {label, score} dicts sorted by score
        if isinstance(result, list):
            # Find the 'Fake' or 'fake' label
            for item in result:
                label = item.get('label', '').lower()
                if 'fake' in label or 'deepfake' in label or 'synthetic' in label:
                    return item.get('score', 0.0)
                elif 'real' in label or 'authentic' in label:
                    # Return inverse of real score as fake probability
                    return 1.0 - item.get('score', 1.0)

            # If no clear label, use the first result if it looks like fake
            if len(result) > 0:
                # Assume binary classification: first is most likely class
                top_result = result[0]
                label = top_result.get('label', '').lower()
                score = top_result.get('score', 0.5)

                # If top label suggests fake, return that score
                if 'fake' in label or 'deepfake' in label or 'synthetic' in label:
                    return score
                elif 'real' in label or 'authentic' in label:
                    return 1.0 - score

                # Default: return score if we can't determine
                return score

        return 0.5  # Default to uncertain

    except Exception as e:
        logger.error(f'[ML_SERVICE] Error extracting fake probability: {str(e)}')
        return 0.5


def calculate_scores(results, media_type, frame_count=1):
    """
    Calculate detection scores from model predictions

    Args:
        results: List of prediction results from pipeline
        media_type: Type of media (VIDEO, IMAGE, AUDIO)
        frame_count: Number of frames processed

    Returns:
        Dictionary of calculated scores
    """
    try:
        # Extract fake probabilities from results
        fake_probs = []
        for result in results:
            prob = extract_fake_probability(result)
            fake_probs.append(prob)

        fake_probs = np.array(fake_probs)

        # DEBUG: Log actual predictions
        logger.info(f'[ML_SERVICE] Number of predictions: {len(fake_probs)}')
        logger.info(f'[ML_SERVICE] Fake probabilities: {fake_probs[:min(5, len(fake_probs))]}...')

        # Calculate video score using 90th percentile (P90)
        if len(fake_probs) > 0:
            video_score = float(np.percentile(fake_probs, 90) * 100)
            peak_risk = float(np.max(fake_probs) * 100)
            mean_risk = float(np.mean(fake_probs) * 100)
        else:
            video_score = 0.0
            peak_risk = 0.0
            mean_risk = 0.0

        # GAN fingerprint is same as video score
        gan_fingerprint = video_score

        # Calculate temporal consistency for videos
        if media_type == 'VIDEO' and len(fake_probs) > 1:
            variance = float(np.var(fake_probs))
            temporal_consistency = max(0, min(100, 100 - (variance * 1000)))
        else:
            temporal_consistency = 100.0

        # Audio score: 0 for image-based model
        audio_score = 0.0 if media_type != 'AUDIO' else video_score

        # Calculate confidence
        confidence = float(np.mean([max(p, 1-p) for p in fake_probs]) * 100)

        # Calculate risk score
        risk_score = video_score
        if peak_risk > risk_score + 10:
            risk_score = (risk_score * 0.7) + (peak_risk * 0.3)
        risk_score = min(100, max(0, risk_score))

        logger.info(f'[ML_SERVICE] Calculated scores: P90={video_score:.2f}, Peak={peak_risk:.2f}, Mean={mean_risk:.2f}, Risk={risk_score:.2f}')

        return {
            'video_score': round(video_score, 2),
            'peak_risk': round(peak_risk, 2),
            'mean_risk': round(mean_risk, 2),
            'audio_score': round(audio_score, 2),
            'gan_fingerprint': round(gan_fingerprint, 2),
            'temporal_consistency': round(temporal_consistency, 2),
            'risk_score': round(risk_score, 2),
            'confidence': round(confidence, 2)
        }

    except Exception as e:
        logger.error(f'[ML_SERVICE] Score calculation error: {str(e)}', exc_info=True)
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_status = 'loaded' if _model_loaded else 'not_loaded'
    return jsonify({
        'status': 'healthy' if _model_loaded else 'unhealthy',
        'service': 'deepfake-detection-ml-service',
        'version': '2.0.0',
        'model': 'prithivMLmods/Deepfake-Detect-Siglip2',
        'model_status': model_status,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if _model_loaded else 503


@app.route('/api/v1/inference', methods=['POST'])
def inference():
    """
    Deepfake detection inference endpoint
    """
    start_time = time.time()

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Request body must be JSON'
            }), 400

        if not _model_loaded:
            return jsonify({
                'error': 'Service Unavailable',
                'message': 'Model is not loaded'
            }), 503

        hash_value = data.get('hash', '')
        media_type = data.get('mediaType', 'UNKNOWN')
        model_version = data.get('modelVersion', 'v2')
        extracted_frames = data.get('extractedFrames', [])
        extracted_audio = data.get('extractedAudio', None)

        logger.info(f'[ML_SERVICE] Inference request: hash={hash_value[:16] if hash_value else "none"}..., type={media_type}, model={model_version}')

        # Get pipeline
        pipeline = get_pipeline()

        # Process based on media type
        if media_type == 'IMAGE':
            # Single image processing
            if not extracted_frames:
                raise ValueError('No frame paths provided for IMAGE')

            # Process first frame as image
            image_path = extracted_frames[0] if isinstance(extracted_frames, list) else extracted_frames
            image = preprocess_image(image_path)
            results = run_model_inference(pipeline, image)
            scores = calculate_scores(results, media_type, frame_count=1)

        elif media_type == 'VIDEO':
            # Video frame processing
            if not extracted_frames:
                raise ValueError('No frame paths provided for VIDEO')

            # Process frames (limit to max 30 frames for performance)
            max_frames = 30
            images, valid_frames = preprocess_frames(extracted_frames, max_frames=max_frames)

            if not images or len(valid_frames) == 0:
                raise ValueError('No valid frames processed')

            # Run inference on frames
            results = run_model_inference(pipeline, images)
            scores = calculate_scores(results, media_type, frame_count=len(valid_frames))

        elif media_type == 'AUDIO':
            # Audio processing not supported by current image model
            raise NotImplementedError('Audio-only inference not supported by image classification model')

        else:
            raise ValueError(f'Unknown media type: {media_type}')

        # Calculate inference time
        inference_time = int((time.time() - start_time) * 1000)

        # Build response
        response = {
            **scores,
            'model_version': model_version,
            'inference_time': inference_time
        }

        logger.info(f'[ML_SERVICE] Inference complete: risk_score={response["risk_score"]}, confidence={response["confidence"]}, time={inference_time}ms')

        return jsonify(response), 200

    except Exception as e:
        logger.error(f'[ML_SERVICE] Inference error: {str(e)}', exc_info=True)
        return jsonify({
            'error': 'Inference failed',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An error occurred during inference'
    }), 500


# Load model when module is imported
if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))

    # Load model before starting server
    load_model_on_startup()

    logger.info(f'[ML_SERVICE] Starting ML service on port {port}')
    logger.info(f'[ML_SERVICE] Model loaded: {_model_loaded}')

    app.run(host='0.0.0.0', port=port, debug=False)
else:
    # Also load when imported as module (e.g., for testing)
    load_model_on_startup()
