"""
Model Loader Module
Loads and manages the EfficientNet-B0 deepfake detection model
"""

import os
import torch
import torch.nn as nn
from torchvision import models
import logging

logger = logging.getLogger(__name__)

# Global model instance (singleton pattern)
_model = None
_device = None


def get_device():
    """Get the appropriate device (CPU or GPU)"""
    global _device
    if _device is None:
        _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f'[MODEL_LOADER] Using device: {_device}')
    return _device


def load_model(model_path=None):
    """
    Load the EfficientNet-B0 model from the specified path
    
    Args:
        model_path: Path to the model directory. If None, uses default path.
    
    Returns:
        Loaded model in eval mode
    """
    global _model
    
    if _model is not None:
        logger.info('[MODEL_LOADER] Model already loaded, returning cached instance')
        return _model
    
    try:
        # Determine model path
        if model_path is None:
            # Default path: look for model in current directory (ml-service/efficientnet_b0_ffpp_c23)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, 'efficientnet_b0_ffpp_c23')
        
        # Validate model path exists
        if not os.path.exists(model_path):
            raise FileNotFoundError(f'Model directory not found: {model_path}')
        
        logger.info(f'[MODEL_LOADER] Loading model from: {model_path}')
        
        # Get device
        device = get_device()
        
        # Rebuild EfficientNet-B0 architecture
        logger.info('[MODEL_LOADER] Building EfficientNet-B0 architecture...')
        model = models.efficientnet_b0(weights=None)
        
        # Modify classifier for 2-class output (Real=0, Fake=1)
        num_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_features, 2)
        
        # Load state dict from the model file
        # Try multiple possible file locations and formats
        model_file = None
        state_dict = None
        
        # Priority 1: Look for .pth file (as mentioned in README)
        pth_file = os.path.join(model_path, 'efficientnet_b0_ffpp_c23.pth')
        if os.path.exists(pth_file):
            model_file = pth_file
            logger.info(f'[MODEL_LOADER] Found .pth file: {model_file}')
        else:
            # Priority 2: Look for any .pth or .pt file in the directory
            for ext in ['.pth', '.pt']:
                for filename in os.listdir(model_path):
                    if filename.endswith(ext):
                        model_file = os.path.join(model_path, filename)
                        logger.info(f'[MODEL_LOADER] Found model file: {model_file}')
                        break
                if model_file:
                    break
        
        # Priority 3: Try data.pkl (pickled format)
        if not model_file:
            pkl_file = os.path.join(model_path, 'data.pkl')
            if os.path.exists(pkl_file):
                model_file = pkl_file
                logger.info(f'[MODEL_LOADER] Found pickled file: {model_file}')
        
        # Priority 4: Try loading the directory itself (PyTorch save format)
        if not model_file:
            try:
                logger.info(f'[MODEL_LOADER] Attempting to load directory as model...')
                state_dict = torch.load(model_path, map_location=device, weights_only=False)
                if isinstance(state_dict, dict) and 'state_dict' in state_dict:
                    state_dict = state_dict['state_dict']
                elif hasattr(state_dict, 'state_dict'):
                    state_dict = state_dict.state_dict()
                logger.info('[MODEL_LOADER] Successfully loaded from directory')
            except Exception as e:
                logger.warning(f'[MODEL_LOADER] Could not load from directory: {e}')
        
        # Load from file if we found one
        if model_file and state_dict is None:
            logger.info(f'[MODEL_LOADER] Loading from file: {model_file}')
            loaded_data = torch.load(model_file, map_location=device, weights_only=False)
            
            # Handle different formats
            if isinstance(loaded_data, dict):
                # Check if it's a state dict or contains state_dict
                if 'state_dict' in loaded_data:
                    state_dict = loaded_data['state_dict']
                elif all(isinstance(k, str) and '.' in k for k in loaded_data.keys()):
                    # Looks like a state dict (keys have module paths)
                    state_dict = loaded_data
                else:
                    # Might be a checkpoint dict with other metadata
                    state_dict = loaded_data
            elif hasattr(loaded_data, 'state_dict'):
                # It's a model object
                state_dict = loaded_data.state_dict()
            elif hasattr(loaded_data, 'load_state_dict'):
                # It's a model object (alternative check)
                state_dict = loaded_data.state_dict()
            else:
                # Try to use it directly as state dict
                state_dict = loaded_data
        
        if state_dict is None:
            raise FileNotFoundError(f'Could not find model file in {model_path}. Expected .pth, .pt, or data.pkl file.')
        
        # Final cleanup of state dict format
        if isinstance(state_dict, dict):
            # If it's a state dict directly, check for nested state_dict
            if 'state_dict' in state_dict and len(state_dict) == 1:
                state_dict = state_dict['state_dict']
            # Remove any non-state-dict keys (like 'epoch', 'optimizer', etc.)
            if isinstance(state_dict, dict):
                # Keep only keys that look like model parameters
                filtered_dict = {}
                for k, v in state_dict.items():
                    if isinstance(v, torch.Tensor) or (isinstance(v, dict) and any(isinstance(vv, torch.Tensor) for vv in v.values())):
                        filtered_dict[k] = v
                if filtered_dict:
                    state_dict = filtered_dict
        elif not isinstance(state_dict, dict):
            # If it's not a dict, try to extract state dict
            if hasattr(state_dict, 'state_dict'):
                state_dict = state_dict.state_dict()
            else:
                raise ValueError(f'Unexpected model file format: {type(state_dict)}')
        
        # Load state dict into model
        try:
            model.load_state_dict(state_dict, strict=False)
            logger.info('[MODEL_LOADER] State dict loaded successfully')
        except Exception as e:
            logger.warning(f'[MODEL_LOADER] Strict loading failed, trying with strict=False: {e}')
            # Try loading with strict=False to handle minor mismatches
            try:
                model.load_state_dict(state_dict, strict=False)
            except Exception as e2:
                raise RuntimeError(f'Failed to load model state dict: {e2}')
        
        # Move model to device and set to eval mode
        model = model.to(device)
        model.eval()
        
        logger.info('[MODEL_LOADER] Model loaded successfully')
        _model = model
        
        return model
        
    except Exception as e:
        logger.error(f'[MODEL_LOADER] Failed to load model: {str(e)}', exc_info=True)
        raise


def get_model(model_path=None):
    """
    Get the loaded model instance (loads if not already loaded)
    
    Args:
        model_path: Path to model directory (optional)
    
    Returns:
        Loaded model
    """
    global _model
    
    if _model is None:
        _model = load_model(model_path)
    
    return _model


def is_model_loaded():
    """Check if model is loaded"""
    return _model is not None
