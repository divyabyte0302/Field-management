package com.keystone.service;

import com.keystone.dto.NotificationDto;
import com.keystone.entity.Notification;
import com.keystone.entity.User;
import com.keystone.enums.NotificationType;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.NotificationRepository;
import com.keystone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<NotificationDto.Response> getUserNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public NotificationDto.Response sendNotification(UUID recipientUserId, String title, String message, NotificationType type, UUID referenceId) {
        User user = userRepository.findById(recipientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + recipientUserId));

        Notification notification = Notification.builder()
                .recipientUser(user)
                .title(title)
                .message(message)
                .notificationType(type)
                .referenceId(referenceId)
                .read(false)
                .build();

        return mapToDto(notificationRepository.save(notification));
    }

    public NotificationDto.Response mapToDto(Notification n) {
        return NotificationDto.Response.builder()
                .id(n.getId())
                .recipientUserId(n.getRecipientUser().getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .notificationType(n.getNotificationType())
                .referenceId(n.getReferenceId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
