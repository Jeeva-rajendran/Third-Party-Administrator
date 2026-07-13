package com.tpa.claim.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim_audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClaimAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    @JsonIgnore
    private Claim claim;

    @Column(nullable = false)
    private String action;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(nullable = false)
    private String role;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
