package com.keystone.service;

import com.keystone.dto.TechnicianDto;
import com.keystone.entity.Organization;
import com.keystone.entity.Technician;
import com.keystone.entity.User;
import com.keystone.enums.TechnicianStatus;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.TechnicianRepository;
import com.keystone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public Page<TechnicianDto.Response> getTechnicians(UUID organizationId, TechnicianStatus status, Pageable pageable) {
        Page<Technician> page;
        if (organizationId != null && status != null) {
            page = technicianRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
        } else if (organizationId != null) {
            page = technicianRepository.findByOrganizationId(organizationId, pageable);
        } else {
            page = technicianRepository.findAll(pageable);
        }
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public TechnicianDto.Response getById(UUID id) {
        Technician tech = technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + id));
        return mapToDto(tech);
    }

    @Transactional
    public TechnicianDto.Response create(TechnicianDto.Request request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Technician technician = Technician.builder()
                .user(user)
                .organization(org)
                .employeeCode(request.getEmployeeCode())
                .hourlyRate(request.getHourlyRate() != null ? request.getHourlyRate() : new BigDecimal("75.00"))
                .status(request.getStatus() != null ? request.getStatus() : TechnicianStatus.AVAILABLE)
                .currentLatitude(request.getCurrentLatitude())
                .currentLongitude(request.getCurrentLongitude())
                .build();

        return mapToDto(technicianRepository.save(technician));
    }

    @Transactional
    public TechnicianDto.Response updateStatus(UUID id, TechnicianStatus status) {
        Technician technician = technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + id));
        technician.setStatus(status);
        return mapToDto(technicianRepository.save(technician));
    }

    @Transactional
    public TechnicianDto.Response updateLocation(UUID id, BigDecimal lat, BigDecimal lng) {
        Technician technician = technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + id));
        technician.setCurrentLatitude(lat);
        technician.setCurrentLongitude(lng);
        return mapToDto(technicianRepository.save(technician));
    }

    public TechnicianDto.Response mapToDto(Technician t) {
        return TechnicianDto.Response.builder()
                .id(t.getId())
                .userId(t.getUser().getId())
                .technicianName(t.getUser().getFirstName() + " " + t.getUser().getLastName())
                .email(t.getUser().getEmail())
                .phone(t.getUser().getPhone())
                .organizationId(t.getOrganization().getId())
                .employeeCode(t.getEmployeeCode())
                .hourlyRate(t.getHourlyRate())
                .status(t.getStatus())
                .currentLatitude(t.getCurrentLatitude())
                .currentLongitude(t.getCurrentLongitude())
                .currentAssignedWoCount(t.getCurrentAssignedWoCount())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
