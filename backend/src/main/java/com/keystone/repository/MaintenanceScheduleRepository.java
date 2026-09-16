package com.keystone.repository;

import com.keystone.entity.MaintenanceSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MaintenanceScheduleRepository extends JpaRepository<MaintenanceSchedule, UUID> {
    Page<MaintenanceSchedule> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<MaintenanceSchedule> findByAssetId(UUID assetId, Pageable pageable);
    List<MaintenanceSchedule> findByActiveTrueAndNextDueDateLessThanEqual(LocalDate dueDate);
}
