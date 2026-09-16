package com.keystone.service;

import com.keystone.dto.AuditLogDto;
import com.keystone.entity.AuditLog;
import com.keystone.entity.Organization;
import com.keystone.entity.User;
import com.keystone.enums.AuditAction;
import com.keystone.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLogDto.Response> getAuditLogs(UUID organizationId, Pageable pageable) {
        Page<AuditLog> page = organizationId != null
                ? auditLogRepository.findByOrganizationId(organizationId, pageable)
                : auditLogRepository.findAll(pageable);
        return page.map(this::mapToDto);
    }

    @Transactional
    public void logAction(UUID organizationId, String entityName, UUID entityId, AuditAction action, UUID userId, String details, String ipAddress) {
        Organization org = Organization.builder().id(organizationId).build();
        User user = userId != null ? User.builder().id(userId).build() : null;

        AuditLog log = AuditLog.builder()
                .organization(org)
                .entityName(entityName)
                .entityId(entityId)
                .action(action)
                .performedByUser(user)
                .details(details)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(log);
    }

    public AuditLogDto.Response mapToDto(AuditLog log) {
        String performerName = log.getPerformedByUser() != null
                ? log.getPerformedByUser().getFirstName() + " " + log.getPerformedByUser().getLastName()
                : "System";

        return AuditLogDto.Response.builder()
                .id(log.getId())
                .organizationId(log.getOrganization().getId())
                .entityName(log.getEntityName())
                .entityId(log.getEntityId())
                .action(log.getAction())
                .performedByUserId(log.getPerformedByUser() != null ? log.getPerformedByUser().getId() : null)
                .performedByUserName(performerName)
                .details(log.getDetails())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
