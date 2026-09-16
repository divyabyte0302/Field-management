package com.keystone.dto;

import com.keystone.enums.TechnicianStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class TechnicianDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID userId;
        private UUID organizationId;

        @NotBlank(message = "Employee code is required")
        private String employeeCode;

        private BigDecimal hourlyRate;
        private TechnicianStatus status;
        private BigDecimal currentLatitude;
        private BigDecimal currentLongitude;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID userId;
        private String technicianName;
        private String email;
        private String phone;
        private UUID organizationId;
        private String employeeCode;
        private BigDecimal hourlyRate;
        private TechnicianStatus status;
        private BigDecimal currentLatitude;
        private BigDecimal currentLongitude;
        private int currentAssignedWoCount;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
