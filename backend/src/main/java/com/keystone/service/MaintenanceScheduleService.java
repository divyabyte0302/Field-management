package com.keystone.service;

import com.keystone.dto.MaintenanceScheduleDto;
import com.keystone.entity.Asset;
import com.keystone.entity.MaintenanceSchedule;
import com.keystone.entity.Organization;
import com.keystone.entity.WorkOrder;
import com.keystone.enums.MaintenanceFrequency;
import com.keystone.enums.Priority;
import com.keystone.enums.WorkOrderStatus;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.AssetRepository;
import com.keystone.repository.MaintenanceScheduleRepository;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MaintenanceScheduleService {

    private final MaintenanceScheduleRepository scheduleRepository;
    private final AssetRepository assetRepository;
    private final OrganizationRepository organizationRepository;
    private final WorkOrderRepository workOrderRepository;

    @Transactional(readOnly = true)
    public Page<MaintenanceScheduleDto.Response> getSchedules(UUID organizationId, Pageable pageable) {
        Page<MaintenanceSchedule> page = organizationId != null
                ? scheduleRepository.findByOrganizationId(organizationId, pageable)
                : scheduleRepository.findAll(pageable);
        return page.map(this::mapToDto);
    }

    @Transactional
    public MaintenanceScheduleDto.Response create(MaintenanceScheduleDto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Asset asset = assetRepository.findById(request.getAssetId())
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found: " + request.getAssetId()));

        MaintenanceSchedule schedule = MaintenanceSchedule.builder()
                .organization(org)
                .asset(asset)
                .name(request.getName())
                .frequency(request.getFrequency() != null ? request.getFrequency() : MaintenanceFrequency.MONTHLY)
                .intervalValue(request.getIntervalValue() != null ? request.getIntervalValue() : 1)
                .nextDueDate(request.getNextDueDate())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .taskInstructions(request.getTaskInstructions())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return mapToDto(scheduleRepository.save(schedule));
    }

    @Transactional
    public WorkOrder generateWorkOrderFromSchedule(UUID scheduleId) {
        MaintenanceSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        Asset asset = schedule.getAsset();
        String woNum = "PM-" + System.currentTimeMillis() % 10000000;

        WorkOrder wo = WorkOrder.builder()
                .organizationId(schedule.getOrganization().getId())
                .facilityId(asset.getFacility().getId())
                .assetId(asset.getId())
                .workOrderNumber(woNum)
                .title("Preventative Maintenance: " + schedule.getName())
                .description(schedule.getTaskInstructions())
                .status(WorkOrderStatus.NEW)
                .priority(schedule.getPriority())
                .category("PREVENTATIVE")
                .estimatedDurationHours(new BigDecimal("2.0"))
                .actualDurationHours(BigDecimal.ZERO)
                .build();

        wo = workOrderRepository.save(wo);

        schedule.setLastGeneratedAt(Instant.now());
        schedule.setNextDueDate(calculateNextDueDate(schedule.getNextDueDate(), schedule.getFrequency(), schedule.getIntervalValue()));
        scheduleRepository.save(schedule);

        return wo;
    }

    private LocalDate calculateNextDueDate(LocalDate current, MaintenanceFrequency freq, int interval) {
        return switch (freq) {
            case DAILY -> current.plusDays(interval);
            case WEEKLY -> current.plusWeeks(interval);
            case BIWEEKLY -> current.plusWeeks(2L * interval);
            case MONTHLY -> current.plusMonths(interval);
            case QUARTERLY -> current.plusMonths(3L * interval);
            case SEMI_ANNUALLY -> current.plusMonths(6L * interval);
            case ANNUALLY -> current.plusYears(interval);
        };
    }

    public MaintenanceScheduleDto.Response mapToDto(MaintenanceSchedule s) {
        return MaintenanceScheduleDto.Response.builder()
                .id(s.getId())
                .organizationId(s.getOrganization().getId())
                .assetId(s.getAsset().getId())
                .assetName(s.getAsset().getName())
                .assetTagNumber(s.getAsset().getTagNumber())
                .name(s.getName())
                .frequency(s.getFrequency())
                .intervalValue(s.getIntervalValue())
                .nextDueDate(s.getNextDueDate())
                .lastGeneratedAt(s.getLastGeneratedAt())
                .priority(s.getPriority())
                .taskInstructions(s.getTaskInstructions())
                .active(s.isActive())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
