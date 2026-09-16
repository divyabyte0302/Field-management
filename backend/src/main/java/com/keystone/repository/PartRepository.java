package com.keystone.repository;

import com.keystone.entity.Part;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PartRepository extends JpaRepository<Part, UUID>, JpaSpecificationExecutor<Part> {
    Optional<Part> findByPartNumber(String partNumber);
    Page<Part> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<Part> findByOrganizationIdAndCategory(UUID organizationId, String category, Pageable pageable);
}
