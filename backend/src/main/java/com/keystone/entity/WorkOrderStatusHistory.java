package com.keystone.entity;

import com.keystone.enums.WorkOrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable, append-only history record tracking every Work Order lifecycle transition (Document v1.0 Section 11).
 * Never updated. Never deleted.
 */
@Entity
@Table(name = "work_order_status_history", indexes = {
    @Index(name = "idx_wosh_wo_id", columnList = "work_order_id"),
    @Index(name = "idx_wosh_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false, updatable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 50, updatable = false)
    private WorkOrderStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 50, updatable = false)
    private WorkOrderStatus newStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_id", updatable = false)
    private User changedByUser;

    @Column(name = "changed_by_name", length = 150, updatable = false)
    private String changedByName;

    @Column(name = "changed_by_role", length = 50, updatable = false)
    private String changedByRole;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private Instant timestamp;

    @Column(name = "note", columnDefinition = "TEXT", updatable = false)
    private String note;
}
