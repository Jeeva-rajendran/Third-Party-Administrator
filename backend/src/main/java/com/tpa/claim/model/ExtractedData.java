package com.tpa.claim.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "extracted_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "claim_id", nullable = false)
    @JsonIgnore
    private Claim claim;

    // From Claim Form
    @Column(name = "policy_number")
    private String policyNumber;

    @Column(name = "policy_id")
    private String policyId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "carrier_name")
    private String carrierName;

    @Column(name = "policy_name")
    private String policyName;

    @Column(name = "claim_form_patient_name")
    private String claimFormPatientName;

    @Column(name = "claim_form_hospital_name")
    private String claimFormHospitalName;

    @Column(name = "claim_form_admission_date")
    private LocalDate claimFormAdmissionDate;

    @Column(name = "claim_form_discharge_date")
    private LocalDate claimFormDischargeDate;

    @Column(name = "claimed_amount")
    private BigDecimal claimedAmount;

    @Column(name = "claim_type")
    private String claimType; // Cashless / Reimbursement

    // From Discharge Summary
    @Column(name = "ds_patient_name")
    private String dsPatientName;

    @Column(name = "ds_hospital_name")
    private String dsHospitalName;

    @Column(name = "ds_admission_date")
    private LocalDate dsAdmissionDate;

    @Column(name = "ds_discharge_date")
    private LocalDate dsDischargeDate;

    @Column(name = "diagnosis")
    private String diagnosis;

    // From Final Hospital Bill
    @Column(name = "bill_patient_name")
    private String billPatientName;

    @Column(name = "bill_hospital_name")
    private String billHospitalName;

    @Column(name = "bill_number")
    private String billNumber;

    @Column(name = "bill_date")
    private LocalDate billDate;

    @Column(name = "total_bill_amount")
    private BigDecimal totalBillAmount;
}
