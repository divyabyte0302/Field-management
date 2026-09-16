package com.keystone.repository;

import com.keystone.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID>, JpaSpecificationExecutor<Customer> {
    Optional<Customer> findByAccountNumber(String accountNumber);
    Page<Customer> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<Customer> findByOrganizationIdAndActive(UUID organizationId, boolean active, Pageable pageable);
}
