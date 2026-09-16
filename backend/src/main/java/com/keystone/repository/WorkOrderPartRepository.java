package com.keystone.repository;

import com.keystone.entity.WorkOrderPart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkOrderPartRepository extends JpaRepository<WorkOrderPart, UUID> {
    List<WorkOrderPart> findByWorkOrderId(UUID workOrderId);
}
