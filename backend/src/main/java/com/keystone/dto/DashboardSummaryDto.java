package com.keystone.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {
    private long totalWorkOrders;
    private long openWorkOrders;
    private long completedWorkOrders;
    private long slaBreachedWorkOrders;
    private long activeTechnicians;
    private long totalAssets;
    private long pendingServiceRequests;
    private Map<String, Long> workOrdersByStatus;
    private Map<String, Long> workOrdersByPriority;
}
