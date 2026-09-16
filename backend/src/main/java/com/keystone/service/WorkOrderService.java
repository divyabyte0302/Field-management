package com.keystone.service;

import com.keystone.dto.PageResponse;
import com.keystone.dto.WorkOrderCreateDto;
import com.keystone.dto.WorkOrderResponseDto;
import com.keystone.dto.WorkOrderTransitionRequest;
import com.keystone.entity.*;
import com.keystone.enums.AuditAction;
import com.keystone.enums.Priority;
import com.keystone.enums.RoleName;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStateMachine stateMachine;
    private final FacilityRepository facilityRepository;
    private final AssetRepository assetRepository;
    private final TechnicianRepository technicianRepository;
    private final SLARepository slaRepository;
    private final AssignmentRepository assignmentRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<WorkOrderResponseDto> getWorkOrders(
            UUID organizationId,
            WorkOrderStatus status,
            Priority priority,
            UUID facilityId,
            UUID technicianId,
            Pageable pageable) {

        Specification<WorkOrder> spec = Specification.where(null);

        if (organizationId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("organizationId"), organizationId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }
        if (facilityId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("facilityId"), facilityId));
        }
        if (technicianId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignedTechnicianId"), technicianId));
        }

        return workOrderRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponseDto getById(UUID id) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + id));
        return mapToDto(wo);
    }

    @Transactional
    public WorkOrderResponseDto createWorkOrder(WorkOrderCreateDto dto) {
        Facility facility = facilityRepository.findById(dto.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + dto.getFacilityId()));

        UUID orgId = dto.getOrganizationId() != null ? dto.getOrganizationId() : facility.getOrganization().getId();
        String woNumber = "WO-" + System.currentTimeMillis() % 10000000;

        WorkOrderStatus initialStatus = dto.getStatus() != null ? dto.getStatus() : WorkOrderStatus.NEW;
        Priority priority = dto.getPriority() != null ? dto.getPriority() : Priority.MEDIUM;

        Instant slaResponseDeadline = null;
        Instant slaResolutionDeadline = null;
        UUID slaId = dto.getSlaId();

        if (slaId != null) {
            SLA sla = slaRepository.findById(slaId).orElse(null);
            if (sla != null) {
                slaResponseDeadline = Instant.now().plusSeconds((long) sla.getResponseTimeMinutes() * 60);
                slaResolutionDeadline = Instant.now().plusSeconds((long) sla.getResolutionTimeMinutes() * 60);
            }
        }

        WorkOrder wo = WorkOrder.builder()
                .organizationId(orgId)
                .facilityId(facility.getId())
                .assetId(dto.getAssetId())
                .serviceRequestId(dto.getServiceRequestId())
                .assignedTechnicianId(dto.getAssignedTechnicianId())
                .slaId(slaId)
                .workOrderNumber(woNumber)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .status(initialStatus)
                .priority(priority)
                .category(dto.getCategory() != null ? dto.getCategory() : "CORRECTIVE")
                .estimatedDurationHours(dto.getEstimatedDurationHours() != null ? dto.getEstimatedDurationHours() : new BigDecimal("2.0"))
                .actualDurationHours(BigDecimal.ZERO)
                .slaResponseDeadline(slaResponseDeadline)
                .slaResolutionDeadline(slaResolutionDeadline)
                .build();

        wo = workOrderRepository.save(wo);

        if (dto.getAssignedTechnicianId() != null) {
            assignTechnician(wo.getId(), dto.getAssignedTechnicianId(), null);
        }

        recordAudit(orgId, wo.getId(), AuditAction.CREATE, null, "Created work order " + woNumber);

        return mapToDto(wo);
    }

    @Transactional
    public WorkOrderResponseDto transitionState(
            UUID workOrderId,
            WorkOrderTransitionRequest request,
            Collection<RoleName> userRoles,
            UUID currentUserId) {

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        WorkOrderStatus currentState = wo.getStatus();
        WorkOrderStatus targetState = request.getTargetState();

        stateMachine.validateTransition(currentState, targetState, userRoles);

        wo.setStatus(targetState);
        Instant now = Instant.now();

        if (targetState == WorkOrderStatus.ACCEPTED && wo.getRespondedAt() == null) {
            wo.setRespondedAt(now);
            if (wo.getSlaResponseDeadline() != null && now.isAfter(wo.getSlaResponseDeadline())) {
                wo.setSlaResponseBreached(true);
            }
        } else if (targetState == WorkOrderStatus.COMPLETED) {
            wo.setCompletedAt(now);
            if (request.getResolutionNotes() != null) {
                wo.setResolutionNotes(request.getResolutionNotes());
            }
            if (wo.getSlaResolutionDeadline() != null && now.isAfter(wo.getSlaResolutionDeadline())) {
                wo.setSlaResolutionBreached(true);
            }
        } else if (targetState == WorkOrderStatus.VERIFIED) {
            wo.setVerifiedAt(now);
        } else if (targetState == WorkOrderStatus.CLOSED) {
            wo.setClosedAt(now);
        }

        wo = workOrderRepository.save(wo);

        recordAudit(wo.getOrganizationId(), wo.getId(), AuditAction.STATUS_TRANSITION, currentUserId,
                "State changed from " + currentState + " to " + targetState + (request.getReason() != null ? " Reason: " + request.getReason() : ""));

        return mapToDto(wo);
    }

    @Transactional
    public WorkOrderResponseDto assignTechnician(UUID workOrderId, UUID technicianId, UUID currentUserId) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        Technician tech = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + technicianId));

        assignmentRepository.findByWorkOrderIdAndCurrentTrue(workOrderId).ifPresent(curr -> {
            curr.setCurrent(false);
            assignmentRepository.save(curr);
        });

        User assignedByUser = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;

        Assignment newAssignment = Assignment.builder()
                .workOrder(wo)
                .technician(tech)
                .assignedByUser(assignedByUser)
                .current(true)
                .build();
        assignmentRepository.save(newAssignment);

        wo.setAssignedTechnicianId(tech.getId());
        if (wo.getStatus() == WorkOrderStatus.NEW || wo.getStatus() == WorkOrderStatus.TRIAGED) {
            wo.setStatus(WorkOrderStatus.ASSIGNED);
        }

        tech.setCurrentAssignedWoCount(tech.getCurrentAssignedWoCount() + 1);
        technicianRepository.save(tech);

        wo = workOrderRepository.save(wo);

        recordAudit(wo.getOrganizationId(), wo.getId(), AuditAction.UPDATE, currentUserId,
                "Assigned technician: " + tech.getEmployeeCode());

        return mapToDto(wo);
    }

    private void recordAudit(UUID orgId, UUID entityId, AuditAction action, UUID userId, String details) {
        Organization org = Organization.builder().id(orgId).build();
        User user = userId != null ? User.builder().id(userId).build() : null;

        AuditLog log = AuditLog.builder()
                .organization(org)
                .entityName("WorkOrder")
                .entityId(entityId)
                .action(action)
                .performedByUser(user)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    public WorkOrderResponseDto mapToDto(WorkOrder wo) {
        String facilityName = null;
        if (wo.getFacilityId() != null) {
            facilityName = facilityRepository.findById(wo.getFacilityId())
                    .map(Facility::getName).orElse(null);
        }

        String assetName = null;
        if (wo.getAssetId() != null) {
            assetName = assetRepository.findById(wo.getAssetId())
                    .map(Asset::getName).orElse(null);
        }

        String technicianName = null;
        if (wo.getAssignedTechnicianId() != null) {
            technicianName = technicianRepository.findById(wo.getAssignedTechnicianId())
                    .map(t -> t.getUser() != null ? t.getUser().getFirstName() + " " + t.getUser().getLastName() : t.getEmployeeCode())
                    .orElse(null);
        }

        Set<WorkOrderStatus> permittedNextStates = stateMachine.getAvailableTransitions(wo.getStatus());

        return WorkOrderResponseDto.builder()
                .id(wo.getId())
                .workOrderNumber(wo.getWorkOrderNumber())
                .title(wo.getTitle())
                .description(wo.getDescription())
                .status(wo.getStatus())
                .priority(wo.getPriority())
                .category(wo.getCategory())
                .facilityId(wo.getFacilityId())
                .facilityName(facilityName)
                .assetId(wo.getAssetId())
                .assetName(assetName)
                .assignedTechnicianId(wo.getAssignedTechnicianId())
                .technicianName(technicianName)
                .estimatedDurationHours(wo.getEstimatedDurationHours())
                .actualDurationHours(wo.getActualDurationHours())
                .slaResponseDeadline(wo.getSlaResponseDeadline())
                .slaResolutionDeadline(wo.getSlaResolutionDeadline())
                .slaResponseBreached(wo.isSlaResponseBreached())
                .slaResolutionBreached(wo.isSlaResolutionBreached())
                .respondedAt(wo.getRespondedAt())
                .completedAt(wo.getCompletedAt())
                .closedAt(wo.getClosedAt())
                .resolutionNotes(wo.getResolutionNotes())
                .permittedNextStates(permittedNextStates)
                .createdAt(wo.getCreatedAt())
                .updatedAt(wo.getUpdatedAt())
                .build();
    }
}
