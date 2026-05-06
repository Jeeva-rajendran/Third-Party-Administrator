package com.tpa.claim.service;

import com.tpa.claim.model.ExtractedData;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiValidationService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    public String extractStructuredData(String rawText) {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            throw new RuntimeException("Gemini API Key is missing. Cannot perform data extraction.");
        }

        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiApiKey;

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                String prompt = "Extract the following fields from the text and return ONLY a JSON object. " +
                        "Fields: policyNumber, customerName, carrierName, policyName, patientName, hospitalName, admissionDate (YYYY-MM-DD), dischargeDate (YYYY-MM-DD), claimedAmount (number only), claimType. " +
                        "If any field is missing, set its value to \"NONE\".\n\nText:\n" + rawText;

                ObjectMapper mapper = new ObjectMapper();
                
                // Construct JSON request body safely
                com.fasterxml.jackson.databind.node.ObjectNode requestBodyNode = mapper.createObjectNode();
                
                // Set system instruction for strict JSON
                com.fasterxml.jackson.databind.node.ObjectNode generationConfig = requestBodyNode.putObject("generationConfig");
                generationConfig.put("responseMimeType", "application/json");

                com.fasterxml.jackson.databind.node.ArrayNode contentsArray = requestBodyNode.putArray("contents");
                com.fasterxml.jackson.databind.node.ObjectNode contentItem = contentsArray.addObject();
                com.fasterxml.jackson.databind.node.ArrayNode partsArray = contentItem.putArray("parts");
                com.fasterxml.jackson.databind.node.ObjectNode textItem = partsArray.addObject();
                textItem.put("text", prompt);
                
                String requestBody = mapper.writeValueAsString(requestBodyNode);

                HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                JsonNode root = mapper.readTree(response.getBody());
                String extractedJsonText = root.path("candidates").get(0)
                        .path("content").path("parts").get(0)
                        .path("text").asText();

                // Clean up possible markdown backticks
                extractedJsonText = extractedJsonText.replaceAll("```json", "").replaceAll("```", "").trim();
                System.out.println("Gemini API extraction succeeded on attempt " + attempt);
                return extractedJsonText;
            } catch (Exception e) {
                String msg = e.getMessage();
                System.err.println("Gemini API error (attempt " + attempt + "/" + maxRetries + "): " + msg);
                
                // If rate-limited and we have retries left, wait and retry
                if (msg != null && msg.contains("429") && attempt < maxRetries) {
                    System.out.println("Rate limited. Waiting 60 seconds before retry...");
                    try { Thread.sleep(60000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else if (attempt == maxRetries) {
                    throw new RuntimeException("Failed to extract data using Gemini API after " + maxRetries + " attempts: " + msg);
                }
            }
        }
        return "{}";
    }

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
