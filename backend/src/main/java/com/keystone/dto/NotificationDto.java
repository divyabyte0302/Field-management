package com.keystone.dto;

import com.keystone.enums.NotificationType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class NotificationDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID recipientUserId;
        private String title;
        private String message;
        private NotificationType notificationType;
        private UUID referenceId;
        private boolean read;
        private Instant createdAt;
    }
}
