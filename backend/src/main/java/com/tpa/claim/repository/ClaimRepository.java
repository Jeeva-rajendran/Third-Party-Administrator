package com.tpa.claim.repository;

import com.tpa.claim.model.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    List<Claim> findByCustomerId(Long customerId);
    List<Claim> findByStatus(String status);
    List<Claim> findByStatusIn(List<String> statuses);
}
