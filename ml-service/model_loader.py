"""
Model Loader Module
Loads and manages the Hugging Face Deepfake-Detect-Siglip2 model
"""

import os
import torch
import logging
from transformers import pipeline

logger = logging.getLogger(__name__)

# Model configuration
MODEL_ID = "prithivMLmods/Deepfake-Detect-Siglip2"

# Global instances (singleton pattern)
_pipeline = None
_device = None


def get_device():
    """Get the appropriate device (CPU or GPU)"""
    global _device
    if _device is None:
        if torch.cuda.is_available():
            _device = 0  # GPU device ID
        else:
            _device = -1  # CPU
        logger.info(f'[MODEL_LOADER] Using device: {"cuda" if _device >= 0 else "cpu"}')
    return _device


def load_model():
    """
    Load the Hugging Face Deepfake-Detect-Siglip2 model using pipeline

    Returns:
        Loaded pipeline for image classification
    """
    global _pipeline

    if _pipeline is not None:
        logger.info('[MODEL_LOADER] Model already loaded, returning cached instance')
        return _pipeline

    try:
        device = get_device()

        logger.info(f'[MODEL_LOADER] Loading model: {MODEL_ID}')

        # Use pipeline for simple and reliable loading
        # The pipeline handles model and processor loading automatically
        _pipeline = pipeline(
            "image-classification",
            model=MODEL_ID,
            device=device
        )

        logger.info('[MODEL_LOADER] Model loaded successfully')
        return _pipeline

    except Exception as e:
        logger.error(f'[MODEL_LOADER] Failed to load model: {str(e)}', exc_info=True)
        raise


def get_pipeline():
    """
    Get the loaded pipeline instance (loads if not already loaded)

    Returns:
        Loaded pipeline
    """
    global _pipeline

    if _pipeline is None:
        _pipeline = load_model()

    return _pipeline


def is_model_loaded():
    """Check if model is loaded"""
    return _pipeline is not None
