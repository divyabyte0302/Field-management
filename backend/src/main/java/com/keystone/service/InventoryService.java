package com.keystone.service;

import com.keystone.dto.InventoryDto;
import com.keystone.entity.Facility;
import com.keystone.entity.Inventory;
import com.keystone.entity.Part;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.FacilityRepository;
import com.keystone.repository.InventoryRepository;
import com.keystone.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final PartRepository partRepository;
    private final FacilityRepository facilityRepository;

    @Transactional(readOnly = true)
    public Page<InventoryDto.Response> getInventory(UUID facilityId, Pageable pageable) {
        Page<Inventory> page = facilityId != null
                ? inventoryRepository.findByFacilityId(facilityId, pageable)
                : inventoryRepository.findAll(pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<InventoryDto.Response> getLowStockItems() {
        return inventoryRepository.findLowStockInventory().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryDto.Response upsertStock(InventoryDto.Request request) {
        Part part = partRepository.findById(request.getPartId())
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + request.getPartId()));

        Facility facility = null;
        if (request.getFacilityId() != null) {
            facility = facilityRepository.findById(request.getFacilityId()).orElse(null);
        }
        final Facility assignedFacility = facility;

        Inventory inventory = inventoryRepository.findByPartIdAndFacilityId(request.getPartId(), request.getFacilityId())
                .orElseGet(() -> Inventory.builder()
                        .part(part)
                        .facility(assignedFacility)
                        .quantityOnHand(0)
                        .quantityReserved(0)
                        .minimumThreshold(5)
                        .reorderQuantity(20)
                        .build());

        inventory.setQuantityOnHand(request.getQuantityOnHand());
        inventory.setQuantityReserved(request.getQuantityReserved());
        if (request.getMinimumThreshold() > 0) inventory.setMinimumThreshold(request.getMinimumThreshold());
        if (request.getReorderQuantity() > 0) inventory.setReorderQuantity(request.getReorderQuantity());
        if (request.getBinLocation() != null) inventory.setBinLocation(request.getBinLocation());

        return mapToDto(inventoryRepository.save(inventory));
    }

    @Transactional
    public InventoryDto.Response adjustQuantity(UUID inventoryId, int delta) {
        Inventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + inventoryId));

        inv.setQuantityOnHand(Math.max(0, inv.getQuantityOnHand() + delta));
        return mapToDto(inventoryRepository.save(inv));
    }

    public InventoryDto.Response mapToDto(Inventory inv) {
        return InventoryDto.Response.builder()
                .id(inv.getId())
                .partId(inv.getPart().getId())
                .partNumber(inv.getPart().getPartNumber())
                .partName(inv.getPart().getName())
                .facilityId(inv.getFacility() != null ? inv.getFacility().getId() : null)
                .facilityName(inv.getFacility() != null ? inv.getFacility().getName() : "Central Warehouse")
                .quantityOnHand(inv.getQuantityOnHand())
                .quantityReserved(inv.getQuantityReserved())
                .minimumThreshold(inv.getMinimumThreshold())
                .reorderQuantity(inv.getReorderQuantity())
                .binLocation(inv.getBinLocation())
                .isLowStock(inv.getQuantityOnHand() <= inv.getMinimumThreshold())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }
}
