package com.keystone.dto;

import com.keystone.enums.MaintenanceFrequency;
import com.keystone.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class MaintenanceScheduleDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotNull(message = "Asset ID is required")
        private UUID assetId;

        @NotBlank(message = "Schedule name is required")
        private String name;

        private MaintenanceFrequency frequency;
        private Integer intervalValue;

        @NotNull(message = "Next due date is required")
        private LocalDate nextDueDate;

        private Priority priority;

        @NotBlank(message = "Task instructions are required")
        private String taskInstructions;

        private Boolean active;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private UUID assetId;
        private String assetName;
        private String assetTagNumber;
        private String name;
        private MaintenanceFrequency frequency;
        private int intervalValue;
        private LocalDate nextDueDate;
        private Instant lastGeneratedAt;
        private Priority priority;
        private String taskInstructions;
        private boolean active;
        private Instant createdAt;
    }
}
