package com.keystone.service;

import com.keystone.dto.OrganizationDto;
import com.keystone.entity.Organization;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public List<OrganizationDto.Response> getAll() {
        return organizationRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrganizationDto.Response getById(UUID id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        return mapToDto(org);
    }

    @Transactional(readOnly = true)
    public OrganizationDto.Response getByCode(String code) {
        Organization org = organizationRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with code: " + code));
        return mapToDto(org);
    }

    @Transactional
    public OrganizationDto.Response create(OrganizationDto.Request request) {
        if (organizationRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Organization code already exists: " + request.getCode());
        }

        Organization org = Organization.builder()
                .name(request.getName())
                .code(request.getCode().toUpperCase())
                .subscriptionTier(request.getSubscriptionTier() != null ? request.getSubscriptionTier() : "ENTERPRISE")
                .timezone(request.getTimezone() != null ? request.getTimezone() : "America/New_York")
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .build();

        return mapToDto(organizationRepository.save(org));
    }

    @Transactional
    public OrganizationDto.Response update(UUID id, OrganizationDto.Request request) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));

        if (request.getName() != null) org.setName(request.getName());
        if (request.getSubscriptionTier() != null) org.setSubscriptionTier(request.getSubscriptionTier());
        if (request.getTimezone() != null) org.setTimezone(request.getTimezone());
        if (request.getStatus() != null) org.setStatus(request.getStatus());

        return mapToDto(organizationRepository.save(org));
    }

    private OrganizationDto.Response mapToDto(Organization org) {
        return OrganizationDto.Response.builder()
                .id(org.getId())
                .name(org.getName())
                .code(org.getCode())
                .subscriptionTier(org.getSubscriptionTier())
                .timezone(org.getTimezone())
                .status(org.getStatus())
                .facilitiesCount(org.getFacilities() != null ? org.getFacilities().size() : 0)
                .usersCount(org.getUsers() != null ? org.getUsers().size() : 0)
                .createdAt(org.getCreatedAt())
                .updatedAt(org.getUpdatedAt())
                .build();
    }
}
