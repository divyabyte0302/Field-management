package com.keystone.controller;

import com.keystone.dto.ServiceRequestDto;
import com.keystone.enums.ServiceRequestStatus;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.ServiceRequestService;
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
@RequestMapping("/api/service-requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    @GetMapping
    public ResponseEntity<Page<ServiceRequestDto.Response>> getRequests(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) ServiceRequestStatus status,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(serviceRequestService.getRequests(orgId, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceRequestService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ServiceRequestDto.Response> create(
            @Valid @RequestBody ServiceRequestDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails != null && request.getReportedByUserId() == null) {
            request.setReportedByUserId(userDetails.getId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceRequestService.create(request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<ServiceRequestDto.Response> updateStatus(
            @PathVariable UUID id,
            @RequestParam ServiceRequestStatus status) {

        return ResponseEntity.ok(serviceRequestService.updateStatus(id, status));
    }
}
