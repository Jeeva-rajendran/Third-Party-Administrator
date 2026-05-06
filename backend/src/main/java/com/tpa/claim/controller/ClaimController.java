package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.ClaimService;
import com.tpa.claim.service.OcrService;
import com.tpa.claim.service.PdfExportService;
import com.tpa.claim.service.PolicyService;
import com.tpa.claim.service.TimelineService;
import com.tpa.claim.repository.ClaimRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfExportService pdfExportService;

    @Autowired
    private PolicyService policyService;

    @Autowired
    private TimelineService timelineService;

    @Autowired
    private OcrService ocrService;

    @Value("${upload.dir}")
    private String uploadDir;

    // OCR extraction — returns editable data for customer to review
    @PostMapping("/ocr-extract")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> extractOcrData(
            @RequestParam("claimForm") MultipartFile claimForm,
            @RequestParam("combinedDoc") MultipartFile combinedDoc) {
        try {
            ExtractedData data = claimService.extractOcrData(claimForm, combinedDoc);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "OCR extraction failed: " + e.getMessage()));
        }
    }

    // Customer submits a claim with edited OCR data
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createClaim(
            @RequestParam("claimForm") MultipartFile claimForm,
            @RequestParam("combinedDoc") MultipartFile combinedDoc,
            @RequestParam("customerPolicyId") Long customerPolicyId,
            // Edited OCR fields (optional — will use raw OCR if not provided)
            @RequestParam(value = "policyNumber", required = false) String policyNumber,
            @RequestParam(value = "customerName", required = false) String customerName,
            @RequestParam(value = "carrierName", required = false) String carrierName,
            @RequestParam(value = "policyName", required = false) String policyName,
            @RequestParam(value = "claimFormPatientName", required = false) String claimFormPatientName,
            @RequestParam(value = "claimFormHospitalName", required = false) String claimFormHospitalName,
            @RequestParam(value = "claimFormAdmissionDate", required = false) String claimFormAdmissionDate,
            @RequestParam(value = "claimFormDischargeDate", required = false) String claimFormDischargeDate,
            @RequestParam(value = "claimedAmount", required = false) String claimedAmount,
            @RequestParam(value = "claimType", required = false) String claimType,
            @RequestParam(value = "dsPatientName", required = false) String dsPatientName,
            @RequestParam(value = "dsHospitalName", required = false) String dsHospitalName,
            @RequestParam(value = "dsAdmissionDate", required = false) String dsAdmissionDate,
            @RequestParam(value = "dsDischargeDate", required = false) String dsDischargeDate,
            @RequestParam(value = "diagnosis", required = false) String diagnosis,
            @RequestParam(value = "billPatientName", required = false) String billPatientName,
            @RequestParam(value = "billHospitalName", required = false) String billHospitalName,
            @RequestParam(value = "billNumber", required = false) String billNumber,
            @RequestParam(value = "billDate", required = false) String billDate,
            @RequestParam(value = "totalBillAmount", required = false) String totalBillAmount) {
        try {
            User customer = getCurrentUser();
            List<CustomerPolicy> activePolicies = policyService.getActiveCustomerPolicies(customer.getId());
            CustomerPolicy cp = activePolicies.stream()
                    .filter(p -> p.getId().equals(customerPolicyId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Active policy not found or doesn't belong to you"));

            // Build edited ExtractedData from form params if any field is provided
            ExtractedData editedData = null;
            if (policyNumber != null || claimFormPatientName != null) {
                editedData = new ExtractedData();
                editedData.setPolicyNumber(policyNumber);
                editedData.setCustomerName(customerName);
                editedData.setCarrierName(carrierName);
                editedData.setPolicyName(policyName);
                editedData.setClaimFormPatientName(claimFormPatientName);
                editedData.setClaimFormHospitalName(claimFormHospitalName);
                editedData.setClaimFormAdmissionDate(parseDate(claimFormAdmissionDate));
                editedData.setClaimFormDischargeDate(parseDate(claimFormDischargeDate));
                editedData.setClaimedAmount(parseBigDecimal(claimedAmount));
                editedData.setClaimType(claimType);
                editedData.setDsPatientName(dsPatientName);
                editedData.setDsHospitalName(dsHospitalName);
                editedData.setDsAdmissionDate(parseDate(dsAdmissionDate));
                editedData.setDsDischargeDate(parseDate(dsDischargeDate));
                editedData.setDiagnosis(diagnosis);
                editedData.setBillPatientName(billPatientName);
                editedData.setBillHospitalName(billHospitalName);
                editedData.setBillNumber(billNumber);
                editedData.setBillDate(parseDate(billDate));
                editedData.setTotalBillAmount(parseBigDecimal(totalBillAmount));
            }

            Claim claim = claimService.createClaim(customer, cp, claimForm, combinedDoc, editedData);
            return ResponseEntity.ok(claim);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error processing claim: " + e.getMessage()));
        }
    }

    // Customer views their claims
    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<Claim>> getMyClaims() {
        User customer = getCurrentUser();
        return ResponseEntity.ok(claimRepository.findByCustomerId(customer.getId()));
    }

    // Any authenticated user views a specific claim
    @GetMapping("/{id}")
    public ResponseEntity<?> getClaim(@PathVariable String id) {
        Claim claim = claimRepository.findById(id).orElse(null);
        if (claim == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(claim);
    }

    // Get claim timeline
    @GetMapping("/{id}/timeline")
    public ResponseEntity<List<ClaimAuditLog>> getClaimTimeline(@PathVariable String id) {
        return ResponseEntity.ok(timelineService.getTimeline(id));
    }

    // Serve uploaded document for PDF viewer
    @GetMapping("/{claimId}/documents/{docType}")
    public ResponseEntity<Resource> getDocument(@PathVariable String claimId, @PathVariable String docType) {
        Claim claim = claimRepository.findById(claimId).orElse(null);
        if (claim == null) return ResponseEntity.notFound().build();

        ClaimDocument doc = claim.getDocuments().stream()
                .filter(d -> d.getDocumentType().equals(docType))
                .findFirst()
                .orElse(null);
        if (doc == null) return ResponseEntity.notFound().build();

        File file = new File(doc.getFilePath());
        if (!file.exists()) return ResponseEntity.notFound().build();

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    // Export claim as PDF
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportClaimPdf(@PathVariable String id) {
        Claim claim = claimRepository.findById(id).orElse(null);
        if (claim == null) return ResponseEntity.notFound().build();

        byte[] pdfBytes = pdfExportService.generateClaimPdf(claim);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "claim_" + id + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal parseBigDecimal(String val) {
        if (val == null || val.isEmpty()) return null;
        try {
            return new BigDecimal(val);
        } catch (Exception e) {
            return null;
        }
    }
}
