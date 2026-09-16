package com.keystone.controller;

import com.keystone.dto.MaintenanceScheduleDto;
import com.keystone.entity.WorkOrder;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.MaintenanceScheduleService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/maintenance-schedules")
@RequiredArgsConstructor
public class MaintenanceScheduleController {

    private final MaintenanceScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<Page<MaintenanceScheduleDto.Response>> getSchedules(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(scheduleService.getSchedules(orgId, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<MaintenanceScheduleDto.Response> create(
            @Valid @RequestBody MaintenanceScheduleDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (request.getOrganizationId() == null && userDetails != null) {
            request.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.create(request));
    }

    @PostMapping("/{id}/generate-work-order")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<UUID> generateWorkOrder(@PathVariable UUID id) {
        WorkOrder wo = scheduleService.generateWorkOrderFromSchedule(id);
        return ResponseEntity.ok(wo.getId());
    }
}
