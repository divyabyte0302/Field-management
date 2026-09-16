package com.keystone.service;

import com.keystone.enums.RoleName;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.exception.InvalidStateTransitionException;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Deterministic finite state machine governing all KEYSTONE Work Order lifecycle transitions (Document v1.0 Section 10).
 * STATES: NEW, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED, CANCELLED.
 * Terminal states: CLOSED, CANCELLED.
 * Enforces valid transition paths, required invariants, and actor RBAC rules.
 */
@Component
public class WorkOrderStateMachine {

    // Transition graph: Current State -> Set of Allowed Next States
    private static final Map<WorkOrderStatus, Set<WorkOrderStatus>> VALID_TRANSITIONS = new EnumMap<>(WorkOrderStatus.class);

    // RBAC policy: Target State -> Set of Authorized Roles
    private static final Map<WorkOrderStatus, Set<RoleName>> ROLE_PERMISSIONS = new EnumMap<>(WorkOrderStatus.class);

    static {
        // 1. NEW -> ASSIGNED, CANCELLED
        VALID_TRANSITIONS.put(WorkOrderStatus.NEW, Set.of(WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED));

        // 2. ASSIGNED -> IN_PROGRESS, ON_HOLD, CANCELLED
        VALID_TRANSITIONS.put(WorkOrderStatus.ASSIGNED, Set.of(WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD, WorkOrderStatus.CANCELLED));

        // 3. IN_PROGRESS -> ON_HOLD, COMPLETED, CANCELLED
        VALID_TRANSITIONS.put(WorkOrderStatus.IN_PROGRESS, Set.of(WorkOrderStatus.ON_HOLD, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED));

        // 4. ON_HOLD -> IN_PROGRESS, CANCELLED (Pause / resume workflow)
        VALID_TRANSITIONS.put(WorkOrderStatus.ON_HOLD, Set.of(WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED));

        // 5. COMPLETED -> CLOSED (Manager/Admin sign-off), IN_PROGRESS (Rework), CANCELLED
        VALID_TRANSITIONS.put(WorkOrderStatus.COMPLETED, Set.of(WorkOrderStatus.CLOSED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED));

        // 6. CLOSED is a terminal state
        VALID_TRANSITIONS.put(WorkOrderStatus.CLOSED, Collections.emptySet());

        // 7. CANCELLED is a terminal state
        VALID_TRANSITIONS.put(WorkOrderStatus.CANCELLED, Collections.emptySet());

        // RBAC Permissions Mapping
        ROLE_PERMISSIONS.put(WorkOrderStatus.NEW, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.ASSIGNED, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.IN_PROGRESS, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.ON_HOLD, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.COMPLETED, Set.of(RoleName.ROLE_TECHNICIAN, RoleName.ROLE_ADMIN));
        ROLE_PERMISSIONS.put(WorkOrderStatus.CLOSED, Set.of(RoleName.ROLE_ADMIN)); // Manager / Admin ONLY - Technicians cannot close jobs
        ROLE_PERMISSIONS.put(WorkOrderStatus.CANCELLED, Set.of(RoleName.ROLE_DISPATCHER, RoleName.ROLE_ADMIN));
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
            Set<WorkOrderStatus> allowed = getAvailableTransitions(current);
            String allowedStr = allowed.isEmpty() ? "None (Terminal state)" : allowed.toString();
            throw new InvalidStateTransitionException(
                String.format("Invalid Work Order transition from '%s' to '%s'. Allowed next states: %s",
                    current, target, allowedStr)
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
