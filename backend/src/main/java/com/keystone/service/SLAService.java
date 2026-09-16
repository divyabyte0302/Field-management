package com.keystone.service;

import com.keystone.dto.SLADto;
import com.keystone.entity.Organization;
import com.keystone.entity.SLA;
import com.keystone.enums.Priority;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.SLARepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SLAService {

    private final SLARepository slaRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public List<SLADto.Response> getByOrganization(UUID organizationId) {
        return slaRepository.findByOrganizationId(organizationId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SLADto.Response getById(UUID id) {
        SLA sla = slaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SLA policy not found: " + id));
        return mapToDto(sla);
    }

    @Transactional
    public SLADto.Response create(SLADto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        SLA sla = SLA.builder()
                .organization(org)
                .name(request.getName())
                .priority(request.getPriority())
                .responseTimeMinutes(request.getResponseTimeMinutes())
                .resolutionTimeMinutes(request.getResolutionTimeMinutes())
                .businessHoursOnly(request.getBusinessHoursOnly() != null ? request.getBusinessHoursOnly() : false)
                .build();

        return mapToDto(slaRepository.save(sla));
    }

    public SLADto.Response mapToDto(SLA s) {
        return SLADto.Response.builder()
                .id(s.getId())
                .organizationId(s.getOrganization().getId())
                .name(s.getName())
                .priority(s.getPriority())
                .responseTimeMinutes(s.getResponseTimeMinutes())
                .resolutionTimeMinutes(s.getResolutionTimeMinutes())
                .businessHoursOnly(s.isBusinessHoursOnly())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
