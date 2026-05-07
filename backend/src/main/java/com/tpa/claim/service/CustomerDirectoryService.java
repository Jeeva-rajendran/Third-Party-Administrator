package com.tpa.claim.service;

import com.tpa.claim.dto.CustomerDirectoryResponse;
import com.tpa.claim.dto.CustomerDetailsResponse;
import com.tpa.claim.model.Claim;
import com.tpa.claim.model.CustomerPolicy;
import com.tpa.claim.model.Role;
import com.tpa.claim.model.User;
import com.tpa.claim.repository.ClaimRepository;
import com.tpa.claim.repository.CustomerPolicyRepository;
import com.tpa.claim.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class CustomerDirectoryService {

    private final UserRepository userRepository;
    private final CustomerPolicyRepository customerPolicyRepository;
    private final CustomerIdService customerIdService;
    private final ClaimRepository claimRepository;

    public CustomerDirectoryService(UserRepository userRepository, CustomerPolicyRepository customerPolicyRepository,
                                    CustomerIdService customerIdService, ClaimRepository claimRepository) {
        this.userRepository = userRepository;
        this.customerPolicyRepository = customerPolicyRepository;
        this.customerIdService = customerIdService;
        this.claimRepository = claimRepository;
    }

    public List<CustomerDirectoryResponse> getAllCustomers() {
        return userRepository.findByRole(Role.ROLE_CUSTOMER).stream()
                .map(this::toDirectoryResponse)
                .toList();
    }

    public CustomerDetailsResponse getCustomerDetails(Long customerId) {
        User customer = userRepository.findById(customerId)
                .filter(user -> user.getRole() == Role.ROLE_CUSTOMER)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        String publicCustomerId = ensureCustomerId(customer);
        List<CustomerPolicy> policies = customerPolicyRepository.findByCustomerId(customer.getId());
        List<Claim> claims = claimRepository.findByCustomerId(customer.getId());

        int activePolicies = (int) policies.stream().filter(policy -> "ACTIVE".equals(policy.getStatus())).count();
        int inactivePolicies = policies.size() - activePolicies;
        int approvedClaims = (int) claims.stream().filter(claim -> "COMPLETED".equals(claim.getStatus()) || "CARRIER_APPROVED".equals(claim.getStatus())).count();
        int rejectedClaims = (int) claims.stream().filter(claim -> claim.getStatus() != null && claim.getStatus().contains("REJECTED")).count();
        int pendingClaims = claims.size() - approvedClaims - rejectedClaims;
        BigDecimal totalClaimedAmount = claims.stream()
                .map(claim -> claim.getExtractedData() != null ? claim.getExtractedData().getClaimedAmount() : null)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSettledAmount = claims.stream()
                .map(Claim::getSettlementAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CustomerDetailsResponse.PolicyHistory> policyHistory = policies.stream()
                .sorted((first, second) -> compareNewestFirst(first.getPurchaseDate(), second.getPurchaseDate()))
                .map(policy -> new CustomerDetailsResponse.PolicyHistory(
                        policy.getId(),
                        policy.getPolicyNumber(),
                        policy.getPolicy() != null ? policy.getPolicy().getPolicyName() : null,
                        policy.getPolicy() != null ? policy.getPolicy().getPolicyType() : null,
                        policy.getPolicy() != null ? policy.getPolicy().getCoverageAmount() : null,
                        policy.getPolicy() != null ? policy.getPolicy().getPremium() : null,
                        policy.getStatus(),
                        policy.getPurchaseDate()
                ))
                .toList();

        List<CustomerDetailsResponse.ClaimHistory> claimHistory = claims.stream()
                .sorted((first, second) -> compareNewestFirst(first.getCreatedAt(), second.getCreatedAt()))
                .map(claim -> new CustomerDetailsResponse.ClaimHistory(
                        claim.getId(),
                        claim.getStatus(),
                        claim.getCustomerPolicy() != null ? claim.getCustomerPolicy().getPolicyNumber() : null,
                        claim.getCustomerPolicy() != null && claim.getCustomerPolicy().getPolicy() != null
                                ? claim.getCustomerPolicy().getPolicy().getPolicyName()
                                : null,
                        claim.getCreatedAt(),
                        claim.getProcessedAt(),
                        claim.getExtractedData() != null ? claim.getExtractedData().getClaimedAmount() : null,
                        claim.getSettlementAmount(),
                        claim.getApprovalChancePercentage(),
                        claim.getDecisionReason()
                ))
                .toList();

        return new CustomerDetailsResponse(
                customer.getId(),
                publicCustomerId,
                customer.getName(),
                customer.getUsername(),
                customer.getEmail(),
                policies.size(),
                activePolicies,
                inactivePolicies,
                claims.size(),
                approvedClaims,
                rejectedClaims,
                pendingClaims,
                totalClaimedAmount,
                totalSettledAmount,
                policyHistory,
                claimHistory
        );
    }

    private CustomerDirectoryResponse toDirectoryResponse(User customer) {
        String customerId = ensureCustomerId(customer);

        List<CustomerPolicy> policies = customerPolicyRepository.findByCustomerId(customer.getId());
        int activePolicies = (int) policies.stream().filter(policy -> "ACTIVE".equals(policy.getStatus())).count();
        int inactivePolicies = policies.size() - activePolicies;
        LocalDateTime lastPurchaseDate = policies.stream()
                .map(CustomerPolicy::getPurchaseDate)
                .filter(date -> date != null)
                .max(Comparator.naturalOrder())
                .orElse(null);

        String status;
        if (policies.isEmpty()) {
            status = "REGISTERED_ONLY";
        } else if (activePolicies > 0) {
            status = "ACTIVE";
        } else {
            status = "INACTIVE";
        }

        return new CustomerDirectoryResponse(
                customer.getId(),
                customerId,
                customer.getName(),
                customer.getUsername(),
                customer.getEmail(),
                policies.size(),
                activePolicies,
                inactivePolicies,
                status,
                lastPurchaseDate
        );
    }

    private String ensureCustomerId(User customer) {
        String customerId = customer.getCustomerId();
        if (customerId == null || customerId.isBlank()) {
            customerId = customerIdService.generateUniqueCustomerId();
            customer.setCustomerId(customerId);
            userRepository.save(customer);
        }
        return customerId;
    }

    private int compareNewestFirst(LocalDateTime first, LocalDateTime second) {
        if (first == null && second == null) return 0;
        if (first == null) return 1;
        if (second == null) return -1;
        return second.compareTo(first);
    }
}
