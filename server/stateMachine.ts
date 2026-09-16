import { WorkOrderStatus, RoleName } from './types';

export const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ['TRIAGED', 'ASSIGNED'],
  TRIAGED: ['ASSIGNED'],
  ASSIGNED: ['ACCEPTED', 'IN_PROGRESS', 'TRIAGED'], // Tech can accept, start immediately, or reject back to triage
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD: ['IN_PROGRESS'],
  COMPLETED: ['VERIFIED', 'IN_PROGRESS', 'CLOSED'], // Verifier can accept, return for rework, or close
  VERIFIED: ['CLOSED'],
  CLOSED: []
};

export const PERMITTED_ROLES_PER_TARGET: Record<WorkOrderStatus, RoleName[]> = {
  NEW: ['DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  TRIAGED: ['DISPATCHER', 'ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'], // Technician can reject back to TRIAGED
  ASSIGNED: ['DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  ACCEPTED: ['TECHNICIAN', 'DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  IN_PROGRESS: ['TECHNICIAN', 'DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  ON_HOLD: ['TECHNICIAN', 'DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  COMPLETED: ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'],
  VERIFIED: ['CUSTOMER', 'DISPATCHER', 'ADMIN', 'SUPER_ADMIN'],
  CLOSED: ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']
};

export function canTransition(current: WorkOrderStatus, target: WorkOrderStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function getPermittedNextStates(current: WorkOrderStatus, userRoles: RoleName[]): WorkOrderStatus[] {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.filter(target => {
    const requiredRoles = PERMITTED_ROLES_PER_TARGET[target] || [];
    return userRoles.some(r => requiredRoles.includes(r));
  });
}

export function validateTransition(
  current: WorkOrderStatus,
  target: WorkOrderStatus,
  userRoles: RoleName[]
): { valid: boolean; error?: string } {

  if (!canTransition(current, target)) {
    return {
      valid: false,
      error: `Invalid transition from state '${current}' to '${target}'. Allowed transitions: ${VALID_TRANSITIONS[current]?.join(', ') || 'None (Terminal state)'}`
    };
  }

  const requiredRoles = PERMITTED_ROLES_PER_TARGET[target] || [];
  const hasRole = userRoles.some(r => requiredRoles.includes(r));
  if (!hasRole) {
    return {
      valid: false,
      error: `Permission denied: transitioning to '${target}' requires one of [${requiredRoles.join(', ')}], but current user holds [${userRoles.join(', ')}]`
    };
  }

  return { valid: true };
}
