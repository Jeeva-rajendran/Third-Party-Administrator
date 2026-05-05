package com.tpa.claim.controller;

import com.tpa.claim.model.*;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.UserDetailsImpl;
import com.tpa.claim.service.PolicyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/policies")
public class PolicyController {

    @Autowired
    private PolicyService policyService;

    @Autowired
    private UserRepository userRepository;

    // Carrier creates a policy
    @PostMapping
    @PreAuthorize("hasRole('CARRIER')")
    public ResponseEntity<?> createPolicy(@RequestBody Policy policy) {
        try {
            User carrier = getCurrentUser();
            Policy saved = policyService.createPolicy(policy, carrier);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // All users can view policies
    @GetMapping
    public ResponseEntity<List<Policy>> getAllPolicies() {
        return ResponseEntity.ok(policyService.getAllPolicies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPolicy(@PathVariable Long id) {
        Policy policy = policyService.getPolicyById(id);
        if (policy == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(policy);
    }

    // Customer purchases a policy
    @PostMapping("/{id}/purchase")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> purchasePolicy(@PathVariable Long id) {
        try {
            User customer = getCurrentUser();
            CustomerPolicy cp = policyService.purchasePolicy(id, customer);
            return ResponseEntity.ok(cp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Customer views their policies
    @GetMapping("/my-policies")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<CustomerPolicy>> getMyPolicies() {
        User customer = getCurrentUser();
        return ResponseEntity.ok(policyService.getCustomerPolicies(customer.getId()));
    }

    // Client views pending policy purchases
    @GetMapping("/pending-purchases")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<CustomerPolicy>> getPendingPurchases() {
        return ResponseEntity.ok(policyService.getCustomerPoliciesByStatus("PENDING"));
    }

    // Client approves policy purchase
    @PutMapping("/customer-policies/{id}/approve")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<?> approvePolicy(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User client = getCurrentUser();
            String remarks = body != null ? body.get("remarks") : null;
            CustomerPolicy cp = policyService.approvePolicy(id, client, remarks);
            return ResponseEntity.ok(cp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Client rejects policy purchase
    @PutMapping("/customer-policies/{id}/reject")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<?> rejectPolicy(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            User client = getCurrentUser();
            String remarks = body != null ? body.get("remarks") : null;
            CustomerPolicy cp = policyService.rejectPolicy(id, client, remarks);
            return ResponseEntity.ok(cp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }
}
