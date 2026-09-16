package com.keystone.service;

import com.keystone.dto.AssetDto;
import com.keystone.entity.Asset;
import com.keystone.entity.Facility;
import com.keystone.entity.Organization;
import com.keystone.enums.AssetStatus;
import com.keystone.enums.Priority;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.AssetRepository;
import com.keystone.repository.FacilityRepository;
import com.keystone.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;
    private final FacilityRepository facilityRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public Page<AssetDto.Response> getAssets(UUID organizationId, UUID facilityId, Pageable pageable) {
        Page<Asset> page;
        if (facilityId != null) {
            page = assetRepository.findByFacilityId(facilityId, pageable);
        } else if (organizationId != null) {
            page = assetRepository.findByOrganizationId(organizationId, pageable);
        } else {
            page = assetRepository.findAll(pageable);
        }
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public AssetDto.Response getById(UUID id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + id));
        return mapToDto(asset);
    }

    @Transactional
    public AssetDto.Response create(AssetDto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Facility facility = facilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + request.getFacilityId()));

        Asset asset = Asset.builder()
                .organization(org)
                .facility(facility)
                .tagNumber(request.getTagNumber())
                .name(request.getName())
                .category(request.getCategory())
                .modelNumber(request.getModelNumber())
                .serialNumber(request.getSerialNumber())
                .manufacturer(request.getManufacturer())
                .installationDate(request.getInstallationDate())
                .warrantyExpiryDate(request.getWarrantyExpiryDate())
                .status(request.getStatus() != null ? request.getStatus() : AssetStatus.OPERATIONAL)
                .criticality(request.getCriticality() != null ? request.getCriticality() : Priority.MEDIUM)
                .locationDetails(request.getLocationDetails())
                .build();

        return mapToDto(assetRepository.save(asset));
    }

    @Transactional
    public AssetDto.Response update(UUID id, AssetDto.Request request) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + id));

        if (request.getName() != null) asset.setName(request.getName());
        if (request.getCategory() != null) asset.setCategory(request.getCategory());
        if (request.getModelNumber() != null) asset.setModelNumber(request.getModelNumber());
        if (request.getSerialNumber() != null) asset.setSerialNumber(request.getSerialNumber());
        if (request.getManufacturer() != null) asset.setManufacturer(request.getManufacturer());
        if (request.getStatus() != null) asset.setStatus(request.getStatus());
        if (request.getCriticality() != null) asset.setCriticality(request.getCriticality());
        if (request.getLocationDetails() != null) asset.setLocationDetails(request.getLocationDetails());

        return mapToDto(assetRepository.save(asset));
    }

    @Transactional
    public void delete(UUID id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + id));
        asset.setStatus(AssetStatus.DECOMMISSIONED);
        assetRepository.save(asset);
    }

    public AssetDto.Response mapToDto(Asset a) {
        return AssetDto.Response.builder()
                .id(a.getId())
                .organizationId(a.getOrganization().getId())
                .facilityId(a.getFacility().getId())
                .facilityName(a.getFacility().getName())
                .tagNumber(a.getTagNumber())
                .name(a.getName())
                .category(a.getCategory())
                .modelNumber(a.getModelNumber())
                .serialNumber(a.getSerialNumber())
                .manufacturer(a.getManufacturer())
                .installationDate(a.getInstallationDate())
                .warrantyExpiryDate(a.getWarrantyExpiryDate())
                .status(a.getStatus())
                .criticality(a.getCriticality())
                .locationDetails(a.getLocationDetails())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
