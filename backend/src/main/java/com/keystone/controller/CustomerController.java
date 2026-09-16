package com.keystone.controller;

import com.keystone.dto.CustomerDto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.CustomerService;
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
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<Page<CustomerDto.Response>> getCustomers(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID orgId = organizationId != null ? organizationId : (userDetails != null ? userDetails.getOrganizationId() : null);
        return ResponseEntity.ok(customerService.getCustomers(orgId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(customerService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<CustomerDto.Response> create(
            @Valid @RequestBody CustomerDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (request.getOrganizationId() == null && userDetails != null) {
            request.setOrganizationId(userDetails.getOrganizationId());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CustomerDto.Response> update(@PathVariable UUID id, @RequestBody CustomerDto.Request request) {
        return ResponseEntity.ok(customerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
