package com.keystone.repository;

import com.keystone.entity.Facility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, UUID>, JpaSpecificationExecutor<Facility> {
    Optional<Facility> findByCode(String code);
    Page<Facility> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<Facility> findByCustomerId(UUID customerId, Pageable pageable);
    Page<Facility> findByOrganizationIdAndActive(UUID organizationId, boolean active, Pageable pageable);
}
