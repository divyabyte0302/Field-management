package com.keystone.service;

import com.keystone.dto.FacilityDto;
import com.keystone.entity.Customer;
import com.keystone.entity.Facility;
import com.keystone.entity.Organization;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CustomerRepository;
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
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final OrganizationRepository organizationRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Page<FacilityDto.Response> getFacilities(UUID organizationId, Pageable pageable) {
        Page<Facility> page = organizationId != null
                ? facilityRepository.findByOrganizationId(organizationId, pageable)
                : facilityRepository.findAll(pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public FacilityDto.Response getById(UUID id) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + id));
        return mapToDto(facility);
    }

    @Transactional
    public FacilityDto.Response create(FacilityDto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }

        Facility facility = Facility.builder()
                .organization(org)
                .customer(customer)
                .name(request.getName())
                .code(request.getCode().toUpperCase())
                .facilityType(request.getFacilityType() != null ? request.getFacilityType() : "COMMERCIAL_OFFICE")
                .addressLine1(request.getAddressLine1())
                .addressLine2(request.getAddressLine2())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry() != null ? request.getCountry() : "USA")
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .accessInstructions(request.getAccessInstructions())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return mapToDto(facilityRepository.save(facility));
    }

    @Transactional
    public FacilityDto.Response update(UUID id, FacilityDto.Request request) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + id));

        if (request.getName() != null) facility.setName(request.getName());
        if (request.getFacilityType() != null) facility.setFacilityType(request.getFacilityType());
        if (request.getAddressLine1() != null) facility.setAddressLine1(request.getAddressLine1());
        if (request.getAddressLine2() != null) facility.setAddressLine2(request.getAddressLine2());
        if (request.getCity() != null) facility.setCity(request.getCity());
        if (request.getState() != null) facility.setState(request.getState());
        if (request.getPostalCode() != null) facility.setPostalCode(request.getPostalCode());
        if (request.getCountry() != null) facility.setCountry(request.getCountry());
        if (request.getLatitude() != null) facility.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) facility.setLongitude(request.getLongitude());
        if (request.getAccessInstructions() != null) facility.setAccessInstructions(request.getAccessInstructions());
        if (request.getActive() != null) facility.setActive(request.getActive());
        if (request.getCustomerId() != null) {
            facility.setCustomer(customerRepository.findById(request.getCustomerId()).orElse(null));
        }

        return mapToDto(facilityRepository.save(facility));
    }

    @Transactional
    public void delete(UUID id) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + id));
        facility.setActive(false);
        facilityRepository.save(facility);
    }

    public FacilityDto.Response mapToDto(Facility f) {
        return FacilityDto.Response.builder()
                .id(f.getId())
                .organizationId(f.getOrganization().getId())
                .customerId(f.getCustomer() != null ? f.getCustomer().getId() : null)
                .customerName(f.getCustomer() != null ? f.getCustomer().getName() : null)
                .name(f.getName())
                .code(f.getCode())
                .facilityType(f.getFacilityType())
                .addressLine1(f.getAddressLine1())
                .addressLine2(f.getAddressLine2())
                .city(f.getCity())
                .state(f.getState())
                .postalCode(f.getPostalCode())
                .country(f.getCountry())
                .latitude(f.getLatitude())
                .longitude(f.getLongitude())
                .accessInstructions(f.getAccessInstructions())
                .active(f.isActive())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }
}
