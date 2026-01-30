
import torch
import os
import sys
from model_loader import get_model, get_device
from preprocessing import preprocess_image
import torch.nn.functional as F

def test():
    print("Loading model...")
    device = get_device()
    model = get_model()
    
    img_path = 'uploads/test_real.png'
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    print(f"Processing {img_path}...")
    try:
        # Preprocess
        tensor = preprocess_image(img_path)
        tensor = tensor.to(device)
        
        # Inference
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=1)
            
        probs_np = probs.cpu().numpy()[0]
        real_prob = probs_np[0]
        fake_prob = probs_np[1]
        
        print("-" * 30)
        print(f"Real Probability: {real_prob:.4f}")
        print(f"Fake Probability: {fake_prob:.4f}")
        print("-" * 30)
        
        if fake_prob > 0.5:
            print("Verdict: DEEPFAKE")
        else:
            print("Verdict: REAL")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
