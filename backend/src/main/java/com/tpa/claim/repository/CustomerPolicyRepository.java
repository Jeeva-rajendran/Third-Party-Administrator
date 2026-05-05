package com.tpa.claim.repository;

import com.tpa.claim.model.CustomerPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerPolicyRepository extends JpaRepository<CustomerPolicy, Long> {
    List<CustomerPolicy> findByCustomerId(Long customerId);
    List<CustomerPolicy> findByStatus(String status);
    List<CustomerPolicy> findByCustomerIdAndStatus(Long customerId, String status);
}
