package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class AttachmentDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotNull(message = "Work order ID is required")
        private UUID workOrderId;

        @NotBlank(message = "File name is required")
        private String fileName;

        @NotBlank(message = "File URL is required")
        private String fileUrl;

        @NotBlank(message = "File type is required")
        private String fileType;

        private long fileSizeBytes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID workOrderId;
        private String fileName;
        private String fileUrl;
        private String fileType;
        private long fileSizeBytes;
        private UUID uploadedByUserId;
        private String uploadedByUserName;
        private Instant createdAt;
    }
}
