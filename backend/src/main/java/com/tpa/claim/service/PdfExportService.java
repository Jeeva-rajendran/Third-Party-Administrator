package com.tpa.claim.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.tpa.claim.model.Claim;
import com.tpa.claim.model.ClaimAuditLog;
import com.tpa.claim.model.ExtractedData;
import com.tpa.claim.model.RuleResult;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class PdfExportService {

    private final TimelineService timelineService;

    public PdfExportService(TimelineService timelineService) {
        this.timelineService = timelineService;
    }

    public byte[] generateClaimPdf(Claim claim) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(0, 51, 102));
            Font headerFont = new Font(Font.HELVETICA, 13, Font.BOLD, new Color(0, 102, 153));
            Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD);

            // Title
            Paragraph title = new Paragraph("TPA CLAIM PROCESSING REPORT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Claim Info Section
            document.add(new Paragraph("CLAIM INFORMATION", headerFont));
            document.add(new Paragraph("Claim ID: " + claim.getId(), normalFont));
            document.add(new Paragraph("Status: " + claim.getStatus(), boldFont));
            document.add(new Paragraph("Created: " + claim.getCreatedAt(), normalFont));
            if (claim.getProcessedAt() != null)
                document.add(new Paragraph("Processed: " + claim.getProcessedAt(), normalFont));
            document.add(new Paragraph(" "));

            // Customer & Policy Info
            document.add(new Paragraph("CUSTOMER & POLICY DETAILS", headerFont));
            if (claim.getCustomer() != null) {
                document.add(new Paragraph("Customer: " + claim.getCustomer().getName() + " (" + claim.getCustomer().getUsername() + ")", normalFont));
            }
            if (claim.getCustomerPolicy() != null) {
                document.add(new Paragraph("Policy Number: " + claim.getCustomerPolicy().getPolicyNumber(), normalFont));
                if (claim.getCustomerPolicy().getPolicy() != null) {
                    document.add(new Paragraph("Policy Name: " + claim.getCustomerPolicy().getPolicy().getPolicyName(), normalFont));
                    document.add(new Paragraph("Coverage: " + claim.getCustomerPolicy().getPolicy().getCoverageAmount(), normalFont));
                }
            }
            document.add(new Paragraph(" "));

            // Extracted Data
            ExtractedData ed = claim.getExtractedData();
            if (ed != null) {
                document.add(new Paragraph("OCR EXTRACTED DATA", headerFont));
                PdfPTable dataTable = new PdfPTable(2);
                dataTable.setWidthPercentage(100);
                addTableRow(dataTable, "Policy Number", ed.getPolicyNumber(), boldFont, normalFont);
                addTableRow(dataTable, "Customer Name", ed.getCustomerName(), boldFont, normalFont);
                addTableRow(dataTable, "Patient Name", ed.getClaimFormPatientName(), boldFont, normalFont);
                addTableRow(dataTable, "Hospital", ed.getClaimFormHospitalName(), boldFont, normalFont);
                addTableRow(dataTable, "Admission Date", String.valueOf(ed.getClaimFormAdmissionDate()), boldFont, normalFont);
                addTableRow(dataTable, "Discharge Date", String.valueOf(ed.getClaimFormDischargeDate()), boldFont, normalFont);
                addTableRow(dataTable, "Claimed Amount", String.valueOf(ed.getClaimedAmount()), boldFont, normalFont);
                addTableRow(dataTable, "Total Bill", String.valueOf(ed.getTotalBillAmount()), boldFont, normalFont);
                addTableRow(dataTable, "Diagnosis", ed.getDiagnosis(), boldFont, normalFont);
                document.add(dataTable);
                document.add(new Paragraph(" "));
            }

            // Rule Results
            if (claim.getRuleResults() != null && !claim.getRuleResults().isEmpty()) {
                document.add(new Paragraph("RULE ENGINE RESULTS", headerFont));
                PdfPTable ruleTable = new PdfPTable(3);
                ruleTable.setWidthPercentage(100);
                ruleTable.setWidths(new float[]{1, 4, 1.5f});
                addRuleHeader(ruleTable, boldFont);
                for (RuleResult rule : claim.getRuleResults()) {
                    ruleTable.addCell(new PdfPCell(new Phrase(rule.getRuleId(), normalFont)));
                    ruleTable.addCell(new PdfPCell(new Phrase(rule.getDescription(), normalFont)));
                    PdfPCell statusCell = new PdfPCell(new Phrase(rule.isTriggered() ? "TRIGGERED" : "PASSED", normalFont));
                    statusCell.setBackgroundColor(rule.isTriggered() ? new Color(255, 200, 200) : new Color(200, 255, 200));
                    ruleTable.addCell(statusCell);
                }
                document.add(ruleTable);
                document.add(new Paragraph(" "));
            }

            // AI Explanation
            if (claim.getAiExplanation() != null) {
                document.add(new Paragraph("AI VALIDATION REPORT", headerFont));
                document.add(new Paragraph(claim.getAiExplanation(), normalFont));
                document.add(new Paragraph(" "));
            }

            // Decision Summary
            document.add(new Paragraph("DECISION SUMMARY", headerFont));
            if (claim.getApprovalChancePercentage() != null)
                document.add(new Paragraph("AI Estimated Approval Chance: " + claim.getApprovalChancePercentage() + "%", boldFont));
            if (claim.getDecisionReason() != null)
                document.add(new Paragraph("Decision Reason: " + claim.getDecisionReason(), normalFont));
            if (claim.getSettlementAmount() != null)
                document.add(new Paragraph("Settlement Amount: " + claim.getSettlementAmount(), boldFont));
            if (claim.getCarrierRemarks() != null)
                document.add(new Paragraph("Carrier Remarks: " + claim.getCarrierRemarks(), normalFont));
            document.add(new Paragraph(" "));

            // Timeline
            List<ClaimAuditLog> timeline = timelineService.getTimeline(claim.getId());
            if (!timeline.isEmpty()) {
                document.add(new Paragraph("CLAIM TIMELINE", headerFont));
                PdfPTable timelineTable = new PdfPTable(4);
                timelineTable.setWidthPercentage(100);
                timelineTable.setWidths(new float[]{2, 1.5f, 1.5f, 3});
                timelineTable.addCell(new PdfPCell(new Phrase("Timestamp", boldFont)));
                timelineTable.addCell(new PdfPCell(new Phrase("Role", boldFont)));
                timelineTable.addCell(new PdfPCell(new Phrase("Action", boldFont)));
                timelineTable.addCell(new PdfPCell(new Phrase("Comments", boldFont)));
                for (ClaimAuditLog log : timeline) {
                    timelineTable.addCell(new PdfPCell(new Phrase(String.valueOf(log.getTimestamp()), normalFont)));
                    timelineTable.addCell(new PdfPCell(new Phrase(log.getRole(), normalFont)));
                    timelineTable.addCell(new PdfPCell(new Phrase(log.getAction(), normalFont)));
                    timelineTable.addCell(new PdfPCell(new Phrase(log.getComments() != null ? log.getComments() : "", normalFont)));
                }
                document.add(timelineTable);
            }

            document.close();
        } catch (Exception e) {
            System.err.println("PDF generation error: " + e.getMessage());
        }

        return baos.toByteArray();
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        table.addCell(new PdfPCell(new Phrase(label, labelFont)));
        table.addCell(new PdfPCell(new Phrase(value != null ? value : "N/A", valueFont)));
    }

    private void addRuleHeader(PdfPTable table, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase("Rule", font));
        c1.setBackgroundColor(new Color(220, 220, 220));
        PdfPCell c2 = new PdfPCell(new Phrase("Description", font));
        c2.setBackgroundColor(new Color(220, 220, 220));
        PdfPCell c3 = new PdfPCell(new Phrase("Status", font));
        c3.setBackgroundColor(new Color(220, 220, 220));
        table.addCell(c1);
        table.addCell(c2);
        table.addCell(c3);
    }
}
