package com.tpa.claim.service;

import com.tpa.claim.model.ExtractedData;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.awt.image.BufferedImage;
import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {

    @Autowired
    private AiValidationService aiValidationService;

    public ExtractedData processDocuments(File claimForm, File combinedDoc) {
        String claimFormText = extractText(claimForm);
        String combinedDocText = extractText(combinedDoc);

        ExtractedData data = parseLocally(claimFormText, combinedDocText);
        if (hasEnoughData(data)) {
            return data;
        }

        try {
            String combinedText = "--- CLAIM FORM ---\n" + claimFormText + "\n--- COMBINED DOC ---\n" + combinedDocText;
            String jsonResponse = aiValidationService.extractStructuredData(combinedText);
            ExtractedData aiData = parseGeminiResponse(jsonResponse);
            mergeMissingFields(aiData, data);
            return aiData;
        } catch (Exception e) {
            System.err.println("Gemini extraction unavailable, using local OCR parser: " + e.getMessage());
            return data;
        }
    }

    private ExtractedData parseGeminiResponse(String jsonResponse) throws Exception {
        ExtractedData data = new ExtractedData();
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(jsonResponse);

        data.setPolicyNumber(getTextNode(root, "policyNumber"));
        data.setCustomerName(getTextNode(root, "customerName"));
        data.setCarrierName(getTextNode(root, "carrierName"));
        data.setPolicyName(getTextNode(root, "policyName"));
        data.setClaimFormPatientName(firstTextNode(root, "claimFormPatientName", "patientName"));
        data.setClaimFormHospitalName(firstTextNode(root, "claimFormHospitalName", "hospitalName"));
        data.setClaimFormAdmissionDate(parseDate(firstTextNode(root, "claimFormAdmissionDate", "admissionDate")));
        data.setClaimFormDischargeDate(parseDate(firstTextNode(root, "claimFormDischargeDate", "dischargeDate")));
        data.setClaimedAmount(parseAmount(getTextNode(root, "claimedAmount")));
        data.setClaimType(getTextNode(root, "claimType"));
        data.setDsPatientName(firstTextNode(root, "dsPatientName", "dischargePatientName"));
        data.setDsHospitalName(firstTextNode(root, "dsHospitalName", "dischargeHospitalName"));
        data.setDsAdmissionDate(parseDate(getTextNode(root, "dsAdmissionDate")));
        data.setDsDischargeDate(parseDate(getTextNode(root, "dsDischargeDate")));
        data.setDiagnosis(getTextNode(root, "diagnosis"));
        data.setBillPatientName(getTextNode(root, "billPatientName"));
        data.setBillHospitalName(getTextNode(root, "billHospitalName"));
        data.setBillNumber(getTextNode(root, "billNumber"));
        data.setBillDate(parseDate(getTextNode(root, "billDate")));
        data.setTotalBillAmount(parseAmount(getTextNode(root, "totalBillAmount")));
        return data;
    }

    private String getTextNode(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            String val = node.get(field).asText().trim();
            return val.equals("NONE") ? null : val;
        }
        return null;
    }

    private String firstTextNode(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = getTextNode(node, field);
            if (value != null) return value;
        }
        return null;
    }

    private String extractText(File file) {
        StringBuilder text = new StringBuilder();
        try {
            if (file.getName().toLowerCase().endsWith(".pdf")) {
                try (PDDocument document = PDDocument.load(file)) {
                    // First try direct text extraction (works for text-based PDFs)
                    PDFTextStripper stripper = new PDFTextStripper();
                    String directText = stripper.getText(document);
                    if (directText != null && directText.trim().length() > 20) {
                        return directText;
                    }
                    
                    // Fall back to OCR for scanned PDFs
                    PDFRenderer pdfRenderer = new PDFRenderer(document);
                    int pagesToScan = Math.min(document.getNumberOfPages(), 5);
                    for (int page = 0; page < pagesToScan; ++page) {
                        BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 200);
                        text.append(doOcr(bim)).append("\n");
                    }
                }
            } else {
                text.append(doOcr(file));
            }
        } catch (Exception e) {
            System.err.println("Error extracting text: " + e.getMessage());
            throw new RuntimeException("Failed to extract text from document: " + e.getMessage(), e);
        }
        return text.toString();
    }

    private String doOcr(Object imageOrFile) throws TesseractException {
        try {
            Tesseract tesseract = new Tesseract();
            tesseract.setPageSegMode(6);
            tesseract.setOcrEngineMode(1);
            // Try multiple tessdata paths for compatibility
            String[] possiblePaths = {
                "/usr/share/tesseract-ocr/4.00/tessdata",
                "/usr/share/tesseract-ocr/5/tessdata",
                "/usr/share/tessdata",
                System.getenv("TESSDATA_PREFIX")
            };
            
            String datapath = null;
            for (String path : possiblePaths) {
                if (path != null && new File(path).exists()) {
                    datapath = path;
                    break;
                }
            }
            
            if (datapath != null) {
                tesseract.setDatapath(datapath);
            }
            tesseract.setLanguage("eng");
            
            if (imageOrFile instanceof BufferedImage) {
                return tesseract.doOCR((BufferedImage) imageOrFile);
            } else if (imageOrFile instanceof File) {
                return tesseract.doOCR((File) imageOrFile);
            }
        } catch (Throwable e) {
            System.err.println("Tesseract Failed: " + e.getMessage());
            throw new RuntimeException("OCR extraction failed", e);
        }
        return "";
    }



    private void parseClaimForm(String text, ExtractedData data) {
        data.setPolicyNumber(firstMatch(text, "policy\\s*(?:no|number|#)", "policy", "member\\s*(?:id|no|number)"));
        data.setCustomerName(firstMatch(text, "customer\\s*name", "customer", "insured\\s*name", "policy\\s*holder"));
        data.setCarrierName(firstMatch(text, "carrier\\s*name", "carrier", "insurance\\s*company", "insurer"));
        data.setPolicyName(firstMatch(text, "policy\\s*name", "plan\\s*name"));
        data.setClaimFormPatientName(firstMatch(text, "patient\\s*name", "patient", "name\\s*of\\s*patient"));
        data.setClaimFormHospitalName(firstMatch(text, "hospital\\s*name", "hospital", "name\\s*of\\s*hospital"));
        data.setClaimFormAdmissionDate(parseDate(firstMatch(text, "admission\\s*date", "admission", "date\\s*of\\s*admission", "admitted\\s*on")));
        data.setClaimFormDischargeDate(parseDate(firstMatch(text, "discharge\\s*date", "discharge", "date\\s*of\\s*discharge", "discharged\\s*on")));
        data.setClaimedAmount(parseAmount(firstMatch(text, "claimed\\s*amount", "claim\\s*amount", "amount\\s*claimed")));
        data.setClaimType(firstMatch(text, "claim\\s*type", "type\\s*of\\s*claim", "type"));
    }

    private void parseCombinedDoc(String text, ExtractedData data) {
        data.setDsPatientName(firstMatch(text, "patient\\s*name", "patient", "name\\s*of\\s*patient"));
        data.setDsHospitalName(firstMatch(text, "hospital\\s*name", "hospital", "name\\s*of\\s*hospital"));
        data.setDsAdmissionDate(parseDate(firstMatch(text, "admission\\s*date", "admission", "date\\s*of\\s*admission", "admitted\\s*on")));
        data.setDsDischargeDate(parseDate(firstMatch(text, "discharge\\s*date", "discharge", "date\\s*of\\s*discharge", "discharged\\s*on")));
        data.setDiagnosis(firstMatch(text, "diagnosis", "provisional\\s*diagnosis", "final\\s*diagnosis"));

        data.setBillPatientName(firstMatch(text, "bill\\s*patient\\s*name", "patient\\s*name", "patient", "name\\s*of\\s*patient"));
        data.setBillHospitalName(firstMatch(text, "bill\\s*hospital\\s*name", "hospital\\s*name", "hospital", "name\\s*of\\s*hospital"));
        data.setBillNumber(firstMatch(text, "bill\\s*(?:no|number|#)", "bill", "invoice\\s*(?:no|number|#)"));
        data.setBillDate(parseDate(firstMatch(text, "bill\\s*date", "invoice\\s*date", "date")));
        data.setTotalBillAmount(parseAmount(firstMatch(text, "total\\s*bill\\s*amount", "total\\s*bill", "grand\\s*total", "net\\s*amount", "total")));
    }

    private String extractRegex(String text, String regex) {
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return cleanValue(matcher.group(1));
        }
        return null;
    }

    private ExtractedData parseLocally(String claimFormText, String combinedDocText) {
        ExtractedData data = new ExtractedData();
        parseClaimForm(normalizeText(claimFormText), data);
        parseCombinedDoc(normalizeText(combinedDocText), data);
        copyClaimValuesToMissingDocumentValues(data);
        return data;
    }

    private String firstMatch(String text, String... labels) {
        for (String label : labels) {
            List<String> patterns = Arrays.asList(
                    label + "\\s*[:\\-]\\s*([^\\r\\n|]+)",
                    label + "\\s+([^\\r\\n|:]{2,80})"
            );
            for (String pattern : patterns) {
                String value = extractRegex(text, pattern);
                if (value != null && !value.isBlank()) return value;
            }
        }
        return null;
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return text.replace('\u00a0', ' ')
                .replaceAll("[ \\t]+", " ")
                .replaceAll("(?m)^\\s+", "")
                .trim();
    }

    private String cleanValue(String value) {
        if (value == null) return null;
        String cleaned = value.replaceAll("\\s{2,}", " ")
                .replaceAll("^[#:\\-\\s]+", "")
                .replaceAll("[,;|]+$", "")
                .trim();
        return cleaned.equalsIgnoreCase("NONE") || cleaned.isBlank() ? null : cleaned;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null) return null;
        String cleaned = dateStr.trim()
                .replaceAll("(\\d+)(st|nd|rd|th)", "$1")
                .replace('.', '-')
                .replace('/', '-');
        List<DateTimeFormatter> formatters = Arrays.asList(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("d-MM-yyyy"),
                DateTimeFormatter.ofPattern("dd-MM-yy"),
                new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd-MMM-yyyy").toFormatter(Locale.ENGLISH),
                new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d-MMM-yyyy").toFormatter(Locale.ENGLISH),
                new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMM yyyy").toFormatter(Locale.ENGLISH),
                new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM yyyy").toFormatter(Locale.ENGLISH)
        );
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(cleaned, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private BigDecimal parseAmount(String amount) {
        if (amount == null) return null;
        String cleaned = amount.replaceAll("[^0-9.]", "");
        if (cleaned.isBlank()) return null;
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean hasEnoughData(ExtractedData data) {
        int score = 0;
        if (data.getPolicyNumber() != null) score++;
        if (data.getClaimFormPatientName() != null) score++;
        if (data.getClaimFormHospitalName() != null) score++;
        if (data.getClaimedAmount() != null) score++;
        if (data.getDsAdmissionDate() != null || data.getClaimFormAdmissionDate() != null) score++;
        if (data.getTotalBillAmount() != null) score++;
        return score >= 4;
    }

    private void copyClaimValuesToMissingDocumentValues(ExtractedData data) {
        if (data.getDsPatientName() == null) data.setDsPatientName(data.getClaimFormPatientName());
        if (data.getBillPatientName() == null) data.setBillPatientName(data.getDsPatientName());
        if (data.getDsHospitalName() == null) data.setDsHospitalName(data.getClaimFormHospitalName());
        if (data.getBillHospitalName() == null) data.setBillHospitalName(data.getDsHospitalName());
        if (data.getDsAdmissionDate() == null) data.setDsAdmissionDate(data.getClaimFormAdmissionDate());
        if (data.getDsDischargeDate() == null) data.setDsDischargeDate(data.getClaimFormDischargeDate());
    }

    private void mergeMissingFields(ExtractedData target, ExtractedData fallback) {
        if (target.getPolicyNumber() == null) target.setPolicyNumber(fallback.getPolicyNumber());
        if (target.getCustomerName() == null) target.setCustomerName(fallback.getCustomerName());
        if (target.getCarrierName() == null) target.setCarrierName(fallback.getCarrierName());
        if (target.getPolicyName() == null) target.setPolicyName(fallback.getPolicyName());
        if (target.getClaimFormPatientName() == null) target.setClaimFormPatientName(fallback.getClaimFormPatientName());
        if (target.getClaimFormHospitalName() == null) target.setClaimFormHospitalName(fallback.getClaimFormHospitalName());
        if (target.getClaimFormAdmissionDate() == null) target.setClaimFormAdmissionDate(fallback.getClaimFormAdmissionDate());
        if (target.getClaimFormDischargeDate() == null) target.setClaimFormDischargeDate(fallback.getClaimFormDischargeDate());
        if (target.getClaimedAmount() == null) target.setClaimedAmount(fallback.getClaimedAmount());
        if (target.getClaimType() == null) target.setClaimType(fallback.getClaimType());
        if (target.getDsPatientName() == null) target.setDsPatientName(fallback.getDsPatientName());
        if (target.getDsHospitalName() == null) target.setDsHospitalName(fallback.getDsHospitalName());
        if (target.getDsAdmissionDate() == null) target.setDsAdmissionDate(fallback.getDsAdmissionDate());
        if (target.getDsDischargeDate() == null) target.setDsDischargeDate(fallback.getDsDischargeDate());
        if (target.getDiagnosis() == null) target.setDiagnosis(fallback.getDiagnosis());
        if (target.getBillPatientName() == null) target.setBillPatientName(fallback.getBillPatientName());
        if (target.getBillHospitalName() == null) target.setBillHospitalName(fallback.getBillHospitalName());
        if (target.getBillNumber() == null) target.setBillNumber(fallback.getBillNumber());
        if (target.getBillDate() == null) target.setBillDate(fallback.getBillDate());
        if (target.getTotalBillAmount() == null) target.setTotalBillAmount(fallback.getTotalBillAmount());
    }
}
