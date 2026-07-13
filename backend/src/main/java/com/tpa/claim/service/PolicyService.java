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
    private final ClaimRepository claimRepository;

    public PolicyService(PolicyRepository policyRepository, 
                        CustomerPolicyRepository customerPolicyRepository,
                        ClaimRepository claimRepository) {
        this.policyRepository = policyRepository;
        this.customerPolicyRepository = customerPolicyRepository;
        this.claimRepository = claimRepository;
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

    // Customer purchases a policy — directly ACTIVE (no Client approval needed)
    public CustomerPolicy purchasePolicy(Long policyId, User customer) {
        Policy policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        CustomerPolicy cp = new CustomerPolicy();
        cp.setCustomer(customer);
        cp.setPolicy(policy);
        cp.setPolicyNumber("POL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cp.setStatus("ACTIVE"); // Direct activation — no Client approval required
        return customerPolicyRepository.save(cp);
    }

    public List<CustomerPolicy> getCustomerPolicies(Long customerId) {
        List<CustomerPolicy> policies = customerPolicyRepository.findByCustomerId(customerId);
        policies.forEach(this::calculateUtilization);
        return policies;
    }

    private void calculateUtilization(CustomerPolicy cp) {
        java.math.BigDecimal utilized = claimRepository.sumSettlementAmountByCustomerPolicyId(cp.getId());
        cp.setUtilizedAmount(utilized != null ? utilized : java.math.BigDecimal.ZERO);
    }

    public List<CustomerPolicy> getCustomerPoliciesByStatus(String status) {
        return customerPolicyRepository.findByStatus(status);
    }

    public List<CustomerPolicy> getActiveCustomerPolicies(Long customerId) {
        List<CustomerPolicy> policies = customerPolicyRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
        policies.forEach(this::calculateUtilization);
        return policies;
    }

    // Update existing policy
    public Policy updatePolicy(Long id, Policy updatedPolicy) {
        Policy existing = policyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));
        
        existing.setPolicyName(updatedPolicy.getPolicyName());
        existing.setPolicyType(updatedPolicy.getPolicyType());
        existing.setCoverageAmount(updatedPolicy.getCoverageAmount());
        existing.setPremium(updatedPolicy.getPremium());
        existing.setValidFrom(updatedPolicy.getValidFrom());
        existing.setValidTo(updatedPolicy.getValidTo());
        existing.setDescription(updatedPolicy.getDescription());
        
        return policyRepository.save(existing);
    }

    // Delete policy
    public void deletePolicy(Long id) {
        if (!policyRepository.existsById(id)) {
            throw new IllegalArgumentException("Policy not found");
        }
        // Check if any customer has purchased this policy before deleting
        if (customerPolicyRepository.existsByPolicyId(id)) {
            throw new IllegalStateException("Cannot delete policy that has active customer subscriptions");
        }
        policyRepository.deleteById(id);
    }
}
