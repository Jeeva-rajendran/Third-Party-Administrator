package com.tpa.claim.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "rule_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RuleResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    @JsonIgnore
    private Claim claim;

    @Column(name = "rule_id", nullable = false)
    private String ruleId; // e.g., "R1", "R2"

    @Column(nullable = false)
    private boolean triggered;

    @Column(columnDefinition = "TEXT")
    private String description;
}
