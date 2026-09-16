package com.keystone.controller;

import com.keystone.dto.TimeEntryDto;
import com.keystone.service.TimeEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/time-entries")
@RequiredArgsConstructor
public class TimeEntryController {

    private final TimeEntryService timeEntryService;

    @GetMapping("/work-order/{workOrderId}")
    public ResponseEntity<List<TimeEntryDto.Response>> getByWorkOrderId(@PathVariable UUID workOrderId) {
        return ResponseEntity.ok(timeEntryService.getByWorkOrderId(workOrderId));
    }

    @PostMapping
    public ResponseEntity<TimeEntryDto.Response> logTime(@Valid @RequestBody TimeEntryDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timeEntryService.logTime(request));
    }
}
