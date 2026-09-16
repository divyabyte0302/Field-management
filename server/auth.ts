import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, RoleName } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'keystone_super_secret_jwt_signing_key_2026_commercial_facility_ops_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'keystone_refresh_secret_key_2026_commercial_facility_ops';
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  organizationId: string;
  roles: RoleName[];
  firstName: string;
  lastName: string;
  type?: 'access' | 'refresh';
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
  rawToken?: string;
}

// ---------------------------------------------------------------------------
// 1. IN-MEMORY TOKEN BLACKLIST & REVOCATION REGISTRY
// ---------------------------------------------------------------------------
const revokedTokens = new Set<string>();
const revokedRefreshTokens = new Set<string>();
const userTokenVersions = new Map<string, number>();

export function getRevocationRegistry() {
  return {
    revokedTokensCount: revokedTokens.size,
    revokedRefreshTokensCount: revokedRefreshTokens.size,
  };
}

export function blacklistToken(token: string) {
  if (token) {
    revokedTokens.add(token);
  }
}

export function isTokenBlacklisted(token: string): boolean {
  if (!token) return true;
  return revokedTokens.has(token);
}

export function blacklistRefreshToken(token: string) {
  if (token) {
    revokedRefreshTokens.add(token);
  }
}

export function isRefreshTokenBlacklisted(token: string): boolean {
  if (!token) return true;
  return revokedRefreshTokens.has(token);
}

export function invalidateAllUserSessions(userId: string) {
  const current = userTokenVersions.get(userId) || 1;
  userTokenVersions.set(userId, current + 1);
}

export function getUserTokenVersion(userId: string): number {
  return userTokenVersions.get(userId) || 1;
}

// ---------------------------------------------------------------------------
// 2. TOKEN GENERATION
// ---------------------------------------------------------------------------
export function generateToken(user: User): { accessToken: string; expiresIn: number } {
  const version = getUserTokenVersion(user.id);
  const payload: AuthJwtPayload = {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roles: user.roles,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'access',
    tokenVersion: version,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  return { accessToken, expiresIn: 3600 };
}

export function generateRefreshToken(user: User): string {
  const version = getUserTokenVersion(user.id);
  const payload: AuthJwtPayload = {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roles: user.roles,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'refresh',
    tokenVersion: version,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyRefreshToken(token: string): AuthJwtPayload | null {
  if (isRefreshTokenBlacklisted(token)) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthJwtPayload;
    if (decoded.type !== 'refresh') return null;

    const currentVersion = getUserTokenVersion(decoded.userId);
    if (decoded.tokenVersion && decoded.tokenVersion < currentVersion) {
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. AUTHENTICATION FILTER / MIDDLEWARE
// ---------------------------------------------------------------------------
export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Unauthorized: Missing or invalid Bearer authorization token',
    });
  }

  const token = authHeader.substring(7);

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Unauthorized: Token has been revoked or logged out',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
    
    // Check if token is access token
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Unauthorized: Invalid token type for API endpoint',
      });
    }

    // Check user token version for mass invalidation
    const currentVersion = getUserTokenVersion(decoded.userId);
    if (decoded.tokenVersion && decoded.tokenVersion < currentVersion) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Unauthorized: Session invalidated due to password change or administrative revocation',
      });
    }

    req.user = decoded;
    req.rawToken = token;
    next();
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      statusCode: 401,
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired 
        ? 'Unauthorized: JWT access token expired. Please refresh session.' 
        : 'Unauthorized: Invalid JWT signature or corrupted token',
    });
  }
}

// Optional Auth (for public endpoints with user context if present)
export function optionalAuthenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (!isTokenBlacklisted(token)) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
        req.user = decoded;
        req.rawToken = token;
      } catch (ignored) {}
    }
  }
  next();
}

// ---------------------------------------------------------------------------
// 4. ROLE-BASED AUTHORIZATION
// ---------------------------------------------------------------------------
export function requireRoles(...allowedRoles: RoleName[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Authentication required',
      });
    }

    // SUPER_ADMIN has god-mode privileges
    const isSuperAdmin = req.user.roles.includes('SUPER_ADMIN');
    const hasAccess = isSuperAdmin || req.user.roles.some(r => allowedRoles.includes(r));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `Forbidden: User role(s) [${req.user.roles.join(', ')}] lack permission. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// 5. HORIZONTAL PRIVILEGE ESCALATION PREVENTION
// ---------------------------------------------------------------------------
export function checkTenantAccess(req: AuthenticatedRequest, targetOrgId: string): boolean {
  if (!req.user) return false;
  if (req.user.roles.includes('SUPER_ADMIN')) return true;
  return req.user.organizationId === targetOrgId;
}

// ---------------------------------------------------------------------------
// 6. PASSWORD RESET STORE
// ---------------------------------------------------------------------------
interface ResetEntry {
  email: string;
  expiresAt: number;
}
const resetTokenStore = new Map<string, ResetEntry>();

export function storePasswordResetToken(token: string, email: string, validDurationMs: number = 3600000) {
  resetTokenStore.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + validDurationMs,
  });
}

export function verifyPasswordResetToken(token: string): string | null {
  const entry = resetTokenStore.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resetTokenStore.delete(token);
    return null;
  }
  return entry.email;
}

export function consumePasswordResetToken(token: string) {
  resetTokenStore.delete(token);
}
