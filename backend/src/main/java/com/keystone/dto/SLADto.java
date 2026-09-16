package com.keystone.dto;

import com.keystone.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class SLADto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotBlank(message = "SLA name is required")
        private String name;

        @NotNull(message = "Priority is required")
        private Priority priority;

        @NotNull(message = "Response time in minutes is required")
        private Integer responseTimeMinutes;

        @NotNull(message = "Resolution time in minutes is required")
        private Integer resolutionTimeMinutes;

        private Boolean businessHoursOnly;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private String name;
        private Priority priority;
        private int responseTimeMinutes;
        private int resolutionTimeMinutes;
        private boolean businessHoursOnly;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
