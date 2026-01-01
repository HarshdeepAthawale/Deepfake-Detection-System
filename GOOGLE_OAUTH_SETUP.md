# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Deepfake Detection System.

## Prerequisites

- A Google Cloud Platform (GCP) account
- Access to Google Cloud Console

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** user type (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: "Deepfake Detection System"
     - User support email: Your email
     - Developer contact information: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (for development)
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Deepfake Detection Web Client"
   - **Authorized JavaScript origins** (CRITICAL - must match exactly):
     - Click **+ ADD URI** for each origin
     - **⚠️ IMPORTANT:** Check what port your Next.js app is actually running on!
       - Look at your terminal when you run `npm run dev` - it will show something like "Ready on http://localhost:3002"
       - Or check your browser's address bar when accessing the app
       - Common ports: `3000`, `3001`, `3002`, etc.
     - For development: `http://localhost:XXXX` (replace XXXX with your actual port number)
     - For production: `https://yourdomain.com`
     - **Important:** 
       - No trailing slashes (`/`)
       - No paths (just the base URL)
       - Use `http://` for development, `https://` for production
       - Match the **exact** URL shown in your browser's address bar (including the port number!)
   - **Authorized redirect URIs**:
     - Click **+ ADD URI** for each redirect URI
     - For development: `http://localhost:3000` (same as JavaScript origin)
     - For production: `https://yourdomain.com` (same as JavaScript origin)
     - Note: For Google Identity Services (One Tap), redirect URIs are typically the same as JavaScript origins
7. Click **CREATE**
8. Copy the **Client ID** (you'll need this for environment variables)

## Step 2: Configure Environment Variables

### Backend (.env file in `backend/` directory)

Add the following variables:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here (optional, for server-side verification)
```

### Frontend (.env.local file in root directory)

Add the following variable:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

**Note:** The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser.

## Step 3: Restart Your Servers

After adding the environment variables:

1. Restart your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Restart your frontend server:
   ```bash
   npm run dev
   ```

## Step 4: Test Google Sign-In

1. Navigate to the login page
2. You should see a "Sign in with Google" button below the email/password form
3. Click the button and sign in with your Google account
4. You should be redirected to the dashboard upon successful authentication

## How It Works

1. **Frontend**: When a user clicks "Sign in with Google", Google's Identity Services library handles the OAuth flow
2. **Google**: Returns an ID token after successful authentication
3. **Frontend**: Sends the ID token to your backend API (`/api/auth/google`)
4. **Backend**: Verifies the token with Google's tokeninfo endpoint
5. **Backend**: Creates a new user or authenticates existing user, then returns a JWT token
6. **Frontend**: Stores the JWT token and redirects to the dashboard

## Troubleshooting

### Error 400: origin_mismatch

**This is the most common error when setting up Google OAuth.**

This error occurs when the JavaScript origin (the URL where your frontend is running) is not registered in Google Cloud Console.

**How to fix:**

1. **Check what URL your app is running on:**
   - **Method 1:** Look at your terminal when you run `npm run dev` - it shows the port (e.g., "Ready on http://localhost:3002")
   - **Method 2:** Look at your browser's address bar when accessing the app
   - Common development URLs:
     - `http://localhost:3000` (default Next.js port)
     - `http://localhost:3001` (if port 3000 is in use)
     - `http://localhost:3002` (if ports 3000-3001 are in use)
     - `http://127.0.0.1:XXXX` (alternative, but use `localhost` for consistency)
   - Note the **exact** URL including the port number - this is critical!

2. **Add the JavaScript origin in Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** > **Credentials**
   - Find your OAuth 2.0 Client ID and click the **Edit** icon (pencil)
   - Under **Authorized JavaScript origins**, click **+ ADD URI**
   - Enter your exact URL (e.g., `http://localhost:3000`)
   - **Important:** 
     - Do NOT include a trailing slash (`/`)
     - Do NOT include a path (e.g., `/login`)
     - Use `http://localhost:3000` NOT `http://127.0.0.1:3000` (or vice versa - be consistent)
     - Protocol must match (`http://` for development, `https://` for production)
   - Click **SAVE**

3. **Wait a few minutes** for changes to propagate (can take 1-5 minutes)

4. **Clear your browser cache** or try in an incognito window

5. **Restart your development server** to ensure environment variables are loaded

**Common mistakes:**
- ❌ Adding `http://localhost:3000/` (trailing slash)
- ❌ Adding `http://localhost:3000/login` (includes path)
- ❌ Using `127.0.0.1` when app runs on `localhost` (or vice versa)
- ❌ Forgetting to click **SAVE** after adding the origin
- ❌ Not waiting for changes to propagate

**If you're still getting the error:**
- Double-check the exact URL in your browser's address bar
- Verify the origin was saved correctly in Google Cloud Console
- Try using a different browser or incognito mode
- Check browser console for any additional error messages

### Google Sign-In button doesn't appear

- Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env.local`
- Ensure the Google Identity Services script is loaded (check browser console)
- Verify the client ID is correct
- Restart your development server after adding environment variables

### "Invalid token" error

- Ensure `GOOGLE_CLIENT_ID` matches `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Check that the authorized JavaScript origins include your domain
- Verify the token hasn't expired (tokens expire after 1 hour)

### CORS errors

- Make sure your backend CORS configuration includes your frontend URL
- Check that authorized JavaScript origins in Google Console match your frontend URL

### User already exists error

- If a user signs up with email/password and then tries Google OAuth with the same email, the accounts will be automatically linked
- The Google account will be linked to the existing email account

## Security Notes

- Never expose `GOOGLE_CLIENT_SECRET` in the frontend
- The ID token verification happens on the backend for security
- Tokens are stored securely in localStorage (consider using httpOnly cookies for production)
- Always use HTTPS in production

## Production Deployment

When deploying to production:

1. Update authorized JavaScript origins in Google Console to include your production domain
2. Update authorized redirect URIs to include your production domain
3. Ensure environment variables are set in your hosting platform
4. Use HTTPS for all OAuth flows
5. Consider implementing token refresh for better security

