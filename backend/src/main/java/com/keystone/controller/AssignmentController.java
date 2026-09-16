package com.keystone.controller;

import com.keystone.dto.AssignmentDto;
import com.keystone.security.CustomUserDetails;
import com.keystone.service.AssignmentService;
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
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping("/technician/{technicianId}")
    public ResponseEntity<Page<AssignmentDto.Response>> getByTechnician(
            @PathVariable UUID technicianId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(assignmentService.getByTechnicianId(technicianId, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<AssignmentDto.Response> assign(
            @Valid @RequestBody AssignmentDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        UUID currentUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.assign(request, currentUserId));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<AssignmentDto.Response> accept(@PathVariable UUID id) {
        return ResponseEntity.ok(assignmentService.acceptAssignment(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<AssignmentDto.Response> reject(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason) {

        return ResponseEntity.ok(assignmentService.rejectAssignment(id, reason));
    }
}
