package com.keystone.repository;

import com.keystone.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);
    Page<Notification> findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(UUID recipientUserId, Pageable pageable);
    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);
}
