package com.keystone.repository;

import com.keystone.entity.WorkOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for immutable, append-only WorkOrderStatusHistory records.
 */
@Repository
public interface WorkOrderStatusHistoryRepository extends JpaRepository<WorkOrderStatusHistory, UUID> {
    List<WorkOrderStatusHistory> findByWorkOrderIdOrderByTimestampAsc(UUID workOrderId);
}
