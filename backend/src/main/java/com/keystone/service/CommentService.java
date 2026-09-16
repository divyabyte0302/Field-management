package com.keystone.service;

import com.keystone.dto.CommentDto;
import com.keystone.entity.Comment;
import com.keystone.entity.User;
import com.keystone.entity.WorkOrder;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CommentRepository;
import com.keystone.repository.UserRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CommentDto.Response> getByWorkOrderId(UUID workOrderId) {
        return commentRepository.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentDto.Response addComment(CommentDto.Request request, UUID currentUserId) {
        WorkOrder wo = workOrderRepository.findById(request.getWorkOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Work order not found: " + request.getWorkOrderId()));

        User user = null;
        if (currentUserId != null) {
            user = userRepository.findById(currentUserId).orElse(null);
        }

        Comment comment = Comment.builder()
                .workOrder(wo)
                .user(user)
                .commentText(request.getCommentText())
                .internalOnly(request.getInternalOnly() != null ? request.getInternalOnly() : false)
                .build();

        return mapToDto(commentRepository.save(comment));
    }

    public CommentDto.Response mapToDto(Comment c) {
        String author = c.getUser() != null
                ? c.getUser().getFirstName() + " " + c.getUser().getLastName()
                : "System";

        return CommentDto.Response.builder()
                .id(c.getId())
                .workOrderId(c.getWorkOrder().getId())
                .userId(c.getUser() != null ? c.getUser().getId() : null)
                .authorName(author)
                .commentText(c.getCommentText())
                .internalOnly(c.isInternalOnly())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
