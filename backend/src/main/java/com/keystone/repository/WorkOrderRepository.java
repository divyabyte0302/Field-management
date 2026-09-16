package com.keystone.repository;

import com.keystone.entity.WorkOrder;
import com.keystone.enums.Priority;
import com.keystone.enums.WorkOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID>, JpaSpecificationExecutor<WorkOrder> {

    Optional<WorkOrder> findByWorkOrderNumber(String workOrderNumber);

    List<WorkOrder> findByOrganizationId(UUID organizationId);

    Page<WorkOrder> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<WorkOrder> findByOrganizationIdAndStatus(UUID organizationId, WorkOrderStatus status, Pageable pageable);

    Page<WorkOrder> findByAssignedTechnicianId(UUID technicianId, Pageable pageable);

    @Query("SELECT w.status, COUNT(w) FROM WorkOrder w WHERE w.organizationId = :organizationId GROUP BY w.status")
    List<Object[]> countWorkOrdersByStatus(UUID organizationId);

    @Query("SELECT w.priority, COUNT(w) FROM WorkOrder w WHERE w.organizationId = :organizationId GROUP BY w.priority")
    List<Object[]> countWorkOrdersByPriority(UUID organizationId);

    long countByOrganizationIdAndSlaResolutionBreachedTrue(UUID organizationId);
}
