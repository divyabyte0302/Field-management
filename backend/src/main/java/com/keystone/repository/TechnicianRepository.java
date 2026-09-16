package com.keystone.repository;

import com.keystone.entity.Technician;
import com.keystone.enums.TechnicianStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TechnicianRepository extends JpaRepository<Technician, UUID>, JpaSpecificationExecutor<Technician> {
    Optional<Technician> findByUserId(UUID userId);
    Optional<Technician> findByEmployeeCode(String employeeCode);
    Page<Technician> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<Technician> findByOrganizationIdAndStatus(UUID organizationId, TechnicianStatus status, Pageable pageable);
    long countByOrganizationIdAndStatus(UUID organizationId, TechnicianStatus status);
    long countByOrganizationId(UUID organizationId);
}
