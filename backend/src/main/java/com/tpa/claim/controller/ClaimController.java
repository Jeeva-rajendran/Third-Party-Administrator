package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.ClaimService;
import com.tpa.claim.service.PdfExportService;
import com.tpa.claim.service.PolicyService;
import com.tpa.claim.service.TimelineService;
import com.tpa.claim.repository.ClaimRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    // Customer submits a claim
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createClaim(
            @RequestParam("claimForm") MultipartFile claimForm,
            @RequestParam("combinedDoc") MultipartFile combinedDoc,
            @RequestParam("customerPolicyId") Long customerPolicyId) {
        try {
            User customer = getCurrentUser();
            List<CustomerPolicy> activePolicies = policyService.getActiveCustomerPolicies(customer.getId());
            CustomerPolicy cp = activePolicies.stream()
                    .filter(p -> p.getId().equals(customerPolicyId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Active policy not found or doesn't belong to you"));

            Claim claim = claimService.createClaim(customer, cp, claimForm, combinedDoc);
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

    // Any authenticated user views a specific claim (with role-based access control)
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
}
