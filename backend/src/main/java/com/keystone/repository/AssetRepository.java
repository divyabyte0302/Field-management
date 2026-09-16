package com.keystone.repository;

import com.keystone.entity.Asset;
import com.keystone.enums.AssetStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
    Optional<Asset> findByTagNumber(String tagNumber);
    Page<Asset> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<Asset> findByFacilityId(UUID facilityId, Pageable pageable);
    Page<Asset> findByOrganizationIdAndStatus(UUID organizationId, AssetStatus status, Pageable pageable);
    long countByOrganizationId(UUID organizationId);
}
