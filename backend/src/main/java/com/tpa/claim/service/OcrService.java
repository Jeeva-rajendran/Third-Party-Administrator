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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {

    @Autowired
    private AiValidationService aiValidationService;

    public ExtractedData processDocuments(File claimForm, File combinedDoc) {
        ExtractedData data = new ExtractedData();
        
        String claimFormText = extractText(claimForm);
        String combinedDocText = extractText(combinedDoc);

        String combinedText = "--- CLAIM FORM ---\n" + claimFormText + "\n--- COMBINED DOC ---\n" + combinedDocText;
        String jsonResponse = aiValidationService.extractStructuredData(combinedText);

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(jsonResponse);
            
            data.setPolicyNumber(getTextNode(root, "policyNumber"));
            data.setCustomerName(getTextNode(root, "customerName"));
            data.setCarrierName(getTextNode(root, "carrierName"));
            data.setPolicyName(getTextNode(root, "policyName"));
            
            data.setClaimFormPatientName(getTextNode(root, "patientName"));
            data.setClaimFormHospitalName(getTextNode(root, "hospitalName"));
            data.setClaimFormAdmissionDate(parseDate(getTextNode(root, "admissionDate")));
            data.setClaimFormDischargeDate(parseDate(getTextNode(root, "dischargeDate")));
            
            String amtStr = getTextNode(root, "claimedAmount");
            if (amtStr != null && !amtStr.equals("NONE")) {
                try {
                    data.setClaimedAmount(new BigDecimal(amtStr));
                } catch (Exception e) {}
            }
            
            data.setClaimType(getTextNode(root, "claimType"));
            
            // Populate discharge/bill fields with the same info for now
            data.setDsPatientName(data.getClaimFormPatientName());
            data.setDsHospitalName(data.getClaimFormHospitalName());
            data.setDsAdmissionDate(data.getClaimFormAdmissionDate());
            data.setDsDischargeDate(data.getClaimFormDischargeDate());
            
        } catch (Exception e) {
            System.err.println("Error parsing Gemini JSON: " + e.getMessage());
            throw new RuntimeException("Failed to parse structured data from Gemini API: " + e.getMessage(), e);
        }

        return data;
    }

    private String getTextNode(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            String val = node.get(field).asText().trim();
            return val.equals("NONE") ? null : val;
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
                    for (int page = 0; page < document.getNumberOfPages(); ++page) {
                        BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 300);
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
        data.setPolicyNumber(extractRegex(text, "POLICY NO:\\s*(.*)"));
        data.setCustomerName(extractRegex(text, "CUSTOMER:\\s*(.*)"));
        data.setCarrierName(extractRegex(text, "CARRIER:\\s*(.*)"));
        data.setPolicyName(extractRegex(text, "POLICY NAME:\\s*(.*)"));
        data.setClaimFormPatientName(extractRegex(text, "PATIENT:\\s*(.*)"));
        data.setClaimFormHospitalName(extractRegex(text, "HOSPITAL:\\s*(.*)"));
        data.setClaimFormAdmissionDate(parseDate(extractRegex(text, "ADMISSION:\\s*(.*)")));
        data.setClaimFormDischargeDate(parseDate(extractRegex(text, "DISCHARGE:\\s*(.*)")));
        
        String amount = extractRegex(text, "CLAIMED AMOUNT:\\s*(\\d+)");
        if (amount != null) data.setClaimedAmount(new BigDecimal(amount));
        
        data.setClaimType(extractRegex(text, "TYPE:\\s*(.*)"));
    }

    private void parseCombinedDoc(String text, ExtractedData data) {
        data.setDsPatientName(extractRegex(text, "PATIENT:\\s*(.*)"));
        data.setDsHospitalName(extractRegex(text, "HOSPITAL:\\s*(.*)"));
        data.setDsAdmissionDate(parseDate(extractRegex(text, "ADMISSION:\\s*(.*)")));
        data.setDsDischargeDate(parseDate(extractRegex(text, "DISCHARGE:\\s*(.*)")));
        data.setDiagnosis(extractRegex(text, "DIAGNOSIS:\\s*(.*)"));

        data.setBillPatientName(extractRegex(text, "PATIENT:\\s*(.*)"));
        data.setBillHospitalName(extractRegex(text, "HOSPITAL:\\s*(.*)"));
        data.setBillNumber(extractRegex(text, "BILL NO:\\s*(.*)"));
        data.setBillDate(parseDate(extractRegex(text, "BILL DATE:\\s*(.*)")));
        
        String billAmt = extractRegex(text, "TOTAL BILL:\\s*(\\d+)");
        if (billAmt != null) data.setTotalBillAmount(new BigDecimal(billAmt));
    }

    private String extractRegex(String text, String regex) {
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null) return null;
        try {
            return LocalDate.parse(dateStr.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (Exception e) {
            return null;
        }
    }
}
