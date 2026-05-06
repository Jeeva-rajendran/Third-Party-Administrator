package com.tpa.claim.repository;

import com.tpa.claim.model.ClaimDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClaimDecisionRepository extends JpaRepository<ClaimDecision, Long> {
    List<ClaimDecision> findByClaimIdOrderByTimestampAsc(String claimId);
}
