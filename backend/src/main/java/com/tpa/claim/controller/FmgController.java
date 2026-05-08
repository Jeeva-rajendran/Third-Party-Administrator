package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.ClaimRepository;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.ClaimService;
import com.tpa.claim.service.CustomerDirectoryService;
import com.tpa.claim.service.ConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.tpa.claim.dto.CustomerDirectoryResponse;
import com.tpa.claim.dto.CustomerDetailsResponse;
import com.tpa.claim.dto.FMGClaimResponse;
import com.tpa.claim.service.ClaimMapper;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/fmg")
@PreAuthorize("hasRole('FMG')")
public class FmgController {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private ClaimMapper claimMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerDirectoryService customerDirectoryService;

    @Autowired
    private ConfigService configService;

    @GetMapping("/claims")
    public ResponseEntity<List<FMGClaimResponse>> getFmgClaims() {
        List<Claim> claims = claimRepository.findByStatusIn(
                Arrays.asList("SUBMITTED", "READY_FOR_CARRIER", "MANUAL_REVIEW", "FMG_REJECTED",
                        "CARRIER_APPROVED", "CARRIER_REJECTED", "COMPLETED"));
        return ResponseEntity.ok(claims.stream()
                .map(claimMapper::toFMGResponse)
                .collect(Collectors.toList()));
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerDirectoryResponse>> getCustomers() {
        return ResponseEntity.ok(customerDirectoryService.getAllCustomers());
    }

    @GetMapping("/customers/{id}")
    public ResponseEntity<CustomerDetailsResponse> getCustomerDetails(@PathVariable Long id) {
        return ResponseEntity.ok(customerDirectoryService.getCustomerDetails(id));
    }

    @PutMapping("/customers/{id}/block")
    public ResponseEntity<?> blockCustomer(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        customerDirectoryService.blockCustomer(id, reason);
        return ResponseEntity.ok(Map.of("message", "Customer blocked successfully"));
    }

    @PutMapping("/customers/{id}/unblock")
    public ResponseEntity<?> unblockCustomer(@PathVariable Long id) {
        customerDirectoryService.unblockCustomer(id);
        return ResponseEntity.ok(Map.of("message", "Customer unblocked successfully"));
    }

    @PostMapping("/claims/{id}/process")
    public ResponseEntity<?> processClaim(@PathVariable String id) {
        try {
            User fmgUser = getCurrentUser();
            Claim claim = claimService.fmgProcessClaim(id, fmgUser);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/claims/{id}/approve")
    public ResponseEntity<?> approveClaim(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User fmgUser = getCurrentUser();
            String comments = body != null ? body.get("comments") : null;
            Claim claim = claimService.fmgApproveClaim(id, fmgUser, comments);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/claims/{id}/reject")
    public ResponseEntity<?> rejectClaim(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User fmgUser = getCurrentUser();
            String comments = body != null ? body.get("comments") : null;
            Claim claim = claimService.fmgRejectClaim(id, fmgUser, comments);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/claims/{id}/manual-review")
    public ResponseEntity<?> manualReview(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User fmgUser = getCurrentUser();
            String comments = body != null ? body.get("comments") : null;
            Claim claim = claimService.fmgManualReview(id, fmgUser, comments);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/config")
    public ResponseEntity<List<SystemConfig>> getConfigs() {
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    @PutMapping("/config")
    public ResponseEntity<?> updateConfig(@RequestBody Map<String, String> body) {
        try {
            for (Map.Entry<String, String> entry : body.entrySet()) {
                configService.updateConfig(entry.getKey(), entry.getValue());
            }
            return ResponseEntity.ok(Map.of("message", "Configuration updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }
}
