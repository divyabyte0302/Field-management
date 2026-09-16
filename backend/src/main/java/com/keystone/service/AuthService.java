package com.keystone.service;

import com.keystone.dto.AuthDto;
import com.keystone.entity.Organization;
import com.keystone.entity.Role;
import com.keystone.entity.User;
import com.keystone.enums.RoleName;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.OrganizationRepository;
import com.keystone.repository.RoleRepository;
import com.keystone.repository.UserRepository;
import com.keystone.security.JwtTokenProvider;
import com.keystone.security.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService tokenBlacklistService;

    // In-memory token store for password reset tokens (token -> ResetTokenInfo)
    private static class ResetTokenInfo {
        String email;
        Instant expiresAt;
        ResetTokenInfo(String email, Instant expiresAt) {
            this.email = email;
            this.expiresAt = expiresAt;
        }
    }
    private final Map<String, ResetTokenInfo> resetTokens = new ConcurrentHashMap<>();

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!user.isActive()) {
            throw new DisabledException("Account has been deactivated. Please contact your system administrator.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());

        return AuthDto.AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organizationId(user.getOrganization() != null ? user.getOrganization().getId() : null)
                .roles(roleNames)
                .build();
    }

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email already registered: " + normalizedEmail);
        }

        Organization org = organizationRepository.findByCode(request.getOrganizationCode().toUpperCase())
                .orElseGet(() -> {
                    Organization newOrg = Organization.builder()
                            .name("Organization " + request.getOrganizationCode().toUpperCase())
                            .code(request.getOrganizationCode().toUpperCase())
                            .build();
                    return organizationRepository.save(newOrg);
                });

        RoleName assignedRole = RoleName.ROLE_CUSTOMER; // default for self-registration
        if (request.getRole() != null) {
            String roleUpper = request.getRole().toUpperCase();
            if (!roleUpper.startsWith("ROLE_")) {
                roleUpper = "ROLE_" + roleUpper;
            }
            try {
                assignedRole = RoleName.valueOf(roleUpper);
            } catch (Exception ignored) {}
        }

        RoleName finalRole = assignedRole;
        Role role = roleRepository.findByName(finalRole)
                .orElseGet(() -> {
                    Role r = Role.builder()
                            .name(finalRole)
                            .description("Default Role for " + finalRole)
                            .build();
                    return roleRepository.save(r);
                });

        User user = User.builder()
                .organization(org)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .phone(request.getPhone())
                .active(true)
                .roles(Set.of(role))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        user = userRepository.save(user);

        String rolesStr = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.joining(","));

        String accessToken = tokenProvider.generateTokenFromUsername(user.getEmail(), rolesStr);
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        return AuthDto.AuthResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organizationId(org.getId())
                .roles(Set.of(role.getName().name()))
                .build();
    }

    @Transactional
    public AuthDto.AuthResponse refreshToken(AuthDto.RefreshRequest request) {
        String token = request.getRefreshToken();
        if (!tokenProvider.validateRefreshToken(token)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        String email = tokenProvider.getUsernameFromToken(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        if (!user.isActive()) {
            throw new DisabledException("Account has been deactivated");
        }

        // Revoke old refresh token (refresh token rotation)
        tokenBlacklistService.blacklistRefreshToken(token);

        String rolesStr = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.joining(","));

        String newAccessToken = tokenProvider.generateTokenFromUsername(user.getEmail(), rolesStr);
        String newRefreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());

        return AuthDto.AuthResponse.builder()
                .token(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs() / 1000)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organizationId(user.getOrganization() != null ? user.getOrganization().getId() : null)
                .roles(roleNames)
                .build();
    }

    public AuthDto.MessageResponse logout(String authorizationHeader, String refreshToken) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String accessToken = authorizationHeader.substring(7);
            tokenBlacklistService.blacklistToken(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            tokenBlacklistService.blacklistRefreshToken(refreshToken);
        }
        SecurityContextHolder.clearContext();
        return AuthDto.MessageResponse.builder()
                .success(true)
                .message("Logged out successfully. Tokens have been invalidated.")
                .build();
    }

    @Transactional
    public AuthDto.MessageResponse changePassword(UUID userId, AuthDto.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password does not match");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        return AuthDto.MessageResponse.builder()
                .success(true)
                .message("Password changed successfully")
                .build();
    }

    public AuthDto.MessageResponse requestPasswordReset(AuthDto.ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase()).orElse(null);
        if (user != null) {
            String resetToken = UUID.randomUUID().toString();
            // Valid for 1 hour
            resetTokens.put(resetToken, new ResetTokenInfo(user.getEmail(), Instant.now().plusSeconds(3600)));
            // In a production setup, send email with reset link.
            return AuthDto.MessageResponse.builder()
                    .success(true)
                    .message("Password reset token generated: " + resetToken)
                    .build();
        }
        return AuthDto.MessageResponse.builder()
                .success(true)
                .message("If the email exists, a password reset link has been dispatched.")
                .build();
    }

    @Transactional
    public AuthDto.MessageResponse resetPassword(AuthDto.ResetPasswordRequest request) {
        ResetTokenInfo info = resetTokens.get(request.getToken());
        if (info == null || Instant.now().isAfter(info.expiresAt)) {
            resetTokens.remove(request.getToken());
            throw new BadCredentialsException("Invalid or expired password reset token");
        }

        User user = userRepository.findByEmail(info.email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for token"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        resetTokens.remove(request.getToken());

        return AuthDto.MessageResponse.builder()
                .success(true)
                .message("Password has been reset successfully. You may now log in with your new password.")
                .build();
    }
}
