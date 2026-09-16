import { WorkOrderStatus, RoleName } from './types';

/**
 * Deterministic finite state machine governing all KEYSTONE Work Order lifecycle transitions (Document v1.0 Section 10).
 * STATES: NEW, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED, CANCELLED.
 * Core flow: NEW -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> CLOSED
 * ON_HOLD: Pause / resume workflow
 * Terminal states: CLOSED, CANCELLED
 */
export const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['CLOSED', 'IN_PROGRESS', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: []
};

export const PERMITTED_ROLES_PER_TARGET: Record<WorkOrderStatus, RoleName[]> = {
  NEW: ['DISPATCHER', 'ADMIN'],
  ASSIGNED: ['DISPATCHER', 'ADMIN'],
  IN_PROGRESS: ['TECHNICIAN', 'DISPATCHER', 'ADMIN'],
  ON_HOLD: ['TECHNICIAN', 'DISPATCHER', 'ADMIN'],
  COMPLETED: ['TECHNICIAN', 'ADMIN'],
  CLOSED: ['ADMIN'], // Technicians CANNOT close jobs - Manager/Admin sign-off only
  CANCELLED: ['DISPATCHER', 'ADMIN']
};

export function canTransition(current: WorkOrderStatus, target: WorkOrderStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function getPermittedNextStates(current: WorkOrderStatus, userRoles: (RoleName | string)[]): WorkOrderStatus[] {
  const allowed = VALID_TRANSITIONS[current] || [];
  // Normalize SUPER_ADMIN to ADMIN
  const normalizedRoles = userRoles.map(r => r === 'SUPER_ADMIN' ? 'ADMIN' : r);
  return allowed.filter(target => {
    const requiredRoles = PERMITTED_ROLES_PER_TARGET[target] || [];
    return normalizedRoles.some(r => requiredRoles.includes(r as RoleName));
  });
}

export function validateTransition(
  current: WorkOrderStatus,
  target: WorkOrderStatus,
  userRoles: (RoleName | string)[]
): { valid: boolean; error?: string } {
  if (!canTransition(current, target)) {
    const allowed = VALID_TRANSITIONS[current] || [];
    return {
      valid: false,
      error: `Invalid transition from state '${current}' to '${target}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'}`
    };
  }

  const normalizedRoles = userRoles.map(r => r === 'SUPER_ADMIN' ? 'ADMIN' : r);
  const requiredRoles = PERMITTED_ROLES_PER_TARGET[target] || [];
  const hasRole = normalizedRoles.some(r => requiredRoles.includes(r as RoleName));
  if (!hasRole) {
    return {
      valid: false,
      error: `Permission denied: transitioning to '${target}' requires one of [${requiredRoles.join(', ')}], but current user holds [${userRoles.join(', ')}]`
    };
  }

  return { valid: true };
}
