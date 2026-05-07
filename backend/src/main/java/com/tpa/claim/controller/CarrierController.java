package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.ClaimRepository;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.ClaimService;
import com.tpa.claim.service.CustomerDirectoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
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
@RequestMapping("/api/carrier")
@PreAuthorize("hasRole('CARRIER')")
public class CarrierController {

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

    // View FMG-approved claims + history of carrier decisions
    @GetMapping("/claims")
    public ResponseEntity<List<FMGClaimResponse>> getCarrierClaims() {
        List<Claim> claims = claimRepository.findByStatusIn(
                Arrays.asList("READY_FOR_CARRIER", "MANUAL_REVIEW", "CARRIER_APPROVED", "CARRIER_REJECTED", "COMPLETED"));
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

    // Approve payment → auto-completes
    @PutMapping("/claims/{id}/approve")
    public ResponseEntity<?> approveClaim(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            User carrier = getCurrentUser();
            BigDecimal settlementAmount = new BigDecimal(body.getOrDefault("settlementAmount", "0"));
            String remarks = body.get("remarks");
            Claim claim = claimService.carrierApproveClaim(id, carrier, settlementAmount, remarks);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Reject payment
    @PutMapping("/claims/{id}/reject")
    public ResponseEntity<?> rejectClaim(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User carrier = getCurrentUser();
            String remarks = body != null ? body.get("remarks") : null;
            Claim claim = claimService.carrierRejectClaim(id, carrier, remarks);
            return ResponseEntity.ok(claimMapper.toFMGResponse(claim));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }
}
