package com.tpa.claim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.tpa.claim.model.*;
import com.tpa.claim.repository.ClaimRepository;
import com.tpa.claim.repository.ClaimDecisionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final OcrService ocrService;
    private final RuleEngineService ruleEngineService;
    private final AiValidationService aiValidationService;
    private final TimelineService timelineService;
    private final ClaimDecisionRepository claimDecisionRepository;
    private final ObjectMapper objectMapper;

    @Value("${upload.dir}")
    private String uploadDir;

    public ClaimService(ClaimRepository claimRepository, OcrService ocrService,
                        RuleEngineService ruleEngineService, AiValidationService aiValidationService,
                        TimelineService timelineService, ClaimDecisionRepository claimDecisionRepository) {
        this.claimRepository = claimRepository;
        this.ocrService = ocrService;
        this.ruleEngineService = ruleEngineService;
        this.aiValidationService = aiValidationService;
        this.timelineService = timelineService;
        this.claimDecisionRepository = claimDecisionRepository;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // OCR extraction only — returns extracted data for customer review
    public ExtractedData extractOcrData(MultipartFile claimForm, MultipartFile combinedDoc) throws Exception {
        Files.createDirectories(Paths.get(uploadDir));

        String tempId = UUID.randomUUID().toString();
        File savedClaimForm = saveFile(claimForm, tempId, "CLAIM_FORM");
        File savedCombinedDoc = saveFile(combinedDoc, tempId, "COMBINED_DOC");

        return ocrService.processDocuments(savedClaimForm, savedCombinedDoc);
    }

    // Customer submits claim with edited OCR data
    @Transactional
    public Claim createClaim(User customer, CustomerPolicy customerPolicy,
                             MultipartFile claimForm, MultipartFile combinedDoc,
                             ExtractedData editedData) throws Exception {
        if (claimForm == null || combinedDoc == null) {
            throw new IllegalArgumentException("Exactly TWO documents must be uploaded");
        }
        if (!"ACTIVE".equals(customerPolicy.getStatus())) {
            throw new IllegalArgumentException("Policy is not active");
        }

        Claim claim = new Claim();
        claim.setId(UUID.randomUUID().toString());
        claim.setCustomer(customer);
        claim.setCustomerPolicy(customerPolicy);
        claim.setStatus("SUBMITTED");
        claim.setDocuments(new ArrayList<>());
        claim.setDecisions(new ArrayList<>());

        Files.createDirectories(Paths.get(uploadDir));

        File savedClaimForm = saveFile(claimForm, claim.getId(), "CLAIM_FORM");
        File savedCombinedDoc = saveFile(combinedDoc, claim.getId(), "COMBINED_DOC");

        claim.getDocuments().add(new ClaimDocument(null, claim, "CLAIM_FORM", savedClaimForm.getAbsolutePath(), LocalDateTime.now()));
        claim.getDocuments().add(new ClaimDocument(null, claim, "COMBINED_DOC", savedCombinedDoc.getAbsolutePath(), LocalDateTime.now()));

        // Use customer-edited OCR data if provided, otherwise extract fresh
        if (editedData != null) {
            editedData.setClaim(claim);
            claim.setExtractedData(editedData);
        } else {
            ExtractedData data = ocrService.processDocuments(savedClaimForm, savedCombinedDoc);
            data.setClaim(claim);
            claim.setExtractedData(data);
        }

        try {
            claim.setExtractedDataSnapshot(objectMapper.writeValueAsString(claim.getExtractedData()));
        } catch (Exception e) {
            System.err.println("JSON snapshot error: " + e.getMessage());
        }

        Claim saved = claimRepository.save(claim);
        timelineService.addEntry(saved, "CLAIM_SUBMITTED", customer.getUsername(), "CUSTOMER",
                "Claim submitted for policy " + customerPolicy.getPolicyNumber());
        return saved;
    }

    // FMG validates claim using OCR, rules, and AI assistance. FMG does not approve or reject manually.
    @Transactional
    public Claim fmgProcessClaim(String claimId, User fmgUser) throws Exception {
        Claim claim = getClaimOrThrow(claimId);
        assertStatus(claim, "SUBMITTED");
        claim.setStatus("FMG_PROCESSING");

        // If OCR data doesn't exist yet, extract it
        if (claim.getExtractedData() == null) {
            File claimFormFile = getDocumentFile(claim, "CLAIM_FORM");
            File combinedDocFile = getDocumentFile(claim, "COMBINED_DOC");

            ExtractedData data = ocrService.processDocuments(claimFormFile, combinedDocFile);
            data.setClaim(claim);
            claim.setExtractedData(data);

            try {
                claim.setExtractedDataSnapshot(objectMapper.writeValueAsString(data));
            } catch (Exception e) {
                System.err.println("JSON snapshot error: " + e.getMessage());
            }
        }

        // Rule Engine
        ruleEngineService.evaluateRules(claim);

        // AI Validation
        String aiExplanation = aiValidationService.analyzeClaimData(claim.getExtractedData());
        claim.setAiExplanation(aiExplanation);

        claim.setProcessedAt(LocalDateTime.now());
        Claim saved = claimRepository.save(claim);
        timelineService.addEntry(saved, "FMG_PROCESSED", fmgUser.getUsername(), "FMG",
                "AI/rule validation completed. Result: " + claim.getStatus() + ". " + claim.getDecisionReason());
        if (saved.getApprovalChancePercentage() != null) {
            timelineService.addEntry(saved, "APPROVAL_CHANCE_ESTIMATED", fmgUser.getUsername(), "FMG",
                    "Estimated approval chance shown to customer: " + saved.getApprovalChancePercentage() + "%");
        }
        return saved;
    }

    @Transactional
    public Claim fmgApproveClaim(String claimId, User fmgUser, String comments) {
        throw new UnsupportedOperationException("FMG cannot approve claims. FMG only performs AI/rule validation.");
    }

    @Transactional
    public Claim fmgRejectClaim(String claimId, User fmgUser, String comments) {
        throw new UnsupportedOperationException("FMG cannot manually reject claims. Rejection is decided only by validation rules or carrier final decision.");
    }

    @Transactional
    public Claim fmgManualReview(String claimId, User fmgUser, String comments) {
        throw new UnsupportedOperationException("FMG cannot manually change routing. Manual review is assigned by validation rules.");
    }

    // Carrier final decision — APPROVE → COMPLETED
    @Transactional
    public Claim carrierApproveClaim(String claimId, User carrier, BigDecimal settlementAmount, String remarks) {
        Claim claim = getClaimOrThrow(claimId);
        assertCarrierDecisionStatus(claim);
        claim.setStatus("CARRIER_APPROVED");
        claim.setSettlementAmount(settlementAmount);
        claim.setCarrierRemarks(remarks);

        // Record decision
        ClaimDecision decision = new ClaimDecision();
        decision.setClaim(claim);
        decision.setDecidedBy(carrier.getUsername());
        decision.setRole("CARRIER");
        decision.setDecision("APPROVED");
        decision.setSettlementAmount(settlementAmount);
        decision.setRemarks(remarks);
        if (claim.getDecisions() == null) claim.setDecisions(new ArrayList<>());
        claim.getDecisions().add(decision);

        Claim saved = claimRepository.save(claim);
        timelineService.addEntry(saved, "CARRIER_APPROVED", carrier.getUsername(), "CARRIER",
                "Payment approved. Settlement: ₹" + settlementAmount + ". " + (remarks != null ? remarks : ""));

        // Auto-transition to COMPLETED
        saved.setStatus("COMPLETED");
        saved = claimRepository.save(saved);
        timelineService.addEntry(saved, "COMPLETED", carrier.getUsername(), "CARRIER",
                "Claim processing completed. Final settlement: ₹" + settlementAmount);
        return saved;
    }

    @Transactional
    public Claim carrierRejectClaim(String claimId, User carrier, String remarks) {
        Claim claim = getClaimOrThrow(claimId);
        assertCarrierDecisionStatus(claim);
        claim.setStatus("CARRIER_REJECTED");
        claim.setCarrierRemarks(remarks);
        claim.setDecisionReason(remarks);

        // Record decision
        ClaimDecision decision = new ClaimDecision();
        decision.setClaim(claim);
        decision.setDecidedBy(carrier.getUsername());
        decision.setRole("CARRIER");
        decision.setDecision("REJECTED");
        decision.setRemarks(remarks);
        if (claim.getDecisions() == null) claim.setDecisions(new ArrayList<>());
        claim.getDecisions().add(decision);

        Claim saved = claimRepository.save(claim);
        timelineService.addEntry(saved, "CARRIER_REJECTED", carrier.getUsername(), "CARRIER",
                remarks != null ? remarks : "Payment rejected by carrier");
        return saved;
    }

    public Claim getClaimById(String id) {
        return claimRepository.findById(id).orElse(null);
    }

    // Helpers
    private Claim getClaimOrThrow(String claimId) {
        return claimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));
    }

    private void assertStatus(Claim claim, String expectedStatus) {
        if (!expectedStatus.equals(claim.getStatus())) {
            throw new IllegalStateException("Claim is not in " + expectedStatus + " status. Current: " + claim.getStatus());
        }
    }

    private void assertCarrierDecisionStatus(Claim claim) {
        if (!"READY_FOR_CARRIER".equals(claim.getStatus()) && !"MANUAL_REVIEW".equals(claim.getStatus())) {
            throw new IllegalStateException("Claim is not ready for carrier decision. Current: " + claim.getStatus());
        }
    }

    private File getDocumentFile(Claim claim, String docType) {
        return claim.getDocuments().stream()
                .filter(d -> d.getDocumentType().equals(docType))
                .findFirst()
                .map(d -> new File(d.getFilePath()))
                .orElseThrow(() -> new IllegalStateException("Document " + docType + " not found"));
    }

    private File saveFile(MultipartFile file, String claimId, String docType) throws IOException {
        String filename = claimId + "_" + docType + "_" + file.getOriginalFilename();
        Path filepath = Paths.get(uploadDir, filename);
        Files.write(filepath, file.getBytes());
        return filepath.toFile();
    }
}
