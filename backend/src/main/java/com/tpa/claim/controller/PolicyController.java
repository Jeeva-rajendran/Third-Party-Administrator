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

    // Customer purchases a policy — directly ACTIVE
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

    // Update policy
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CARRIER')")
    public ResponseEntity<?> updatePolicy(@PathVariable Long id, @RequestBody Policy policy) {
        try {
            Policy updated = policyService.updatePolicy(id, policy);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Delete policy
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CARRIER')")
    public ResponseEntity<?> deletePolicy(@PathVariable Long id) {
        try {
            policyService.deletePolicy(id);
            return ResponseEntity.ok(Map.of("message", "Policy deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }
}
