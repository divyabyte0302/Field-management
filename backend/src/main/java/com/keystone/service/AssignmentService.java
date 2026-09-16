package com.keystone.service;

import com.keystone.dto.AssignmentDto;
import com.keystone.entity.Assignment;
import com.keystone.entity.Technician;
import com.keystone.entity.User;
import com.keystone.entity.WorkOrder;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.AssignmentRepository;
import com.keystone.repository.TechnicianRepository;
import com.keystone.repository.UserRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final TechnicianRepository technicianRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AssignmentDto.Response> getByWorkOrderId(UUID workOrderId) {
        return assignmentRepository.findByWorkOrderIdOrderByAssignedAtDesc(workOrderId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<AssignmentDto.Response> getByTechnicianId(UUID technicianId, Pageable pageable) {
        return assignmentRepository.findByTechnicianId(technicianId, pageable).map(this::mapToDto);
    }

    @Transactional
    public AssignmentDto.Response assign(AssignmentDto.Request request, UUID assignedByUserId) {
        WorkOrder wo = workOrderRepository.findById(request.getWorkOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Work order not found: " + request.getWorkOrderId()));

        Technician tech = technicianRepository.findById(request.getTechnicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + request.getTechnicianId()));

        assignmentRepository.findByWorkOrderIdAndCurrentTrue(wo.getId()).ifPresent(curr -> {
            curr.setCurrent(false);
            assignmentRepository.save(curr);
        });

        User assignedByUser = assignedByUserId != null ? userRepository.findById(assignedByUserId).orElse(null) : null;

        Assignment assignment = Assignment.builder()
                .workOrder(wo)
                .technician(tech)
                .assignedByUser(assignedByUser)
                .current(true)
                .build();

        wo.setAssignedTechnicianId(tech.getId());
        if (wo.getStatus() == WorkOrderStatus.NEW || wo.getStatus() == WorkOrderStatus.TRIAGED) {
            wo.setStatus(WorkOrderStatus.ASSIGNED);
        }
        workOrderRepository.save(wo);

        return mapToDto(assignmentRepository.save(assignment));
    }

    @Transactional
    public AssignmentDto.Response acceptAssignment(UUID assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        assignment.setAcceptedAt(Instant.now());
        WorkOrder wo = assignment.getWorkOrder();
        if (wo.getStatus() == WorkOrderStatus.ASSIGNED) {
            wo.setStatus(WorkOrderStatus.ACCEPTED);
            workOrderRepository.save(wo);
        }

        return mapToDto(assignmentRepository.save(assignment));
    }

    @Transactional
    public AssignmentDto.Response rejectAssignment(UUID assignmentId, String reason) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));

        assignment.setRejectedAt(Instant.now());
        assignment.setRejectionReason(reason);
        assignment.setCurrent(false);

        WorkOrder wo = assignment.getWorkOrder();
        wo.setAssignedTechnicianId(null);
        wo.setStatus(WorkOrderStatus.TRIAGED);
        workOrderRepository.save(wo);

        return mapToDto(assignmentRepository.save(assignment));
    }

    public AssignmentDto.Response mapToDto(Assignment a) {
        String techName = a.getTechnician().getUser() != null
                ? a.getTechnician().getUser().getFirstName() + " " + a.getTechnician().getUser().getLastName()
                : a.getTechnician().getEmployeeCode();

        String assignedByName = a.getAssignedByUser() != null
                ? a.getAssignedByUser().getFirstName() + " " + a.getAssignedByUser().getLastName()
                : null;

        return AssignmentDto.Response.builder()
                .id(a.getId())
                .workOrderId(a.getWorkOrder().getId())
                .workOrderNumber(a.getWorkOrder().getWorkOrderNumber())
                .technicianId(a.getTechnician().getId())
                .technicianName(techName)
                .assignedByUserId(a.getAssignedByUser() != null ? a.getAssignedByUser().getId() : null)
                .assignedByUserName(assignedByName)
                .assignedAt(a.getAssignedAt())
                .acceptedAt(a.getAcceptedAt())
                .rejectedAt(a.getRejectedAt())
                .rejectionReason(a.getRejectionReason())
                .current(a.isCurrent())
                .build();
    }
}
