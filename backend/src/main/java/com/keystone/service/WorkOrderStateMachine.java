package com.keystone.service;

import com.keystone.enums.RoleName;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.exception.InvalidStateTransitionException;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Deterministic finite state machine governing all KEYSTONE Work Order lifecycle transitions.
 * Enforces valid transition paths, required invariants, and actor RBAC rules.
 */
@Component
public class WorkOrderStateMachine {

    // Transition graph: Current State -> Set of Allowed Next States
    private static final Map<WorkOrderStatus, Set<WorkOrderStatus>> VALID_TRANSITIONS = new EnumMap<>(WorkOrderStatus.class);

    // RBAC policy: Target State -> Set of Authorized Roles
    private static final Map<WorkOrderStatus, Set<RoleName>> ROLE_PERMISSIONS = new EnumMap<>(WorkOrderStatus.class);

    static {
        // 1. NEW -> TRIAGED
        VALID_TRANSITIONS.put(WorkOrderStatus.NEW, Set.of(WorkOrderStatus.TRIAGED));

        // 2. TRIAGED -> ASSIGNED
        VALID_TRANSITIONS.put(WorkOrderStatus.TRIAGED, Set.of(WorkOrderStatus.ASSIGNED));

        // 3. ASSIGNED -> ACCEPTED (or back to TRIAGED if technician rejects)
        VALID_TRANSITIONS.put(WorkOrderStatus.ASSIGNED, Set.of(WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRIAGED));

        // 4. ACCEPTED -> IN_PROGRESS
        VALID_TRANSITIONS.put(WorkOrderStatus.ACCEPTED, Set.of(WorkOrderStatus.IN_PROGRESS));

        // 5. IN_PROGRESS -> ON_HOLD or COMPLETED
        VALID_TRANSITIONS.put(WorkOrderStatus.IN_PROGRESS, Set.of(WorkOrderStatus.ON_HOLD, WorkOrderStatus.COMPLETED));

        // 6. ON_HOLD -> IN_PROGRESS
        VALID_TRANSITIONS.put(WorkOrderStatus.ON_HOLD, Set.of(WorkOrderStatus.IN_PROGRESS));

        // 7. COMPLETED -> VERIFIED (or back to IN_PROGRESS if rework needed)
        VALID_TRANSITIONS.put(WorkOrderStatus.COMPLETED, Set.of(WorkOrderStatus.VERIFIED, WorkOrderStatus.IN_PROGRESS));

        // 8. VERIFIED -> CLOSED
        VALID_TRANSITIONS.put(WorkOrderStatus.VERIFIED, Set.of(WorkOrderStatus.CLOSED));

        // 9. CLOSED is a terminal state
        VALID_TRANSITIONS.put(WorkOrderStatus.CLOSED, Collections.emptySet());

        // RBAC Permissions Mapping
        ROLE_PERMISSIONS.put(WorkOrderStatus.TRIAGED, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.ASSIGNED, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.ACCEPTED, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.IN_PROGRESS, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.ON_HOLD, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.COMPLETED, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.VERIFIED, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN, RoleName.ROLE_CUSTOMER));
        ROLE_PERMISSIONS.put(WorkOrderStatus.CLOSED, Set.of(RoleName.ROLE_ADMIN, RoleName.ROLE_SUPER_ADMIN));
    }

    /**
     * Validates whether a state transition is legally permissible from a given current state to target state.
     */
    public boolean canTransition(WorkOrderStatus current, WorkOrderStatus target) {
        if (current == null || target == null) {
            return false;
        }
        return VALID_TRANSITIONS.getOrDefault(current, Collections.emptySet()).contains(target);
    }

    /**
     * Returns the set of valid next states available from the given current state.
     */
    public Set<WorkOrderStatus> getAvailableTransitions(WorkOrderStatus current) {
        return VALID_TRANSITIONS.getOrDefault(current, Collections.emptySet());
    }

    /**
     * Asserts transition validity, throwing an InvalidStateTransitionException if illegal.
     */
    public void validateTransition(WorkOrderStatus current, WorkOrderStatus target, Collection<RoleName> userRoles) {
        if (!canTransition(current, target)) {
            throw new InvalidStateTransitionException(
                String.format("Invalid Work Order transition from '%s' to '%s'. Allowed next states: %s",
                    current, target, getAvailableTransitions(current))
            );
        }

        Set<RoleName> allowedRoles = ROLE_PERMISSIONS.getOrDefault(target, Collections.emptySet());
        boolean hasPermission = userRoles.stream().anyMatch(allowedRoles::contains);
        if (!hasPermission) {
            throw new InvalidStateTransitionException(
                String.format("User with roles %s is not authorized to transition Work Order to '%s'. Required roles: %s",
                    userRoles, target, allowedRoles)
            );
        }
    }
}
