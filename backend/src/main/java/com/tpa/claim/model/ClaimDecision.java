package com.tpa.claim.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim_decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClaimDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    @JsonIgnore
    private Claim claim;

    @Column(name = "decided_by", nullable = false)
    private String decidedBy;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private String decision; // APPROVED, REJECTED, MANUAL_REVIEW

    @Column(name = "settlement_amount")
    private BigDecimal settlementAmount;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
