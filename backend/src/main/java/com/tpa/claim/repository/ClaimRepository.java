package com.tpa.claim.repository;

import com.tpa.claim.model.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    List<Claim> findByCustomerId(Long customerId);
    List<Claim> findByStatus(String status);
    List<Claim> findByStatusIn(List<String> statuses);

    @Query("""
            select c from Claim c
            join c.extractedData e
            where c.id <> :claimId
              and c.customerPolicy.policyNumber = :policyNumber
              and lower(e.claimFormPatientName) = lower(:patientName)
              and lower(e.claimFormHospitalName) = lower(:hospitalName)
              and e.claimFormAdmissionDate = :admissionDate
            """)
    List<Claim> findPotentialDuplicates(@Param("claimId") String claimId,
                                         @Param("policyNumber") String policyNumber,
                                         @Param("patientName") String patientName,
                                         @Param("hospitalName") String hospitalName,
                                         @Param("admissionDate") java.time.LocalDate admissionDate);
    @Query("SELECT SUM(c.settlementAmount) FROM Claim c WHERE c.customerPolicy.id = :policyId AND c.status IN ('CARRIER_APPROVED', 'COMPLETED')")
    BigDecimal sumSettlementAmountByCustomerPolicyId(@Param("policyId") Long policyId);
}
