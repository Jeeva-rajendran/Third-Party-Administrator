package com.tpa.claim.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "claims")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Claim {

    @Id
    @Column(unique = true, nullable = false)
    private String id; // UUID generated claim id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_policy_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private CustomerPolicy customerPolicy;

    // SUBMITTED, CLIENT_APPROVED, CLIENT_REJECTED, FMG_PROCESSING,
    // FMG_APPROVED, FMG_REJECTED, MANUAL_REVIEW,
    // CARRIER_APPROVED, CARRIER_REJECTED, COMPLETED
    @Column(nullable = false)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "decision_reason", columnDefinition = "TEXT")
    private String decisionReason;

    @Column(name = "settlement_amount")
    private BigDecimal settlementAmount;

    @Column(name = "carrier_remarks", columnDefinition = "TEXT")
    private String carrierRemarks;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    // Use JSONB to store the entire OCR snapshot
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_data_snapshot", columnDefinition = "jsonb")
    private String extractedDataSnapshot;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClaimDocument> documents;

    @OneToOne(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    private ExtractedData extractedData;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RuleResult> ruleResults;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
