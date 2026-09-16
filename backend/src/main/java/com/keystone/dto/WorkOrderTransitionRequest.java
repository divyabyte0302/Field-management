package com.keystone.dto;

import com.keystone.enums.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderTransitionRequest {

    @NotNull(message = "Target status is required")
    private WorkOrderStatus targetStatus;

    private String notes;
    private String holdReason;
    private String rejectionReason;
    private UUID reassignedTechnicianId;

    public WorkOrderStatus getTargetState() {
        return targetStatus;
    }

    public String getResolutionNotes() {
        return notes;
    }

    public String getReason() {
        if (notes != null && !notes.isBlank()) return notes;
        if (holdReason != null && !holdReason.isBlank()) return holdReason;
        return rejectionReason;
    }
}
