package com.tpa.claim.service;

import com.tpa.claim.model.Claim;
import com.tpa.claim.model.ExtractedData;
import com.tpa.claim.model.RuleResult;
import com.tpa.claim.repository.ClaimRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RuleEngineService {

    private final ClaimRepository claimRepository;
    private final ConfigService configService;

    public RuleEngineService(ClaimRepository claimRepository, ConfigService configService) {
        this.claimRepository = claimRepository;
        this.configService = configService;
    }

    public void evaluateRules(Claim claim) {
        List<RuleResult> results = new ArrayList<>();
        ExtractedData data = claim.getExtractedData();
        boolean rejected = false;
        boolean manualReview = false;

        // R1: Claim form missing
        boolean r1 = claim.getDocuments().stream().noneMatch(d -> d.getDocumentType().equals("CLAIM_FORM"));
        results.add(new RuleResult(null, claim, "R1", r1, "Claim form missing"));
        if (r1) rejected = true;

        // R2: Combined document missing
        boolean r2 = claim.getDocuments().stream().noneMatch(d -> d.getDocumentType().equals("COMBINED_DOC"));
        results.add(new RuleResult(null, claim, "R2", r2, "Combined document missing"));
        if (r2) rejected = true;

        // R3: Policy inactive on admission date
        boolean r3 = false;
        if (claim.getCustomerPolicy() != null && claim.getCustomerPolicy().getPolicy() != null) {
            LocalDate admissionDate = data.getClaimFormAdmissionDate() != null
                    ? data.getClaimFormAdmissionDate()
                    : data.getDsAdmissionDate();
            LocalDate validFrom = claim.getCustomerPolicy().getPolicy().getValidFrom();
            LocalDate validTo = claim.getCustomerPolicy().getPolicy().getValidTo();
            if (admissionDate == null ||
                    (validFrom != null && admissionDate.isBefore(validFrom)) ||
                    (validTo != null && admissionDate.isAfter(validTo))) {
                r3 = true;
            }
        }
        results.add(new RuleResult(null, claim, "R3", r3, "Policy inactive on admission date"));
        if (r3) rejected = true;

        // R4: Policy number missing
        boolean r4 = data.getPolicyNumber() == null || data.getPolicyNumber().trim().isEmpty();
        results.add(new RuleResult(null, claim, "R4", r4, "Policy number missing from documents"));
        if (r4) manualReview = true;

        // R5: Patient name mismatch across documents
        boolean r5 = !safeEqualsIgnoreCase(data.getClaimFormPatientName(), data.getDsPatientName()) ||
                     !safeEqualsIgnoreCase(data.getClaimFormPatientName(), data.getBillPatientName());
        results.add(new RuleResult(null, claim, "R5", r5, "Patient name mismatch across documents"));
        if (r5) manualReview = true;

        // R6: Hospital name mismatch across documents
        boolean r6 = !safeEqualsIgnoreCase(data.getClaimFormHospitalName(), data.getDsHospitalName()) ||
                     !safeEqualsIgnoreCase(data.getClaimFormHospitalName(), data.getBillHospitalName());
        results.add(new RuleResult(null, claim, "R6", r6, "Hospital name mismatch across documents"));
        if (r6) manualReview = true;

        // R7: Admission/Discharge date mismatch
        boolean r7 = !safeEqualsDate(data.getClaimFormAdmissionDate(), data.getDsAdmissionDate()) ||
                     !safeEqualsDate(data.getClaimFormDischargeDate(), data.getDsDischargeDate());
        results.add(new RuleResult(null, claim, "R7", r7, "Admission/Discharge date mismatch"));
        if (r7) manualReview = true;

        // R8: Claimed amount greater than total bill
        boolean r8 = false;
        if (data.getClaimedAmount() != null && data.getTotalBillAmount() != null) {
            if (data.getClaimedAmount().compareTo(data.getTotalBillAmount()) > 0) {
                r8 = true;
            }
        }
        results.add(new RuleResult(null, claim, "R8", r8, "Claimed amount greater than total bill"));
        if (r8) manualReview = true;

        // R9: Claimed amount greater than threshold (Dynamic)
        boolean r9 = false;
        BigDecimal r9Threshold = configService.getConfigAsBigDecimal("RULE_R1_THRESHOLD", "100000");
        if (data.getClaimedAmount() != null && data.getClaimedAmount().compareTo(r9Threshold) > 0) {
            r9 = true;
        }
        results.add(new RuleResult(null, claim, "R9", r9, "Claimed amount greater than threshold (" + r9Threshold + ")"));
        if (r9) manualReview = true;

        // R10: Possible duplicate claim (same policy + patient + hospital + admission date)
        boolean r10 = isPotentialDuplicate(claim, data);
        results.add(new RuleResult(null, claim, "R10", r10, "Possible duplicate claim for same policy, patient, hospital, and admission date"));
        if (r10) manualReview = true;

        if (claim.getRuleResults() == null) {
            claim.setRuleResults(new ArrayList<>());
        }
        claim.getRuleResults().clear();
        claim.getRuleResults().addAll(results);

        // Set status based on rule evaluation
        if (rejected) {
            claim.setStatus("FMG_REJECTED");
            claim.setApprovalChancePercentage(0);
            claim.setDecisionReason("Rejected by FMG validation: one or more rejection rules failed");
        } else if (manualReview) {
            claim.setStatus("MANUAL_REVIEW");
            int approvalChance = calculateApprovalChance(results);
            claim.setApprovalChancePercentage(approvalChance);
            claim.setDecisionReason("Needs carrier manual review: one or more review rules were triggered. Estimated approval chance: " + approvalChance + "%");
        } else {
            claim.setStatus("READY_FOR_CARRIER");
            claim.setApprovalChancePercentage(92);
            claim.setDecisionReason("All FMG validation rules passed. Forwarded to carrier for final decision. Estimated approval chance: 92%");
        }
    }

    private int calculateApprovalChance(List<RuleResult> results) {
        int score = 82;
        for (RuleResult result : results) {
            if (!result.isTriggered()) {
                continue;
            }
            switch (result.getRuleId()) {
                case "R4":
                    score -= 14;
                    break;
                case "R5":
                case "R6":
                    score -= 12;
                    break;
                case "R7":
                    score -= 10;
                    break;
                case "R8":
                    score -= 16;
                    break;
                case "R9":
                    score -= 8;
                    break;
                case "R10":
                    score -= 18;
                    break;
                default:
                    break;
            }
        }
        return Math.max(15, Math.min(88, score));
    }

    private boolean isPotentialDuplicate(Claim claim, ExtractedData data) {
        if (claim.getId() == null || claim.getCustomerPolicy() == null || data == null ||
                data.getClaimFormPatientName() == null ||
                data.getClaimFormHospitalName() == null ||
                data.getClaimFormAdmissionDate() == null) {
            return false;
        }
        return !claimRepository.findPotentialDuplicates(
                claim.getId(),
                claim.getCustomerPolicy().getPolicyNumber(),
                data.getClaimFormPatientName().trim(),
                data.getClaimFormHospitalName().trim(),
                data.getClaimFormAdmissionDate()
        ).isEmpty();
    }

    private boolean safeEqualsIgnoreCase(String s1, String s2) {
        if (s1 == null && s2 == null) return true;
        if (s1 == null || s2 == null) return false;
        return s1.trim().equalsIgnoreCase(s2.trim());
    }

    private boolean safeEqualsDate(LocalDate d1, LocalDate d2) {
        if (d1 == null && d2 == null) return true;
        if (d1 == null || d2 == null) return false;
        return d1.equals(d2);
    }
}
