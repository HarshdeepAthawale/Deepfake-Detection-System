"""
Face Detection Module
Detects and crops faces from images/frames using OpenCV DNN Face Detector
"""

import cv2
import numpy as np
from PIL import Image
import logging
import os

logger = logging.getLogger(__name__)

# Global face detector
_face_detector = None
_detector_initialized = False


def get_face_detector():
    """Get or initialize the face detector (singleton pattern)"""
    global _face_detector, _detector_initialized
    
    if _detector_initialized:
        return _face_detector
    
    try:
        # Use OpenCV's DNN face detector (built-in)
        # This uses a pre-trained Caffe model that comes with OpenCV
        modelFile = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _face_detector = cv2.CascadeClassifier(modelFile)
        
        if _face_detector.empty():
            logger.warning('[FACE_DETECTION] Could not load face detector, face detection disabled')
            _face_detector = None
        else:
            logger.info('[FACE_DETECTION] OpenCV Haar Cascade face detector initialized')
        
        _detector_initialized = True
        return _face_detector
        
    except Exception as e:
        logger.error(f'[FACE_DETECTION] Error initializing face detector: {str(e)}')
        _detector_initialized = True
        _face_detector = None
        return None


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
            gray = image_np
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        elif image_np.shape[2] == 4:
            # RGBA to RGB
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        else:
            # RGB
            image_rgb = image_np
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        
        # Get face detector
        detector = get_face_detector()
        
        if detector is None:
            logger.debug('[FACE_DETECTION] Detector not available, using full image')
            if return_bbox:
                return Image.fromarray(image_rgb), None
            return Image.fromarray(image_rgb)
        
        # Detect faces
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        if len(faces) == 0:
            logger.debug('[FACE_DETECTION] No face detected, using full image')
            if return_bbox:
                return Image.fromarray(image_rgb), None
            return Image.fromarray(image_rgb)
        
        # Get the largest face (by area)
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = largest_face
        
        # Add padding
        padding_w = int(w * padding_percent / 100)
        padding_h = int(h * padding_percent / 100)
        
        # Calculate padded coordinates
        img_h, img_w = image_rgb.shape[:2]
        x1 = max(0, x - padding_w)
        y1 = max(0, y - padding_h)
        x2 = min(img_w, x + w + padding_w)
        y2 = min(img_h, y + h + padding_h)
        
        # Crop face
        face_crop = image_rgb[y1:y2, x1:x2]
        
        # Convert back to PIL Image
        face_image = Image.fromarray(face_crop)
        
        logger.debug(f'[FACE_DETECTION] Face detected and cropped: bbox=({x1},{y1},{x2-x1},{y2-y1})')
        
        if return_bbox:
            return face_image, (x1, y1, x2-x1, y2-y1)
        return face_image
        
    except Exception as e:
        logger.error(f'[FACE_DETECTION] Error detecting face: {str(e)}')
        # Return original image on error
        image_rgb = image_np if len(image_np.shape) == 3 else cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        if return_bbox:
            return Image.fromarray(image_rgb), None
        return Image.fromarray(image_rgb)


def detect_faces_in_frame(frame, min_confidence=0.5):
    """
    Detect all faces in a frame
    
    Args:
        frame: numpy array (RGB format)
        min_confidence: minimum detection confidence (not used for Haar cascades)
    
    Returns:
        List of bounding boxes [(x, y, w, h), ...]
    """
    try:
        detector = get_face_detector()
        
        if detector is None:
            return []
        
        # Convert to grayscale
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        else:
            gray = frame
        
        # Detect faces
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
