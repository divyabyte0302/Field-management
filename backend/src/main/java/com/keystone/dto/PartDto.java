package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PartDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotBlank(message = "Part number is required")
        private String partNumber;

        @NotBlank(message = "Part name is required")
        private String name;

        private String description;

        @NotBlank(message = "Category is required")
        private String category;

        private BigDecimal unitCost;
        private BigDecimal unitPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private String partNumber;
        private String name;
        private String description;
        private String category;
        private BigDecimal unitCost;
        private BigDecimal unitPrice;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
