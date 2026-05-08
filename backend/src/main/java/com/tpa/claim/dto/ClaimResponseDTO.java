package com.tpa.claim.dto;

import com.tpa.claim.model.ClaimDocument;
import com.tpa.claim.model.CustomerPolicy;
import com.tpa.claim.model.User;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ClaimResponseDTO {
    private String id;
    private User customer;
    private CustomerPolicy customerPolicy;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
    private BigDecimal settlementAmount;
    private Integer approvalChancePercentage;
    private List<ClaimDocument> documents;
    private long queueAgeMs;
}
