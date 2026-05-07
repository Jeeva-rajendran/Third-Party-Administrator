package com.tpa.claim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claim.model.ExtractedData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiValidationService {

    private static final int MAX_INPUT_CHARS = 12000;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    @Value("${gemini.api.enabled:false}")
    private boolean enabled;

    public String extractStructuredData(String documentText) {
        if (!isGeminiConfigured()) {
            throw new IllegalStateException("Gemini API is disabled or API key is missing");
        }

        String prompt = """
                Extract insurance claim fields from the text below. Return JSON only.
                Use these keys: policyNumber, customerName, carrierName, policyName,
                claimFormPatientName, claimFormHospitalName, claimFormAdmissionDate,
                claimFormDischargeDate, claimedAmount, claimType, dsPatientName,
                dsHospitalName, dsAdmissionDate, dsDischargeDate, diagnosis,
                billPatientName, billHospitalName, billNumber, billDate, totalBillAmount.
                Dates must be yyyy-MM-dd. Amounts must be numbers without currency symbols.
                Use null when a value is not present.

                TEXT:
                """ + trimForModel(documentText);

        String response = callGemini(prompt);
        return extractJsonText(response);
    }

    public String analyzeClaimData(ExtractedData data) {
        if (!isGeminiConfigured()) {
            return buildLocalExplanation(data);
        }

        try {
            String prompt = """
                    Review this extracted health insurance claim data and summarize possible concerns in 3 short bullet points.
                    Return plain text only.

                    DATA:
                    """ + objectMapper.writeValueAsString(data);
            return extractText(callGemini(prompt));
        } catch (Exception e) {
            return buildLocalExplanation(data);
        }
    }

    private boolean isGeminiConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    private String callGemini(String prompt) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                + ":generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> body = Map.of(
                "contents", List.of(content),
                "generationConfig", Map.of(
                        "temperature", 0,
                        "maxOutputTokens", 1200
                )
        );

        try {
            return restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
        } catch (RestClientException e) {
            throw new RuntimeException("Gemini API request failed: " + e.getMessage(), e);
        }
    }

    private String extractJsonText(String geminiResponse) {
        String text = extractText(geminiResponse).trim();
        if (text.startsWith("```")) {
            text = text.replaceFirst("^```(?:json)?\\s*", "")
                    .replaceFirst("\\s*```$", "")
                    .trim();
        }

        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        throw new IllegalStateException("Gemini response did not contain a JSON object");
    }

    private String extractText(String geminiResponse) {
        try {
            JsonNode root = objectMapper.readTree(geminiResponse);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (!textNode.isMissingNode()) {
                return textNode.asText();
            }
        } catch (Exception ignored) {
        }
        return geminiResponse == null ? "" : geminiResponse;
    }

    private String trimForModel(String text) {
        if (text == null) return "";
        return text.length() <= MAX_INPUT_CHARS ? text : text.substring(0, MAX_INPUT_CHARS);
    }

    private String buildLocalExplanation(ExtractedData data) {
        if (data == null) {
            return "AI validation skipped. No extracted data was available.";
        }
        return "AI validation skipped or unavailable. Local extraction completed; review any blank fields before approval.";
    }
}
