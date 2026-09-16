package com.keystone.entity;

import com.keystone.enums.Priority;
import com.keystone.enums.WorkOrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "work_order_number", nullable = false, unique = true, length = 50)
    private String workOrderNumber;

    @Column(name = "service_request_id")
    private UUID serviceRequestId;

    @Column(name = "facility_id", nullable = false)
    private UUID facilityId;

    @Column(name = "asset_id")
    private UUID assetId;

    @Column(name = "assigned_technician_id")
    private UUID assignedTechnicianId;

    @Column(name = "sla_id")
    private UUID slaId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WorkOrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Priority priority;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(name = "estimated_duration_hours")
    private BigDecimal estimatedDurationHours;

    @Column(name = "actual_duration_hours")
    private BigDecimal actualDurationHours;

    @Column(name = "sla_response_deadline")
    private Instant slaResponseDeadline;

    @Column(name = "sla_resolution_deadline")
    private Instant slaResolutionDeadline;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "is_sla_response_breached", nullable = false)
    private boolean slaResponseBreached;

    @Column(name = "is_sla_resolution_breached", nullable = false)
    private boolean slaResolutionBreached;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "customer_id")
    private UUID customerId;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<Assignment> assignments = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
    @Builder.Default
    private java.util.List<WorkOrderStatusHistory> statusHistory = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<WorkOrderPart> parts = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<TimeEntry> timeEntries = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<Comment> comments = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<Attachment> attachments = new java.util.ArrayList<>();
}
