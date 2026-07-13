package com.tpa.claim.service;

import com.tpa.claim.model.ClaimAuditLog;
import com.tpa.claim.model.Claim;
import com.tpa.claim.repository.ClaimAuditLogRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TimelineService {

    private final ClaimAuditLogRepository auditLogRepository;

    public TimelineService(ClaimAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void addEntry(Claim claim, String action, String performedBy, String role, String comments) {
        ClaimAuditLog log = new ClaimAuditLog();
        log.setClaim(claim);
        log.setAction(action);
        log.setPerformedBy(performedBy);
        log.setRole(role);
        log.setComments(comments);
        auditLogRepository.save(log);
    }

    public List<ClaimAuditLog> getTimeline(String claimId) {
        return auditLogRepository.findByClaimIdOrderByTimestampAsc(claimId);
    }
}
