---
name: Phase 2 User Experience Enhancement
overview: "Implement Phase 2 features to enhance user experience: analytics dashboard, collaboration features (sharing/comments), notification system, audit logging, and performance optimizations (Redis caching)."
todos:
  - id: analytics-backend
    content: Create analytics service and controller (data aggregation, trends, distributions, user activity metrics)
    status: pending
  - id: analytics-frontend
    content: Create analytics dashboard with charts (time-series, pie charts, bar charts) and metrics display
    status: pending
    dependencies:
      - analytics-backend
  - id: collaboration-backend
    content: Add collaboration features to backend (scan sharing, comments, case management, assignment)
    status: pending
  - id: collaboration-frontend
    content: Create collaboration UI components (share dialog, comments, case manager)
    status: pending
    dependencies:
      - collaboration-backend
  - id: notifications-backend
    content: Implement notification system (email service, notification model, preferences, WebSocket integration)
    status: pending
  - id: notifications-frontend
    content: Create notification center and settings UI (notification dropdown, preferences, badge)
    status: pending
    dependencies:
      - notifications-backend
  - id: audit-backend
    content: Implement audit logging (audit model, service, middleware, endpoints)
    status: pending
  - id: audit-frontend
    content: Create audit log viewer UI (table, filters, pagination, export)
    status: pending
    dependencies:
      - audit-backend
  - id: caching-backend
    content: Implement Redis caching layer (cache utilities, scan results, analytics, stats caching)
    status: pending
---

# Phase 2 User Experience Enhancement Plan

## Overview

Implement 5 medium-priority features to enhance user experience with analytics, collaboration, notifications, audit logging, and performance optimizations.

## Phase 2 Features

### 1. Analytics Dashboard

Comprehensive analytics dashboard with time-series charts, verdict distributions, user activity metrics, and trend analysis.

### 2. Collaboration Features

Scan sharing, comments/annotations, case management, and assignment workflows for team collaboration.

### 3. Notification System

Multi-channel notification system with email, in-app notifications, and user preferences.

### 4. Audit Logging

Comprehensive audit trail for all system actions, user activity logging, and security event monitoring.

### 5. Performance Optimizations

Redis caching layer for frequently accessed data, scan result caching, and user session caching.

## Implementation Tasks

### Task 1: Analytics Dashboard

**Backend Changes:**

- Create `backend/src/admin/analytics.service.js` for analytics data aggregation
- Create `backend/src/admin/analytics.controller.js` for analytics endpoints
- Add analytics endpoints: `/api/admin/analytics/overview`, `/api/admin/analytics/trends`, `/api/admin/analytics/users`, `/api/admin/analytics/scans`
- Aggregate scan trends (daily/weekly/monthly)
- Calculate verdict distributions
- Track user activity metrics
- Analyze media type distributions
- Calculate risk score trends

**Frontend Changes:**

- Create `components/admin/analytics-dashboard.tsx` with charts and metrics
- Create `app/analytics/page.tsx` (analyst role access)
- Use recharts for time-series charts, pie charts, bar charts
- Display scan trends over time
- Show verdict distribution charts
- Display user activity analytics
- Show media type distribution
- Display risk score trends

**Files to Create/Modify:**

- `backend/src/admin/analytics.service.js` (new)
- `backend/src/admin/analytics.controller.js` (new)
- `backend/src/admin/admin.routes.js` (modify - add analytics routes)
- `components/admin/analytics-dashboard.tsx` (new)
- `app/analytics/page.tsx` (new)
- `lib/api.ts` (modify - add analytics methods)

### Task 2: Collaboration Features

**Backend Changes:**

- Update `backend/src/scans/scan.model.js` to add:
- `sharedWith` array (user IDs who have access)
- `comments` array (comment objects with user, text, timestamp)
- `caseId` field (for case management)
- `assignedTo` field (user ID for assignment)
- Create `backend/src/cases/case.model.js` for case management
- Create `backend/src/cases/case.service.js` for case operations
- Create `backend/src/cases/case.controller.js` for case endpoints
- Update `backend/src/scans/scan.service.js` with:
- `shareScan` function
- `addComment` function
- `assignScan` function
- Case management functions
- Add endpoints: `/api/scans/:id/share`, `/api/scans/:id/comments`, `/api/scans/:id/assign`, `/api/cases/*`

**Frontend Changes:**

- Update `components/evidence-vault.tsx` with share/comment UI
- Create `components/cases/case-manager.tsx` for case management
- Create `components/scans/scan-share-dialog.tsx` for sharing
- Create `components/scans/scan-comments.tsx` for comments
- Add share button to scan rows
- Add comment section to scan details
- Add assignment UI for analysts

**Files to Create/Modify:**

- `backend/src/scans/scan.model.js` (modify - add sharing/comments/cases)
- `backend/src/cases/case.model.js` (new)
- `backend/src/cases/case.service.js` (new)
- `backend/src/cases/case.controller.js` (new)
- `backend/src/cases/case.routes.js` (new)
- `backend/src/scans/scan.service.js` (modify - add collaboration functions)
- `backend/src/scans/scan.controller.js` (modify - add collaboration endpoints)
- `backend/src/scans/scan.routes.js` (modify - add collaboration routes)
- `components/evidence-vault.tsx` (modify - add share/comment UI)
- `components/cases/case-manager.tsx` (new)
- `components/scans/scan-share-dialog.tsx` (new)
- `components/scans/scan-comments.tsx` (new)
- `lib/api.ts` (modify - add collaboration methods)

