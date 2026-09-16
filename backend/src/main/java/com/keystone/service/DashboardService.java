package com.keystone.service;

import com.keystone.dto.DashboardSummaryDto;
import com.keystone.entity.WorkOrder;
import com.keystone.enums.Priority;
import com.keystone.enums.ServiceRequestStatus;
import com.keystone.enums.TechnicianStatus;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.repository.AssetRepository;
import com.keystone.repository.ServiceRequestRepository;
import com.keystone.repository.TechnicianRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkOrderRepository workOrderRepository;
    private final TechnicianRepository technicianRepository;
    private final AssetRepository assetRepository;
    private final ServiceRequestRepository serviceRequestRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryDto getSummary(UUID organizationId) {
        List<WorkOrder> workOrders = organizationId != null
                ? workOrderRepository.findByOrganizationId(organizationId)
                : workOrderRepository.findAll();

        long totalWorkOrders = workOrders.size();
        long openWorkOrders = workOrders.stream()
                .filter(w -> w.getStatus() != WorkOrderStatus.CLOSED && w.getStatus() != WorkOrderStatus.VERIFIED)
                .count();
        long completedWorkOrders = workOrders.stream()
                .filter(w -> w.getStatus() == WorkOrderStatus.COMPLETED || w.getStatus() == WorkOrderStatus.VERIFIED || w.getStatus() == WorkOrderStatus.CLOSED)
                .count();
        long slaBreached = workOrders.stream()
                .filter(w -> w.isSlaResponseBreached() || w.isSlaResolutionBreached())
                .count();

        Map<String, Long> byStatus = new HashMap<>();
        for (WorkOrderStatus s : WorkOrderStatus.values()) {
            long count = workOrders.stream().filter(w -> w.getStatus() == s).count();
            byStatus.put(s.name(), count);
        }

        Map<String, Long> byPriority = new HashMap<>();
        for (Priority p : Priority.values()) {
            long count = workOrders.stream().filter(w -> w.getPriority() == p).count();
            byPriority.put(p.name(), count);
        }

        long activeTechs = organizationId != null
                ? technicianRepository.countByOrganizationIdAndStatus(organizationId, TechnicianStatus.AVAILABLE)
                : technicianRepository.count();

        long totalAssets = organizationId != null
                ? assetRepository.countByOrganizationId(organizationId)
                : assetRepository.count();

        long pendingRequests = organizationId != null
                ? serviceRequestRepository.countByOrganizationIdAndStatus(organizationId, ServiceRequestStatus.PENDING_REVIEW)
                : serviceRequestRepository.count();

        return DashboardSummaryDto.builder()
                .totalWorkOrders(totalWorkOrders)
                .openWorkOrders(openWorkOrders)
                .completedWorkOrders(completedWorkOrders)
                .slaBreachedWorkOrders(slaBreached)
                .activeTechnicians(activeTechs)
                .totalAssets(totalAssets)
                .pendingServiceRequests(pendingRequests)
                .workOrdersByStatus(byStatus)
                .workOrdersByPriority(byPriority)
                .build();
    }
}
