package com.keystone.service;

import com.keystone.dto.ServiceRequestDto;
import com.keystone.entity.Customer;
import com.keystone.entity.Facility;
import com.keystone.entity.Organization;
import com.keystone.entity.ServiceRequest;
import com.keystone.entity.User;
import com.keystone.enums.Priority;
import com.keystone.enums.ServiceRequestStatus;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CustomerRepository;
import com.keystone.repository.FacilityRepository;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.ServiceRequestRepository;
import com.keystone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final CustomerRepository customerRepository;
    private final FacilityRepository facilityRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<ServiceRequestDto.Response> getRequests(UUID organizationId, ServiceRequestStatus status, Pageable pageable) {
        Page<ServiceRequest> page;
        if (organizationId != null && status != null) {
            page = serviceRequestRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
        } else if (organizationId != null) {
            page = serviceRequestRepository.findByOrganizationId(organizationId, pageable);
        } else {
            page = serviceRequestRepository.findAll(pageable);
        }
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public ServiceRequestDto.Response getById(UUID id) {
        ServiceRequest sr = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + id));
        return mapToDto(sr);
    }

    @Transactional
    public ServiceRequestDto.Response create(ServiceRequestDto.Request request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + request.getCustomerId()));

        Facility facility = facilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found: " + request.getFacilityId()));

        Organization org = customer.getOrganization();

        User reportedBy = null;
        if (request.getReportedByUserId() != null) {
            reportedBy = userRepository.findById(request.getReportedByUserId()).orElse(null);
        }

        String reqNum = "SR-" + System.currentTimeMillis() % 1000000;

        ServiceRequest sr = ServiceRequest.builder()
                .organization(org)
                .customer(customer)
                .facility(facility)
                .reportedByUser(reportedBy)
                .requestNumber(reqNum)
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .status(request.getStatus() != null ? request.getStatus() : ServiceRequestStatus.PENDING_REVIEW)
                .build();

        return mapToDto(serviceRequestRepository.save(sr));
    }

    @Transactional
    public ServiceRequestDto.Response updateStatus(UUID id, ServiceRequestStatus status) {
        ServiceRequest sr = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + id));
        sr.setStatus(status);
        return mapToDto(serviceRequestRepository.save(sr));
    }

    public ServiceRequestDto.Response mapToDto(ServiceRequest sr) {
        return ServiceRequestDto.Response.builder()
                .id(sr.getId())
                .organizationId(sr.getOrganization().getId())
                .customerId(sr.getCustomer().getId())
                .customerName(sr.getCustomer().getName())
                .facilityId(sr.getFacility().getId())
                .facilityName(sr.getFacility().getName())
                .reportedByUserId(sr.getReportedByUser() != null ? sr.getReportedByUser().getId() : null)
                .reportedByUserName(sr.getReportedByUser() != null ? sr.getReportedByUser().getFirstName() + " " + sr.getReportedByUser().getLastName() : null)
                .requestNumber(sr.getRequestNumber())
                .title(sr.getTitle())
                .description(sr.getDescription())
                .priority(sr.getPriority())
                .status(sr.getStatus())
                .createdAt(sr.getCreatedAt())
                .updatedAt(sr.getUpdatedAt())
                .build();
    }
}
