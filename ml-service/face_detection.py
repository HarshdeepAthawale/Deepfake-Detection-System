"""
Face Detection Module
Detects and crops faces from images/frames using OpenCV DNN Face Detector

This module uses OpenCV's DNN-based face detector (SSD with ResNet-10 backbone)
which is much more accurate than Haar Cascade and doesn't require external models.

The EfficientNet-B0 model trained on FaceForensics++ expects CROPPED FACE images.
Accurate face detection is CRITICAL for correct deepfake detection results.
"""

import cv2
import numpy as np
from PIL import Image
import logging
import os
import urllib.request

logger = logging.getLogger(__name__)

# Global face detector
_face_detector = None
_detector_initialized = False
_detection_method = "none"

# OpenCV DNN model URLs (SSD with ResNet-10 backbone)
DNN_MODEL_URL = "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
DNN_CONFIG_URL = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"


def _download_file(url, filepath):
    """Download a file from URL if it doesn't exist"""
    if os.path.exists(filepath):
        return True
    try:
        logger.info(f'[FACE_DETECTION] Downloading: {url}')
        urllib.request.urlretrieve(url, filepath)
        logger.info(f'[FACE_DETECTION] Downloaded to: {filepath}')
        return True
    except Exception as e:
        logger.error(f'[FACE_DETECTION] Failed to download {url}: {e}')
        return False


def get_face_detector():
    """Get or initialize the face detector (singleton pattern)"""
    global _face_detector, _detector_initialized, _detection_method

    if _detector_initialized:
        return _face_detector

    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(script_dir, 'face_detection_models')
        os.makedirs(models_dir, exist_ok=True)

        model_path = os.path.join(models_dir, 'res10_300x300_ssd_iter_140000.caffemodel')
        config_path = os.path.join(models_dir, 'deploy.prototxt')

        # Download models if needed
        model_downloaded = _download_file(DNN_MODEL_URL, model_path)
        config_downloaded = _download_file(DNN_CONFIG_URL, config_path)

        if model_downloaded and config_downloaded:
            # Use OpenCV DNN face detector (much better than Haar Cascade)
            _face_detector = cv2.dnn.readNetFromCaffe(config_path, model_path)
            _detection_method = "OpenCV DNN (SSD ResNet-10)"
            logger.info(f'[FACE_DETECTION] {_detection_method} initialized')
        else:
            # Fallback to Haar Cascade
            logger.warning('[FACE_DETECTION] DNN model not available, using Haar Cascade fallback')
            modelFile = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            _face_detector = cv2.CascadeClassifier(modelFile)

            if _face_detector.empty():
                logger.error('[FACE_DETECTION] Could not load Haar Cascade')
                _face_detector = None
                _detection_method = "none"
            else:
                _detection_method = "OpenCV Haar Cascade (fallback)"
                logger.info(f'[FACE_DETECTION] {_detection_method} initialized')

        _detector_initialized = True
        return _face_detector

    except Exception as e:
        logger.error(f'[FACE_DETECTION] Error initializing face detector: {str(e)}')
        _detector_initialized = True
        _face_detector = None
        _detection_method = "none"
        return None


def _detect_face_dnn(image_rgb, net, confidence_threshold=0.3):
    """Detect faces using OpenCV DNN detector

    Note: Lower confidence threshold (0.3) to catch more faces at the cost of potential false positives.
    This is important because the deepfake model REQUIRES face crops to work correctly.
    """
    h, w = image_rgb.shape[:2]

    # Create blob from image
    # Using standard mean subtraction values for face detection
    blob = cv2.dnn.blobFromImage(
        cv2.resize(image_rgb, (300, 300)),
        1.0,
        (300, 300),
        (104.0, 177.0, 123.0)
    )

    net.setInput(blob)
    detections = net.forward()

    faces = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        if confidence > confidence_threshold:
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            x1, y1, x2, y2 = box.astype("int")

            # Ensure valid coordinates
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            if x2 > x1 and y2 > y1:
                faces.append((x1, y1, x2 - x1, y2 - y1, confidence))

    if not faces:
        return None

    # Return largest face by area
    largest_face = max(faces, key=lambda f: f[2] * f[3])
    return largest_face[:4]  # Return (x, y, w, h) without confidence


def _detect_face_haar(gray, detector):
    """Detect faces using Haar Cascade (fallback)"""
    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    if len(faces) == 0:
        return None

    # Get the largest face (by area)
    largest_face = max(faces, key=lambda f: f[2] * f[3])
    return tuple(largest_face)


