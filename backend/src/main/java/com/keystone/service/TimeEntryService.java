package com.keystone.service;

import com.keystone.dto.TimeEntryDto;
import com.keystone.entity.Technician;
import com.keystone.entity.TimeEntry;
import com.keystone.entity.WorkOrder;
import com.keystone.enums.TimeEntryType;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.TechnicianRepository;
import com.keystone.repository.TimeEntryRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimeEntryService {

    private final TimeEntryRepository timeEntryRepository;
    private final WorkOrderRepository workOrderRepository;
    private final TechnicianRepository technicianRepository;

    @Transactional(readOnly = true)
    public List<TimeEntryDto.Response> getByWorkOrderId(UUID workOrderId) {
        return timeEntryRepository.findByWorkOrderIdOrderByStartTimeDesc(workOrderId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public TimeEntryDto.Response logTime(TimeEntryDto.Request request) {
        WorkOrder wo = workOrderRepository.findById(request.getWorkOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Work order not found: " + request.getWorkOrderId()));

        Technician tech = null;
        if (request.getTechnicianId() != null) {
            tech = technicianRepository.findById(request.getTechnicianId()).orElse(null);
        }

        int duration = request.getDurationMinutes() != null ? request.getDurationMinutes() : 0;
        if (duration == 0 && request.getStartTime() != null && request.getEndTime() != null) {
            duration = (int) Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        }

        TimeEntry entry = TimeEntry.builder()
                .workOrder(wo)
                .technician(tech)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .durationMinutes(duration)
                .entryType(request.getEntryType() != null ? request.getEntryType() : TimeEntryType.LABOR)
                .notes(request.getNotes())
                .build();

        entry = timeEntryRepository.save(entry);

        BigDecimal additionalHours = BigDecimal.valueOf(duration).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        wo.setActualDurationHours(wo.getActualDurationHours().add(additionalHours));
        workOrderRepository.save(wo);

        return mapToDto(entry);
    }

    public TimeEntryDto.Response mapToDto(TimeEntry te) {
        String techName = te.getTechnician() != null && te.getTechnician().getUser() != null
                ? te.getTechnician().getUser().getFirstName() + " " + te.getTechnician().getUser().getLastName()
                : (te.getTechnician() != null ? te.getTechnician().getEmployeeCode() : "Unassigned");

        return TimeEntryDto.Response.builder()
                .id(te.getId())
                .workOrderId(te.getWorkOrder().getId())
                .workOrderNumber(te.getWorkOrder().getWorkOrderNumber())
                .technicianId(te.getTechnician() != null ? te.getTechnician().getId() : null)
                .technicianName(techName)
                .startTime(te.getStartTime())
                .endTime(te.getEndTime())
                .durationMinutes(te.getDurationMinutes())
                .entryType(te.getEntryType())
                .notes(te.getNotes())
                .createdAt(te.getCreatedAt())
                .build();
    }
}
