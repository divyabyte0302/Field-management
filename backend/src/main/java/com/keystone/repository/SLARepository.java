package com.keystone.repository;

import com.keystone.entity.SLA;
import com.keystone.enums.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SLARepository extends JpaRepository<SLA, UUID> {
    List<SLA> findByOrganizationId(UUID organizationId);
    Page<SLA> findByOrganizationId(UUID organizationId, Pageable pageable);
    Optional<SLA> findByOrganizationIdAndPriority(UUID organizationId, Priority priority);
}
