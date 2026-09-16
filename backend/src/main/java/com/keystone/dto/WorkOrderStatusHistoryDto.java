package com.keystone.dto;

import com.keystone.enums.WorkOrderStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderStatusHistoryDto {
    private UUID id;
    private UUID workOrderId;
    private WorkOrderStatus previousStatus;
    private WorkOrderStatus newStatus;
    private UUID changedByUserId;
    private String changedByName;
    private String changedByRole;
    private Instant timestamp;
    private String note;
}
