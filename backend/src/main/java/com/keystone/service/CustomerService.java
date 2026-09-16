package com.keystone.service;

import com.keystone.dto.CustomerDto;
import com.keystone.entity.Customer;
import com.keystone.entity.Organization;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CustomerRepository;
import com.keystone.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public Page<CustomerDto.Response> getCustomers(UUID organizationId, Pageable pageable) {
        Page<Customer> page = organizationId != null
                ? customerRepository.findByOrganizationId(organizationId, pageable)
                : customerRepository.findAll(pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public CustomerDto.Response getById(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
        return mapToDto(customer);
    }

    @Transactional
    public CustomerDto.Response create(CustomerDto.Request request) {
        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Customer customer = Customer.builder()
                .organization(org)
                .name(request.getName())
                .accountNumber(request.getAccountNumber())
                .primaryContactName(request.getPrimaryContactName())
                .primaryContactEmail(request.getPrimaryContactEmail())
                .primaryContactPhone(request.getPrimaryContactPhone())
                .billingAddress(request.getBillingAddress())
                .slaTier(request.getSlaTier() != null ? request.getSlaTier() : "STANDARD")
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto.Response update(UUID id, CustomerDto.Request request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));

        if (request.getName() != null) customer.setName(request.getName());
        if (request.getPrimaryContactName() != null) customer.setPrimaryContactName(request.getPrimaryContactName());
        if (request.getPrimaryContactEmail() != null) customer.setPrimaryContactEmail(request.getPrimaryContactEmail());
        if (request.getPrimaryContactPhone() != null) customer.setPrimaryContactPhone(request.getPrimaryContactPhone());
        if (request.getBillingAddress() != null) customer.setBillingAddress(request.getBillingAddress());
        if (request.getSlaTier() != null) customer.setSlaTier(request.getSlaTier());
        if (request.getActive() != null) customer.setActive(request.getActive());

        return mapToDto(customerRepository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
        customer.setActive(false);
        customerRepository.save(customer);
    }

    public CustomerDto.Response mapToDto(Customer c) {
        return CustomerDto.Response.builder()
                .id(c.getId())
                .organizationId(c.getOrganization().getId())
                .name(c.getName())
                .accountNumber(c.getAccountNumber())
                .primaryContactName(c.getPrimaryContactName())
                .primaryContactEmail(c.getPrimaryContactEmail())
                .primaryContactPhone(c.getPrimaryContactPhone())
                .billingAddress(c.getBillingAddress())
                .slaTier(c.getSlaTier())
                .active(c.isActive())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
