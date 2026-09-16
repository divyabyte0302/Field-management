package com.keystone.controller;

import com.keystone.dto.SLADto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.SLAService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sla")
@RequiredArgsConstructor
public class SLAController {

    private final SLAService slaService;

    @GetMapping
    public ResponseEntity<List<SLADto.Response>> getByOrganization(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(slaService.getByOrganization(orgId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SLADto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(slaService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<SLADto.Response> create(
            @Valid @RequestBody SLADto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (request.getOrganizationId() == null && userDetails != null) {
            request.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(slaService.create(request));
    }
}
