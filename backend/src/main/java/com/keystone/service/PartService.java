package com.keystone.service;

import com.keystone.dto.PartDto;
import com.keystone.entity.Organization;
import com.keystone.entity.Part;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PartService {

    private final PartRepository partRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public Page<PartDto.Response> getParts(UUID organizationId, String category, Pageable pageable) {
        Page<Part> page;
        if (organizationId != null && category != null) {
            page = partRepository.findByOrganizationIdAndCategory(organizationId, category, pageable);
        } else if (organizationId != null) {
            page = partRepository.findByOrganizationId(organizationId, pageable);
        } else {
            page = partRepository.findAll(pageable);
        }
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public PartDto.Response getById(UUID id) {
        Part part = partRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + id));
        return mapToDto(part);
    }

    @Transactional
    public PartDto.Response create(PartDto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Part part = Part.builder()
                .organization(org)
                .partNumber(request.getPartNumber())
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .unitCost(request.getUnitCost() != null ? request.getUnitCost() : BigDecimal.ZERO)
                .unitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO)
                .build();

        return mapToDto(partRepository.save(part));
    }

    @Transactional
    public PartDto.Response update(UUID id, PartDto.Request request) {
        Part part = partRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + id));

        if (request.getName() != null) part.setName(request.getName());
        if (request.getDescription() != null) part.setDescription(request.getDescription());
        if (request.getCategory() != null) part.setCategory(request.getCategory());
        if (request.getUnitCost() != null) part.setUnitCost(request.getUnitCost());
        if (request.getUnitPrice() != null) part.setUnitPrice(request.getUnitPrice());

        return mapToDto(partRepository.save(part));
    }

    public PartDto.Response mapToDto(Part p) {
        return PartDto.Response.builder()
                .id(p.getId())
                .organizationId(p.getOrganization().getId())
                .partNumber(p.getPartNumber())
                .name(p.getName())
                .description(p.getDescription())
                .category(p.getCategory())
                .unitCost(p.getUnitCost())
                .unitPrice(p.getUnitPrice())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
