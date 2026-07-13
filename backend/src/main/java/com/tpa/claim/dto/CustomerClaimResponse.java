package com.tpa.claim.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CustomerClaimResponse extends ClaimResponseDTO {
    // This DTO contains no AI or Rule Engine data
}
