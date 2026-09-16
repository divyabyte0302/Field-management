package com.keystone.controller;

import com.keystone.dto.AssetDto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.AssetService;
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
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    @GetMapping
    public ResponseEntity<Page<AssetDto.Response>> getAssets(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) UUID facilityId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(assetService.getAssets(orgId, facilityId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetDto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(assetService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<AssetDto.Response> create(
            @Valid @RequestBody AssetDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (request.getOrganizationId() == null && userDetails != null) {
            request.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(assetService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<AssetDto.Response> update(@PathVariable UUID id, @RequestBody AssetDto.Request request) {
        return ResponseEntity.ok(assetService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        assetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
