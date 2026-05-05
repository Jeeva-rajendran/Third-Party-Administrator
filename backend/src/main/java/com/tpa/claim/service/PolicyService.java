package com.tpa.claim.service;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.*;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class PolicyService {

    private final PolicyRepository policyRepository;
    private final CustomerPolicyRepository customerPolicyRepository;

    public PolicyService(PolicyRepository policyRepository, CustomerPolicyRepository customerPolicyRepository) {
        this.policyRepository = policyRepository;
        this.customerPolicyRepository = customerPolicyRepository;
    }

    // Carrier creates a policy
    public Policy createPolicy(Policy policy, User carrier) {
        policy.setCreatedBy(carrier);
        return policyRepository.save(policy);
    }

    public List<Policy> getAllPolicies() {
        return policyRepository.findAll();
    }

    public Policy getPolicyById(Long id) {
        return policyRepository.findById(id).orElse(null);
    }

    // Customer purchases a policy
    public CustomerPolicy purchasePolicy(Long policyId, User customer) {
        Policy policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        CustomerPolicy cp = new CustomerPolicy();
        cp.setCustomer(customer);
        cp.setPolicy(policy);
        cp.setPolicyNumber("POL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cp.setStatus("PENDING");
        return customerPolicyRepository.save(cp);
    }

    // Client approves a policy purchase
    public CustomerPolicy approvePolicy(Long customerPolicyId, User client, String remarks) {
        CustomerPolicy cp = customerPolicyRepository.findById(customerPolicyId)
                .orElseThrow(() -> new IllegalArgumentException("Customer policy not found"));
        if (!"PENDING".equals(cp.getStatus())) {
            throw new IllegalStateException("Policy is not in PENDING status");
        }
        cp.setStatus("ACTIVE");
        cp.setApprovedBy(client);
        cp.setDecisionDate(java.time.LocalDateTime.now());
        cp.setRemarks(remarks);
        return customerPolicyRepository.save(cp);
    }

    // Client rejects a policy purchase
    public CustomerPolicy rejectPolicy(Long customerPolicyId, User client, String remarks) {
        CustomerPolicy cp = customerPolicyRepository.findById(customerPolicyId)
                .orElseThrow(() -> new IllegalArgumentException("Customer policy not found"));
        if (!"PENDING".equals(cp.getStatus())) {
            throw new IllegalStateException("Policy is not in PENDING status");
        }
        cp.setStatus("REJECTED");
        cp.setApprovedBy(client);
        cp.setDecisionDate(java.time.LocalDateTime.now());
        cp.setRemarks(remarks);
        return customerPolicyRepository.save(cp);
    }

    public List<CustomerPolicy> getCustomerPolicies(Long customerId) {
        return customerPolicyRepository.findByCustomerId(customerId);
    }

    public List<CustomerPolicy> getCustomerPoliciesByStatus(String status) {
        return customerPolicyRepository.findByStatus(status);
    }

    public List<CustomerPolicy> getActiveCustomerPolicies(Long customerId) {
        return customerPolicyRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
    }
}
