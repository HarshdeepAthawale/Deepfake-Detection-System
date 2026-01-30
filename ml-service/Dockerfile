FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage cache
COPY requirements.txt .

# Upgrade pip and install with increased timeout/retries for large packages
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --timeout 300 --retries 5 -r requirements.txt

# Pre-download the model during build for faster startup
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='prithivMLmods/Deepfake-Detect-Siglip2')"

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
