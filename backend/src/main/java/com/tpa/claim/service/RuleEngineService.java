package com.tpa.claim.service;

import com.tpa.claim.model.Claim;
import com.tpa.claim.model.ExtractedData;
import com.tpa.claim.model.RuleResult;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class RuleEngineService {

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

        // R3: Policy inactive (check against customer policy validity)
        boolean r3 = false;
        if (claim.getCustomerPolicy() != null && claim.getCustomerPolicy().getPolicy() != null) {
            LocalDate validTo = claim.getCustomerPolicy().getPolicy().getValidTo();
            if (validTo != null && validTo.isBefore(LocalDate.now())) {
                r3 = true;
            }
        }
        results.add(new RuleResult(null, claim, "R3", r3, "Policy expired or inactive"));
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

        // R9: Claimed amount greater than 50,000
        boolean r9 = false;
        if (data.getClaimedAmount() != null && data.getClaimedAmount().compareTo(new BigDecimal("50000")) > 0) {
            r9 = true;
        }
        results.add(new RuleResult(null, claim, "R9", r9, "Claimed amount greater than 50000"));
        if (r9) manualReview = true;

        // R10: Possible duplicate claim
        boolean r10 = data.getBillNumber() != null && data.getBillNumber().equalsIgnoreCase("DUPLICATE");
        results.add(new RuleResult(null, claim, "R10", r10, "Possible duplicate claim"));
        if (r10) manualReview = true;

        if (claim.getRuleResults() == null) {
            claim.setRuleResults(new ArrayList<>());
        }
        claim.getRuleResults().clear();
        claim.getRuleResults().addAll(results);

        // Set status based on rule evaluation
        if (rejected) {
            claim.setStatus("FMG_REJECTED");
            claim.setDecisionReason("Rejected by rule engine: critical document or policy validation failed");
        } else if (manualReview) {
            claim.setStatus("MANUAL_REVIEW");
            claim.setDecisionReason("Flagged for manual review: inconsistencies detected by rule engine");
        } else {
            claim.setStatus("FMG_PROCESSING");
            claim.setDecisionReason("All rules passed successfully");
        }
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
