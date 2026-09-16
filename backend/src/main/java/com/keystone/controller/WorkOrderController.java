package com.keystone.controller;

import com.keystone.dto.*;
import com.keystone.enums.Priority;
import com.keystone.enums.RoleName;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final CommentService commentService;
    private final AttachmentService attachmentService;
    private final TimeEntryService timeEntryService;
    private final AssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<Page<WorkOrderResponseDto>> getWorkOrders(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) UUID facilityId,
            @RequestParam(required = false) UUID technicianId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(workOrderService.getWorkOrders(organizationId, status, priority, facilityId, technicianId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkOrderResponseDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(workOrderService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'CUSTOMER')")
    public ResponseEntity<WorkOrderResponseDto> create(
            @Valid @RequestBody WorkOrderCreateDto dto,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (dto.getOrganizationId() == null && userDetails != null) {
            dto.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(workOrderService.createWorkOrder(dto));
    }

    @PostMapping("/{id}/transition")
    public ResponseEntity<WorkOrderResponseDto> transitionState(
            @PathVariable UUID id,
            @Valid @RequestBody WorkOrderTransitionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Set<RoleName> userRoles = Set.of(RoleName.ROLE_ADMIN);
        UUID currentUserId = null;
        if (userDetails != null) {
            currentUserId = userDetails.getId();
            userRoles = userDetails.getAuthorities().stream()
                    .map(a -> {
                        try {
                            return RoleName.valueOf(a.getAuthority());
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(r -> r != null)
                    .collect(Collectors.toSet());
        }

        return ResponseEntity.ok(workOrderService.transitionState(id, request, userRoles, currentUserId));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<WorkOrderResponseDto> assignTechnician(
            @PathVariable UUID id,
            @RequestParam UUID technicianId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        UUID currentUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId, currentUserId));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentDto.Response>> getComments(@PathVariable UUID id) {
        return ResponseEntity.ok(commentService.getByWorkOrderId(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentDto.Response> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CommentDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        request.setWorkOrderId(id);
        UUID currentUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.addComment(request, currentUserId));
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<AttachmentDto.Response>> getAttachments(@PathVariable UUID id) {
        return ResponseEntity.ok(attachmentService.getByWorkOrderId(id));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<AttachmentDto.Response> addAttachment(
            @PathVariable UUID id,
            @Valid @RequestBody AttachmentDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        request.setWorkOrderId(id);
        UUID currentUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(attachmentService.addAttachment(request, currentUserId));
    }

    @GetMapping("/{id}/time-entries")
    public ResponseEntity<List<TimeEntryDto.Response>> getTimeEntries(@PathVariable UUID id) {
        return ResponseEntity.ok(timeEntryService.getByWorkOrderId(id));
    }

    @PostMapping("/{id}/time-entries")
    public ResponseEntity<TimeEntryDto.Response> logTime(
            @PathVariable UUID id,
            @Valid @RequestBody TimeEntryDto.Request request) {

        request.setWorkOrderId(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(timeEntryService.logTime(request));
    }

    @GetMapping("/{id}/assignments")
    public ResponseEntity<List<AssignmentDto.Response>> getAssignments(@PathVariable UUID id) {
        return ResponseEntity.ok(assignmentService.getByWorkOrderId(id));
    }
}
