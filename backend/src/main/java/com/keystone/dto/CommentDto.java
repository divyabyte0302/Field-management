package com.keystone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class CommentDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        @NotNull(message = "Work order ID is required")
        private UUID workOrderId;

        @NotBlank(message = "Comment text is required")
        private String commentText;

        private Boolean internalOnly;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID workOrderId;
        private UUID userId;
        private String authorName;
        private String commentText;
        private boolean internalOnly;
        private Instant createdAt;
    }
}
