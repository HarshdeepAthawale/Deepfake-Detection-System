# 🔌 Frontend-Backend API Integration Guide

This guide helps you connect your Next.js frontend to the Node.js backend.

## API Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Frontend Configuration

Update your frontend API service (`lib/api.ts`) to use real backend endpoints:

### 1. Update API Base URL

```typescript
// lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper function for authenticated requests
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token'); // Or use your auth context
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
}
```

### 2. Update Login Function

```typescript
// Replace the mock login in login-form.tsx or create auth service

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  
  // Store token
  localStorage.setItem('auth_token', data.data.token);
  localStorage.setItem('user', JSON.stringify(data.data.user));
  
  return data.data;
}
```

### 3. Update Scan Upload

```typescript
// Update media-scanner.tsx or create scan service

export async function uploadScan(file: File) {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/scans/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
}
```

### 4. Update Scan History

```typescript
// Update evidence-vault.tsx

export async function getScanHistory(page = 1, limit = 20) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `${API_BASE_URL}/scans/history?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch scan history');
  }

  return response.json();
}
```

### 5. Update Scan Details

```typescript
export async function getScanDetails(scanId: string) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}/scans/${scanId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scan details');
  }

  return response.json();
}
```

## Environment Variables

Create `.env.local` in your Next.js frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Response Format

All backend responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

## Authentication Flow

1. **Login** → Get JWT token
2. **Store token** → localStorage or auth context
3. **Include token** → In Authorization header for all protected routes
4. **Handle 401** → Redirect to login if token expired

## Example: Complete API Service

```typescript
// lib/api-service.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class APIService {
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/';
        throw new Error('Unauthorized');
      }
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('auth_token', data.data.token);
    return data.data;
  }

  async uploadScan(file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/scans/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async getScanHistory(page = 1, limit = 20) {
    return this.request(`/scans/history?page=${page}&limit=${limit}`);
  }

  async getScanDetails(scanId: string) {
    return this.request(`/scans/${scanId}`);
  }
}

export const apiService = new APIService();
```

## Testing the Integration

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Login:**
   - Use: `operative@sentinel.com` / `operative123`
   - Should redirect to dashboard

4. **Test Upload:**
   - Upload a video/audio file
   - Should show processing status
   - Check scan history after completion

5. **Test History:**
   - Navigate to vault page
   - Should display scan history

## CORS Configuration

If you encounter CORS errors, ensure your backend `.env` has:

```env
FRONTEND_URL=http://localhost:3000
```

And the backend `app.js` has CORS configured correctly (already done).

## Error Handling

Handle common errors:

```typescript
try {
  const result = await apiService.uploadScan(file);
} catch (error) {
  if (error.message === 'Unauthorized') {
    // Redirect to login
  } else if (error.message.includes('File too large')) {
    // Show file size error
  } else {
    // Show generic error
  }
}
```

## Next Steps

1. ✅ Update frontend API calls
2. ✅ Test authentication flow
3. ✅ Test file uploads
4. ✅ Test scan history
5. 🚀 Deploy both frontend and backend

---

**Ready to integrate!** 🎉

