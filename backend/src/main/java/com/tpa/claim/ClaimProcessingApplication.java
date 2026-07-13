package com.tpa.claim;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.io.File;
import java.io.FileOutputStream;

@SpringBootApplication
public class ClaimProcessingApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClaimProcessingApplication.class, args);
    }

    @Bean
    public CommandLineRunner generateDummyDocs() {
        return args -> {
            File dummyDir = new File("dummy_docs");
            if (!dummyDir.exists()) dummyDir.mkdirs();

            // 1. Claim Form
            File claimFormFile = new File("dummy_docs/Dummy_Claim_Form.pdf");
            if (!claimFormFile.exists()) {
                Document claimForm = new Document();
                PdfWriter.getInstance(claimForm, new FileOutputStream(claimFormFile));
                claimForm.open();
                claimForm.add(new Paragraph("TPA CLAIM FORM"));
                claimForm.add(new Paragraph("POLICY NO: POL-12345"));
                claimForm.add(new Paragraph("CUSTOMER: John Customer"));
                claimForm.add(new Paragraph("CARRIER: TPA Health Inc"));
                claimForm.add(new Paragraph("POLICY NAME: Gold Shield"));
                claimForm.add(new Paragraph("PATIENT: John Customer"));
                claimForm.add(new Paragraph("HOSPITAL: City General"));
                claimForm.add(new Paragraph("ADMISSION: 2023-10-01"));
                claimForm.add(new Paragraph("DISCHARGE: 2023-10-05"));
                claimForm.add(new Paragraph("CLAIMED AMOUNT: 45000"));
                claimForm.add(new Paragraph("TYPE: Cashless"));
                claimForm.close();
            }

            // 2. Combined Doc
            File combinedDocFile = new File("dummy_docs/Dummy_Combined_Doc.pdf");
            if (!combinedDocFile.exists()) {
                Document combinedDoc = new Document();
                PdfWriter.getInstance(combinedDoc, new FileOutputStream(combinedDocFile));
                combinedDoc.open();
                combinedDoc.add(new Paragraph("DISCHARGE SUMMARY"));
                combinedDoc.add(new Paragraph("PATIENT: John Customer"));
                combinedDoc.add(new Paragraph("HOSPITAL: City General"));
                combinedDoc.add(new Paragraph("ADMISSION: 2023-10-01"));
                combinedDoc.add(new Paragraph("DISCHARGE: 2023-10-05"));
                combinedDoc.add(new Paragraph("DIAGNOSIS: Viral Fever"));
                combinedDoc.add(new Paragraph("\n\n------------------------\n\n"));
                combinedDoc.add(new Paragraph("FINAL HOSPITAL BILL"));
                combinedDoc.add(new Paragraph("PATIENT: John Customer"));
                combinedDoc.add(new Paragraph("HOSPITAL: City General"));
                combinedDoc.add(new Paragraph("BILL NO: B-9991"));
                combinedDoc.add(new Paragraph("BILL DATE: 2023-10-05"));
                combinedDoc.add(new Paragraph("TOTAL BILL: 45000"));
                combinedDoc.close();
            }

            System.out.println("Dummy documents ready in 'dummy_docs' folder.");
        };
    }
}
