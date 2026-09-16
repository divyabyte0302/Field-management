package com.keystone.dto;

import com.keystone.enums.AuditAction;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class AuditLogDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private String entityName;
        private UUID entityId;
        private AuditAction action;
        private UUID performedByUserId;
        private String performedByUserName;
        private String details;
        private String ipAddress;
        private Instant createdAt;
    }
}
