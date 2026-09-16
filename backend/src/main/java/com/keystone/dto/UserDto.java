package com.keystone.dto;

import com.keystone.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public class UserDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private UUID organizationId;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String password;

        @NotBlank(message = "First name is required")
        private String firstName;

        @NotBlank(message = "Last name is required")
        private String lastName;

        private String phone;
        private Set<RoleName> roles;
        private Boolean active;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private UUID organizationId;
        private String organizationName;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private boolean active;
        private boolean emailVerified;
        private Instant lastLoginAt;
        private Set<String> roles;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
