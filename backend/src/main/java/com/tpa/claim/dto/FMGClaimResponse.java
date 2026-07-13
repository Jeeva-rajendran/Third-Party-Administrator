package com.tpa.claim.dto;

import com.tpa.claim.model.ClaimDecision;
import com.tpa.claim.model.ExtractedData;
import com.tpa.claim.model.RuleResult;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class FMGClaimResponse extends ClaimResponseDTO {
    private String aiExplanation;
    private List<RuleResult> ruleResults;
    private List<ClaimDecision> decisions;
    private ExtractedData extractedData;
    private String extractedDataSnapshot;
    private String decisionReason;
    private String carrierRemarks;
}
