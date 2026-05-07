package com.tpa.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class CustomerDetailsResponse {
    private Long id;
    private String customerId;
    private String name;
    private String username;
    private String email;
    private int totalPolicies;
    private int activePolicies;
    private int inactivePolicies;
    private int totalClaims;
    private int approvedClaims;
    private int rejectedClaims;
    private int pendingClaims;
    private BigDecimal totalClaimedAmount;
    private BigDecimal totalSettledAmount;
    private List<PolicyHistory> policies;
    private List<ClaimHistory> claims;

    @Data
    @AllArgsConstructor
    public static class PolicyHistory {
        private Long id;
        private String policyNumber;
        private String policyName;
        private String policyType;
        private BigDecimal coverageAmount;
        private BigDecimal premium;
        private String status;
        private LocalDateTime purchaseDate;
    }

    @Data
    @AllArgsConstructor
    public static class ClaimHistory {
        private String id;
        private String status;
        private String policyNumber;
        private String policyName;
        private LocalDateTime createdAt;
        private LocalDateTime processedAt;
        private BigDecimal claimedAmount;
        private BigDecimal settlementAmount;
        private Integer approvalChancePercentage;
        private String decisionReason;
    }
}