### Task 3: Notification System

**Backend Changes:**

- Create `backend/src/notifications/notification.model.js` for notification storage
- Create `backend/src/notifications/notification.service.js` for notification logic
- Create `backend/src/notifications/email.service.js` for email notifications (using nodemailer)
- Create `backend/src/notifications/notification.controller.js` for notification endpoints
- Add notification preferences to user model
- Integrate notifications into scan service (emit notifications on scan completion/failure)
- Add endpoints: `/api/notifications`, `/api/notifications/preferences`, `/api/notifications/:id/read`
- Support email notifications for critical findings (DEEPFAKE detected)
- In-app notifications via WebSocket (already integrated)

**Frontend Changes:**

- Create `components/notifications/notification-center.tsx` for notification display
- Create `components/notifications/notification-settings.tsx` for user preferences
- Update `components/tactical-shell.tsx` to show notification badge and center
- Add notification bell icon with badge count
- Display notifications in dropdown/modal
- Mark notifications as read
- Configure notification preferences (email, in-app, critical only)

**Files to Create/Modify:**

- `backend/src/notifications/notification.model.js` (new)
- `backend/src/notifications/notification.service.js` (new)
- `backend/src/notifications/email.service.js` (new)
- `backend/src/notifications/notification.controller.js` (new)
- `backend/src/notifications/notification.routes.js` (new)
- `backend/src/users/user.model.js` (modify - add notification preferences)
- `backend/src/scans/scan.service.js` (modify - emit notifications)
- `backend/src/app.js` (modify - register notification routes)
- `components/notifications/notification-center.tsx` (new)
- `components/notifications/notification-settings.tsx` (new)
- `components/tactical-shell.tsx` (modify - add notification UI)
- `lib/api.ts` (modify - add notification methods)
- `backend/package.json` (modify - add nodemailer)

### Task 4: Audit Logging

**Backend Changes:**

- Create `backend/src/audit/audit.model.js` for audit log storage
- Create `backend/src/audit/audit.service.js` for audit logging logic
- Create `backend/src/audit/audit.controller.js` for audit log endpoints
- Create `backend/src/audit/audit.middleware.js` for automatic audit logging
- Log all critical actions: login/logout, scan upload/delete, user create/update/delete, admin actions
- Add audit log endpoint: `/api/admin/audit` (admin only)
- Support filtering by user, action type, date range
- Export audit logs

**Frontend Changes:**

- Create `components/admin/audit-log.tsx` for audit log viewer
- Create `app/admin/audit/page.tsx` for audit log page
- Display audit logs in table format
- Add filters (user, action, date range)
- Support pagination
- Export audit logs (CSV)

**Files to Create/Modify:**

- `backend/src/audit/audit.model.js` (new)
- `backend/src/audit/audit.service.js` (new)
- `backend/src/audit/audit.controller.js` (new)
- `backend/src/audit/audit.middleware.js` (new)
- `backend/src/audit/audit.routes.js` (new)
- `backend/src/app.js` (modify - add audit middleware)
- `components/admin/audit-log.tsx` (new)
- `app/admin/audit/page.tsx` (new)
- `lib/api.ts` (modify - add audit methods)
- Update existing controllers to use audit middleware

### Task 5: Performance Optimizations (Redis Caching)

**Backend Changes:**

- Create `backend/src/utils/cache.js` for Redis caching utilities
- Create `backend/src/config/redis.config.js` for Redis configuration (already exists in env.js)
- Implement caching for:
- Scan results (deterministic based on hash)
- User sessions
- Frequently accessed scan history queries
- Analytics data (cache for 5-15 minutes)
- Admin stats (cache for 1-5 minutes)
- Add cache invalidation strategies
- Graceful fallback if Redis unavailable (skip caching)

**Frontend Changes:**

- No frontend changes required (caching is transparent)
- May add cache-busting headers if needed

**Files to Create/Modify:**

- `backend/src/utils/cache.js` (new)
- `backend/src/config/redis.config.js` (new - optional, can use env.js)
- `backend/src/scans/scan.service.js` (modify - add caching)
- `backend/src/admin/admin.controller.js` (modify - add caching)
- `backend/src/admin/analytics.service.js` (modify - add caching)
- `backend/package.json` (modify - add redis client, already have bull which uses redis)
- Note: Redis client (ioredis) may already be available via Bull, or add explicitly

## Implementation Order

1. **Performance Optimizations (Caching)** - Foundation for other features
2. **Analytics Dashboard** - High user value, uses caching
3. **Audit Logging** - Security/compliance requirement
4. **Notification System** - Enhances user experience
5. **Collaboration Features** - Advanced feature, builds on others

## Dependencies

- **Redis**: Required for caching (optional - graceful degradation if unavailable)
- **nodemailer**: For email notifications
- **recharts**: Already in frontend dependencies
- **ioredis** or **redis**: Redis client (may already be available via Bull)

## Success Criteria

- Analytics dashboard displays accurate metrics and charts
- Users can share scans and add comments
- Notifications are sent for critical events (email + in-app)
- All system actions are logged in audit trail
- Caching improves response times for frequent queries
- All features work gracefully if Redis unavailable

## Technical Notes

- Redis caching is optional - system should work without it
- Email notifications require SMTP configuration
- Audit logging should not impact performance significantly
- Collaboration features require proper RBAC permissions
- Analytics queries should be optimized for large datasets