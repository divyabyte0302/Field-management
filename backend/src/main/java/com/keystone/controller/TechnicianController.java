package com.keystone.controller;

import com.keystone.dto.TechnicianDto;
import com.keystone.enums.TechnicianStatus;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.TechnicianService;
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

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/technicians")
@RequiredArgsConstructor
public class TechnicianController {

    private final TechnicianService technicianService;

    @GetMapping
    public ResponseEntity<Page<TechnicianDto.Response>> getTechnicians(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) TechnicianStatus status,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(technicianService.getTechnicians(orgId, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TechnicianDto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(technicianService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<TechnicianDto.Response> create(
            @Valid @RequestBody TechnicianDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (request.getOrganizationId() == null && userDetails != null) {
            request.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(technicianService.create(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TechnicianDto.Response> updateStatus(
            @PathVariable UUID id,
            @RequestParam TechnicianStatus status) {

        return ResponseEntity.ok(technicianService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/location")
    public ResponseEntity<TechnicianDto.Response> updateLocation(
            @PathVariable UUID id,
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude) {

        return ResponseEntity.ok(technicianService.updateLocation(id, latitude, longitude));
    }
}
