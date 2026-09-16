package com.keystone.dto;

import com.keystone.enums.TimeEntryType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class TimeEntryDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotNull(message = "Work order ID is required")
        private UUID workOrderId;

        private UUID technicianId;

        @NotNull(message = "Start time is required")
        private Instant startTime;

        private Instant endTime;
        private Integer durationMinutes;
        private TimeEntryType entryType;
        private String notes;
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
        private Instant startTime;
        private Instant endTime;
        private Integer durationMinutes;
        private TimeEntryType entryType;
        private String notes;
        private Instant createdAt;
    }
}
