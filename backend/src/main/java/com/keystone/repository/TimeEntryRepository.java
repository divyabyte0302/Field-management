package com.keystone.repository;

import com.keystone.entity.TimeEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID> {
    List<TimeEntry> findByWorkOrderIdOrderByStartTimeDesc(UUID workOrderId);
    Page<TimeEntry> findByTechnicianId(UUID technicianId, Pageable pageable);
}
