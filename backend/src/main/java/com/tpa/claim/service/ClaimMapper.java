package com.tpa.claim.service;

import com.tpa.claim.dto.ClaimResponseDTO;
import com.tpa.claim.dto.CustomerClaimResponse;
import com.tpa.claim.dto.FMGClaimResponse;
import com.tpa.claim.model.Claim;
import org.springframework.stereotype.Service;

@Service
public class ClaimMapper {

    public CustomerClaimResponse toCustomerResponse(Claim claim) {
        CustomerClaimResponse dto = new CustomerClaimResponse();
        mapBaseFields(claim, dto);
        return dto;
    }

    public FMGClaimResponse toFMGResponse(Claim claim) {
        FMGClaimResponse dto = new FMGClaimResponse();
        mapBaseFields(claim, dto);
        dto.setAiExplanation(claim.getAiExplanation());
        dto.setRuleResults(claim.getRuleResults());
        dto.setDecisions(claim.getDecisions());
        dto.setExtractedData(claim.getExtractedData());
        dto.setExtractedDataSnapshot(claim.getExtractedDataSnapshot());
        dto.setDecisionReason(claim.getDecisionReason());
        dto.setCarrierRemarks(claim.getCarrierRemarks());
        return dto;
    }

    private void mapBaseFields(Claim claim, ClaimResponseDTO dto) {
        dto.setId(claim.getId());
        dto.setStatus(claim.getStatus());
        dto.setCreatedAt(claim.getCreatedAt());
        dto.setProcessedAt(claim.getProcessedAt());
        dto.setSettlementAmount(claim.getSettlementAmount());
        dto.setApprovalChancePercentage(claim.getApprovalChancePercentage());
        dto.setCustomer(claim.getCustomer());
        dto.setCustomerPolicy(claim.getCustomerPolicy());
        dto.setDocuments(claim.getDocuments());
    }
}
