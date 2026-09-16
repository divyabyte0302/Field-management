package com.keystone.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class WorkOrderPartDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID workOrderId;
        private UUID partId;
        private int quantityUsed;
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
        private UUID workOrderId;
        private UUID partId;
        private String partNumber;
        private String partName;
        private int quantityUsed;
        private BigDecimal unitCostAtTime;
        private BigDecimal unitPriceAtTime;
        private Instant createdAt;
    }
}
