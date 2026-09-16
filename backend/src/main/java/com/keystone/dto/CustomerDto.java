package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class CustomerDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotBlank(message = "Customer name is required")
        private String name;

        @NotBlank(message = "Account number is required")
        private String accountNumber;

        private String primaryContactName;
        private String primaryContactEmail;
        private String primaryContactPhone;
        private String billingAddress;
        private String slaTier;
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
        private String name;
        private String accountNumber;
        private String primaryContactName;
        private String primaryContactEmail;
        private String primaryContactPhone;
        private String billingAddress;
        private String slaTier;
        private boolean active;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
