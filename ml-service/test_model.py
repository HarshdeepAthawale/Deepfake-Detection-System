#!/usr/bin/env python3
"""
Test script to evaluate the ML model on real and fake videos
"""

import os
import sys
import cv2
import torch
import numpy as np
from pathlib import Path
from model_loader import load_model, get_device
from preprocessing import preprocess_image
from PIL import Image

def extract_frames_from_video(video_path, max_frames=10):
    """Extract frames from video file"""
    frames = []
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return frames
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Sample frames evenly
    if total_frames > max_frames:
        step = total_frames // max_frames
        frame_indices = [i * step for i in range(max_frames)]
    else:
        frame_indices = list(range(total_frames))
    
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(frame_rgb))
    
    cap.release()
    return frames

def predict_video(model, device, video_path, max_frames=10, detect_faces=True):
    """Run inference on a video"""
    # Extract frames
    frames = extract_frames_from_video(video_path, max_frames)
    
    if not frames:
        return None, None
    
    # Run inference on each frame
    predictions = []
    for frame in frames:
        tensor = preprocess_image(frame, detect_faces=detect_faces)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)
            fake_prob = probs[0][1].item()
            predictions.append(fake_prob)
    
    # Calculate video-level prediction (mean of frame predictions)
    mean_fake_prob = np.mean(predictions)
    
    return mean_fake_prob, predictions

def test_model():
    """Test the model on real and fake videos"""
    print("=" * 80)
    print("ML MODEL TESTING - Real vs Fake Videos (WITH FACE DETECTION)")
    print("=" * 80)
    print()
    
    # Paths
    real_dir = Path("/home/harshdeep/Documents/Projects/Deepfake-Detection-System/test of ml pipeline/real")
    fake_dir = Path("/home/harshdeep/Documents/Projects/Deepfake-Detection-System/test of ml pipeline/fake")
    
    # Load model
    print("Loading model...")
    model = load_model()
    device = get_device()
    print(f"Model loaded on device: {device}")
    print()
    
    # Test real videos
    print("-" * 80)
    print("TESTING REAL VIDEOS (Expected: Low fake probability)")
    print("-" * 80)
    real_videos = sorted(list(real_dir.glob("*.mp4")))
    real_predictions = []
    
    for i, video_path in enumerate(real_videos, 1):
        print(f"\n[{i}/{len(real_videos)}] Processing: {video_path.name}")
        mean_prob, frame_probs = predict_video(model, device, str(video_path))
        
        if mean_prob is not None:
            real_predictions.append(mean_prob)
            print(f"  Frames analyzed: {len(frame_probs)}")
            print(f"  Mean fake probability: {mean_prob:.4f} ({mean_prob*100:.2f}%)")
            print(f"  Prediction: {'FAKE' if mean_prob > 0.5 else 'REAL'} ✓" if mean_prob <= 0.5 else f"  Prediction: {'FAKE' if mean_prob > 0.5 else 'REAL'} ✗")
        else:
            print(f"  ERROR: Could not process video")
    
    # Test fake videos
    print()
    print("-" * 80)
    print("TESTING FAKE VIDEOS (Expected: High fake probability)")
    print("-" * 80)
    fake_videos = sorted(list(fake_dir.glob("*.mp4")))
    fake_predictions = []
    
    for i, video_path in enumerate(fake_videos, 1):
        print(f"\n[{i}/{len(fake_videos)}] Processing: {video_path.name}")
        mean_prob, frame_probs = predict_video(model, device, str(video_path))
        
        if mean_prob is not None:
            fake_predictions.append(mean_prob)
            print(f"  Frames analyzed: {len(frame_probs)}")
            print(f"  Mean fake probability: {mean_prob:.4f} ({mean_prob*100:.2f}%)")
            print(f"  Prediction: {'FAKE' if mean_prob > 0.5 else 'REAL'} ✓" if mean_prob > 0.5 else f"  Prediction: {'FAKE' if mean_prob > 0.5 else 'REAL'} ✗")
        else:
            print(f"  ERROR: Could not process video")
    
    # Calculate metrics
    print()
    print("=" * 80)
    print("RESULTS SUMMARY")
    print("=" * 80)
    print()
    
    # Real videos (should predict REAL, i.e., fake_prob < 0.5)
    real_correct = sum(1 for p in real_predictions if p <= 0.5)
    real_total = len(real_predictions)
    real_accuracy = (real_correct / real_total * 100) if real_total > 0 else 0
    
    # Fake videos (should predict FAKE, i.e., fake_prob > 0.5)
    fake_correct = sum(1 for p in fake_predictions if p > 0.5)
    fake_total = len(fake_predictions)
    fake_accuracy = (fake_correct / fake_total * 100) if fake_total > 0 else 0
    
    # Overall accuracy
    total_correct = real_correct + fake_correct
    total_samples = real_total + fake_total
    overall_accuracy = (total_correct / total_samples * 100) if total_samples > 0 else 0
    
    print(f"Real Videos:")
    print(f"  Total: {real_total}")
    print(f"  Correctly classified as REAL: {real_correct}")
    print(f"  Incorrectly classified as FAKE: {real_total - real_correct}")
    print(f"  Accuracy: {real_accuracy:.2f}%")
    print(f"  Mean fake probability: {np.mean(real_predictions):.4f}")
    print()
    
    print(f"Fake Videos:")
    print(f"  Total: {fake_total}")
    print(f"  Correctly classified as FAKE: {fake_correct}")
    print(f"  Incorrectly classified as REAL: {fake_total - fake_correct}")
    print(f"  Accuracy: {fake_accuracy:.2f}%")
    print(f"  Mean fake probability: {np.mean(fake_predictions):.4f}")
    print()
    
    print(f"Overall Performance:")
    print(f"  Total videos: {total_samples}")
    print(f"  Correctly classified: {total_correct}")
    print(f"  Incorrectly classified: {total_samples - total_correct}")
    print(f"  Overall Accuracy: {overall_accuracy:.2f}%")
    print()
    
    # Expected performance from README
    print(f"Expected Performance (from model README):")
    print(f"  Frame-Level Accuracy: 85.2%")
    print(f"  Video-Level Accuracy: 88%+")
    print()
    
    if overall_accuracy >= 85:
        print("✅ Model performance meets or exceeds expected accuracy!")
    elif overall_accuracy >= 75:
        print("⚠️  Model performance is good but slightly below expected accuracy")
    else:
        print("❌ Model performance is below expected accuracy")
    
    print()
    print("=" * 80)

if __name__ == "__main__":
    test_model()
