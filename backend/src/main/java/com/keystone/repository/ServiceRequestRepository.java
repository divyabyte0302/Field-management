package com.keystone.repository;

import com.keystone.entity.ServiceRequest;
import com.keystone.enums.ServiceRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID>, JpaSpecificationExecutor<ServiceRequest> {
    Optional<ServiceRequest> findByRequestNumber(String requestNumber);
    Page<ServiceRequest> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<ServiceRequest> findByCustomerId(UUID customerId, Pageable pageable);
    Page<ServiceRequest> findByFacilityId(UUID facilityId, Pageable pageable);
    Page<ServiceRequest> findByOrganizationIdAndStatus(UUID organizationId, ServiceRequestStatus status, Pageable pageable);
    long countByOrganizationIdAndStatus(UUID organizationId, ServiceRequestStatus status);
}
