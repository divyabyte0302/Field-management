package com.keystone.dto;

import com.keystone.enums.Priority;
import com.keystone.enums.WorkOrderStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderCreateDto {

    private UUID organizationId;
    private UUID serviceRequestId;

    @NotNull(message = "Facility ID is required")
    private UUID facilityId;

    private UUID assetId;
    private UUID assignedTechnicianId;
    private UUID slaId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private Priority priority;
    private WorkOrderStatus status;
    private String category;
    private BigDecimal estimatedDurationHours;
}
