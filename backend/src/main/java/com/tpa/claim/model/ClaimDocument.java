package com.tpa.claim.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClaimDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    @JsonIgnore
    private Claim claim;

    @Column(name = "document_type", nullable = false)
    private String documentType; // CLAIM_FORM, COMBINED_DOC

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}
