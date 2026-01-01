# 🚀 Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB installed and running
- [ ] FFmpeg installed
- [ ] Git installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# At minimum, change:
# - JWT_SECRET (min 32 characters)
# - ENCRYPTION_KEY (32 characters)
# - ENCRYPTION_IV (16 characters)
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
# or
mongod
```

**MongoDB Atlas (Cloud):**
- Create account at https://www.mongodb.com/cloud/atlas
- Create cluster and get connection string
- Update `MONGODB_URI` in `.env`

### 4. Install FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH after installation
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### 5. Seed Initial Users

```bash
node scripts/seed-users.js
```

This creates:
- **Admin**: `admin@sentinel.com` / `admin123`
- **Operative**: `operative@sentinel.com` / `operative123`
- **Analyst**: `analyst@sentinel.com` / `analyst123`

### 6. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 7. Verify Installation

```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "...",
#   "service": "deepfake-detection-backend",
#   "version": "1.0.0"
# }
```

## Testing the API

### 1. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operative@sentinel.com",
    "password": "operative123"
  }'
```

Save the `token` from the response.

### 2. Upload a File

```bash
curl -X POST http://localhost:3001/api/scans/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your/video.mp4"
```

### 3. Get Scan History

```bash
curl http://localhost:3001/api/scans/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env or kill process using port 3001
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

### MongoDB Connection Failed
- Check MongoDB is running: `mongosh` or `mongo`
- Verify connection string in `.env`
- Check firewall/network settings

### FFmpeg Not Found
- Verify installation: `ffmpeg -version`
- Add to PATH if needed
- Or set `FFMPEG_PATH` in `.env`

### Module Not Found Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## Next Steps

1. ✅ Backend is running
2. 🔄 Connect frontend to backend API
3. 🐳 Optional: Dockerize the application
4. 🤖 Replace mock AI with real ML models
5. 🚀 Deploy to production

---

**Need help?** Check the main [README.md](./README.md) for detailed documentation.

