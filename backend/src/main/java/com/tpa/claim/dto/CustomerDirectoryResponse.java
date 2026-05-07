package com.tpa.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class CustomerDirectoryResponse {
    private Long id;
    private String customerId;
    private String name;
    private String username;
    private String email;
    private int totalPolicies;
    private int activePolicies;
    private int inactivePolicies;
    private String status;
    private LocalDateTime lastPurchaseDate;
}
