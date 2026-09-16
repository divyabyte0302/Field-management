package com.keystone.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class AssignmentDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotNull(message = "Work order ID is required")
        private UUID workOrderId;

        @NotNull(message = "Technician ID is required")
        private UUID technicianId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID workOrderId;
        private String workOrderNumber;
        private UUID technicianId;
        private String technicianName;
        private UUID assignedByUserId;
        private String assignedByUserName;
        private Instant assignedAt;
        private Instant acceptedAt;
        private Instant rejectedAt;
        private String rejectionReason;
        private boolean current;
    }
}
