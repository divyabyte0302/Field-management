package com.keystone.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class InventoryDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotNull(message = "Part ID is required")
        private UUID partId;

        private UUID facilityId;
        private int quantityOnHand;
        private int quantityReserved;
        private int minimumThreshold;
        private int reorderQuantity;
        private String binLocation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID partId;
        private String partNumber;
        private String partName;
        private UUID facilityId;
        private String facilityName;
        private int quantityOnHand;
        private int quantityReserved;
        private int minimumThreshold;
        private int reorderQuantity;
        private String binLocation;
        private boolean isLowStock;
        private Instant updatedAt;
    }
}
