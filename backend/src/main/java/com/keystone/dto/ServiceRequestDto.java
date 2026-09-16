package com.keystone.dto;

import com.keystone.enums.Priority;
import com.keystone.enums.ServiceRequestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class ServiceRequestDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotNull(message = "Customer ID is required")
        private UUID customerId;

        @NotNull(message = "Facility ID is required")
        private UUID facilityId;

        private UUID reportedByUserId;

        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Description is required")
        private String description;

        private Priority priority;
        private ServiceRequestStatus status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private UUID customerId;
        private String customerName;
        private UUID facilityId;
        private String facilityName;
        private UUID reportedByUserId;
        private String reportedByUserName;
        private String requestNumber;
        private String title;
        private String description;
        private Priority priority;
        private ServiceRequestStatus status;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
