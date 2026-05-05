package com.tpa.claim.service;

import com.tpa.claim.model.ExtractedData;
import org.springframework.stereotype.Service;

@Service
public class AiValidationService {

    /**
     * Analyzes extracted claim data and returns an AI-generated explanation.
     * In production, this would call the Gemini API.
     * Currently uses a mock implementation for demo purposes.
     */
    public String analyzeClaimData(ExtractedData data) {
        try {
            return generateMockAnalysis(data);
        } catch (Exception e) {
            return "AI analysis unavailable: " + e.getMessage();
        }
    }

    private String generateMockAnalysis(ExtractedData data) {
        StringBuilder analysis = new StringBuilder();
        analysis.append("=== AI Claim Analysis Report ===\n\n");

        // Check data completeness
        analysis.append("1. DATA COMPLETENESS: ");
        int fieldsPresent = 0;
        int totalFields = 10;
        if (data.getPolicyNumber() != null) fieldsPresent++;
        if (data.getCustomerName() != null) fieldsPresent++;
        if (data.getClaimFormPatientName() != null) fieldsPresent++;
        if (data.getClaimFormHospitalName() != null) fieldsPresent++;
        if (data.getClaimedAmount() != null) fieldsPresent++;
        if (data.getTotalBillAmount() != null) fieldsPresent++;
        if (data.getDiagnosis() != null) fieldsPresent++;
        if (data.getClaimFormAdmissionDate() != null) fieldsPresent++;
        if (data.getClaimFormDischargeDate() != null) fieldsPresent++;
        if (data.getBillNumber() != null) fieldsPresent++;
        analysis.append(fieldsPresent).append("/").append(totalFields).append(" fields extracted.\n");

        // Cross-document consistency
        analysis.append("\n2. CROSS-DOCUMENT CONSISTENCY: ");
        boolean patientMatch = safeEquals(data.getClaimFormPatientName(), data.getDsPatientName());
        boolean hospitalMatch = safeEquals(data.getClaimFormHospitalName(), data.getDsHospitalName());
        if (patientMatch && hospitalMatch) {
            analysis.append("CONSISTENT - Patient and hospital names match across documents.\n");
        } else {
            analysis.append("INCONSISTENCY DETECTED - ");
            if (!patientMatch) analysis.append("Patient names differ between claim form and discharge summary. ");
            if (!hospitalMatch) analysis.append("Hospital names differ between documents. ");
            analysis.append("\n");
        }

        // Financial analysis
        analysis.append("\n3. FINANCIAL ANALYSIS: ");
        if (data.getClaimedAmount() != null && data.getTotalBillAmount() != null) {
            int comparison = data.getClaimedAmount().compareTo(data.getTotalBillAmount());
            if (comparison > 0) {
                analysis.append("WARNING - Claimed amount (").append(data.getClaimedAmount())
                        .append(") exceeds total bill (").append(data.getTotalBillAmount()).append(").\n");
            } else if (comparison == 0) {
                analysis.append("NORMAL - Claimed amount matches bill total.\n");
            } else {
                analysis.append("OK - Claimed amount is within bill total.\n");
            }
        } else {
            analysis.append("INCOMPLETE - Unable to verify financial details.\n");
        }

        // Diagnosis assessment
        analysis.append("\n4. DIAGNOSIS ASSESSMENT: ");
        if (data.getDiagnosis() != null) {
            analysis.append("Diagnosis '").append(data.getDiagnosis())
                    .append("' is documented. Coverage applicability should be verified against policy terms.\n");
        } else {
            analysis.append("No diagnosis information found in documents.\n");
        }

        // Overall recommendation
        analysis.append("\n5. OVERALL RECOMMENDATION: ");
        if (fieldsPresent >= 8 && patientMatch && hospitalMatch) {
            analysis.append("FAVORABLE - Claim documentation appears complete and consistent. Recommend approval pending financial verification.\n");
        } else if (fieldsPresent >= 5) {
            analysis.append("REQUIRES REVIEW - Some inconsistencies or missing data detected. Manual review recommended.\n");
        } else {
            analysis.append("INSUFFICIENT DATA - Too many fields missing for automated assessment. Manual review required.\n");
        }

        return analysis.toString();
    }

    private boolean safeEquals(String s1, String s2) {
        if (s1 == null || s2 == null) return s1 == s2;
        return s1.trim().equalsIgnoreCase(s2.trim());
    }
}
