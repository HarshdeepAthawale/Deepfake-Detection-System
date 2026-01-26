#!/usr/bin/env python3
"""
Download real and deepfake images from the web for testing
"""

import os
import requests
from pathlib import Path
import time

# Test directories
REAL_DIR = Path("/home/harshdeep/Documents/Projects/Deepfake-Detection-System/test of ml pipeline/real-world-test/real")
DEEPFAKE_DIR = Path("/home/harshdeep/Documents/Projects/Deepfake-Detection-System/test of ml pipeline/real-world-test/deepfake")

# Real celebrity photos (high-quality, authentic photos)
REAL_IMAGES = [
    # Using publicly available celebrity photos from Wikimedia Commons and official sources
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tom_Cruise_avp_2014.jpg/800px-Tom_Cruise_avp_2014.jpg", "tom_cruise_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Dwayne_Johnson_2%2C_2013.jpg/800px-Dwayne_Johnson_2%2C_2013.jpg", "dwayne_johnson_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Elon_Musk_Colorado_2022_%28cropped2%29.jpg/800px-Elon_Musk_Colorado_2022_%28cropped2%29.jpg", "elon_musk_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg/800px-Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg", "mark_zuckerberg_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Scarlett_Johansson_by_Gage_Skidmore_2_%28cropped%2C_2%29.jpg/800px-Scarlett_Johansson_by_Gage_Skidmore_2_%28cropped%2C_2%29.jpg", "scarlett_johansson_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Chris_Hemsworth_by_Gage_Skidmore_2_%28cropped%29.jpg/800px-Chris_Hemsworth_by_Gage_Skidmore_2_%28cropped%29.jpg", "chris_hemsworth_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Emma_Watson_2013.jpg/800px-Emma_Watson_2013.jpg", "emma_watson_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Bill_Gates_2017_%28cropped%29.jpg/800px-Bill_Gates_2017_%28cropped%29.jpg", "bill_gates_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg/800px-Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg", "jeff_bezos_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Elon_Musk_Royal_Society.jpg/800px-Elon_Musk_Royal_Society.jpg", "elon_musk_2.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Keanu_Reeves_2019.jpg/800px-Keanu_Reeves_2019.jpg", "keanu_reeves_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Barack_Obama.jpg/800px-Barack_Obama.jpg", "barack_obama_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/800px-Donald_Trump_official_portrait.jpg", "donald_trump_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Vladimir_Putin_-_2012.jpg/800px-Vladimir_Putin_-_2012.jpg", "vladimir_putin_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Xi_Jinping_2019.jpg/800px-Xi_Jinping_2019.jpg", "xi_jinping_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Joe_Biden_presidential_portrait.jpg/800px-Joe_Biden_presidential_portrait.jpg", "joe_biden_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Gal_Gadot_by_Gage_Skidmore_3.jpg/800px-Gal_Gadot_by_Gage_Skidmore_3.jpg", "gal_gadot_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Tom_Hanks_2016.jpg/800px-Tom_Hanks_2016.jpg", "tom_hanks_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Brad_Pitt_2019_by_Glenn_Francis.jpg/800px-Brad_Pitt_2019_by_Glenn_Francis.jpg", "brad_pitt_1.jpg"),
    ("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Leonardo_DiCaprio_visited_Goddard_Saturday_to_discuss_Earth_science_with_Piers_Sellers_%2826105091624%29_cropped.jpg/800px-Leonardo_DiCaprio_visited_Goddard_Saturday_to_discuss_Earth_science_with_Piers_Sellers_%2826105091624%29_cropped.jpg", "leonardo_dicaprio_1.jpg"),
]

# Note: For deepfake images, we'll use sample images or generate placeholders
# since downloading actual deepfakes from the web may violate terms of service
# Instead, we'll note that the user should provide their own deepfake test images

def download_image(url, filepath):
    """Download an image from URL"""
    try:
        print(f"Downloading {filepath.name}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"  ✓ Downloaded {filepath.name}")
        return True
        
    except Exception as e:
        print(f"  ✗ Failed to download {filepath.name}: {str(e)}")
        return False

def main():
    print("=" * 80)
    print("DOWNLOADING TEST IMAGES")
    print("=" * 80)
    print()
    
    # Download real images
    print("Downloading REAL celebrity photos from Wikimedia Commons...")
    print("-" * 80)
    real_count = 0
    for url, filename in REAL_IMAGES:
        filepath = REAL_DIR / filename
        if download_image(url, filepath):
            real_count += 1
        time.sleep(0.5)  # Be nice to servers
    
    print()
    print(f"Downloaded {real_count}/{len(REAL_IMAGES)} real images")
    print()
    
    # Note about deepfake images
    print("=" * 80)
    print("DEEPFAKE IMAGES NOTE")
    print("=" * 80)
    print()
    print("For ethical and legal reasons, we cannot automatically download deepfake images.")
    print("Please manually add deepfake test images to:")
    print(f"  {DEEPFAKE_DIR}")
    print()
    print("You can find deepfake examples from:")
    print("  - FaceForensics++ dataset (manipulated videos)")
    print("  - Deepfake detection challenge datasets")
    print("  - Research papers with sample images")
    print()
    print("Alternatively, you can use the FaceForensics++ fake videos you already have.")
    print()

if __name__ == "__main__":
    main()
