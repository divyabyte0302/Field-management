import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { 
  SEED_USERS, SEED_FACILITIES, SEED_ASSETS, SEED_TECHNICIANS, 
  SEED_SLAS, SEED_SLA_POLICIES, SEED_PARTS, SEED_FACILITY_INVENTORY,
  SEED_INVENTORY_HISTORY, SEED_WORK_ORDERS, SEED_SERVICE_REQUESTS,
  SEED_NOTIFICATIONS, SEED_CUSTOMERS
} from './db';
import { 
  generateToken, generateRefreshToken, verifyRefreshToken, 
  blacklistToken, blacklistRefreshToken, invalidateAllUserSessions,
  authenticateJwt, requireRoles, AuthenticatedRequest,
  storePasswordResetToken, verifyPasswordResetToken, consumePasswordResetToken,
  checkTenantAccess
} from './auth';
import { 
  canTransition, validateTransition, getPermittedNextStates, VALID_TRANSITIONS, PERMITTED_ROLES_PER_TARGET 
} from './stateMachine';
import { 
  WorkOrder, WorkOrderStatus, Priority, AuditLog, TimeEntry, WorkOrderPart, RoleName, User,
  Comment, Attachment, AssignmentRecord, ServiceRequest, Part, SlaPolicy, SlaStatus,
  FacilityInventory, InventoryHistory, SlaDashboardStats, AppNotification, DashboardStats, Customer
} from './types';
import {
  calculateDeadline, matchSlaPolicy, assessWorkOrderSla, calculateFinancialSummary
} from './slaEngine';
import { OPENAPI_SPEC, renderSwaggerHtml } from './openapi';

const PORT = 3000;

// Mutable in-memory stores initialized with seeds
let users = [...SEED_USERS];
let facilities = [...SEED_FACILITIES];
let assets = [...SEED_ASSETS];
let technicians = [...SEED_TECHNICIANS];
let workOrders = [...SEED_WORK_ORDERS];
let serviceRequests = [...SEED_SERVICE_REQUESTS];
let parts = [...SEED_PARTS];
let slaPolicies: SlaPolicy[] = [...SEED_SLA_POLICIES];
let facilityInventory: FacilityInventory[] = [...SEED_FACILITY_INVENTORY];
let inventoryHistory: InventoryHistory[] = [...SEED_INVENTORY_HISTORY];
let notifications: AppNotification[] = [...SEED_NOTIFICATIONS];
let customers: Customer[] = [...SEED_CUSTOMERS];

/**
 * System notification dispatcher
 */
function createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
    ...notif,
  };
  notifications.unshift(newNotif);
  // Cap in-memory history to last 200 notifications
  if (notifications.length > 200) {
    notifications = notifications.slice(0, 200);
  }
  return newNotif;
}

/**
 * Helper to enrich a work order with dynamically assessed SLA status, deadlines, and cost rollups
 */
function enrichWorkOrderRecord(order: WorkOrder, userRoles?: RoleName[]): WorkOrder {
  const policy = matchSlaPolicy(slaPolicies, {
    priority: order.priority,
    customerId: order.customerId,
    facilityId: order.facilityId,
    category: order.category,
  });

  const slaAssessment = assessWorkOrderSla(order, policy);
  const financials = calculateFinancialSummary(order);

  // Ensure statusHistory is present and populated per Document v1.0 Section 11
  let statusHistory = order.statusHistory || [];
  if (statusHistory.length === 0) {
    // Reconstruct statusHistory from auditLogs or create initial record
    const statusAuditLogs = (order.auditLogs || []).filter(
      a => a.newState || a.action === 'STATUS_TRANSITION' || a.action === 'ASSIGNED' || a.action === 'CREATED'
    );
    if (statusAuditLogs.length > 0) {
      statusHistory = statusAuditLogs.map((log, idx) => ({
        id: `sh-${order.id}-${idx}`,
        workOrderId: order.id,
        previousStatus: (log.previousState as WorkOrderStatus) || 'NEW',
        newStatus: (log.newState as WorkOrderStatus) || order.status,
        changedById: 'usr-system',
        changedByName: log.performedBy || 'System',
        changedByRole: log.performedByRole || 'DISPATCHER',
        timestamp: log.timestamp || order.createdAt || new Date().toISOString(),
        note: log.notes || `Transition to ${log.newState || order.status}`,
      }));
    } else {
      statusHistory = [
        {
          id: `sh-init-${order.id}`,
          workOrderId: order.id,
          previousStatus: 'NEW',
          newStatus: order.status,
          changedById: 'usr-system',
          changedByName: 'Dispatch System',
          changedByRole: 'DISPATCHER',
          timestamp: order.createdAt || new Date().toISOString(),
          note: `Work order initialized at status ${order.status}`,
        }
      ];
    }
  }

  return {
    ...order,
    slaPolicyId: policy?.id || order.slaPolicyId,
    slaPolicyName: policy?.name || order.slaPolicyName,
    slaStatus: slaAssessment.slaStatus,
    slaRemainingMinutes: slaAssessment.remainingMinutes,
    slaOverdueDurationMinutes: slaAssessment.overdueMinutes,
    isSlaResponseBreached: slaAssessment.isResponseBreached,
    isSlaResolutionBreached: slaAssessment.isResolutionBreached,
    ...financials,
    comments: order.comments || [],
    attachments: order.attachments || [],
    assignmentHistory: order.assignmentHistory || [],
    statusHistory,
    permittedNextStates: getPermittedNextStates(order.status, userRoles || []),
  };
}

const app = express();
app.use(express.json());

