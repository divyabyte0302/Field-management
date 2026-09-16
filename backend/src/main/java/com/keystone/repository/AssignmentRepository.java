package com.keystone.repository;

import com.keystone.entity.Assignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    List<Assignment> findByWorkOrderIdOrderByAssignedAtDesc(UUID workOrderId);
    Optional<Assignment> findByWorkOrderIdAndCurrentTrue(UUID workOrderId);
    Page<Assignment> findByTechnicianId(UUID technicianId, Pageable pageable);
}
