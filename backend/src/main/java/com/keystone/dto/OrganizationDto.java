package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class OrganizationDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotBlank(message = "Organization name is required")
        private String name;

        @NotBlank(message = "Code is required")
        private String code;

        private String subscriptionTier;
        private String timezone;
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private String name;
        private String code;
        private String subscriptionTier;
        private String timezone;
        private String status;
        private int facilitiesCount;
        private int usersCount;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
