package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.ClaimRepository;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.ClaimService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/client")
@PreAuthorize("hasRole('CLIENT')")
public class ClientController {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private UserRepository userRepository;

    // View all SUBMITTED claims
    @GetMapping("/claims")
    public ResponseEntity<List<Claim>> getSubmittedClaims() {
        return ResponseEntity.ok(claimRepository.findByStatus("SUBMITTED"));
    }

    // Approve claim -> Forward to FMG
    @PutMapping("/claims/{id}/approve")
    public ResponseEntity<?> approveClaim(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User client = getCurrentUser();
            String comments = body != null ? body.get("comments") : null;
            Claim claim = claimService.clientApproveClaim(id, client, comments);
            return ResponseEntity.ok(claim);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Reject claim
    @PutMapping("/claims/{id}/reject")
    public ResponseEntity<?> rejectClaim(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User client = getCurrentUser();
            String comments = body != null ? body.get("comments") : null;
            Claim claim = claimService.clientRejectClaim(id, client, comments);
            return ResponseEntity.ok(claim);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }
}
