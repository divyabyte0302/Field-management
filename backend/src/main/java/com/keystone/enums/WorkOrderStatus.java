package com.keystone.enums;

/**
 * Defines the strict, deterministic lifecycle states for KEYSTONE Work Orders.
 * Transition sequence:
 * NEW -> TRIAGED -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> ON_HOLD -> COMPLETED -> VERIFIED -> CLOSED
 */
public enum WorkOrderStatus {
    NEW,
    TRIAGED,
    ASSIGNED,
    ACCEPTED,
    IN_PROGRESS,
    ON_HOLD,
    COMPLETED,
    VERIFIED,
    CLOSED
}
