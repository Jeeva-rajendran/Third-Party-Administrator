package com.tpa.claim.repository;

import com.tpa.claim.model.ClaimAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClaimAuditLogRepository extends JpaRepository<ClaimAuditLog, Long> {
    List<ClaimAuditLog> findByClaimIdOrderByTimestampAsc(String claimId);
}
