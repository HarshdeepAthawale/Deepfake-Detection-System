"""
Preprocessing Module
Handles image preprocessing for EfficientNet-B0 model
"""

import os
from PIL import Image
import torch
from torchvision import transforms
import logging

# Import face detection module
try:
    from face_detection import detect_and_crop_face
    FACE_DETECTION_AVAILABLE = True
except ImportError:
    FACE_DETECTION_AVAILABLE = False
    logging.warning('[PREPROCESSING] Face detection module not available')

logger = logging.getLogger(__name__)

# NOTE: ImageNet normalization is NOT used for this model
# The model was trained with only Resize + ToTensor (values in [0, 1] range)
# Adding normalization here would cause incorrect predictions
# IMAGENET_MEAN = [0.485, 0.456, 0.406]
# IMAGENET_STD = [0.229, 0.224, 0.225]

# Preprocessing transform pipeline (matches model README specification)
_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
    # NO normalization - model expects raw tensor values in [0, 1] range
])


def preprocess_image(image_input, detect_faces=True):
    """
    Preprocess a single image for model inference
    
    Args:
        image_input: Can be:
            - PIL Image object
            - File path (str)
            - numpy array
        detect_faces: If True, detect and crop face before preprocessing (default: True)
    
    Returns:
        Preprocessed tensor ready for model input (shape: [1, 3, 224, 224])
    """
    try:
        # Handle different input types
        if isinstance(image_input, str):
            # File path
            if not os.path.exists(image_input):
                raise FileNotFoundError(f'Image file not found: {image_input}')
            image = Image.open(image_input).convert('RGB')
        elif isinstance(image_input, Image.Image):
            # PIL Image
            image = image_input.convert('RGB')
        else:
            # Try to convert numpy array or other formats
            if hasattr(image_input, 'shape'):
                # numpy array
                image = Image.fromarray(image_input).convert('RGB')
            else:
                raise ValueError(f'Unsupported image input type: {type(image_input)}')
        
        # Apply face detection if enabled and available
        if detect_faces and FACE_DETECTION_AVAILABLE:
            image = detect_and_crop_face(image)
            logger.debug('[PREPROCESSING] Face detection applied')
        elif detect_faces and not FACE_DETECTION_AVAILABLE:
            logger.warning('[PREPROCESSING] Face detection requested but not available')
        
        # Apply preprocessing transform
        tensor = _transform(image)
        
        # Add batch dimension
        tensor = tensor.unsqueeze(0)
        
        return tensor
        
    except Exception as e:
        logger.error(f'[PREPROCESSING] Error preprocessing image: {str(e)}')
        raise


def preprocess_batch(image_paths, detect_faces=True):
    """
    Preprocess a batch of images for model inference
    
    Args:
        image_paths: List of image file paths
        detect_faces: If True, detect and crop faces before preprocessing (default: True)
    
    Returns:
        Preprocessed tensor batch (shape: [batch_size, 3, 224, 224])
    """
    try:
        if not image_paths:
            raise ValueError('Empty image paths list')
        
        tensors = []
        valid_paths = []
        
        for path in image_paths:
            try:
                tensor = preprocess_image(path, detect_faces=detect_faces)
                tensors.append(tensor.squeeze(0))  # Remove batch dim, will add back later
                valid_paths.append(path)
            except Exception as e:
                logger.warning(f'[PREPROCESSING] Skipping invalid image {path}: {str(e)}')
                continue
        
        if not tensors:
            raise ValueError('No valid images found in batch')
        
        # Stack tensors into batch
        batch_tensor = torch.stack(tensors)
        
        return batch_tensor, valid_paths
        
    except Exception as e:
        logger.error(f'[PREPROCESSING] Error preprocessing batch: {str(e)}')
        raise


def preprocess_frames(frame_paths, max_frames=None, detect_faces=True):
    """
    Preprocess video frames for inference
    
    Args:
        frame_paths: List of frame file paths
        max_frames: Maximum number of frames to process (None = all)
        detect_faces: If True, detect and crop faces before preprocessing (default: True)
    
    Returns:
        Preprocessed tensor batch and list of processed frame paths
    """
    try:
        if not frame_paths:
            logger.warning('[PREPROCESSING] No frame paths provided')
            return None, []
        
        # Limit number of frames if specified
        if max_frames and len(frame_paths) > max_frames:
            # Sample frames evenly
            step = len(frame_paths) // max_frames
            frame_paths = frame_paths[::step][:max_frames]
            logger.info(f'[PREPROCESSING] Sampling {len(frame_paths)} frames from {len(frame_paths)} total')
        
        # Preprocess batch
        batch_tensor, valid_paths = preprocess_batch(frame_paths, detect_faces=detect_faces)
        
        return batch_tensor, valid_paths
        
    except Exception as e:
        logger.error(f'[PREPROCESSING] Error preprocessing frames: {str(e)}')
        raise
