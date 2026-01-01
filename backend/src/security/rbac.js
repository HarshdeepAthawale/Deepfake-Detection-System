/**
 * Role-Based Access Control (RBAC) Module
 * Defines roles and permissions for the system
 */

export const ROLES = {
  ADMIN: 'admin',
  OPERATIVE: 'operative',
  ANALYST: 'analyst',
};

export const PERMISSIONS = {
  // Scan permissions
  SCAN_UPLOAD: 'scan:upload',
  SCAN_VIEW: 'scan:view',
  SCAN_VIEW_ALL: 'scan:view:all',
  SCAN_DELETE: 'scan:delete',
  SCAN_EXPORT: 'scan:export',
  
  // User permissions
  USER_CREATE: 'user:create',
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_EXPORT_ALL: 'system:export:all',
};

/**
 * Role permissions mapping
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.SCAN_UPLOAD,
    PERMISSIONS.SCAN_VIEW,
    PERMISSIONS.SCAN_VIEW_ALL,
    PERMISSIONS.SCAN_DELETE,
    PERMISSIONS.SCAN_EXPORT,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.SYSTEM_EXPORT_ALL,
  ],
  [ROLES.OPERATIVE]: [
    PERMISSIONS.SCAN_UPLOAD,
    PERMISSIONS.SCAN_VIEW,
    PERMISSIONS.SCAN_EXPORT,
  ],
  [ROLES.ANALYST]: [
    PERMISSIONS.SCAN_VIEW,
    PERMISSIONS.SCAN_VIEW_ALL,
    PERMISSIONS.SCAN_EXPORT,
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
export const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Check if user has any of the required permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has at least one permission
 */
export const hasAnyPermission = (role, permissions) => {
  return permissions.some((permission) => hasPermission(role, permission));
};

/**
 * Check if user has all required permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has all permissions
 */
export const hasAllPermissions = (role, permissions) => {
  return permissions.every((permission) => hasPermission(role, permission));
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permissions
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Middleware factory for permission checking
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @returns {Function} Express middleware
 */
export const requirePermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized: No role assigned' });
    }

    if (!hasAllPermissions(userRole, permissions)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        required: permissions,
        current: getRolePermissions(userRole),
      });
    }

    next();
  };
};

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  requirePermission,
};

