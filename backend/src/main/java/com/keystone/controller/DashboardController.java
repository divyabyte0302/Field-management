package com.keystone.controller;

import com.keystone.dto.DashboardSummaryDto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> getSummary(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(dashboardService.getSummary(orgId));
    }
}
