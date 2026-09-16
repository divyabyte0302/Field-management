package com.keystone.dto;

import com.keystone.enums.Priority;
import com.keystone.enums.WorkOrderStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderResponseDto {

    private UUID id;
    private String workOrderNumber;
    private String title;
    private String description;
    private WorkOrderStatus status;
    private Priority priority;
    private String category;
    private UUID facilityId;
    private String facilityName;
    private UUID assetId;
    private String assetName;
    private UUID assignedTechnicianId;
    private String technicianName;
    private BigDecimal estimatedDurationHours;
    private BigDecimal actualDurationHours;
    private Instant slaResponseDeadline;
    private Instant slaResolutionDeadline;
    private boolean slaResponseBreached;
    private boolean slaResolutionBreached;
    private Instant respondedAt;
    private Instant completedAt;
    private Instant closedAt;
    private String resolutionNotes;
    private Set<WorkOrderStatus> permittedNextStates;
    private Instant createdAt;
    private Instant updatedAt;
}
