package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class FacilityDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;
        private UUID customerId;

        @NotBlank(message = "Facility name is required")
        private String name;

        @NotBlank(message = "Facility code is required")
        private String code;

        private String facilityType;

        @NotBlank(message = "Address line 1 is required")
        private String addressLine1;

        private String addressLine2;

        @NotBlank(message = "City is required")
        private String city;

        @NotBlank(message = "State is required")
        private String state;

        @NotBlank(message = "Postal code is required")
        private String postalCode;

        private String country;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String accessInstructions;
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
        private UUID customerId;
        private String customerName;
        private String name;
        private String code;
        private String facilityType;
        private String addressLine1;
        private String addressLine2;
        private String city;
        private String state;
        private String postalCode;
        private String country;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String accessInstructions;
        private boolean active;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
