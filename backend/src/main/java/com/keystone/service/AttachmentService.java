package com.keystone.service;

import com.keystone.dto.AttachmentDto;
import com.keystone.entity.Attachment;
import com.keystone.entity.User;
import com.keystone.entity.WorkOrder;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.AttachmentRepository;
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
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AttachmentDto.Response> getByWorkOrderId(UUID workOrderId) {
        return attachmentRepository.findByWorkOrderIdOrderByCreatedAtDesc(workOrderId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttachmentDto.Response addAttachment(AttachmentDto.Request request, UUID currentUserId) {
        WorkOrder wo = workOrderRepository.findById(request.getWorkOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Work order not found: " + request.getWorkOrderId()));

        User user = null;
        if (currentUserId != null) {
            user = userRepository.findById(currentUserId).orElse(null);
        }

        Attachment attachment = Attachment.builder()
                .workOrder(wo)
                .uploadedByUser(user)
                .fileName(request.getFileName())
                .fileUrl(request.getFileUrl())
                .fileType(request.getFileType())
                .fileSizeBytes(request.getFileSizeBytes())
                .build();

        return mapToDto(attachmentRepository.save(attachment));
    }

    public AttachmentDto.Response mapToDto(Attachment a) {
        String uploader = a.getUploadedByUser() != null
                ? a.getUploadedByUser().getFirstName() + " " + a.getUploadedByUser().getLastName()
                : "System";

        return AttachmentDto.Response.builder()
                .id(a.getId())
                .workOrderId(a.getWorkOrder().getId())
                .fileName(a.getFileName())
                .fileUrl(a.getFileUrl())
                .fileType(a.getFileType())
                .fileSizeBytes(a.getFileSizeBytes())
                .uploadedByUserId(a.getUploadedByUser() != null ? a.getUploadedByUser().getId() : null)
                .uploadedByUserName(uploader)
                .createdAt(a.getCreatedAt())
                .build();
    }
}