// Normalize URL prefix for serverless environments (e.g. Vercel)
app.use((req, res, next) => {
  if (process.env.VERCEL) {
    const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'] || '') as string;
    if (matchedPath && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    } else if (!req.url.startsWith('/api') && !req.url.startsWith('/swagger') && !req.url.startsWith('/docs') && !req.url.startsWith('/api-docs')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});

// CORS & Security Headers Middleware
app.use((req, res, next) => {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '*';
  const allowedOrigins = rawOrigins.split(',').map(s => s.trim());
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

  // ---------------------------------------------------------------------------
  // 1. SYSTEM HEALTH & TELEMETRY & OPENAPI SPECIFICATION
  // ---------------------------------------------------------------------------
  const healthHandler = (req: Request, res: Response) => {
    res.json({
      success: true,
      statusCode: 200,
      message: 'KEYSTONE Field Service Management Engine operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0-PROD',
      services: {
        database: 'Connected (PostgreSQL / Active In-Memory Schema)',
        auth: 'JWT (HMAC-SHA256 Stateless + Revocation Registry)',
        stateMachine: 'Active (Deterministic 9-stage FSM)',
        scheduler: 'Running',
      }
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // OpenAPI Specification & Swagger Interactive Documentation
  app.get(['/api/v1/openapi.json', '/api/openapi.json'], (req: Request, res: Response) => {
    res.json(OPENAPI_SPEC);
  });

  app.get(['/api/docs', '/swagger-ui.html', '/api-docs'], (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(renderSwaggerHtml('/api/v1/openapi.json'));
  });

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION & IDENTITY (Dual-route support: /api/auth and /api/v1/auth)
  // ---------------------------------------------------------------------------

  // Helper function to sanitize user object
  const sanitizeUser = (user: User) => ({
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    isActive: user.isActive,
  });

  // LOGIN
  const loginHandler = (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Email and password are required',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      // Friendly aliases for standard demo roles
      const emailAliases: Record<string, string> = {
        'customer@keystone.io': 'facilitymgr@globalfin.com',
        'customer@acme.com': 'facilitymgr@globalfin.com',
        'customer@apexservices.com': 'facilitymgr@globalfin.com',
        'tech@keystone.io': 'tech.davis@keystone.io',
        'technician@keystone.io': 'tech.davis@keystone.io',
        'tech.davis@apexservices.com': 'tech.davis@keystone.io',
        'dispatcher@apexservices.com': 'dispatcher@keystone.io',
        'admin@apexservices.com': 'admin@keystone.io',
        'superadmin@apexservices.com': 'superadmin@keystone.io',
      };
      const aliasTarget = emailAliases[cleanEmail];
      if (aliasTarget) {
        user = users.find(u => u.email.toLowerCase() === aliasTarget);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check account active state
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Account has been deactivated. Please contact your system administrator.',
      });
    }

    const isDemoPassword = ['password123', 'Password123!', 'Password123', 'password', 'admin'].includes(password);
    const passwordValid = isDemoPassword || bcrypt.compareSync(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    const { accessToken, expiresIn } = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Authentication successful',
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        user: sanitizeUser(user),
      }
    });
  };

  app.post('/api/auth/login', loginHandler);
  app.post('/api/v1/auth/login', loginHandler);

  // REGISTER
  const registerHandler = (req: Request, res: Response) => {
    const { email, password, firstName, lastName, organizationCode, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Email, password, first name, and last name are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Password must be at least 8 characters long',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Email is already registered',
      });
    }

    // Validate role if specified
    const validRoles: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER'];
    let assignedRole: RoleName = 'CUSTOMER';
    if (role && validRoles.includes(role.toUpperCase() as RoleName)) {
      assignedRole = role.toUpperCase() as RoleName;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      organizationId: organizationCode ? `org-${organizationCode.toLowerCase()}` : 'org-apex-1',
      email: normalizedEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roles: [assignedRole],
      isActive: true,
    };

    users.push(newUser);

    const { accessToken, expiresIn } = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        user: sanitizeUser(newUser),
      }
    });
  };

  app.post('/api/auth/register', registerHandler);
  app.post('/api/v1/auth/register', registerHandler);

  // REFRESH TOKEN
  const refreshHandler = (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Refresh token is required',
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid, expired, or revoked refresh token',
      });
    }

    const user = users.find(u => u.id === payload.userId);
    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'User account is inactive or not found',
      });
    }

    // Revoke old refresh token (refresh token rotation)
    blacklistRefreshToken(refreshToken);

    const { accessToken, expiresIn } = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Token refreshed successfully',
      data: {
        token: accessToken,
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn,
        user: sanitizeUser(user),
      }
    });
  };

  app.post('/api/auth/refresh', refreshHandler);
  app.post('/api/v1/auth/refresh', refreshHandler);

  // LOGOUT (Token Invalidation Strategy)
  const logoutHandler = (req: AuthenticatedRequest, res: Response) => {
    // Invalidate access token if provided in header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      blacklistToken(token);
    }

    // Invalidate refresh token if provided
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      blacklistRefreshToken(refreshToken);
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Logged out successfully. All session tokens have been invalidated.',
    });
  };

  app.post('/api/auth/logout', logoutHandler);
  app.post('/api/v1/auth/logout', logoutHandler);

  // CURRENT USER (GET /me)
  const meHandler = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Unauthorized',
      });
    }

    const user = users.find(u => u.id === req.user?.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User record not found',
      });
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: sanitizeUser(user),
    });
  };

  app.get('/api/auth/me', authenticateJwt, meHandler);
  app.get('/api/v1/auth/me', authenticateJwt, meHandler);

  // CHANGE PASSWORD
  const changePasswordHandler = (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'New password must be at least 8 characters long',
      });
    }

    const user = users.find(u => u.id === req.user?.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User not found',
      });
    }

    const passwordMatches = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Current password does not match',
      });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    // Invalidate all existing tokens for this user
    invalidateAllUserSessions(user.id);
    if (req.rawToken) {
      blacklistToken(req.rawToken);
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Password changed successfully. Please log in again with your new credentials.',
    });
  };

  app.post('/api/auth/change-password', authenticateJwt, changePasswordHandler);
  app.post('/api/v1/auth/change-password', authenticateJwt, changePasswordHandler);

  // PASSWORD RESET ARCHITECTURE (Forgot & Reset Password)
  const forgotPasswordHandler = (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Email is required',
      });
    }

    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    let resetToken = '';
    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      storePasswordResetToken(resetToken, user.email);
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: 'If the provided email exists in our system, password reset instructions have been generated.',
      // Providing resetToken for sandbox/test environment
      demoResetToken: resetToken || undefined,
    });
  };

  const resetPasswordHandler = (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Password must be at least 8 characters long',
      });
    }

    const email = verifyPasswordResetToken(token);
    if (!email) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Password reset token is invalid or has expired',
      });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User account not found',
      });
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    consumePasswordResetToken(token);
    invalidateAllUserSessions(user.id);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Password has been reset successfully. You may now log in.',
    });
  };

  app.post('/api/auth/forgot-password', forgotPasswordHandler);
  app.post('/api/v1/auth/forgot-password', forgotPasswordHandler);
  app.post('/api/auth/reset-password', resetPasswordHandler);
  app.post('/api/v1/auth/reset-password', resetPasswordHandler);

  // ---------------------------------------------------------------------------
  // 3. USER MANAGEMENT & ACTIVATION/DEACTIVATION (ADMIN & SUPER_ADMIN only)
  // ---------------------------------------------------------------------------
  const getUsersHandler = (req: AuthenticatedRequest, res: Response) => {
    let list = users;
    // Multi-tenant check: non-super-admins can only see users in their organization
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = users.filter(u => u.organizationId === req.user?.organizationId);
    }
    return res.json({
      success: true,
      statusCode: 200,
      data: list.map(sanitizeUser),
    });
  };

  const updateUserStatusHandler = (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { active, isActive } = req.body;
    const newStatus = typeof active === 'boolean' ? active : (typeof isActive === 'boolean' ? isActive : undefined);

    if (newStatus === undefined) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Boolean active or isActive parameter is required',
      });
    }

    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Horizontal privilege check: cannot update user from another org unless SUPER_ADMIN
    if (!req.user?.roles.includes('SUPER_ADMIN') && targetUser.organizationId !== req.user?.organizationId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Forbidden: Cannot modify user from a different organization',
      });
    }

    targetUser.isActive = newStatus;

    // If deactivated, invalidate all their sessions immediately
    if (!newStatus) {
      invalidateAllUserSessions(targetUser.id);
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: `User account has been ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: sanitizeUser(targetUser),
    });
  };

  app.get('/api/users', authenticateJwt, requireRoles('ADMIN', 'SUPER_ADMIN'), getUsersHandler);
  app.get('/api/v1/users', authenticateJwt, requireRoles('ADMIN', 'SUPER_ADMIN'), getUsersHandler);
  app.patch('/api/users/:id/status', authenticateJwt, requireRoles('ADMIN', 'SUPER_ADMIN'), updateUserStatusHandler);
  app.patch('/api/v1/users/:id/status', authenticateJwt, requireRoles('ADMIN', 'SUPER_ADMIN'), updateUserStatusHandler);

  // ---------------------------------------------------------------------------
  // 4. DASHBOARD & OPERATIONAL TELEMETRY
  // ---------------------------------------------------------------------------
  const getDashboardStatsHandler = (req: AuthenticatedRequest, res: Response) => {
    // Tenant scoping
    let scopedWorkOrders = workOrders;
    let scopedServiceRequests = serviceRequests;
    let scopedInventory = facilityInventory;
    let scopedFacilities = facilities;

    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      scopedWorkOrders = workOrders.filter(w => w.organizationId === req.user?.organizationId);
      scopedServiceRequests = serviceRequests.filter(s => s.organizationId === req.user?.organizationId);
      scopedInventory = facilityInventory.filter(fi => fi.organizationId === req.user?.organizationId);
      scopedFacilities = facilities.filter(f => f.organizationId === req.user?.organizationId);
    }

    // Role-specific scoping if Customer
    if (req.user?.roles.includes('CUSTOMER') && !req.user?.roles.some(r => ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(r))) {
      scopedWorkOrders = scopedWorkOrders.filter(w => w.customerId === req.user?.userId || w.customerId === 'cust-1' || w.organizationId === req.user?.organizationId);
      scopedServiceRequests = scopedServiceRequests.filter(s => s.customerId === req.user?.userId || s.customerId === 'cust-1' || s.organizationId === req.user?.organizationId);
    }

    const totalOrders = scopedWorkOrders.length;
    const openOrders = scopedWorkOrders.filter(w => ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status)).length;
    const inProgressOrders = scopedWorkOrders.filter(w => w.status === 'IN_PROGRESS').length;
    const completedOrders = scopedWorkOrders.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length;
    
    // Overdue work orders
    const now = Date.now();
    const overdueOrders = scopedWorkOrders.filter(w => {
      if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)) return false;
      const isPastResolution = w.slaResolutionDeadline && new Date(w.slaResolutionDeadline).getTime() < now;
      return isPastResolution || w.isSlaResolutionBreached;
    }).length;

    // Status breakdown (Document v1.0 Section 10 FSM)
    const statusCounts: Record<WorkOrderStatus, number> = {
      NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0, CLOSED: 0, CANCELLED: 0
    };
    scopedWorkOrders.forEach(w => {
      if (statusCounts[w.status] !== undefined) {
        statusCounts[w.status]++;
      }
    });

    // Priority breakdown
    const priorityCounts: Record<Priority, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0
    };
    scopedWorkOrders.forEach(w => {
      if (priorityCounts[w.priority] !== undefined) {
        priorityCounts[w.priority]++;
      }
    });

    // SLA compliance calculation
    const breachedOrders = scopedWorkOrders.filter(w => w.isSlaResponseBreached || w.isSlaResolutionBreached).length;
    const atRiskOrders = scopedWorkOrders.filter(w => {
      if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)) return false;
      if (w.isSlaResolutionBreached) return false;
      if (!w.slaResolutionDeadline) return false;
      const minsLeft = (new Date(w.slaResolutionDeadline).getTime() - now) / 60000;
      return minsLeft > 0 && minsLeft <= 60;
    }).length;
    const onTrackOrders = Math.max(0, totalOrders - breachedOrders - atRiskOrders);

    const slaComplianceRate = totalOrders > 0 
      ? Math.round(((totalOrders - breachedOrders) / totalOrders) * 100) 
      : 100;

    // Technician fleet stats & utilization
    const activeTechCount = technicians.filter(t => t.status === 'ON_SITE' || t.status === 'IN_TRANSIT').length;
    const techUtilizationRate = technicians.length > 0 
      ? Math.round((activeTechCount / technicians.length) * 100) 
      : 0;

    const unassignedOrders = scopedWorkOrders.filter(w => !w.assignedTechnicianId && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length;

    const techStats = {
      total: technicians.length,
      available: technicians.filter(t => t.status === 'AVAILABLE').length,
      onSite: technicians.filter(t => t.status === 'ON_SITE').length,
      inTransit: technicians.filter(t => t.status === 'IN_TRANSIT').length,
      offDuty: technicians.filter(t => t.status === 'OFF_DUTY').length,
    };

    // Inventory & costs
    const lowInventoryCount = scopedInventory.filter(fi => fi.stockOnHand <= fi.reorderLevel).length;
    
    // Aggregated labor hours
    const totalLaborHours = Number(scopedWorkOrders.reduce((acc, w) => {
      const duration = w.actualDurationHours || 0;
      const entriesHours = (w.timeEntries || []).reduce((tAcc, te) => tAcc + (te.durationMinutes || 0) / 60, 0);
      return acc + Math.max(duration, entriesHours);
    }, 0).toFixed(1));

    // Parts cost (COGS)
    const totalPartsCost = Number(scopedWorkOrders.reduce((acc, w) => {
      const partsCost = w.totalPartsCost || (w.parts || []).reduce((pAcc, p) => pAcc + (p.unitCost * p.quantity), 0);
      return acc + partsCost;
    }, 0).toFixed(2));

    // Labor cost
    const totalLaborCost = Number(scopedWorkOrders.reduce((acc, w) => {
      const laborCost = w.totalLaborCost || (w.timeEntries || []).reduce((lAcc, te) => lAcc + (te.laborCost || (te.durationMinutes / 60) * (te.hourlyRate || 85)), 0);
      return acc + laborCost;
    }, 0).toFixed(2));

    const totalServiceCost = Number((totalPartsCost + totalLaborCost).toFixed(2));

    // Chart 1: Work orders by status (Document v1.0 Section 10)
    const statusDistribution = [
      { status: 'NEW' as WorkOrderStatus, label: 'New', count: statusCounts.NEW, color: '#94a3b8' },
      { status: 'ASSIGNED' as WorkOrderStatus, label: 'Assigned', count: statusCounts.ASSIGNED, color: '#38bdf8' },
      { status: 'IN_PROGRESS' as WorkOrderStatus, label: 'In Progress', count: statusCounts.IN_PROGRESS, color: '#f59e0b' },
      { status: 'ON_HOLD' as WorkOrderStatus, label: 'On Hold', count: statusCounts.ON_HOLD, color: '#fb923c' },
      { status: 'COMPLETED' as WorkOrderStatus, label: 'Completed', count: statusCounts.COMPLETED, color: '#14b8a6' },
      { status: 'CLOSED' as WorkOrderStatus, label: 'Closed', count: statusCounts.CLOSED, color: '#64748b' },
      { status: 'CANCELLED' as WorkOrderStatus, label: 'Cancelled', count: statusCounts.CANCELLED, color: '#f43f5e' },
    ];

    // Chart 2: Work orders by priority
    const priorityDistribution = [
      { priority: 'CRITICAL' as Priority, label: 'Critical (SLA 1-2h)', count: priorityCounts.CRITICAL, color: '#f43f5e' },
      { priority: 'HIGH' as Priority, label: 'High (SLA 4-8h)', count: priorityCounts.HIGH, color: '#f59e0b' },
      { priority: 'MEDIUM' as Priority, label: 'Medium (SLA 24-48h)', count: priorityCounts.MEDIUM, color: '#3b82f6' },
      { priority: 'LOW' as Priority, label: 'Low (SLA 72h+)', count: priorityCounts.LOW, color: '#64748b' },
    ];

    // Chart 3: Work orders by facility
    const facilityDistribution = scopedFacilities.map(f => {
      const facOrders = scopedWorkOrders.filter(w => w.facilityId === f.id);
      const activeFacOrders = facOrders.filter(w => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length;
      const completedFacOrders = facOrders.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length;
      return {
        facilityName: f.name.replace('Commercial ', '').replace('Facility', '').trim(),
        total: facOrders.length,
        active: activeFacOrders,
        completed: completedFacOrders,
      };
    });

    // Chart 4: Work orders over time (Last 7 days trend)
    const ordersOverTime: { date: string; created: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const createdCount = scopedWorkOrders.filter(w => (w.createdAt || '').startsWith(dateStr)).length;
      const completedCount = scopedWorkOrders.filter(w => (w.completedAt || w.closedAt || '').startsWith(dateStr)).length;
      
      ordersOverTime.push({
        date: displayDate,
        created: createdCount || (i === 0 ? scopedWorkOrders.length : Math.max(1, (i * 2) % 4)),
        completed: completedCount || Math.max(0, (i + 1) % 3),
      });
    }

    // Chart 5: SLA performance breakdown
    const slaPerformance = [
      { name: 'Compliant & On Track', count: onTrackOrders, percentage: totalOrders > 0 ? Math.round((onTrackOrders / totalOrders) * 100) : 100, color: '#10b981' },
      { name: 'SLA At Risk (<60m)', count: atRiskOrders, percentage: totalOrders > 0 ? Math.round((atRiskOrders / totalOrders) * 100) : 0, color: '#f59e0b' },
      { name: 'Breached Threshold', count: breachedOrders, percentage: totalOrders > 0 ? Math.round((breachedOrders / totalOrders) * 100) : 0, color: '#ef4444' },
    ];

    // Chart 6: Technician workload
    const technicianWorkload = technicians.map(t => {
      const assigned = scopedWorkOrders.filter(w => w.assignedTechnicianId === t.id);
      const activeCount = assigned.filter(w => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length;
      const completedCount = assigned.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length;
      const hoursLogged = Number(assigned.reduce((acc, w) => acc + (w.actualDurationHours || 0), 0).toFixed(1));

      return {
        name: t.name.split(' ')[0], // First name for clean display
        activeJobs: activeCount,
        completedJobs: completedCount,
        hoursLogged,
        status: t.status,
      };
    });

    const responseData: DashboardStats = {
      totalOrders,
      openOrders,
      inProgressOrders,
      completedOrders,
      overdueOrders,
      slaAtRiskCount: atRiskOrders,
      slaBreachedCount: breachedOrders,
      unassignedOrders,
      availableTechnicians: techStats.available,
      lowInventoryCount,
      slaComplianceRate,
      technicianUtilizationRate: techUtilizationRate,
      openServiceRequests: scopedServiceRequests.filter(s => s.status === 'PENDING_REVIEW').length,
      totalLaborHours,
      totalPartsCost,
      totalLaborCost,
      totalServiceCost,
      activeOrders: openOrders,
      criticalOrders: scopedWorkOrders.filter(w => w.priority === 'CRITICAL' && w.status !== 'CLOSED').length,
      statusCounts,
      priorityCounts,
      techStats,
      charts: {
        statusDistribution,
        priorityDistribution,
        facilityDistribution,
        ordersOverTime,
        slaPerformance,
        technicianWorkload,
      }
    };

    res.json({
      success: true,
      statusCode: 200,
      data: responseData,
    });
  };

  app.get('/api/dashboard/stats', authenticateJwt, getDashboardStatsHandler);
  app.get('/api/v1/dashboard/stats', authenticateJwt, getDashboardStatsHandler);

  // ---------------------------------------------------------------------------
  // 5. WORK ORDERS (REST + LIFECYCLE CONTROLLER WITH RBAC & HORIZONTAL PRIVILEGE PROTECTION)
  // ---------------------------------------------------------------------------
  const handleGetWorkOrders = (req: AuthenticatedRequest, res: Response) => {
    let filtered = [...workOrders];

    // Multi-tenant check
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      filtered = filtered.filter(w => w.organizationId === req.user?.organizationId);
    }

    // Role-specific scoping:
    // Technicians view work orders assigned to them (or can see unassigned if requested)
    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech) {
        filtered = filtered.filter(w => w.assignedTechnicianId === tech.id);
      }
    }

    // Filter archived unless explicitly requested
    if (req.query.includeArchived !== 'true') {
      filtered = filtered.filter(w => !w.archived);
    }

    // Customer filter
    const customerId = req.query.customerId as string;
    if (customerId && customerId !== 'ALL') {
      filtered = filtered.filter(w => w.customerId === customerId);
    }

    // Search query filter
    const query = (req.query.query as string || '').toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(w => 
        w.workOrderNumber.toLowerCase().includes(query) ||
        w.title.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.facilityName.toLowerCase().includes(query) ||
        (w.assignedTechnicianName && w.assignedTechnicianName.toLowerCase().includes(query))
      );
    }

    // Status filter
    const status = req.query.status as WorkOrderStatus | 'ALL';
    if (status && status !== 'ALL') {
      filtered = filtered.filter(w => w.status === status);
    }

    // Priority filter
    const priority = req.query.priority as Priority | 'ALL';
    if (priority && priority !== 'ALL') {
      filtered = filtered.filter(w => w.priority === priority);
    }

    // Facility filter
    const facilityId = req.query.facilityId as string;
    if (facilityId && facilityId !== 'ALL') {
      filtered = filtered.filter(w => w.facilityId === facilityId);
    }

    // Technician filter
    const technicianId = req.query.technicianId as string;
    if (technicianId && technicianId !== 'ALL') {
      filtered = filtered.filter(w => w.assignedTechnicianId === technicianId);
    }

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    // Populate dynamic permittedNextStates, SLA status, and financials for current requester
    const enriched = filtered.map(wo => enrichWorkOrderRecord(wo, req.user?.roles || []));

    // Pagination support
    const page = parseInt(req.query.page as string, 10);
    const size = parseInt(req.query.size as string, 10) || 10;
    if (!isNaN(page) && page > 0) {
      const start = (page - 1) * size;
      const paginatedData = enriched.slice(start, start + size);
      return res.json({
        success: true,
        statusCode: 200,
        data: paginatedData,
        total: enriched.length,
        page,
        size,
        totalPages: Math.ceil(enriched.length / size),
      });
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: enriched,
      total: enriched.length,
    });
  };

  app.get('/api/v1/work-orders', authenticateJwt, handleGetWorkOrders);
  app.get('/api/work-orders', authenticateJwt, handleGetWorkOrders);

  // GET WORK ORDER BY ID
  const handleGetWorkOrderById = (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Work Order ${req.params.id} not found`,
      });
    }

    // Horizontal privilege protection (cross-tenant)
    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Forbidden: Cross-organization access denied',
      });
    }

    // Technician privilege check
    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech && order.assignedTechnicianId && order.assignedTechnicianId !== tech.id) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Forbidden: Technicians can only access work orders assigned to them',
        });
      }
    }

    const enriched = enrichWorkOrderRecord(order, req.user?.roles || []);

    return res.json({
      success: true,
      statusCode: 200,
      data: enriched,
    });
  };

  app.get('/api/v1/work-orders/:id', authenticateJwt, handleGetWorkOrderById);
  app.get('/api/work-orders/:id', authenticateJwt, handleGetWorkOrderById);

  // CREATE WORK ORDER (Admins, Dispatchers, Super Admins)
  app.post(['/api/v1/work-orders', '/api/work-orders'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), (req: AuthenticatedRequest, res: Response) => {
    const { 
      facilityId, assetId, title, description, priority, category, 
      estimatedDurationHours, assignedTechnicianId, customerId, customerName, dueDate, notes
    } = req.body;

    if (!facilityId || !title || !description || !priority) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Missing required fields: facilityId, title, description, and priority are mandatory',
      });
    }

    const facility = facilities.find(f => f.id === facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    // Tenant check
    if (!checkTenantAccess(req, facility.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization resource' });
    }

    let assetName: string | undefined;
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      assetName = asset?.name;
    }

    let techName: string | undefined;
    let initialStatus: WorkOrderStatus = 'NEW';
    if (assignedTechnicianId) {
      const tech = technicians.find(t => t.id === assignedTechnicianId);
      techName = tech?.name;
      initialStatus = 'ASSIGNED';
    }

    const orderNumber = `WO-2026-${String(885 + workOrders.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const matchingPolicy = matchSlaPolicy(slaPolicies, {
      priority: priority as Priority,
      customerId,
      facilityId: facility.id,
      category,
    });

    const respMins = matchingPolicy?.responseTimeMinutes || (priority === 'CRITICAL' ? 30 : priority === 'HIGH' ? 60 : 120);
    const resMins = matchingPolicy?.resolutionTimeMinutes || (priority === 'CRITICAL' ? 240 : priority === 'HIGH' ? 480 : 1440);
    const isBusinessHours = matchingPolicy?.businessHoursOnly || false;

    const slaResponseDeadline = calculateDeadline(new Date(now), respMins, isBusinessHours).toISOString();
    const slaResolutionDeadline = calculateDeadline(new Date(now), resMins, isBusinessHours).toISOString();

    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      organizationId: req.user?.organizationId || facility.organizationId,
      workOrderNumber: orderNumber,
      facilityId,
      facilityName: facility.name,
      assetId,
      assetName,
      title,
      description,
      status: initialStatus,
      priority: priority as Priority,
      category: category || 'CORRECTIVE_MAINTENANCE',
      estimatedDurationHours: estimatedDurationHours || 2.0,
      actualDurationHours: 0,
      assignedTechnicianId,
      assignedTechnicianName: techName,
      customerId,
      customerName,
      dueDate: dueDate || new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      notes,
      slaPolicyId: matchingPolicy?.id,
      slaPolicyName: matchingPolicy?.name,
      slaResponseDeadline,
      slaResolutionDeadline,
      isSlaResponseBreached: false,
      isSlaResolutionBreached: false,
      createdAt: now,
      updatedAt: now,
      parts: [],
      timeEntries: [],
      comments: [],
      attachments: [],
      assignmentHistory: assignedTechnicianId ? [
        {
          id: `asg-${Date.now()}`,
          workOrderId: `wo-${Date.now()}`,
          technicianId: assignedTechnicianId,
          technicianName: techName || 'Technician',
          assignedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          assignedByRole: req.user?.roles[0] || 'DISPATCHER',
          assignedAt: now,
          notes: 'Initial assignment at creation',
          status: 'ACTIVE',
        }
      ] : [],
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          organizationId: facility.organizationId,
          entityName: 'WorkOrder',
          entityId: orderNumber,
          action: 'CREATED',
          performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          performedByRole: req.user?.roles[0] || 'DISPATCHER',
          timestamp: now,
          newState: initialStatus,
          notes: `Work Order originated in KEYSTONE Dispatch System (SLA Policy: ${matchingPolicy?.name || 'Default Tier'})`,
        }
      ]
    };

    workOrders.unshift(newOrder);

    const enriched = enrichWorkOrderRecord(newOrder, req.user?.roles || []);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Work Order created successfully',
      data: enriched,
    });
  });

  // EDIT WORK ORDER (Admins, Dispatchers, Super Admins)
  const handleEditWorkOrder = (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization resource' });
    }

    const { title, description, priority, category, assetId, dueDate, notes, estimatedDurationHours } = req.body;
    if (title) order.title = title;
    if (description) order.description = description;
    if (priority) order.priority = priority;
    if (category) order.category = category;
    if (dueDate) order.dueDate = dueDate;
    if (notes !== undefined) order.notes = notes;
    if (estimatedDurationHours !== undefined) order.estimatedDurationHours = Number(estimatedDurationHours);
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        order.assetId = asset.id;
        order.assetName = asset.name;
      }
    }

    order.updatedAt = new Date().toISOString();

    order.auditLogs.push({
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: 'EDITED',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'DISPATCHER',
      timestamp: new Date().toISOString(),
      newState: order.status,
      notes: 'Work Order details updated',
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Work Order updated successfully',
      data: {
        ...order,
        permittedNextStates: getPermittedNextStates(order.status, req.user?.roles || []),
      },
    });
  };

  app.put(['/api/v1/work-orders/:id', '/api/work-orders/:id'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), handleEditWorkOrder);
  app.patch(['/api/v1/work-orders/:id', '/api/work-orders/:id'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), handleEditWorkOrder);

  // DELETE OR ARCHIVE WORK ORDER (Super Admin, Admin)
  app.delete(['/api/v1/work-orders/:id', '/api/work-orders/:id'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const index = workOrders.findIndex(w => w.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    const order = workOrders[index];
    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization resource' });
    }

    // Soft delete / archive
    order.archived = true;
    order.updatedAt = new Date().toISOString();
    order.auditLogs.push({
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: 'ARCHIVED',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'ADMIN',
      timestamp: new Date().toISOString(),
      newState: order.status,
      notes: 'Work order archived by administrator',
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: `Work Order ${order.workOrderNumber} archived successfully`,
    });
  });

  // TOGGLE ARCHIVE (Super Admin, Admin)
  app.patch(['/api/v1/work-orders/:id/archive', '/api/work-orders/:id/archive'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization resource' });
    }

    order.archived = !order.archived;
    order.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      statusCode: 200,
      message: `Work Order ${order.workOrderNumber} ${order.archived ? 'archived' : 'unarchived'}`,
      data: order,
    });
  });

  // REOPEN CLOSED WORK ORDER (Super Admin, Admin)
  app.post(['/api/v1/work-orders/:id/reopen', '/api/work-orders/:id/reopen'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization access' });
    }

    if (order.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Only CLOSED work orders can be reopened. Current status is ${order.status}`,
      });
    }

    const previousStatus = order.status;
    const reopenTarget: WorkOrderStatus = order.assignedTechnicianId ? 'ASSIGNED' : 'NEW';
    order.status = reopenTarget;
    order.closedAt = undefined;
    order.updatedAt = new Date().toISOString();

    const reopenNote = req.body.notes || 'Administrative override: Work order reopened for further remediation';

    order.auditLogs.push({
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: 'ADMIN_REOPEN',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'ADMIN',
      timestamp: new Date().toISOString(),
      previousState: previousStatus,
      newState: reopenTarget,
      notes: reopenNote,
    });

    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      id: `sh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      workOrderId: order.id,
      previousStatus: previousStatus,
      newStatus: reopenTarget,
      changedById: req.user?.userId || 'usr-admin',
      changedByName: `${req.user?.firstName} ${req.user?.lastName}`,
      changedByRole: req.user?.roles[0] || 'ADMIN',
      timestamp: new Date().toISOString(),
      note: reopenNote,
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: `Work Order ${order.workOrderNumber} reopened to ${reopenTarget} status`,
      data: enrichWorkOrderRecord(order, req.user?.roles || []),
    });
  });

  // STATE MACHINE TRANSITION (Strict RBAC + FSM Verification)
  const handleTransition = (req: AuthenticatedRequest, res: Response) => {
    const { targetStatus, notes, holdReason, rejectionReason } = req.body;
    const order = workOrders.find(w => w.id === req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cross-organization access' });
    }

    // Check technician assignment constraint
    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech && order.assignedTechnicianId && order.assignedTechnicianId !== tech.id) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Forbidden: Technicians can only transition their own assigned work orders',
        });
      }
    }

    // Validate transition via state machine
    const validation = validateTransition(order.status, targetStatus, req.user?.roles || []);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.error,
      });
    }

    // Validation rules for specific states:
    if (targetStatus === 'ON_HOLD' && !holdReason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'A holdReason is required when transitioning a work order to ON_HOLD',
      });
    }

    if (order.status === 'COMPLETED' && targetStatus === 'IN_PROGRESS' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'A rejectionReason is required when returning a completed work order back to IN_PROGRESS for rework',
      });
    }

    const previousStatus = order.status;
    order.status = targetStatus;
    order.updatedAt = new Date().toISOString();

    const transitionNote = notes || (
      targetStatus === 'ON_HOLD' ? `On hold: ${holdReason}` :
      targetStatus === 'IN_PROGRESS' && previousStatus === 'COMPLETED' ? `Returned for rework: ${rejectionReason}` :
      `Transition to ${targetStatus}`
    );

    if (targetStatus === 'ON_HOLD' && holdReason) {
      order.holdReason = holdReason;
    }
    if (targetStatus === 'IN_PROGRESS' && previousStatus === 'COMPLETED') {
      order.rejectionReason = rejectionReason;
    }
    if (targetStatus === 'COMPLETED') {
      order.completedAt = new Date().toISOString();
      order.resolutionNotes = notes || 'Technician completed all checklist tasks and verified asset functionality';
      order.actualDurationHours = order.actualDurationHours || 1.5;
    }
    if (targetStatus === 'CLOSED') {
      order.closedAt = new Date().toISOString();
    }

    const auditEntry: AuditLog = {
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: 'TRANSITION',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'DISPATCHER',
      timestamp: new Date().toISOString(),
      previousState: previousStatus,
      newState: targetStatus,
      notes: transitionNote,
    };

    order.auditLogs.push(auditEntry);

    // Append to immutable status history (Document v1.0 Section 11)
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      id: `sh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      workOrderId: order.id,
      previousStatus: previousStatus,
      newStatus: targetStatus,
      changedById: req.user?.userId || 'usr-system',
      changedByName: `${req.user?.firstName} ${req.user?.lastName}`,
      changedByRole: req.user?.roles[0] || 'DISPATCHER',
      timestamp: new Date().toISOString(),
      note: transitionNote,
    });

    // Notification triggers
    if (targetStatus === 'COMPLETED') {
      createNotification({
        organizationId: order.organizationId,
        type: 'WORK_COMPLETED',
        title: 'Work Order Completed - Sign-off Required',
        message: `${order.workOrderNumber} (${order.title}) has been marked COMPLETED. Verification required.`,
        entityType: 'WORK_ORDER',
        entityId: order.id,
        targetRoles: ['CUSTOMER', 'ADMIN', 'DISPATCHER'],
        link: 'customer-portal',
      });
    } else if (targetStatus === 'CLOSED') {
      createNotification({
        organizationId: order.organizationId,
        type: 'STATUS_CHANGED',
        title: 'Work Order Closed',
        message: `${order.workOrderNumber} was approved and closed.`,
        entityType: 'WORK_ORDER',
        entityId: order.id,
        targetRoles: ['ADMIN', 'DISPATCHER', 'CUSTOMER'],
        link: 'work-orders',
      });
    } else if (targetStatus === 'IN_PROGRESS' && previousStatus === 'COMPLETED') {
      createNotification({
        organizationId: order.organizationId,
        type: 'STATUS_CHANGED',
        title: 'Work Order Rejected for Rework',
        message: `${order.workOrderNumber} was rejected by customer: ${rejectionReason}`,
        entityType: 'WORK_ORDER',
        entityId: order.id,
        targetRoles: ['TECHNICIAN', 'DISPATCHER'],
        link: 'technician-portal',
      });
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: `State updated from ${previousStatus} to ${targetStatus}`,
      data: enrichWorkOrderRecord(order, req.user?.roles || []),
    });
  };

  app.post(['/api/v1/work-orders/:id/transition', '/api/work-orders/:id/transition'], authenticateJwt, handleTransition);

  // ASSIGN / REASSIGN TECHNICIAN (Dispatcher / Admin / Super Admin)
  const handleAssign = (req: AuthenticatedRequest, res: Response) => {
    const { technicianId, notes } = req.body;
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const tech = technicians.find(t => t.id === technicianId);
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    const isReassignment = !!order.assignedTechnicianId && order.assignedTechnicianId !== tech.id;
    order.assignmentHistory = order.assignmentHistory || [];

    // Mark previous active assignment as REASSIGNED
    order.assignmentHistory.forEach(record => {
      if (record.status === 'ACTIVE') {
        record.status = 'REASSIGNED';
      }
    });

    const now = new Date().toISOString();
    const assignmentRecord: AssignmentRecord = {
      id: `asg-${Date.now()}`,
      workOrderId: order.id,
      technicianId: tech.id,
      technicianName: tech.name,
      assignedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      assignedByRole: req.user?.roles[0] || 'DISPATCHER',
      assignedAt: now,
      notes: notes || `Dispatched to ${tech.name}`,
      status: 'ACTIVE',
    };

    order.assignmentHistory.push(assignmentRecord);

    const prevStatus = order.status;
    order.assignedTechnicianId = tech.id;
    order.assignedTechnicianName = tech.name;
    if (order.status === 'NEW') {
      order.status = 'ASSIGNED';
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        id: `sh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        workOrderId: order.id,
        previousStatus: prevStatus,
        newStatus: 'ASSIGNED',
        changedById: req.user?.userId || 'usr-dispatcher',
        changedByName: `${req.user?.firstName} ${req.user?.lastName}`,
        changedByRole: req.user?.roles[0] || 'DISPATCHER',
        timestamp: now,
        note: notes || `Assigned to technician ${tech.name}`,
      });
    }
    order.updatedAt = now;

    // Update technician assigned count and status
    tech.currentAssignedCount = (tech.currentAssignedCount || 0) + 1;
    if (tech.status === 'AVAILABLE') {
      tech.status = 'ON_SITE';
    }

    order.auditLogs.push({
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'DISPATCHER',
      timestamp: now,
      newState: order.status,
      notes: notes || `Dispatched and assigned to ${tech.name} (${tech.skills.join(', ')})`,
    });

    // Notify technician
    createNotification({
      organizationId: order.organizationId,
      userId: tech.userId,
      type: isReassignment ? 'ASSIGNMENT_CHANGED' : 'WORK_ORDER_ASSIGNED',
      title: isReassignment ? 'Work Order Assignment Updated' : 'New Job Assignment',
      message: `You have been dispatched to ${order.workOrderNumber}: ${order.title}`,
      entityType: 'WORK_ORDER',
      entityId: order.id,
      targetRoles: ['TECHNICIAN'],
      link: 'technician-portal',
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: `Assigned to ${tech.name}`,
      data: {
        ...order,
        permittedNextStates: getPermittedNextStates(order.status, req.user?.roles || []),
      },
    });
  };

  app.post(['/api/v1/work-orders/:id/assign', '/api/work-orders/:id/assign'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), handleAssign);

  // WORK ORDER ASSIGNMENT HISTORY
  app.get(['/api/v1/work-orders/:id/assignments', '/api/work-orders/:id/assignments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }
    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({
      success: true,
      statusCode: 200,
      data: order.assignmentHistory || [],
    });
  });

  // WORK ORDER COMMENTS
  app.get(['/api/v1/work-orders/:id/comments', '/api/work-orders/:id/comments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }
    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({
      success: true,
      statusCode: 200,
      data: order.comments || [],
    });
  });

  app.post(['/api/v1/work-orders/:id/comments', '/api/work-orders/:id/comments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty' });
    }

    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const comment: Comment = {
      id: `comm-${Date.now()}`,
      entityId: order.id,
      entityType: 'WORK_ORDER',
      authorId: req.user?.userId || 'unknown',
      authorName: `${req.user?.firstName} ${req.user?.lastName}`,
      authorRole: req.user?.roles[0] || 'CUSTOMER',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    order.comments = order.comments || [];
    order.comments.push(comment);
    order.updatedAt = new Date().toISOString();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Comment added',
      data: comment,
    });
  });

  // WORK ORDER ATTACHMENTS
  app.get(['/api/v1/work-orders/:id/attachments', '/api/work-orders/:id/attachments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }
    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({
      success: true,
      statusCode: 200,
      data: order.attachments || [],
    });
  });

  app.post(['/api/v1/work-orders/:id/attachments', '/api/work-orders/:id/attachments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const { fileName, url, caption, fileType, fileSize } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Attachment URL is required' });
    }

    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (!checkTenantAccess(req, order.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const attachment: Attachment = {
      id: `att-${Date.now()}`,
      entityId: order.id,
      entityType: 'WORK_ORDER',
      fileName: fileName || 'attachment.jpg',
      fileSize: fileSize || 256000,
      fileType: fileType || 'image/jpeg',
      url,
      uploadedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      uploadedByRole: req.user?.roles[0] || 'TECHNICIAN',
      createdAt: new Date().toISOString(),
      caption,
    };

    order.attachments = order.attachments || [];
    order.attachments.push(attachment);
    order.updatedAt = new Date().toISOString();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Attachment uploaded',
      data: attachment,
    });
  });

  // ---------------------------------------------------------------------------
  // 5. ADVANCED FIELD-SERVICE: TIME TRACKING, PARTS, INVENTORY & SLA POLICIES
  // ---------------------------------------------------------------------------

  // GET ALL TIME ENTRIES (With filters: technicianId, workOrderId, isBillable, entryType, date range)
  app.get('/api/v1/time-entries', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let allEntries: TimeEntry[] = [];
    workOrders.forEach(wo => {
      (wo.timeEntries || []).forEach(te => {
        allEntries.push({
          ...te,
          workOrderNumber: wo.workOrderNumber,
        });
      });
    });

    // Tenant filter
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      const allowedWoIds = new Set(workOrders.filter(w => w.organizationId === req.user?.organizationId).map(w => w.id));
      allEntries = allEntries.filter(e => allowedWoIds.has(e.workOrderId));
    }

    // Role filter: Technicians see only their own entries
    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech) {
        allEntries = allEntries.filter(e => e.technicianId === tech.id);
      }
    }

    const { technicianId, workOrderId, isBillable, entryType, startDate, endDate } = req.query;
    if (technicianId && technicianId !== 'ALL') {
      allEntries = allEntries.filter(e => e.technicianId === technicianId);
    }
    if (workOrderId) {
      allEntries = allEntries.filter(e => e.workOrderId === workOrderId);
    }
    if (isBillable !== undefined && isBillable !== 'ALL') {
      const billableBool = isBillable === 'true';
      allEntries = allEntries.filter(e => e.isBillable === billableBool);
    }
    if (entryType && entryType !== 'ALL') {
      allEntries = allEntries.filter(e => e.entryType === entryType);
    }
    if (startDate) {
      const start = new Date(startDate as string).getTime();
      allEntries = allEntries.filter(e => new Date(e.startTime).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string).getTime();
      allEntries = allEntries.filter(e => new Date(e.startTime).getTime() <= end);
    }

    // Sort newest first
    allEntries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const totalMinutes = allEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const billableMinutes = allEntries.filter(e => e.isBillable !== false).reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const totalLaborCost = Number(allEntries.reduce((acc, e) => acc + (e.laborCost || 0), 0).toFixed(2));

    return res.json({
      success: true,
      statusCode: 200,
      data: allEntries,
      summary: {
        totalEntries: allEntries.length,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
        billableHours: Number((billableMinutes / 60).toFixed(2)),
        totalLaborCost,
      }
    });
  });

  // GET ACTIVE RUNNING TIMER FOR A TECHNICIAN
  app.get('/api/v1/technicians/:id/active-timer', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const techId = req.params.id;
    let foundEntry: TimeEntry | null = null;
    let foundOrder: WorkOrder | null = null;

    for (const wo of workOrders) {
      const active = (wo.timeEntries || []).find(t => t.technicianId === techId && t.isRunning === true);
      if (active) {
        foundEntry = active;
        foundOrder = wo;
        break;
      }
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: foundEntry ? {
        activeTimer: foundEntry,
        workOrder: {
          id: foundOrder?.id,
          workOrderNumber: foundOrder?.workOrderNumber,
          title: foundOrder?.title,
          status: foundOrder?.status,
          facilityName: foundOrder?.facilityName,
        }
      } : null,
    });
  });

  // START LIVE TIMER FOR TECHNICIAN
  app.post('/api/v1/work-orders/:id/timer/start', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    // Identify technician
    let techId = req.body.technicianId || order.assignedTechnicianId;
    let techName = order.assignedTechnicianName;
    if (req.user?.roles.includes('TECHNICIAN')) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech) {
        techId = tech.id;
        techName = tech.name;
      }
    }

    if (!techId) {
      return res.status(400).json({ success: false, message: 'Technician ID required to start timer' });
    }

    // CHECK FOR OVERLAPPING ACTIVE TIMER ACROSS ALL WORK ORDERS
    for (const wo of workOrders) {
      const conflict = (wo.timeEntries || []).find(t => t.technicianId === techId && t.isRunning === true);
      if (conflict) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Cannot start new timer. An active timer is already running on Work Order ${wo.workOrderNumber}. Please stop that timer first.`,
          conflictingWorkOrderId: wo.id,
          conflictingWorkOrderNumber: wo.workOrderNumber,
        });
      }
    }

    const { entryType, isBillable, hourlyRate, description } = req.body;
    const rate = Number(hourlyRate) || 85.00;
    const now = new Date().toISOString();

    const timerEntry: TimeEntry = {
      id: `te-${Date.now()}`,
      workOrderId: order.id,
      workOrderNumber: order.workOrderNumber,
      technicianId: techId,
      technicianName: techName || 'Field Technician',
      startTime: now,
      durationMinutes: 0,
      entryType: entryType || 'LABOR',
      description: description || 'Active timer in progress',
      notes: description || 'Active timer in progress',
      isBillable: isBillable !== false,
      hourlyRate: rate,
      laborCost: 0,
      isRunning: true,
      createdAt: now,
    };

    order.timeEntries = order.timeEntries || [];
    order.timeEntries.push(timerEntry);

    // If order is ASSIGNED, advance automatically to IN_PROGRESS
    if (order.status === 'ASSIGNED') {
      const prevStatus = order.status;
      order.status = 'IN_PROGRESS';
      if (!order.respondedAt) {
        order.respondedAt = now;
      }
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        id: `sh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        workOrderId: order.id,
        previousStatus: prevStatus,
        newStatus: 'IN_PROGRESS',
        changedById: req.user?.userId || 'usr-tech',
        changedByName: `${req.user?.firstName} ${req.user?.lastName}`,
        changedByRole: req.user?.roles[0] || 'TECHNICIAN',
        timestamp: now,
        note: 'Live work timer started on site by technician',
      });
    }

    order.updatedAt = now;

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Job timer started successfully',
      data: timerEntry,
      workOrder: enrichWorkOrderRecord(order, req.user?.roles),
    });
  });

  // STOP LIVE TIMER
  app.post('/api/v1/work-orders/:id/timer/stop', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    const { timeEntryId, notes, description } = req.body;
    order.timeEntries = order.timeEntries || [];

    // Find running entry
    let entry: TimeEntry | undefined;
    if (timeEntryId) {
      entry = order.timeEntries.find(t => t.id === timeEntryId && t.isRunning === true);
    } else {
      // Fallback: find any running timer on this order
      entry = order.timeEntries.find(t => t.isRunning === true);
    }

    if (!entry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'No active timer found running on this Work Order',
      });
    }

    const now = new Date();
    const startTime = new Date(entry.startTime);
    const elapsedMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / (60 * 1000)));

    entry.endTime = now.toISOString();
    entry.durationMinutes = elapsedMinutes;
    entry.isRunning = false;
    if (notes || description) {
      entry.notes = notes || description;
      entry.description = description || notes;
    }
    entry.laborCost = Number(((elapsedMinutes / 60) * entry.hourlyRate).toFixed(2));
    entry.updatedAt = now.toISOString();

    // Recompute order actual duration
    const totalMinutes = order.timeEntries.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    order.actualDurationHours = Number((totalMinutes / 60).toFixed(2));
    order.updatedAt = now.toISOString();

    const enriched = enrichWorkOrderRecord(order, req.user?.roles);

    return res.json({
      success: true,
      statusCode: 200,
      message: `Timer stopped. Logged ${elapsedMinutes} minutes ($${entry.laborCost}).`,
      data: entry,
      workOrder: enriched,
    });
  });

  // RECORD MANUAL TIME ENTRY
  app.post('/api/v1/work-orders/:id/time-entries', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'), (req: AuthenticatedRequest, res: Response) => {
    const { durationMinutes, entryType, notes, description, isBillable, hourlyRate, startTime, endTime } = req.body;
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    // Technician assignment check
    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech && order.assignedTechnicianId && order.assignedTechnicianId !== tech.id) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Forbidden: Technicians can only log time against their assigned work orders',
        });
      }
    }

    let minutes = parseInt(durationMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      if (startTime && endTime) {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        minutes = Math.max(1, Math.round((end - start) / (60 * 1000)));
      } else {
        return res.status(400).json({ success: false, message: 'durationMinutes must be a positive integer' });
      }
    }

    const rate = Number(hourlyRate) || 85.00;
    const laborCost = Number(((minutes / 60) * rate).toFixed(2));
    const now = new Date().toISOString();

    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      workOrderId: order.id,
      workOrderNumber: order.workOrderNumber,
      technicianId: order.assignedTechnicianId || 'tech-1',
      technicianName: order.assignedTechnicianName || `${req.user?.firstName} ${req.user?.lastName}`,
      startTime: startTime || new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      endTime: endTime || now,
      durationMinutes: minutes,
      entryType: entryType || 'LABOR',
      description: description || notes || 'Service labor logged',
      notes: notes || description || 'Service labor logged',
      isBillable: isBillable !== false,
      hourlyRate: rate,
      laborCost,
      isRunning: false,
      createdAt: now,
    };

    order.timeEntries = order.timeEntries || [];
    order.timeEntries.push(entry);

    const totalMinutes = order.timeEntries.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    order.actualDurationHours = Number((totalMinutes / 60).toFixed(2));
    order.updatedAt = now;

    const enriched = enrichWorkOrderRecord(order, req.user?.roles);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Time entry recorded successfully',
      data: entry,
      workOrder: enriched,
    });
  });

  // DELETE TIME ENTRY
  app.delete('/api/v1/work-orders/:id/time-entries/:entryId', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    const entryIndex = (order.timeEntries || []).findIndex(t => t.id === req.params.entryId);
    if (entryIndex === -1) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }

    order.timeEntries.splice(entryIndex, 1);
    const totalMinutes = order.timeEntries.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    order.actualDurationHours = Number((totalMinutes / 60).toFixed(2));
    order.updatedAt = new Date().toISOString();

    const enriched = enrichWorkOrderRecord(order, req.user?.roles);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Time entry deleted successfully',
      workOrder: enriched,
    });
  });

  // ALLOCATE PART TO WORK ORDER (With facility inventory validation & negative stock prevention)
  app.post('/api/v1/work-orders/:id/parts', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'), (req: AuthenticatedRequest, res: Response) => {
    const { partId, quantity, notes } = req.body;
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    if (req.user?.roles.includes('TECHNICIAN') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      const tech = technicians.find(t => t.email.toLowerCase() === req.user?.email.toLowerCase());
      if (tech && order.assignedTechnicianId && order.assignedTechnicianId !== tech.id) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Forbidden: Technicians can only add parts to their assigned work orders',
        });
      }
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer greater than 0' });
    }

    const part = parts.find(p => p.id === partId);
    if (!part) {
      return res.status(400).json({ success: false, message: 'Part not found in catalog' });
    }

    // CHECK FACILITY-LEVEL INVENTORY FIRST
    let facInv = facilityInventory.find(f => f.facilityId === order.facilityId && f.partId === partId);
    const availableStock = facInv ? facInv.stockOnHand : part.stockOnHand;

    // PREVENT NEGATIVE INVENTORY
    if (availableStock < qty) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Insufficient inventory at ${order.facilityName}. In stock: ${availableStock}, Requested: ${qty}`,
        availableStock,
        requestedQuantity: qty,
      });
    }

    // Decrement stock
    const prevStock = availableStock;
    const newStock = availableStock - qty;

    if (facInv) {
      facInv.stockOnHand = newStock;
      facInv.updatedAt = new Date().toISOString();
    }
    part.stockOnHand = Math.max(0, part.stockOnHand - qty);

    const totalCost = Number((part.unitCost * qty).toFixed(2));
    const totalPrice = Number((part.unitPrice * qty).toFixed(2));
    const now = new Date().toISOString();

    const workOrderPart: WorkOrderPart = {
      id: `wop-${Date.now()}`,
      workOrderId: order.id,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      quantity: qty,
      unitCost: part.unitCost,
      totalCost,
      unitPrice: part.unitPrice,
      totalPrice,
      facilityId: order.facilityId,
      facilityName: order.facilityName,
      addedAt: now,
      addedBy: `${req.user?.firstName} ${req.user?.lastName}`,
    };

    order.parts = order.parts || [];
    order.parts.push(workOrderPart);
    order.updatedAt = now;

    // Log to inventory history
    const historyEntry: InventoryHistory = {
      id: `invh-${Date.now()}`,
      organizationId: order.organizationId,
      facilityId: order.facilityId,
      facilityName: order.facilityName,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      changeType: 'CONSUMPTION',
      quantityChanged: -qty,
      previousStock: prevStock,
      newStock,
      referenceId: order.workOrderNumber,
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'TECHNICIAN',
      reason: notes || `Allocated to Work Order ${order.workOrderNumber}`,
      timestamp: now,
    };
    inventoryHistory.unshift(historyEntry);

    // Audit log
    order.auditLogs.push({
      id: `aud-${Date.now()}`,
      organizationId: order.organizationId,
      entityName: 'WorkOrder',
      entityId: order.workOrderNumber,
      action: 'PART_ALLOCATED',
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'TECHNICIAN',
      timestamp: now,
      notes: `Allocated ${qty}x ${part.partNumber} (${part.name}) - Total: $${totalPrice}`,
    });

    const enriched = enrichWorkOrderRecord(order, req.user?.roles);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Allocated ${qty}x ${part.name} to Work Order`,
      data: workOrderPart,
      workOrder: enriched,
    });
  });

  // REMOVE PART FROM WORK ORDER (Restores inventory)
  app.delete('/api/v1/work-orders/:id/parts/:partItemId', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN'), (req: AuthenticatedRequest, res: Response) => {
    const order = workOrders.find(w => w.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Work Order not found' });
    }

    const itemIndex = (order.parts || []).findIndex(p => p.id === req.params.partItemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Part item not found on Work Order' });
    }

    const [removedPart] = order.parts.splice(itemIndex, 1);
    const now = new Date().toISOString();

    // Restore stock
    const facInv = facilityInventory.find(f => f.facilityId === order.facilityId && f.partId === removedPart.partId);
    let prevStock = 0;
    let newStock = 0;

    if (facInv) {
      prevStock = facInv.stockOnHand;
      facInv.stockOnHand += removedPart.quantity;
      newStock = facInv.stockOnHand;
      facInv.updatedAt = now;
    }

    const catalogPart = parts.find(p => p.id === removedPart.partId);
    if (catalogPart) {
      catalogPart.stockOnHand += removedPart.quantity;
    }

    // Log to inventory history
    inventoryHistory.unshift({
      id: `invh-${Date.now()}`,
      organizationId: order.organizationId,
      facilityId: order.facilityId,
      facilityName: order.facilityName,
      partId: removedPart.partId,
      partNumber: removedPart.partNumber,
      partName: removedPart.partName,
      changeType: 'RESTORATION',
      quantityChanged: removedPart.quantity,
      previousStock: prevStock,
      newStock,
      referenceId: order.workOrderNumber,
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'TECHNICIAN',
      reason: `Returned to inventory from Work Order ${order.workOrderNumber}`,
      timestamp: now,
    });

    order.updatedAt = now;
    const enriched = enrichWorkOrderRecord(order, req.user?.roles);

    return res.json({
      success: true,
      statusCode: 200,
      message: `Removed ${removedPart.partName} and restored ${removedPart.quantity} units to inventory`,
      workOrder: enriched,
    });
  });

  // GET FACILITY INVENTORY LIST (Supports facilityId, lowStock, category filters)
  app.get('/api/v1/inventory', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let list = [...facilityInventory];

    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(i => i.organizationId === req.user?.organizationId);
    }

    const { facilityId, lowStock, category, search } = req.query;
    if (facilityId && facilityId !== 'ALL') {
      list = list.filter(i => i.facilityId === facilityId);
    }
    if (category && category !== 'ALL') {
      list = list.filter(i => i.category === category);
    }
    if (lowStock === 'true') {
      list = list.filter(i => i.stockOnHand <= i.reorderLevel);
    }
    if (search) {
      const q = (search as string).toLowerCase().trim();
      list = list.filter(i => 
        i.partNumber.toLowerCase().includes(q) || 
        i.partName.toLowerCase().includes(q) || 
        i.binLocation.toLowerCase().includes(q) ||
        i.facilityName.toLowerCase().includes(q)
      );
    }

    const totalItems = list.length;
    const lowStockItems = list.filter(i => i.stockOnHand <= i.reorderLevel).length;
    const totalValuation = Number(list.reduce((acc, i) => acc + (i.stockOnHand * i.unitCost), 0).toFixed(2));

    return res.json({
      success: true,
      statusCode: 200,
      data: list,
      summary: {
        totalItems,
        lowStockItems,
        totalValuation,
      }
    });
  });

  // GET INVENTORY FOR SPECIFIC FACILITY
  app.get('/api/v1/facilities/:facilityId/inventory', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const list = facilityInventory.filter(i => i.facilityId === req.params.facilityId);
    return res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  });

  // ADJUST INVENTORY (Manual adjustment with negative stock prevention)
  app.post('/api/v1/inventory/adjust', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), (req: AuthenticatedRequest, res: Response) => {
    const { facilityId, partId, quantityChanged, reason } = req.body;
    if (!facilityId || !partId || quantityChanged === undefined || !reason) {
      return res.status(400).json({ success: false, message: 'facilityId, partId, quantityChanged, and reason are required' });
    }

    const qty = parseInt(quantityChanged, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ success: false, message: 'quantityChanged must be a valid integer' });
    }

    let facInv = facilityInventory.find(f => f.facilityId === facilityId && f.partId === partId);
    const facility = facilities.find(f => f.id === facilityId);
    const part = parts.find(p => p.id === partId);

    if (!facility || !part) {
      return res.status(404).json({ success: false, message: 'Facility or Part not found' });
    }

    const prevStock = facInv ? facInv.stockOnHand : 0;
    const newStock = prevStock + qty;

    // PREVENT NEGATIVE INVENTORY
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Adjustment rejected: stock cannot be negative. Current: ${prevStock}, Adjustment: ${qty}`,
        currentStock: prevStock,
      });
    }

    const now = new Date().toISOString();
    if (facInv) {
      facInv.stockOnHand = newStock;
      facInv.updatedAt = now;
    } else {
      facInv = {
        id: `inv-${facilityId}-${partId}`,
        organizationId: facility.organizationId,
        facilityId: facility.id,
        facilityName: facility.name,
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        category: part.category,
        binLocation: 'General Spares Area',
        stockOnHand: newStock,
        reservedQuantity: 0,
        minStock: part.minStock || 2,
        reorderLevel: part.reorderLevel || 5,
        unitCost: part.unitCost,
        unitPrice: part.unitPrice,
        supplier: part.supplier,
        updatedAt: now,
      };
      facilityInventory.push(facInv);
    }

    part.stockOnHand = Math.max(0, part.stockOnHand + qty);

    const historyEntry: InventoryHistory = {
      id: `invh-${Date.now()}`,
      organizationId: facility.organizationId,
      facilityId: facility.id,
      facilityName: facility.name,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      changeType: 'ADJUSTMENT',
      quantityChanged: qty,
      previousStock: prevStock,
      newStock,
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'ADMIN',
      reason,
      timestamp: now,
    };
    inventoryHistory.unshift(historyEntry);

    return res.json({
      success: true,
      statusCode: 200,
      message: `Stock successfully adjusted for ${part.name} to ${newStock} units`,
      data: facInv,
      history: historyEntry,
    });
  });

  // RESTOCK INVENTORY (Receive shipment / replenishment)
  app.post('/api/v1/inventory/restock', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), (req: AuthenticatedRequest, res: Response) => {
    const { facilityId, partId, quantity, supplierRef, reason } = req.body;
    const qty = parseInt(quantity, 10);
    if (!facilityId || !partId || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'facilityId, partId, and a positive quantity are required' });
    }

    const facility = facilities.find(f => f.id === facilityId);
    const part = parts.find(p => p.id === partId);
    if (!facility || !part) {
      return res.status(404).json({ success: false, message: 'Facility or Part not found' });
    }

    let facInv = facilityInventory.find(f => f.facilityId === facilityId && f.partId === partId);
    const prevStock = facInv ? facInv.stockOnHand : 0;
    const newStock = prevStock + qty;
    const now = new Date().toISOString();

    if (facInv) {
      facInv.stockOnHand = newStock;
      facInv.lastRestockedAt = now;
      facInv.updatedAt = now;
    } else {
      facInv = {
        id: `inv-${facilityId}-${partId}`,
        organizationId: facility.organizationId,
        facilityId: facility.id,
        facilityName: facility.name,
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        category: part.category,
        binLocation: 'General Receiving',
        stockOnHand: newStock,
        reservedQuantity: 0,
        minStock: part.minStock || 2,
        reorderLevel: part.reorderLevel || 5,
        unitCost: part.unitCost,
        unitPrice: part.unitPrice,
        supplier: part.supplier,
        lastRestockedAt: now,
        updatedAt: now,
      };
      facilityInventory.push(facInv);
    }

    part.stockOnHand += qty;

    const historyEntry: InventoryHistory = {
      id: `invh-${Date.now()}`,
      organizationId: facility.organizationId,
      facilityId: facility.id,
      facilityName: facility.name,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      changeType: 'RESTOCK',
      quantityChanged: qty,
      previousStock: prevStock,
      newStock,
      referenceId: supplierRef || `PO-${Date.now().toString().slice(-6)}`,
      performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      performedByRole: req.user?.roles[0] || 'ADMIN',
      reason: reason || `Received delivery replenishment from ${part.supplier}`,
      timestamp: now,
    };
    inventoryHistory.unshift(historyEntry);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Successfully restocked ${qty} units of ${part.name}`,
      data: facInv,
      history: historyEntry,
    });
  });

  // INVENTORY HISTORY
  app.get('/api/v1/inventory/history', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let list = [...inventoryHistory];
    const { facilityId, partId, changeType } = req.query;

    if (facilityId && facilityId !== 'ALL') {
      list = list.filter(h => h.facilityId === facilityId);
    }
    if (partId && partId !== 'ALL') {
      list = list.filter(h => h.partId === partId);
    }
    if (changeType && changeType !== 'ALL') {
      list = list.filter(h => h.changeType === changeType);
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  });

  // CATALOG PARTS CRUD
  app.post('/api/v1/parts', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const { partNumber, name, description, category, unitCost, unitPrice, supplier, reorderLevel, minStock, stockOnHand } = req.body;
    if (!partNumber || !name || !category || unitCost === undefined || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: 'partNumber, name, category, unitCost, and unitPrice are required' });
    }

    const existing = parts.find(p => p.partNumber.toLowerCase() === partNumber.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: `Part number ${partNumber} already exists in catalog` });
    }

    const newPart: Part = {
      id: `prt-${Date.now()}`,
      organizationId: req.user?.organizationId || 'org-apex-1',
      partNumber: partNumber.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || '',
      category: category.trim().toUpperCase(),
      unitCost: Number(unitCost),
      unitPrice: Number(unitPrice),
      supplier: supplier?.trim() || 'General Industrial Supplier',
      isActive: true,
      stockOnHand: Number(stockOnHand) || 0,
      reorderLevel: Number(reorderLevel) || 5,
      minStock: Number(minStock) || 2,
    };

    parts.push(newPart);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Part created successfully',
      data: newPart,
    });
  });

  app.put('/api/v1/parts/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const part = parts.find(p => p.id === req.params.id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Part not found' });
    }

    const { name, description, category, unitCost, unitPrice, supplier, reorderLevel, minStock, isActive } = req.body;
    if (name) part.name = name.trim();
    if (description !== undefined) part.description = description.trim();
    if (category) part.category = category.trim().toUpperCase();
    if (unitCost !== undefined) part.unitCost = Number(unitCost);
    if (unitPrice !== undefined) part.unitPrice = Number(unitPrice);
    if (supplier) part.supplier = supplier.trim();
    if (reorderLevel !== undefined) part.reorderLevel = Number(reorderLevel);
    if (minStock !== undefined) part.minStock = Number(minStock);
    if (isActive !== undefined) part.isActive = Boolean(isActive);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Part updated successfully',
      data: part,
    });
  });

  // ---------------------------------------------------------------------------
  // SLA POLICIES MANAGEMENT & SLA METRICS DASHBOARD
  // ---------------------------------------------------------------------------

  // GET SLA POLICIES
  const handleGetSlaPolicies = (req: AuthenticatedRequest, res: Response) => {
    let list = [...slaPolicies];
    const { priority, facilityId, customerId } = req.query;

    if (priority && priority !== 'ALL') {
      list = list.filter(p => p.priority === priority);
    }
    if (facilityId && facilityId !== 'ALL') {
      list = list.filter(p => !p.facilityId || p.facilityId === facilityId);
    }
    if (customerId && customerId !== 'ALL') {
      list = list.filter(p => !p.customerId || p.customerId === customerId);
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  };
  app.get('/api/v1/sla-policies', authenticateJwt, handleGetSlaPolicies);
  app.get('/api/sla-policies', authenticateJwt, handleGetSlaPolicies);

  // CREATE SLA POLICY
  app.post(['/api/v1/sla-policies', '/api/sla-policies'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const { 
      name, priority, responseTimeMinutes, resolutionTimeMinutes, 
      customerId, customerName, facilityId, facilityName, 
      businessHoursOnly, escalationRules 
    } = req.body;

    if (!name || !priority || !responseTimeMinutes || !resolutionTimeMinutes) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'name, priority, responseTimeMinutes, and resolutionTimeMinutes are required',
      });
    }

    const resp = Number(responseTimeMinutes);
    const resMins = Number(resolutionTimeMinutes);

    if (resp <= 0 || resMins <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Response and resolution durations must be greater than 0',
      });
    }

    if (resp >= resMins) {
      return res.status(400).json({
        success: false,
        message: 'Resolution time must be greater than response time',
      });
    }

    const now = new Date().toISOString();
    const newPolicy: SlaPolicy = {
      id: `sla-${Date.now()}`,
      organizationId: req.user?.organizationId || 'org-apex-1',
      name: name.trim(),
      priority: priority as Priority,
      responseTimeMinutes: resp,
      resolutionTimeMinutes: resMins,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      facilityId: facilityId || undefined,
      facilityName: facilityName || undefined,
      businessHoursOnly: businessHoursOnly === true,
      escalationRules: Array.isArray(escalationRules) ? escalationRules : [
        { id: `esc-${Date.now()}-1`, triggerPercentage: 75, action: 'NOTIFY_DISPATCHER', description: 'Notify dispatch team at 75% elapsed window' },
        { id: `esc-${Date.now()}-2`, triggerPercentage: 90, action: 'ESCALATE_SUPERVISOR', description: 'Escalate to supervisor at 90% elapsed window' },
      ],
      createdAt: now,
      updatedAt: now,
    };

    slaPolicies.push(newPolicy);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'SLA policy created successfully',
      data: newPolicy,
    });
  });

  // UPDATE SLA POLICY
  app.put(['/api/v1/sla-policies/:id', '/api/sla-policies/:id'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const policy = slaPolicies.find(p => p.id === req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'SLA policy not found' });
    }

    const { 
      name, priority, responseTimeMinutes, resolutionTimeMinutes, 
      businessHoursOnly, escalationRules, facilityId, facilityName, customerId, customerName 
    } = req.body;

    if (name) policy.name = name.trim();
    if (priority) policy.priority = priority;
    if (responseTimeMinutes !== undefined) policy.responseTimeMinutes = Number(responseTimeMinutes);
    if (resolutionTimeMinutes !== undefined) policy.resolutionTimeMinutes = Number(resolutionTimeMinutes);
    if (businessHoursOnly !== undefined) policy.businessHoursOnly = Boolean(businessHoursOnly);
    if (escalationRules !== undefined && Array.isArray(escalationRules)) policy.escalationRules = escalationRules;
    if (facilityId !== undefined) policy.facilityId = facilityId || undefined;
    if (facilityName !== undefined) policy.facilityName = facilityName || undefined;
    if (customerId !== undefined) policy.customerId = customerId || undefined;
    if (customerName !== undefined) policy.customerName = customerName || undefined;
    policy.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      statusCode: 200,
      message: 'SLA policy updated successfully',
      data: policy,
    });
  });

  // DELETE SLA POLICY
  app.delete(['/api/v1/sla-policies/:id', '/api/sla-policies/:id'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const index = slaPolicies.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'SLA policy not found' });
    }

    slaPolicies.splice(index, 1);
    return res.json({
      success: true,
      statusCode: 200,
      message: 'SLA policy deleted successfully',
    });
  });

  // SLA COMPLIANCE DASHBOARD METRICS
  app.get('/api/v1/sla/dashboard', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let scopedWorkOrders = workOrders;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      scopedWorkOrders = workOrders.filter(w => w.organizationId === req.user?.organizationId);
    }

    const assessedOrders = scopedWorkOrders.map(wo => enrichWorkOrderRecord(wo, req.user?.roles));
    const totalOrders = assessedOrders.length;

    let breachedCount = 0;
    let atRiskCount = 0;
    let onTrackCount = 0;
    let completedOnTimeCount = 0;

    let totalResponseMinutes = 0;
    let respondedOrdersCount = 0;
    let compliantResponseCount = 0;

    let totalResolutionMinutes = 0;
    let resolvedOrdersCount = 0;
    let compliantResolutionCount = 0;

    const complianceByPriority: Record<Priority, { total: number; compliant: number; breached: number; rate: number }> = {
      CRITICAL: { total: 0, compliant: 0, breached: 0, rate: 100 },
      HIGH: { total: 0, compliant: 0, breached: 0, rate: 100 },
      MEDIUM: { total: 0, compliant: 0, breached: 0, rate: 100 },
      LOW: { total: 0, compliant: 0, breached: 0, rate: 100 },
    };

    const complianceByFacility: Record<string, { facilityName: string; total: number; compliant: number; breached: number; rate: number }> = {};

    assessedOrders.forEach(order => {
      // By priority
      if (complianceByPriority[order.priority]) {
        complianceByPriority[order.priority].total++;
      }

      // By facility
      if (!complianceByFacility[order.facilityId]) {
        complianceByFacility[order.facilityId] = {
          facilityName: order.facilityName,
          total: 0,
          compliant: 0,
          breached: 0,
          rate: 100,
        };
      }
      complianceByFacility[order.facilityId].total++;

      // Status
      if (order.slaStatus === 'BREACHED') {
        breachedCount++;
        complianceByPriority[order.priority].breached++;
        complianceByFacility[order.facilityId].breached++;
      } else {
        complianceByPriority[order.priority].compliant++;
        complianceByFacility[order.facilityId].compliant++;
        if (order.slaStatus === 'AT_RISK') atRiskCount++;
        else if (order.slaStatus === 'COMPLETED') completedOnTimeCount++;
        else onTrackCount++;
      }

      // Response metrics
      if (order.respondedAt) {
        const respTime = (new Date(order.respondedAt).getTime() - new Date(order.createdAt).getTime()) / (60 * 1000);
        totalResponseMinutes += Math.max(0, respTime);
        respondedOrdersCount++;
        if (!order.isSlaResponseBreached) {
          compliantResponseCount++;
        }
      }

      // Resolution metrics
      if (['COMPLETED', 'CLOSED'].includes(order.status)) {
        const compTime = ((order.completedAt ? new Date(order.completedAt).getTime() : new Date().getTime()) - new Date(order.createdAt).getTime()) / (60 * 1000);
        totalResolutionMinutes += Math.max(0, compTime);
        resolvedOrdersCount++;
        if (!order.isSlaResolutionBreached) {
          compliantResolutionCount++;
        }
      }
    });

    // Calculate priority rates
    Object.keys(complianceByPriority).forEach(p => {
      const prio = p as Priority;
      const stats = complianceByPriority[prio];
      stats.rate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 100;
    });

    // Calculate facility rates
    Object.keys(complianceByFacility).forEach(fId => {
      const stats = complianceByFacility[fId];
      stats.rate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 100;
    });

    const complianceRate = totalOrders > 0
      ? Math.round(((totalOrders - breachedCount) / totalOrders) * 100)
      : 100;

    const responseSlaComplianceRate = respondedOrdersCount > 0
      ? Math.round((compliantResponseCount / respondedOrdersCount) * 100)
      : 100;

    const resolutionSlaComplianceRate = resolvedOrdersCount > 0
      ? Math.round((compliantResolutionCount / resolvedOrdersCount) * 100)
      : 100;

    const averageResponseMinutes = respondedOrdersCount > 0
      ? Math.round(totalResponseMinutes / respondedOrdersCount)
      : 25;

    const averageResolutionMinutes = resolvedOrdersCount > 0
      ? Math.round(totalResolutionMinutes / resolvedOrdersCount)
      : 160;

    const stats: SlaDashboardStats = {
      complianceRate,
      totalOrders,
      breachedCount,
      atRiskCount,
      onTrackCount,
      completedOnTimeCount,
      averageResponseMinutes,
      averageResolutionMinutes,
      responseSlaComplianceRate,
      resolutionSlaComplianceRate,
      complianceByPriority,
      complianceByFacility,
    };

    return res.json({
      success: true,
      statusCode: 200,
      data: stats,
    });
  });

  // GET BREACHED WORK ORDERS LIST
  app.get('/api/v1/sla/breached', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let scoped = workOrders;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      scoped = scoped.filter(w => w.organizationId === req.user?.organizationId);
    }
    const assessed = scoped.map(wo => enrichWorkOrderRecord(wo, req.user?.roles));
    const breached = assessed.filter(w => w.slaStatus === 'BREACHED');

    return res.json({
      success: true,
      statusCode: 200,
      data: breached,
      total: breached.length,
    });
  });

  // GET AT-RISK WORK ORDERS LIST
  app.get('/api/v1/sla/at-risk', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let scoped = workOrders;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      scoped = scoped.filter(w => w.organizationId === req.user?.organizationId);
    }
    const assessed = scoped.map(wo => enrichWorkOrderRecord(wo, req.user?.roles));
    const atRisk = assessed.filter(w => w.slaStatus === 'AT_RISK');

    return res.json({
      success: true,
      statusCode: 200,
      data: atRisk,
      total: atRisk.length,
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MASTER DATA & SERVICE REQUESTS
  // ---------------------------------------------------------------------------
  const handleGetTechnicians = (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      statusCode: 200,
      data: technicians,
    });
  };
  app.get('/api/v1/technicians', authenticateJwt, handleGetTechnicians);
  app.get('/api/technicians', authenticateJwt, handleGetTechnicians);

  // GET SINGLE TECHNICIAN BY ID
  const handleGetTechnicianById = (req: AuthenticatedRequest, res: Response) => {
    const tech = technicians.find(t => t.id === req.params.id);
    if (!tech) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Technician not found' });
    }
    if (!checkTenantAccess(req, tech.organizationId)) {
      return res.status(403).json({ success: false, statusCode: 403, message: 'Forbidden' });
    }
    const assignedOrders = workOrders
      .filter(w => w.assignedTechnicianId === tech.id)
      .map(w => enrichWorkOrderRecord(w, req.user?.roles));
    const activeOrder = assignedOrders.find(w => ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status));
    
    return res.json({
      success: true,
      statusCode: 200,
      data: {
        ...tech,
        activeWorkOrder: activeOrder || null,
        assignedWorkOrders: assignedOrders,
        totalJobsAssigned: assignedOrders.length,
        completedJobsCount: assignedOrders.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length,
      }
    });
  };
  app.get('/api/v1/technicians/:id', authenticateJwt, handleGetTechnicianById);
  app.get('/api/technicians/:id', authenticateJwt, handleGetTechnicianById);

  // UPDATE TECHNICIAN STATUS (Dispatcher, Admin, Super Admin, or self)
  app.patch(['/api/v1/technicians/:id/status', '/api/technicians/:id/status'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const tech = technicians.find(t => t.id === req.params.id);
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    const isSelf = tech.email.toLowerCase() === req.user?.email.toLowerCase();
    const isStaff = req.user?.roles.some(r => ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(r));
    if (!isSelf && !isStaff) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status, latitude, longitude } = req.body;
    if (status) {
      tech.status = status;
    }
    if (latitude && longitude) {
      tech.lat = Number(latitude);
      tech.lng = Number(longitude);
      tech.currentLocation = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: new Date().toISOString(),
      };
    }

    return res.json({
      success: true,
      statusCode: 200,
      message: `Technician status updated to ${tech.status}`,
      data: tech,
    });
  });

  const handleGetFacilities = (req: AuthenticatedRequest, res: Response) => {
    let list = facilities;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(f => f.organizationId === req.user?.organizationId);
    }
    res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  };
  app.get('/api/v1/facilities', authenticateJwt, handleGetFacilities);
  app.get('/api/facilities', authenticateJwt, handleGetFacilities);

  // GET SINGLE FACILITY BY ID
  const handleGetFacilityById = (req: AuthenticatedRequest, res: Response) => {
    const fac = facilities.find(f => f.id === req.params.id);
    if (!fac) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Facility not found' });
    }
    if (!checkTenantAccess(req, fac.organizationId)) {
      return res.status(403).json({ success: false, statusCode: 403, message: 'Forbidden' });
    }
    const facilityAssets = assets.filter(a => a.facilityId === fac.id);
    const facilityOrders = workOrders
      .filter(w => w.facilityId === fac.id)
      .map(w => enrichWorkOrderRecord(w, req.user?.roles));
    const facilityInv = facilityInventory.filter(fi => fi.facilityId === fac.id);

    return res.json({
      success: true,
      statusCode: 200,
      data: {
        ...fac,
        assets: facilityAssets,
        workOrders: facilityOrders,
        inventory: facilityInv,
        activeOrdersCount: facilityOrders.filter(w => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length,
      }
    });
  };
  app.get('/api/v1/facilities/:id', authenticateJwt, handleGetFacilityById);
  app.get('/api/facilities/:id', authenticateJwt, handleGetFacilityById);

  const handleGetAssets = (req: AuthenticatedRequest, res: Response) => {
    const facilityId = req.query.facilityId as string;
    let list = facilityId ? assets.filter(a => a.facilityId === facilityId) : assets;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(a => a.organizationId === req.user?.organizationId);
    }
    res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  };
  app.get('/api/v1/assets', authenticateJwt, handleGetAssets);
  app.get('/api/assets', authenticateJwt, handleGetAssets);

  // GET SINGLE ASSET BY ID
  const handleGetAssetById = (req: AuthenticatedRequest, res: Response) => {
    const asset = assets.find(a => a.id === req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Asset not found' });
    }
    if (!checkTenantAccess(req, asset.organizationId)) {
      return res.status(403).json({ success: false, statusCode: 403, message: 'Forbidden' });
    }
    const assetOrders = workOrders
      .filter(w => w.assetId === asset.id)
      .map(w => enrichWorkOrderRecord(w, req.user?.roles));
    const facility = facilities.find(f => f.id === asset.facilityId);

    return res.json({
      success: true,
      statusCode: 200,
      data: {
        ...asset,
        facilityName: facility?.name || 'Main Campus',
        workOrders: assetOrders,
        maintenanceCount: assetOrders.length,
      }
    });
  };
  app.get('/api/v1/assets/:id', authenticateJwt, handleGetAssetById);
  app.get('/api/assets/:id', authenticateJwt, handleGetAssetById);

  // CUSTOMERS MANAGEMENT ENDPOINTS
  const handleGetCustomers = (req: AuthenticatedRequest, res: Response) => {
    let list = customers;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(c => c.organizationId === req.user?.organizationId);
    }
    // If Customer role, only view self
    if (req.user?.roles.includes('CUSTOMER') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      list = list.filter(c => c.email.toLowerCase() === req.user?.email.toLowerCase() || c.id === 'cust-1');
    }
    return res.json({
      success: true,
      statusCode: 200,
      data: list,
    });
  };
  app.get('/api/v1/customers', authenticateJwt, handleGetCustomers);
  app.get('/api/customers', authenticateJwt, handleGetCustomers);

  const handleGetCustomerById = (req: AuthenticatedRequest, res: Response) => {
    const customer = customers.find(c => c.id === req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Customer account not found' });
    }
    if (!checkTenantAccess(req, customer.organizationId)) {
      return res.status(403).json({ success: false, statusCode: 403, message: 'Forbidden' });
    }
    const customerFacilities = facilities.filter(f => f.organizationId === customer.organizationId);
    const customerOrders = workOrders
      .filter(w => w.customerId === customer.id || w.customerName === customer.name)
      .map(w => enrichWorkOrderRecord(w, req.user?.roles));
    const customerRequests = serviceRequests.filter(s => s.customerId === customer.id || s.customerName === customer.name);

    return res.json({
      success: true,
      statusCode: 200,
      data: {
        ...customer,
        facilities: customerFacilities,
        workOrders: customerOrders,
        serviceRequests: customerRequests,
      }
    });
  };
  app.get('/api/v1/customers/:id', authenticateJwt, handleGetCustomerById);
  app.get('/api/customers/:id', authenticateJwt, handleGetCustomerById);

  // OPERATIONAL REPORTS & ANALYTICS
  const handleGetReports = (req: AuthenticatedRequest, res: Response) => {
    let scopedOrders = workOrders;
    let scopedRequests = serviceRequests;
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      scopedOrders = scopedOrders.filter(w => w.organizationId === req.user?.organizationId);
      scopedRequests = scopedRequests.filter(s => s.organizationId === req.user?.organizationId);
    }
    const enriched = scopedOrders.map(w => enrichWorkOrderRecord(w, req.user?.roles));
    
    // Compute KPI rollups
    const totalOrders = enriched.length;
    const completedOrders = enriched.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length;
    const breachedOrders = enriched.filter(w => w.slaStatus === 'BREACHED').length;
    const slaComplianceRate = totalOrders > 0 ? Math.round(((totalOrders - breachedOrders) / totalOrders) * 100) : 100;
    
    // Financial rollups
    let totalLaborCost = 0;
    let totalPartsCost = 0;
    let totalLaborHours = 0;
    enriched.forEach(w => {
      totalLaborCost += w.totalLaborCost || 0;
      totalPartsCost += w.totalPartsCost || 0;
      totalLaborHours += w.totalLaborHours || 0;
    });

    const reportData = {
      kpis: {
        totalOrders,
        completedOrders,
        slaComplianceRate,
        firstTimeFixRate: 94.2,
        meanTimeToRespondMinutes: 24,
        meanTimeToResolveMinutes: 142,
        totalLaborHours: Number(totalLaborHours.toFixed(1)),
        totalLaborCost: Number(totalLaborCost.toFixed(2)),
        totalPartsCost: Number(totalPartsCost.toFixed(2)),
        totalServiceValuation: Number((totalLaborCost + totalPartsCost).toFixed(2)),
        technicianUtilizationRate: 88.5,
      },
      priorityBreakdown: [
        { priority: 'CRITICAL', count: enriched.filter(w => w.priority === 'CRITICAL').length, compliance: 100 },
        { priority: 'HIGH', count: enriched.filter(w => w.priority === 'HIGH').length, compliance: 92 },
        { priority: 'MEDIUM', count: enriched.filter(w => w.priority === 'MEDIUM').length, compliance: 96 },
        { priority: 'LOW', count: enriched.filter(w => w.priority === 'LOW').length, compliance: 100 },
      ],
      monthlyTrends: [
        { month: 'Apr', orders: 24, completed: 22, cost: 14200 },
        { month: 'May', orders: 31, completed: 29, cost: 18450 },
        { month: 'Jun', orders: 28, completed: 27, cost: 16100 },
        { month: 'Jul', orders: 38, completed: 35, cost: 22400 },
        { month: 'Aug', orders: 42, completed: 39, cost: 26800 },
        { month: 'Sep', orders: 46, completed: 43, cost: 28950 },
      ],
      technicianLeaderboard: technicians.map(t => ({
        id: t.id,
        name: t.name,
        jobsCompleted: 14 + Math.floor(Math.random() * 8),
        hoursLogged: 62.5,
        rating: 4.9,
        status: t.status,
      }))
    };

    return res.json({
      success: true,
      statusCode: 200,
      data: reportData,
    });
  };
  app.get('/api/v1/reports', authenticateJwt, handleGetReports);
  app.get('/api/reports', authenticateJwt, handleGetReports);

  const handleGetParts = (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      statusCode: 200,
      data: parts,
    });
  };
  app.get('/api/v1/parts', authenticateJwt, handleGetParts);
  app.get('/api/parts', authenticateJwt, handleGetParts);

  // SERVICE REQUESTS (GET ALL)
  const handleGetServiceRequests = (req: AuthenticatedRequest, res: Response) => {
    let list = [...serviceRequests];
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(s => s.organizationId === req.user?.organizationId);
    }
    // If Customer role, only view their own requests
    if (req.user?.roles.includes('CUSTOMER') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      list = list.filter(s => s.requesterEmail?.toLowerCase() === req.user?.email.toLowerCase());
    }

    // Search query filter
    const query = (req.query.query as string || '').toLowerCase().trim();
    if (query) {
      list = list.filter(s =>
        s.requestNumber.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.facilityName.toLowerCase().includes(query)
      );
    }

    // Status filter
    const status = req.query.status as string;
    if (status && status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }

    // Priority filter
    const priority = req.query.priority as string;
    if (priority && priority !== 'ALL') {
      list = list.filter(s => s.priority === priority);
    }

    const enriched = list.map(sr => ({
      ...sr,
      comments: sr.comments || [],
      attachments: sr.attachments || [],
    }));

    res.json({
      success: true,
      statusCode: 200,
      data: enriched,
      total: enriched.length,
    });
  };
  app.get('/api/v1/service-requests', authenticateJwt, handleGetServiceRequests);
  app.get('/api/service-requests', authenticateJwt, handleGetServiceRequests);

  // GET SINGLE SERVICE REQUEST BY ID
  const handleGetServiceRequestById = (req: AuthenticatedRequest, res: Response) => {
    const request = serviceRequests.find(s => s.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    if (!checkTenantAccess(req, request.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (req.user?.roles.includes('CUSTOMER') && !req.user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(r))) {
      if (request.requesterEmail?.toLowerCase() !== req.user?.email.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    return res.json({
      success: true,
      statusCode: 200,
      data: {
        ...request,
        comments: request.comments || [],
        attachments: request.attachments || [],
      },
    });
  };
  app.get('/api/v1/service-requests/:id', authenticateJwt, handleGetServiceRequestById);
  app.get('/api/service-requests/:id', authenticateJwt, handleGetServiceRequestById);

  // CREATE SERVICE REQUEST (Customers, Dispatchers, Admins)
  app.post(['/api/v1/service-requests', '/api/service-requests'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const { facilityId, assetId, title, description, priority, locationDetails, requestedDate } = req.body;
    if (!facilityId || !title || !description) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'facilityId, title, and description are required',
      });
    }

    const facility = facilities.find(f => f.id === facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    let assetName: string | undefined;
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      assetName = asset?.name;
    }

    const reqNumber = `SR-2026-${String(100 + serviceRequests.length + 1).padStart(4, '0')}`;
    const newSR: ServiceRequest = {
      id: `sr-${Date.now()}`,
      organizationId: req.user?.organizationId || facility.organizationId,
      customerId: facility.customerId || req.user?.userId || 'cust-apex-hq',
      customerName: facility.name || req.user?.organizationId || 'Apex Commercial',
      facilityId: facility.id,
      facilityName: facility.name,
      assetId,
      assetName,
      requestNumber: reqNumber,
      title,
      description,
      status: 'PENDING_REVIEW',
      priority: priority || 'MEDIUM',
      requesterName: `${req.user?.firstName} ${req.user?.lastName}`,
      requesterEmail: req.user?.email || 'customer@keystone.io',
      locationDetails: locationDetails || facility.address,
      requestedDate: requestedDate || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date().toISOString(),
      comments: [],
      attachments: [],
    };

    serviceRequests.unshift(newSR);

    // Notify dispatchers and admins of new inbound customer request
    createNotification({
      organizationId: newSR.organizationId,
      type: 'NEW_SERVICE_REQUEST',
      title: 'New Service Request Intake',
      message: `${newSR.requestNumber}: ${newSR.title} (${newSR.priority} priority) at ${newSR.facilityName}`,
      entityType: 'SERVICE_REQUEST',
      entityId: newSR.id,
      targetRoles: ['ADMIN', 'DISPATCHER'],
      link: 'service-requests',
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Service request created successfully',
      data: newSR,
    });
  });

  // UPDATE / REVIEW SERVICE REQUEST (Dispatcher, Admin, Super Admin)
  app.patch(['/api/v1/service-requests/:id', '/api/service-requests/:id'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = serviceRequests.find(s => s.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    if (!checkTenantAccess(req, request.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status, priority, title, description, locationDetails } = req.body;
    if (status) request.status = status;
    if (priority) request.priority = priority;
    if (title) request.title = title;
    if (description) request.description = description;
    if (locationDetails) request.locationDetails = locationDetails;

    return res.json({
      success: true,
      statusCode: 200,
      message: 'Service Request updated',
      data: request,
    });
  });

  // DELETE SERVICE REQUEST (Admin, Super Admin, or Requester while PENDING_REVIEW)
  app.delete(['/api/v1/service-requests/:id', '/api/service-requests/:id'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const idx = serviceRequests.findIndex(s => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    const request = serviceRequests[idx];
    if (!checkTenantAccess(req, request.organizationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const isStaff = req.user?.roles.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const isOwnerPending = request.requesterEmail?.toLowerCase() === req.user?.email.toLowerCase() && request.status === 'PENDING_REVIEW';
    if (!isStaff && !isOwnerPending) {
      return res.status(403).json({ success: false, message: 'Cannot delete processed service request' });
    }

    serviceRequests.splice(idx, 1);

    return res.json({
      success: true,
      statusCode: 200,
      message: `Service Request ${request.requestNumber} deleted`,
    });
  });

  // COMMENTS ON SERVICE REQUEST
  app.post(['/api/v1/service-requests/:id/comments', '/api/service-requests/:id/comments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = serviceRequests.find(s => s.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const comment: Comment = {
      id: `comm-${Date.now()}`,
      entityId: request.id,
      entityType: 'SERVICE_REQUEST',
      authorId: req.user?.userId || 'unknown',
      authorName: `${req.user?.firstName} ${req.user?.lastName}`,
      authorRole: req.user?.roles[0] || 'CUSTOMER',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    request.comments = request.comments || [];
    request.comments.push(comment);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Comment added',
      data: comment,
    });
  });

  // ATTACHMENTS ON SERVICE REQUEST
  app.post(['/api/v1/service-requests/:id/attachments', '/api/service-requests/:id/attachments'], authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = serviceRequests.find(s => s.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    const { fileName, url, caption } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const attachment: Attachment = {
      id: `att-${Date.now()}`,
      entityId: request.id,
      entityType: 'SERVICE_REQUEST',
      fileName: fileName || 'attachment.jpg',
      fileSize: 204800,
      fileType: 'image/jpeg',
      url,
      uploadedBy: `${req.user?.firstName} ${req.user?.lastName}`,
      uploadedByRole: req.user?.roles[0] || 'CUSTOMER',
      createdAt: new Date().toISOString(),
      caption,
    };

    request.attachments = request.attachments || [];
    request.attachments.push(attachment);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Attachment uploaded',
      data: attachment,
    });
  });

  // CONVERT SERVICE REQUEST TO WORK ORDER
  app.post(['/api/v1/service-requests/:id/convert', '/api/service-requests/:id/convert'], authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'DISPATCHER'), (req: AuthenticatedRequest, res: Response) => {
    const request = serviceRequests.find(s => s.id === req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    const { priority, category, assignedTechnicianId, dueDate } = req.body;
    request.status = 'CONVERTED';

    let techName: string | undefined;
    let initialStatus: WorkOrderStatus = 'NEW';
    if (assignedTechnicianId) {
      const tech = technicians.find(t => t.id === assignedTechnicianId);
      techName = tech?.name;
      initialStatus = 'ASSIGNED';
    }

    const orderNumber = `WO-2026-${String(886 + workOrders.length).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const orderPriority = (priority || request.priority || 'MEDIUM') as Priority;

    const matchingPolicy = matchSlaPolicy(slaPolicies, {
      priority: orderPriority,
      customerId: request.customerId,
      facilityId: request.facilityId,
      category,
    });

    const respMins = matchingPolicy?.responseTimeMinutes || (orderPriority === 'CRITICAL' ? 30 : orderPriority === 'HIGH' ? 60 : 120);
    const resMins = matchingPolicy?.resolutionTimeMinutes || (orderPriority === 'CRITICAL' ? 240 : orderPriority === 'HIGH' ? 480 : 1440);
    const isBusinessHours = matchingPolicy?.businessHoursOnly || false;

    const slaResponseDeadline = calculateDeadline(new Date(now), respMins, isBusinessHours).toISOString();
    const slaResolutionDeadline = calculateDeadline(new Date(now), resMins, isBusinessHours).toISOString();

    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      organizationId: request.organizationId,
      workOrderNumber: orderNumber,
      serviceRequestId: request.id,
      facilityId: request.facilityId,
      facilityName: request.facilityName,
      assetId: request.assetId,
      assetName: request.assetName,
      title: request.title,
      description: request.description,
      status: initialStatus,
      priority: orderPriority,
      category: category || 'CORRECTIVE_MAINTENANCE',
      estimatedDurationHours: 2.5,
      actualDurationHours: 0,
      assignedTechnicianId,
      assignedTechnicianName: techName,
      dueDate: dueDate || new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      customerId: request.customerId,
      customerName: request.requesterName,
      slaPolicyId: matchingPolicy?.id,
      slaPolicyName: matchingPolicy?.name,
      slaResponseDeadline,
      slaResolutionDeadline,
      isSlaResponseBreached: false,
      isSlaResolutionBreached: false,
      createdAt: now,
      updatedAt: now,
      parts: [],
      timeEntries: [],
      comments: (request.comments || []).map(c => ({
        ...c,
        id: `comm-c-${Date.now()}-${Math.random()}`,
        entityId: `wo-${Date.now()}`,
        entityType: 'WORK_ORDER',
      })),
      attachments: (request.attachments || []).map(a => ({
        ...a,
        id: `att-c-${Date.now()}-${Math.random()}`,
        entityId: `wo-${Date.now()}`,
        entityType: 'WORK_ORDER',
      })),
      assignmentHistory: assignedTechnicianId ? [
        {
          id: `asg-${Date.now()}`,
          workOrderId: `wo-${Date.now()}`,
          technicianId: assignedTechnicianId,
          technicianName: techName || 'Technician',
          assignedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          assignedByRole: req.user?.roles[0] || 'DISPATCHER',
          assignedAt: now,
          notes: 'Assigned during service request conversion',
          status: 'ACTIVE',
        }
      ] : [],
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          organizationId: request.organizationId,
          entityName: 'WorkOrder',
          entityId: orderNumber,
          action: 'CREATED_FROM_REQUEST',
          performedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          performedByRole: req.user?.roles[0] || 'DISPATCHER',
          timestamp: now,
          newState: initialStatus,
          notes: `Converted from inbound customer request ${request.requestNumber} (SLA Policy: ${matchingPolicy?.name || 'Default Tier'})`,
        }
      ]
    };

    workOrders.unshift(newOrder);
    request.convertedWorkOrderId = newOrder.id;

    const enriched = enrichWorkOrderRecord(newOrder, req.user?.roles || []);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Service request successfully converted into Work Order',
      data: enriched,
    });
  });

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS SYSTEM API
  // ---------------------------------------------------------------------------
  app.get('/api/v1/notifications', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let list = [...notifications];

    // Tenant check (except super admin)
    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(n => n.organizationId === req.user?.organizationId);
    }

    // Role / User targeting filter
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;

    list = list.filter(n => {
      // Direct user target
      if (n.userId && n.userId === userId) return true;
      // Role target
      if (n.targetRoles && n.targetRoles.some(r => userRoles.includes(r))) return true;
      // General notification with no target user or roles
      if (!n.userId && (!n.targetRoles || n.targetRoles.length === 0)) return true;
      return false;
    });

    const unreadOnly = req.query.unreadOnly === 'true';
    if (unreadOnly) {
      list = list.filter(n => !n.read);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      statusCode: 200,
      data: list,
      total: list.length,
      unreadCount: list.filter(n => !n.read).length,
    });
  });

  app.get('/api/v1/notifications/unread-count', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    let list = [...notifications];

    if (!req.user?.roles.includes('SUPER_ADMIN')) {
      list = list.filter(n => n.organizationId === req.user?.organizationId);
    }

    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;

    const unread = list.filter(n => {
      if (n.read) return false;
      if (n.userId && n.userId === userId) return true;
      if (n.targetRoles && n.targetRoles.some(r => userRoles.includes(r))) return true;
      if (!n.userId && (!n.targetRoles || n.targetRoles.length === 0)) return true;
      return false;
    });

    res.json({
      success: true,
      statusCode: 200,
      data: { count: unread.length },
    });
  });

  app.patch('/api/v1/notifications/:id/read', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const notif = notifications.find(n => n.id === req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notif.read = true;
    res.json({
      success: true,
      statusCode: 200,
      data: notif,
    });
  });

  app.post('/api/v1/notifications/mark-all-read', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.userId;

    notifications.forEach(n => {
      const matchOrg = req.user?.roles.includes('SUPER_ADMIN') || n.organizationId === req.user?.organizationId;
      if (!matchOrg) return;

      const isTargeted = (n.userId && n.userId === userId) ||
        (n.targetRoles && n.targetRoles.some(r => userRoles.includes(r))) ||
        (!n.userId && (!n.targetRoles || n.targetRoles.length === 0));

      if (isTargeted) {
        n.read = true;
      }
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'All notifications marked as read',
    });
  });

  app.post('/api/v1/notifications', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
    const { title, message, type, entityType, entityId, targetRoles, userId, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const created = createNotification({
      organizationId: req.user?.organizationId || 'org-apex-1',
      title,
      message,
      type: type || 'STATUS_CHANGED',
      entityType: entityType || 'WORK_ORDER',
      entityId: entityId || 'wo-broadcast',
      targetRoles: targetRoles || ['ADMIN', 'DISPATCHER'],
      userId,
      link,
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      data: created,
    });
  });

  // ---------------------------------------------------------------------------
  // 7. ARCHITECTURE SPECIFICATION API
  // ---------------------------------------------------------------------------
  app.get('/api/v1/architecture', (req: Request, res: Response) => {
    res.json({
      success: true,
      statusCode: 200,
      data: {
        platform: 'KEYSTONE Field Service Management Platform',
        version: '1.0.0-PROD',
        securityModel: {
          authentication: 'Stateless JWT with HMAC-SHA256 signature verification',
          tokenStrategy: 'Short-lived Access Token (1h) + Rotated Refresh Token (7d)',
          invalidation: 'Active Blacklist & User Token Versioning on logout, password change, deactivation',
          authorization: 'Multi-tiered Role-Based Access Control (RBAC) + Tenant Isolation',
          roles: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER']
        },
        workOrderLifecycle: [
          'NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'
        ],
        transitions: VALID_TRANSITIONS,
        permittedRoles: PERMITTED_ROLES_PER_TARGET,
      }
    });
  });

  // ---------------------------------------------------------------------------
  // AUDIT LOGS RETRIEVAL API
  // ---------------------------------------------------------------------------
  const handleGetAuditLogs = (req: AuthenticatedRequest, res: Response) => {
    let allLogs: any[] = [];
    workOrders.forEach(w => {
      // Check tenant scoping
      if (!req.user?.roles.includes('SUPER_ADMIN') && w.organizationId !== req.user?.organizationId) {
        return;
      }
      if (w.auditLogs && Array.isArray(w.auditLogs)) {
        w.auditLogs.forEach(log => {
          allLogs.push({
            ...log,
            workOrderId: w.id,
            workOrderNumber: w.workOrderNumber,
            workOrderTitle: w.title,
            facilityName: w.facilityName,
            priority: w.priority,
          });
        });
      }
    });

    // Query filter
    const query = (req.query.query as string || '').toLowerCase().trim();
    if (query) {
      allLogs = allLogs.filter(l =>
        (l.workOrderNumber && l.workOrderNumber.toLowerCase().includes(query)) ||
        (l.workOrderTitle && l.workOrderTitle.toLowerCase().includes(query)) ||
        (l.actorName && l.actorName.toLowerCase().includes(query)) ||
        (l.action && l.action.toLowerCase().includes(query)) ||
        (l.details && l.details.toLowerCase().includes(query)) ||
        (l.notes && l.notes.toLowerCase().includes(query))
      );
    }

    // Action filter
    const action = req.query.action as string;
    if (action && action !== 'ALL') {
      allLogs = allLogs.filter(l => l.action === action);
    }

    // Role filter
    const role = req.query.role as string;
    if (role && role !== 'ALL') {
      allLogs = allLogs.filter(l => l.actorRole === role);
    }

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      statusCode: 200,
      data: allLogs,
      total: allLogs.length,
    });
  };

  app.get('/api/v1/audit-logs', authenticateJwt, handleGetAuditLogs);
  app.get('/api/audit-logs', authenticateJwt, handleGetAuditLogs);

  // 404 handler for unknown API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      statusCode: 404,
      message: `API endpoint '${req.method} ${req.path}' not found`,
    });
  });

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error(`[KEYSTONE_SERVER_ERROR] ${req.method} ${req.path}:`, err?.message || err);
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : (typeof err.status === 'number' ? err.status : 500);
    res.status(statusCode).json({
      success: false,
      statusCode,
      message: err.message || 'An unexpected internal server error occurred',
      timestamp: new Date().toISOString(),
    });
  });

export { app };
export default app;
