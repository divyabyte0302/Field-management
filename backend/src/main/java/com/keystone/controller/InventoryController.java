package com.keystone.controller;

import com.keystone.dto.InventoryDto;
import com.keystone.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<Page<InventoryDto.Response>> getInventory(
            @RequestParam(required = false) UUID facilityId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(inventoryService.getInventory(facilityId, pageable));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryDto.Response>> getLowStock() {
        return ResponseEntity.ok(inventoryService.getLowStockItems());
    }

    @PostMapping("/upsert")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')")
    public ResponseEntity<InventoryDto.Response> upsertStock(@Valid @RequestBody InventoryDto.Request request) {
        return ResponseEntity.ok(inventoryService.upsertStock(request));
    }

    @PatchMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'TECHNICIAN')")
    public ResponseEntity<InventoryDto.Response> adjustQuantity(@PathVariable UUID id, @RequestParam int delta) {
        return ResponseEntity.ok(inventoryService.adjustQuantity(id, delta));
    }
}