def detect_and_crop_face(image, padding_percent=30, return_bbox=False):
    """
    Detect face in image and return cropped face

    Args:
        image: PIL Image or numpy array
        padding_percent: Percentage of padding to add around face (default: 30%)
        return_bbox: If True, also return bounding box coordinates

    Returns:
        PIL Image of cropped face (or original image if no face detected)
        If return_bbox=True, returns (cropped_image, bbox) where bbox is (x, y, w, h) or None

    Note:
        The model expects CROPPED FACE images. If no face is detected, the original
        image is returned, which may lead to incorrect predictions. Check logs for
        "No face detected" warnings.
    """
    try:
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            image_np = np.array(image)
        else:
            image_np = image.copy()

        # Ensure RGB format
        if len(image_np.shape) == 2:
            # Grayscale
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        elif image_np.shape[2] == 4:
            # RGBA to RGB
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
        else:
            # Already RGB
            image_rgb = image_np

        # Get face detector
        detector = get_face_detector()

        if detector is None:
            logger.warning('[FACE_DETECTION] Detector not available, using full image (may cause incorrect predictions)')
            if return_bbox:
                return Image.fromarray(image_rgb), None
            return Image.fromarray(image_rgb)

        # Detect face using appropriate method
        if _detection_method.startswith("OpenCV DNN"):
            face_bbox = _detect_face_dnn(image_rgb, detector)
        else:
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
            face_bbox = _detect_face_haar(gray, detector)

        if face_bbox is None:
            logger.warning(f'[FACE_DETECTION] No face detected in image of size {image_rgb.shape}, using full image (may cause incorrect predictions)')
            if return_bbox:
                return Image.fromarray(image_rgb), None
            return Image.fromarray(image_rgb)
        else:
            logger.info(f'[FACE_DETECTION] Face found at {face_bbox} in image of size {image_rgb.shape}')

        x, y, w, h = face_bbox

        # Make the crop square and add padding
        center_x = x + w / 2
        center_y = y + h / 2
        max_dim = max(w, h)

        # Calculate image dimensions
        img_h, img_w = image_rgb.shape[:2]

        # Add padding (default 30%)
        # For efficientnet_b0_ffpp_c23, a looser crop is often better
        size = int(max_dim * (1 + padding_percent / 100))

        # Calculate square coordinates centered on face
        half_size = size // 2
        x1 = int(max(0, center_x - half_size))
        y1 = int(max(0, center_y - half_size))
        x2 = int(min(img_w, center_x + half_size))
        y2 = int(min(img_h, center_y + half_size))

        # Adjust if we hit boundaries to keep square aspect ratio
        crop_w = x2 - x1
        crop_h = y2 - y1

        # Try to shift the box into the image if clipped
        if crop_w < size:
            if x1 == 0:
                x2 = min(img_w, size)
            elif x2 == img_w:
                x1 = max(0, img_w - size)

        if crop_h < size:
            if y1 == 0:
                y2 = min(img_h, size)
            elif y2 == img_h:
                y1 = max(0, img_h - size)

        # Final update
        x2 = min(img_w, x1 + size)
        y2 = min(img_h, y1 + size)
        x1 = max(0, x2 - size)
        y1 = max(0, y2 - size)

        # Crop face
        face_crop = image_rgb[y1:y2, x1:x2]

        # Convert back to PIL Image
        face_image = Image.fromarray(face_crop)

        logger.debug(f'[FACE_DETECTION] Face detected and cropped: bbox=({x1},{y1},{x2-x1},{y2-y1}), original_face=({x},{y},{w},{h})')

        if return_bbox:
            return face_image, (x1, y1, x2-x1, y2-y1)
        return face_image

    except Exception as e:
        logger.error(f'[FACE_DETECTION] Error detecting face: {str(e)}')
        # Return original image on error
        if len(image_np.shape) == 3:
            image_rgb = image_np
        else:
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        if return_bbox:
            return Image.fromarray(image_rgb), None
        return Image.fromarray(image_rgb)


def detect_faces_in_frame(frame, min_confidence=0.5):
    """
    Detect all faces in a frame

    Args:
        frame: numpy array (RGB format)
        min_confidence: minimum detection confidence

    Returns:
        List of bounding boxes [(x, y, w, h), ...]
    """
    try:
        detector = get_face_detector()

        if detector is None:
            return []

        # Ensure RGB format
        if len(frame.shape) == 2:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
        elif frame.shape[2] == 4:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_RGBA2RGB)
        else:
            frame_rgb = frame

        if _detection_method.startswith("OpenCV DNN"):
            h, w = frame_rgb.shape[:2]
            blob = cv2.dnn.blobFromImage(
                cv2.resize(frame_rgb, (300, 300)),
                1.0,
                (300, 300),
                (104.0, 177.0, 123.0)
            )
            detector.setInput(blob)
            detections = detector.forward()

            faces = []
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > min_confidence:
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    x1, y1, x2, y2 = box.astype("int")
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    if x2 > x1 and y2 > y1:
                        faces.append((x1, y1, x2 - x1, y2 - y1))
            return faces
        else:
            # Fallback to Haar Cascade
            gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
            faces = detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]

    except Exception as e:
        logger.error(f'[FACE_DETECTION] Error detecting faces: {str(e)}')
        return []


def get_largest_face(image):
    """
    Detect and return the largest face in the image

    Args:
        image: PIL Image or numpy array

    Returns:
        PIL Image of largest face crop (or original if no face)
    """
    return detect_and_crop_face(image, padding_percent=30, return_bbox=False)


def get_detection_method():
    """Return the current face detection method being used"""
    global _detection_method
    if not _detector_initialized:
        get_face_detector()  # Initialize if needed
    return _detection_method
