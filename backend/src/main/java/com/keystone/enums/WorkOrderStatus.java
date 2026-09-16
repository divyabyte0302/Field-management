package com.keystone.enums;

/**
 * Defines the strict, deterministic lifecycle states for KEYSTONE Work Orders (Document v1.0 Section 10).
 * STATES: NEW, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED, CANCELLED
 * Core flow: NEW -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> CLOSED
 * ON_HOLD: Pause / resume workflow
 * Terminal states: CLOSED, CANCELLED
 */
public enum WorkOrderStatus {
    NEW,
    ASSIGNED,
    IN_PROGRESS,
    ON_HOLD,
    COMPLETED,
    CLOSED,
    CANCELLED
}
