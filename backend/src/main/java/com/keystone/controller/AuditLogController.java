package com.keystone.controller;

import com.keystone.dto.AuditLogDto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLogDto.Response>> getAuditLogs(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 30) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(auditLogService.getAuditLogs(orgId, pageable));
    }
}
