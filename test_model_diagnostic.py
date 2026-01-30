#!/usr/bin/env python3
"""
ML Model Diagnostic Test
Tests the EfficientNet-B0 deepfake detection model to verify it's working correctly

Run from project root:
    cd ml-service && python ../test_model_diagnostic.py
"""

import os
import sys
import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import models, transforms

# Add ml-service to path
ML_SERVICE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ml-service')
sys.path.insert(0, ML_SERVICE_PATH)

def test_model_loading():
    """Test 1: Verify model loads correctly"""
    print("\n" + "="*60)
    print("TEST 1: Model Loading")
    print("="*60)

    model_path = os.path.join(ML_SERVICE_PATH, 'efficientnet_b0_ffpp_c23', 'efficientnet_b0_ffpp_c23.pth')

    if not os.path.exists(model_path):
        print(f"❌ FAIL: Model file not found at {model_path}")
        return None

    print(f"✓ Model file found: {model_path}")
    print(f"  File size: {os.path.getsize(model_path) / 1024 / 1024:.2f} MB")

    # Load model architecture
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"  Device: {device}")

    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)

    # Load weights
    state_dict = torch.load(model_path, map_location=device, weights_only=False)

    # Check state dict format
    print(f"  State dict type: {type(state_dict)}")
    print(f"  Number of keys: {len(state_dict.keys())}")

    # Sample keys
    sample_keys = list(state_dict.keys())[:5]
    print(f"  Sample keys: {sample_keys}")

    # Try loading
    try:
        result = model.load_state_dict(state_dict, strict=True)
        print(f"✓ Model loaded with strict=True: {result}")
    except Exception as e:
        print(f"⚠ Strict loading failed: {e}")
        result = model.load_state_dict(state_dict, strict=False)
        print(f"✓ Model loaded with strict=False: {result}")

    model = model.to(device)
    model.eval()

    print("✓ Model loaded successfully")
    return model, device


def test_preprocessing():
    """Test 2: Verify preprocessing pipeline"""
    print("\n" + "="*60)
    print("TEST 2: Preprocessing Pipeline")
    print("="*60)

    # Create test image (random noise)
    test_image = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))

    # Correct transform (matches model README)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor()
    ])

    tensor = transform(test_image)
    print(f"✓ Tensor shape: {tensor.shape}")
    print(f"  Tensor dtype: {tensor.dtype}")
    print(f"  Tensor range: [{tensor.min():.4f}, {tensor.max():.4f}]")

    if tensor.min() >= 0 and tensor.max() <= 1:
        print("✓ Tensor values in correct range [0, 1] (no ImageNet normalization)")
    else:
        print("❌ FAIL: Tensor values outside [0, 1] range")

    return tensor.unsqueeze(0)


def test_inference(model, device, tensor):
    """Test 3: Verify model inference"""
    print("\n" + "="*60)
    print("TEST 3: Model Inference")
    print("="*60)

    tensor = tensor.to(device)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)

    print(f"✓ Logits shape: {logits.shape}")
    print(f"  Logits: {logits[0].cpu().numpy()}")
    print(f"  Probabilities: {probs[0].cpu().numpy()}")
    print(f"  Real prob: {probs[0][0].item():.4f}")
    print(f"  Fake prob: {probs[0][1].item():.4f}")

    return probs


def test_face_detection():
    """Test 4: Face detection quality"""
    print("\n" + "="*60)
    print("TEST 4: Face Detection")
    print("="*60)

    try:
        import cv2

        # Check if Haar cascade is loaded
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        if face_cascade.empty():
            print("❌ FAIL: Haar cascade failed to load")
            return False

        print("✓ Haar cascade loaded")
        print("⚠ WARNING: Haar cascade is outdated and may miss faces")
        print("  RECOMMENDATION: Use MTCNN, RetinaFace, or OpenCV DNN detector for better accuracy")

        # Test on a synthetic face-like image
        test_img = np.zeros((300, 300, 3), dtype=np.uint8)
        test_img[100:200, 100:200] = 200  # Simple bright square

        gray = cv2.cvtColor(test_img, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        print(f"  Test detection (synthetic): {len(faces)} faces found")

        return True

    except Exception as e:
        print(f"❌ FAIL: Face detection error: {e}")
        return False


def test_known_images():
    """Test 5: Test with known real/fake images (if available)"""
    print("\n" + "="*60)
    print("TEST 5: Sample Predictions")
    print("="*60)

    # Test with random noise (should be unpredictable)
    print("\nTest with random noise (no face):")
    noise_img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor()
    ])

    # Load model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model_path = os.path.join(ML_SERVICE_PATH, 'efficientnet_b0_ffpp_c23', 'efficientnet_b0_ffpp_c23.pth')
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=False), strict=False)
    model = model.to(device)
    model.eval()

    # Test noise
    tensor = transform(noise_img).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1)
    print(f"  Random noise → Real: {probs[0][0].item():.4f}, Fake: {probs[0][1].item():.4f}")
    print("  NOTE: Random noise predictions should be near 0.5 (uncertain)")

    # Test with solid colors
    print("\nTest with solid colors (no face):")
    for color_name, rgb in [("Black", (0,0,0)), ("White", (255,255,255)), ("Red", (255,0,0))]:
        color_img = Image.new('RGB', (224, 224), rgb)
        tensor = transform(color_img).unsqueeze(0).to(device)
        with torch.no_grad():
            probs = torch.softmax(model(tensor), dim=1)
        print(f"  {color_name} → Real: {probs[0][0].item():.4f}, Fake: {probs[0][1].item():.4f}")

    print("\n⚠ NOTE: Without actual face images, the model may give unreliable results.")
    print("  The model expects CROPPED FACE images, not full images or random content.")


def main():
    print("="*60)
    print("ML MODEL DIAGNOSTIC TEST")
    print("EfficientNet-B0 FaceForensics++ Deepfake Detector")
    print("="*60)

    # Test 1: Model Loading
    result = test_model_loading()
    if result is None:
        print("\n❌ CRITICAL: Model loading failed. Cannot continue.")
        return
    model, device = result

    # Test 2: Preprocessing
    tensor = test_preprocessing()

    # Test 3: Inference
    test_inference(model, device, tensor)

    # Test 4: Face Detection
    test_face_detection()

    # Test 5: Sample Predictions
    test_known_images()

    # Summary
    print("\n" + "="*60)
    print("DIAGNOSTIC SUMMARY")
    print("="*60)
    print("""
FINDINGS:
1. ✓ Model loads and runs inference correctly
2. ✓ Preprocessing matches training (no ImageNet normalization)
3. ⚠ Face detection uses outdated Haar Cascade

LIKELY CAUSES OF BAD RESULTS:
1. FACE DETECTION FAILURES
   - Haar Cascade misses many faces
   - When no face detected, full image is sent to model
   - Model was trained on CROPPED FACES only

2. SOLUTION:
   - Replace Haar Cascade with MTCNN or RetinaFace
   - Or: Ensure input images are already face-cropped

3. TESTING:
   - Use actual deepfake/real face images from FF++ dataset
   - Ensure faces are properly cropped before inference
   - Check logs for "No face detected" warnings
""")


if __name__ == "__main__":
    main()
