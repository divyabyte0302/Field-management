package com.keystone.dto;

import com.keystone.enums.AssetStatus;
import com.keystone.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class AssetDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;
        private UUID facilityId;

        @NotBlank(message = "Tag number is required")
        private String tagNumber;

        @NotBlank(message = "Asset name is required")
        private String name;

        @NotBlank(message = "Category is required")
        private String category;

        private String modelNumber;
        private String serialNumber;
        private String manufacturer;
        private LocalDate installationDate;
        private LocalDate warrantyExpiryDate;
        private AssetStatus status;
        private Priority criticality;
        private String locationDetails;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private UUID facilityId;
        private String facilityName;
        private String tagNumber;
        private String name;
        private String category;
        private String modelNumber;
        private String serialNumber;
        private String manufacturer;
        private LocalDate installationDate;
        private LocalDate warrantyExpiryDate;
        private AssetStatus status;
        private Priority criticality;
        private String locationDetails;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
