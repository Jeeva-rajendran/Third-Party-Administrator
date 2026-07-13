# TPA Insurance Claim Processing System

A full-stack insurance claim processing platform for Third Party Administrator (TPA) workflows. The system lets carriers create policies, customers purchase policies and submit medical claim documents, FMG users validate claims through OCR, business rules, and optional Gemini AI, and carriers make the final settlement decision.

The project is built for an end-to-end demo of a real medical insurance claim lifecycle: policy creation, policy purchase, document upload, OCR extraction, editable review, automated validation, final carrier adjudication, customer tracking, and PDF export.

---

## Problem Statement

Manual insurance claim workflows are inefficient and costly, resulting in slow settlements and a lack of real-time transparency for customers. Our solution digitizes the end-to-end claim lifecycle using AI-driven document extraction and automated business logic to reduce operational overhead and improve the customer experience.


---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Project Summary](#project-summary)
3. [Tech Stack](#tech-stack)
4. [User Roles](#user-roles)
5. [Mermaid Diagram Index](#mermaid-diagram-index)
6. [High Level Design Mermaid Diagram](#high-level-design-hld---mermaid-diagram)
7. [Low Level Design Mermaid Diagram](#low-level-design-lld---mermaid-diagram)
8. [Project Flow Mermaid Diagram](#project-flow---mermaid-diagram)
9. [Claim Status Flow Mermaid Diagram](#claim-status-flow---mermaid-diagram)
10. [Database Schema Mermaid ER Diagram](#database-schema---mermaid-er-diagram)
11. [Backend Details](#backend-details)
12. [Frontend Details](#frontend-details)
13. [Rule Engine](#rule-engine)
14. [API Endpoints](#api-endpoints)
15. [How to Setup and Run](#how-to-setup-and-run)
16. [Demo Guide](#demo-guide)
17. [Project Structure](#project-structure)
18. [Future Enhancements](#future-enhancements)

---

## Project Summary

The application automates the claim journey for a health insurance process.

- **Carrier** creates insurance policies and performs final claim approval or rejection.
- **Customer** registers, purchases a policy, uploads required claim PDFs, reviews OCR-extracted data, submits claims, tracks progress, views documents, and exports claim reports.
- **FMG / TPA** validates submitted claims using OCR output, business rules, AI explanation, SLA monitoring, customer history, and rule configuration.

Important behavior in this implementation:

- FMG does **not** manually approve or reject claims.
- FMG runs OCR, rule validation, and AI-assisted analysis.
- The rule engine decides whether a claim becomes `READY_FOR_CARRIER`, `MANUAL_REVIEW`, or `FMG_REJECTED`.
- Carrier makes the final financial decision.
- Carrier approval automatically moves the claim to `COMPLETED`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Material UI, Axios, React Router |
| Backend | Java 17, Spring Boot 3.1.5, Spring Web, Spring Security, Spring Data JPA |
| Authentication | JWT, BCrypt password hashing, role-based authorization |
| Database | MySQL 8 |
| OCR / Documents | Tess4J, Tesseract OCR, Apache PDFBox |
| AI | Optional Google Gemini API |
| PDF Export | OpenPDF |
| DevOps | Docker, Docker Compose, Nginx frontend container |
| API Docs | Springdoc OpenAPI / Swagger UI |

---

## User Roles

| Role | Backend Enum | Main Responsibilities |
|---|---|---|
| Customer | `ROLE_CUSTOMER` | Register, login, buy policies, submit claims, upload claim documents, review OCR data, track claim timeline, export claim PDF |
| FMG / TPA | `ROLE_FMG` | View submitted claims, run OCR/rule/AI validation, monitor SLA, view customer directory, block/unblock customers, update rule settings |
| Carrier | `ROLE_CARRIER` | Create/update/delete policies, view FMG-validated claims, approve/reject final payment, view customer directory, block/unblock customers |

Default seeded users:

| Username | Password | Role |
|---|---|---|
| `fmg` | `fmg123` | FMG |
| `carrier` | `carrier123` | Carrier |

Customers are created from the registration screen.

---

## Mermaid Diagram Index

This README includes the following Mermaid diagrams for project explanation:

| Diagram | What It Explains |
|---|---|
| HLD diagram | Overall system architecture: frontend, backend, database, OCR, AI, uploads |
| LLD diagram | Internal code-level design: pages, controllers, services, repositories |
| Project flow sequence diagram | Step-by-step claim process from login to final settlement |
| Claim status state diagram | How a claim moves between statuses |
| Database ER diagram | Tables and relationships used by the project |

If your editor does not render Mermaid, open the Markdown preview in GitHub, GitLab, or a Mermaid-supported VS Code preview extension. The diagram source is still present in the README inside fenced `mermaid` code blocks.

---

## High Level Design (HLD) - Mermaid Diagram

```mermaid
flowchart LR
    Customer[Customer Browser] -->|React UI| Frontend["Frontend: React + Vite + MUI"]
    FMG[FMG Browser] -->|React UI| Frontend
    Carrier[Carrier Browser] -->|React UI| Frontend

    Frontend -->|HTTP + JWT| API[Spring Boot REST API]

    API --> Auth["Security Layer: JWT Filter + RBAC"]
    API --> ClaimModule[Claim Module]
    API --> PolicyModule[Policy Module]
    API --> CustomerModule[Customer Directory Module]

    ClaimModule --> OCR["OCR Layer: PDFBox + Tesseract"]
    ClaimModule --> Rules[Rule Engine]
    ClaimModule --> AI[Optional Gemini AI]
    ClaimModule --> PDF[PDF Export Service]

    API --> DB[(MySQL Database)]
    ClaimModule --> Uploads[(uploads/)]
    OCR --> Uploads
    PDF --> API
```

### HLD Explanation

- The frontend is a single-page React app served by Nginx in Docker.
- Spring Boot exposes REST APIs under `/api`.
- JWT authentication protects APIs after login.
- Role-based method security restricts sensitive actions.
- MySQL stores users, policies, claims, OCR data, decisions, rule results, audit logs, and system configuration.
- Uploaded documents are stored in the `uploads/` directory.
- OCR extraction uses direct PDF text extraction first, then Tesseract OCR for scanned documents.
- Gemini AI is optional. If disabled or unavailable, the system falls back to local extraction and local explanation.

---

## Low Level Design (LLD) - Mermaid Diagram

The LLD is split into multiple larger Mermaid diagrams so each one is readable in the README preview.

### LLD Overview

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "nodeSpacing": 70, "rankSpacing": 85}, "themeVariables": {"fontSize": "19px"}}}%%
flowchart LR
    UI["React Frontend<br/>Pages + Components"]
    Auth["JWT Security<br/>AuthTokenFilter + RBAC"]
    Controllers["REST Controllers<br/>Auth, Policy, Claim, FMG, Carrier"]
    Services["Service Layer<br/>Business Logic + Workflow"]
    Repositories["Repository Layer<br/>Spring Data JPA"]
    Database[("MySQL Database")]
    Files[("uploads/ PDF Storage")]
    External["External Processing<br/>Tesseract OCR + Optional Gemini"]

    UI -->|Axios HTTP API calls| Controllers
    Controllers --> Auth
    Controllers --> Services
    Services --> Repositories
    Repositories --> Database
    Services --> Files
    Services --> External
```

### Frontend LLD

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "nodeSpacing": 55, "rankSpacing": 70}, "themeVariables": {"fontSize": "18px"}}}%%
flowchart TB
    App["App.jsx<br/>Routing, layout, auth context, theme context"]
    Login["Login.jsx<br/>Customer registration and login"]
    CustomerDash["CustomerDashboard.jsx<br/>Policies, purchased policies, claims, timeline, PDF export"]
    OcrReview["OcrReview.jsx<br/>Upload documents, edit OCR fields, submit claim"]
    FmgDash["FmgDashboard.jsx<br/>Claim queue, validation, customer directory, rule settings"]
    CarrierDash["CarrierDashboard.jsx<br/>Policy CRUD, pending approvals, final decision"]
    ClaimDetails["ClaimDetails.jsx<br/>Claim details, OCR data, rules, decisions, documents"]
    Timeline["ClaimTimeline.jsx<br/>Visual audit trail"]

    App --> Login
    App --> CustomerDash
    App --> OcrReview
    App --> FmgDash
    App --> CarrierDash
    App --> ClaimDetails
    CustomerDash --> Timeline
    ClaimDetails --> Timeline
```

### Backend LLD

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "nodeSpacing": 55, "rankSpacing": 75}, "themeVariables": {"fontSize": "18px"}}}%%
flowchart TB
    AuthController["AuthController<br/>login, register, seed users"]
    PolicyController["PolicyController<br/>policy CRUD and purchase"]
    ClaimController["ClaimController<br/>OCR, submit claim, details, timeline, export"]
    FmgController["FmgController<br/>validation queue, customers, config"]
    CarrierController["CarrierController<br/>final approval or rejection"]

    ClaimService["ClaimService<br/>claim lifecycle orchestration"]
    PolicyService["PolicyService<br/>policy creation, purchase, utilization"]
    OcrService["OcrService<br/>PDFBox, Tesseract, local parser"]
    RuleEngine["RuleEngineService<br/>R1-R10 validation and routing"]
    AiService["AiValidationService<br/>Gemini extraction and analysis fallback"]
    TimelineService["TimelineService<br/>audit log entries"]
    ConfigService["ConfigService<br/>rule threshold and SLA settings"]
    PdfService["PdfExportService<br/>claim PDF report"]
    Mapper["ClaimMapper<br/>customer and FMG response DTOs"]

    AuthController --> UserRepo["UserRepository"]
    PolicyController --> PolicyService
    ClaimController --> ClaimService
    ClaimController --> PdfService
    ClaimController --> Mapper
    FmgController --> ClaimService
    FmgController --> ConfigService
    CarrierController --> ClaimService

    ClaimService --> OcrService
    ClaimService --> RuleEngine
    ClaimService --> AiService
    ClaimService --> TimelineService
    PolicyService --> ClaimRepo["ClaimRepository"]
```

### Repository and Model LLD

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "nodeSpacing": 55, "rankSpacing": 75}, "themeVariables": {"fontSize": "18px"}}}%%
flowchart LR
    UserRepo["UserRepository"] --> User["User<br/>username, role, customerId, blocked"]
    PolicyRepo["PolicyRepository"] --> Policy["Policy<br/>name, type, coverage, premium"]
    CustomerPolicyRepo["CustomerPolicyRepository"] --> CustomerPolicy["CustomerPolicy<br/>policyNumber, status, purchaseDate"]
    ClaimRepo["ClaimRepository"] --> Claim["Claim<br/>status, settlement, AI explanation"]
    DecisionRepo["ClaimDecisionRepository"] --> Decision["ClaimDecision<br/>approved/rejected, remarks"]
    AuditRepo["ClaimAuditLogRepository"] --> Audit["ClaimAuditLog<br/>timeline action"]
    ConfigRepo["SystemConfigRepository"] --> Config["SystemConfig<br/>rule and SLA values"]

    Claim --> Document["ClaimDocument<br/>CLAIM_FORM / COMBINED_DOC"]
    Claim --> Extracted["ExtractedData<br/>patient, hospital, dates, amount, diagnosis"]
    Claim --> RuleResult["RuleResult<br/>ruleId, triggered, description"]
```

### Main Backend Components

| Component | Responsibility |
|---|---|
| `AuthController` | Login, customer registration, seed FMG and carrier users |
| `PolicyController` | Carrier policy CRUD, customer policy purchase, customer policy list |
| `ClaimController` | OCR extraction, claim submission, claim list/details, timeline, document view, PDF export |
| `FmgController` | FMG claim queue, validation trigger, customer directory, rule/SLA config |
| `CarrierController` | Carrier claim queue, final approve/reject, customer directory, policy management support |
| `ClaimService` | Main claim lifecycle orchestration |
| `OcrService` | PDF/text extraction, Tesseract OCR, local parsing, optional Gemini structured extraction |
| `RuleEngineService` | Ten validation rules and claim routing |
| `AiValidationService` | Gemini extraction/analysis when enabled, local fallback when disabled |
| `TimelineService` | Audit timeline entries |
| `PdfExportService` | Claim report generation |

---

## Project Flow - Mermaid Diagram

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "nodeSpacing": 45, "rankSpacing": 60}, "themeVariables": {"fontSize": "17px"}}}%%
flowchart TD
    A["1. Carrier creates policy"]
    B["2. Customer registers / logs in"]
    C["3. Customer purchases policy"]
    D["4. Customer uploads documents<br/>Claim Form + Combined Bill/Discharge"]
    E["5. OCR extracts claim data"]
    F["6. Customer reviews and submits claim"]
    G["7. FMG runs validation<br/>Rules + Optional AI"]
    H{"Validation Result"}
    I["Ready for Carrier"]
    J["Manual Review"]
    K["FMG Rejected"]
    L["8. Carrier approves or rejects"]
    M["9. Claim completed / rejected"]
    N["10. Customer tracks timeline<br/>and exports PDF"]

    A --> B --> C --> D --> E --> F --> G --> H
    H -->|All rules passed| I --> L
    H -->|Review rule triggered| J --> L
    H -->|Hard rejection rule| K --> N
    L --> M --> N
```

### Project Flow Explanation

1. Carrier creates an insurance policy.
2. Customer registers, logs in, and purchases an active policy.
3. Customer uploads a claim form and combined hospital bill/discharge document.
4. OCR extracts data and the customer reviews/edits it.
5. FMG runs rule validation and optional AI analysis.
6. Claim is routed to carrier, manual review, or FMG rejection.
7. Carrier makes the final approval/rejection decision.
8. Customer tracks the timeline and exports the claim PDF.

---

## Claim Status Flow - Mermaid Diagram

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Customer submits claim
    SUBMITTED --> FMG_PROCESSING: FMG runs validation
    FMG_PROCESSING --> FMG_REJECTED: Rejection rule triggered
    FMG_PROCESSING --> MANUAL_REVIEW: Review rule triggered
    FMG_PROCESSING --> READY_FOR_CARRIER: All rules passed
    READY_FOR_CARRIER --> CARRIER_APPROVED: Carrier approves payment
    READY_FOR_CARRIER --> CARRIER_REJECTED: Carrier rejects claim
    MANUAL_REVIEW --> CARRIER_APPROVED: Carrier approves after review
    MANUAL_REVIEW --> CARRIER_REJECTED: Carrier rejects after review
    CARRIER_APPROVED --> COMPLETED: Auto completion after settlement
    FMG_REJECTED --> [*]
    CARRIER_REJECTED --> [*]
    COMPLETED --> [*]
```

### Status Meaning

| Status | Meaning |
|---|---|
| `SUBMITTED` | Customer submitted claim and documents |
| `FMG_PROCESSING` | FMG validation is running |
| `READY_FOR_CARRIER` | Rules passed and carrier can make final decision |
| `MANUAL_REVIEW` | One or more review rules triggered; carrier review is required |
| `FMG_REJECTED` | Hard rejection rule triggered during validation |
| `CARRIER_APPROVED` | Carrier approved payment |
| `CARRIER_REJECTED` | Carrier rejected the claim |
| `COMPLETED` | Approved claim is fully settled |

---

## Database Schema - Mermaid ER Diagram

```mermaid
erDiagram
    USERS ||--o{ POLICIES : creates
    USERS ||--o{ CUSTOMER_POLICIES : purchases
    POLICIES ||--o{ CUSTOMER_POLICIES : assigned_as
    USERS ||--o{ CLAIMS : submits
    CUSTOMER_POLICIES ||--o{ CLAIMS : used_for
    CLAIMS ||--o{ CLAIM_DOCUMENTS : stores
    CLAIMS ||--|| EXTRACTED_DATA : has
    CLAIMS ||--o{ RULE_RESULTS : evaluated_by
    CLAIMS ||--o{ CLAIM_DECISIONS : receives
    CLAIMS ||--o{ CLAIM_AUDIT_LOGS : tracks

    USERS {
        bigint id PK
        varchar username UK
        varchar password
        varchar name
        varchar email UK
        varchar customer_id UK
        enum role
        boolean is_blocked
        text block_reason
    }

    POLICIES {
        bigint id PK
        varchar policy_name
        varchar policy_type
        decimal coverage_amount
        decimal premium
        date valid_from
        date valid_to
        text description
        bigint created_by FK
        datetime created_at
    }

    CUSTOMER_POLICIES {
        bigint id PK
        bigint customer_id FK
        bigint policy_id FK
        varchar policy_number UK
        varchar status
        datetime purchase_date
        text remarks
    }

    CLAIMS {
        varchar id PK
        bigint customer_id FK
        bigint customer_policy_id FK
        varchar status
        datetime created_at
        datetime processed_at
        text decision_reason
        decimal settlement_amount
        text carrier_remarks
        text ai_explanation
        int approval_chance_percentage
        json extracted_data_snapshot
    }

    CLAIM_DOCUMENTS {
        bigint id PK
        varchar claim_id FK
        varchar document_type
        varchar file_path
        datetime uploaded_at
    }

    EXTRACTED_DATA {
        bigint id PK
        varchar claim_id FK
        varchar policy_number
        varchar policy_id
        varchar customer_name
        varchar carrier_name
        varchar policy_name
        varchar claim_form_patient_name
        varchar claim_form_hospital_name
        date claim_form_admission_date
        date claim_form_discharge_date
        decimal claimed_amount
        varchar claim_type
        varchar ds_patient_name
        varchar ds_hospital_name
        date ds_admission_date
        date ds_discharge_date
        varchar diagnosis
        varchar bill_patient_name
        varchar bill_hospital_name
        varchar bill_number
        date bill_date
        decimal total_bill_amount
    }

    RULE_RESULTS {
        bigint id PK
        varchar claim_id FK
        varchar rule_id
        boolean triggered
        text description
    }

    CLAIM_DECISIONS {
        bigint id PK
        varchar claim_id FK
        varchar decided_by
        varchar role
        varchar decision
        decimal settlement_amount
        text remarks
        datetime timestamp
    }

    CLAIM_AUDIT_LOGS {
        bigint id PK
        varchar claim_id FK
        varchar action
        varchar performed_by
        varchar role
        text comments
        datetime timestamp
    }

    SYSTEM_CONFIGS {
        varchar config_key PK
        varchar config_value
        varchar description
    }
```

### Main Tables

| Table | Purpose |
|---|---|
| `users` | Stores login accounts, role, customer ID, blocked status |
| `policies` | Carrier-created insurance products |
| `customer_policies` | Purchased policies linked to customers |
| `claims` | Main claim record and lifecycle status |
| `claim_documents` | Uploaded claim form and combined medical document paths |
| `extracted_data` | OCR/AI extracted medical and claim fields |
| `rule_results` | Individual rule result rows for each claim |
| `claim_decisions` | Carrier final approval/rejection records |
| `claim_audit_logs` | Timeline entries shown in the UI |
| `system_configs` | Dynamic rule thresholds and SLA settings |

---

## Backend Details

### Authentication and Security

- Login endpoint returns a JWT token.
- Frontend stores auth data in `localStorage`.
- API requests pass `Authorization: Bearer <token>`.
- Spring Security uses a stateless session policy.
- `@PreAuthorize` protects role-specific controller methods.
- Passwords are encrypted with BCrypt.

### OCR and AI Extraction

The OCR flow in `OcrService` is:

1. Load uploaded PDF.
2. Try direct text extraction using PDFBox.
3. If direct text is not enough, render PDF pages and run Tesseract OCR.
4. Parse fields locally with regular expressions.
5. If local extraction is incomplete and Gemini is enabled, ask Gemini for structured JSON.
6. Merge AI values with local fallback values.
7. Return `ExtractedData` to the frontend for customer review.

### Claim Submission

The customer uploads exactly two documents:

- `CLAIM_FORM`
- `COMBINED_DOC`

The combined document represents discharge summary plus final hospital bill. Files are saved under `uploads/` with the claim UUID and document type in the filename.

### Timeline

Timeline events are stored in `claim_audit_logs`, for example:

- `CLAIM_SUBMITTED`
- `FMG_PROCESSED`
- `APPROVAL_CHANCE_ESTIMATED`
- `CARRIER_APPROVED`
- `CARRIER_REJECTED`
- `COMPLETED`

---

## Frontend Details

### Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login and registration | Public |
| `/` | Role-based dashboard | Authenticated |
| `/submit-claim` | OCR review and claim submission | Customer |
| `/claims/:id` | Claim detail view | Authenticated, customer can only view own claim |

### Pages

| Page | Purpose |
|---|---|
| `Login.jsx` | Login and customer registration |
| `CustomerDashboard.jsx` | Browse policies, purchased policies, claim list, timeline, PDF export |
| `OcrReview.jsx` | Upload documents, preview OCR data, edit fields, submit claim |
| `FmgDashboard.jsx` | Active claim queue, validation action, customer directory, rule settings |
| `CarrierDashboard.jsx` | Pending approvals, decision history, policy CRUD, customer directory |
| `ClaimDetails.jsx` | Full claim details, extracted data, documents, decision information |
| `ClaimTimeline.jsx` | Visual claim progress history |

---

## Rule Engine

Rules are evaluated in `RuleEngineService`.

| Rule | Description | Result Type |
|---|---|---|
| R1 | Claim form missing | Hard rejection |
| R2 | Combined document missing | Hard rejection |
| R3 | Policy inactive on admission date | Hard rejection |
| R4 | Policy number missing from documents | Manual review |
| R5 | Patient name mismatch across documents | Manual review |
| R6 | Hospital name mismatch across documents | Manual review |
| R7 | Admission/discharge date mismatch | Manual review |
| R8 | Claimed amount greater than total bill | Manual review |
| R9 | Claimed amount greater than configured threshold | Manual review |
| R10 | Possible duplicate claim for same policy, patient, hospital, and admission date | Manual review |

### Rule Outputs

- If any hard rejection rule is triggered, status becomes `FMG_REJECTED`.
- If no hard rejection occurs but one or more review rules trigger, status becomes `MANUAL_REVIEW`.
- If no rules trigger, status becomes `READY_FOR_CARRIER`.
- Approval chance is calculated and shown to the customer.

### Dynamic Configuration

Default configs are inserted by `ConfigService`:

| Key | Default | Purpose |
|---|---:|---|
| `RULE_R1_THRESHOLD` | `100000` | High amount threshold used by rule R9 |
| `RULE_R2_AGE_DAYS` | `30` | Reserved rule-age setting |
| `SLA_AMBER_HOURS` | `12` | FMG dashboard urgent threshold |
| `SLA_RED_HOURS` | `24` | FMG dashboard SLA breach threshold |

---

## API Endpoints

### Auth

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer |
| `POST` | `/api/auth/login` | Public | Login and receive JWT |

### Policies

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/policies` | Authenticated | View all policies |
| `GET` | `/api/policies/{id}` | Authenticated | View policy details |
| `POST` | `/api/policies` | Carrier | Create policy |
| `PUT` | `/api/policies/{id}` | Carrier | Update policy |
| `DELETE` | `/api/policies/{id}` | Carrier | Delete policy if not purchased |
| `POST` | `/api/policies/{id}/purchase` | Customer | Purchase policy |
| `GET` | `/api/policies/my-policies` | Customer | View purchased policies |

### Claims

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/claims/ocr-extract` | Customer | Upload documents and extract OCR fields |
| `POST` | `/api/claims` | Customer | Submit claim with documents and reviewed OCR data |
| `GET` | `/api/claims` | Customer | View own claims |
| `GET` | `/api/claims/{id}` | Authenticated | View claim details |
| `GET` | `/api/claims/{id}/timeline` | Authenticated | View claim timeline |
| `GET` | `/api/claims/{claimId}/documents/{docType}` | Authenticated | View uploaded PDF document |
| `GET` | `/api/claims/{id}/export` | Authenticated | Export claim report PDF |

### FMG

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/fmg/claims` | FMG | View FMG claim queue and history |
| `POST` | `/api/fmg/claims/{id}/process` | FMG | Run OCR/rule/AI validation |
| `GET` | `/api/fmg/customers` | FMG | View customer directory |
| `GET` | `/api/fmg/customers/{id}` | FMG | View customer details |
| `PUT` | `/api/fmg/customers/{id}/block` | FMG | Block customer |
| `PUT` | `/api/fmg/customers/{id}/unblock` | FMG | Unblock customer |
| `GET` | `/api/fmg/config` | FMG | View rule/SLA config |
| `PUT` | `/api/fmg/config` | FMG | Update config |

### Carrier

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/carrier/claims` | Carrier | View claims ready for final decision and history |
| `PUT` | `/api/carrier/claims/{id}/approve` | Carrier | Approve settlement and complete claim |
| `PUT` | `/api/carrier/claims/{id}/reject` | Carrier | Reject claim |
| `GET` | `/api/carrier/customers` | Carrier | View customer directory |
| `GET` | `/api/carrier/customers/{id}` | Carrier | View customer details |
| `PUT` | `/api/carrier/customers/{id}/block` | Carrier | Block customer |
| `PUT` | `/api/carrier/customers/{id}/unblock` | Carrier | Unblock customer |

Swagger UI is available at:

```text
http://localhost:8080/swagger-ui.html
```

---

## How to Setup and Run

### Prerequisites

For Docker setup:

- Docker
- Docker Compose

For local development:

- Java 17
- Maven
- Node.js 20 or compatible
- MySQL 8
- Tesseract OCR installed locally if OCR is tested outside Docker

### Run with Docker Compose

From the project root:

```bash
docker-compose up --build
```

Services:

| Service | URL / Port |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8080` |
| MySQL | `localhost:3306` |
| Swagger UI | `http://localhost:8080/swagger-ui.html` |

Docker Compose starts:

- `db`: MySQL 8 database named `tpa_claims`
- `backend`: Spring Boot app with Tesseract installed
- `frontend`: React app built and served by Nginx

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` / `db` in Docker | Database host |
| `DB_PORT` | `3306` | Database port |
| `DB_NAME` | `tpa_claims` | Database name |
| `DB_USER` | `root` | Database user |
| `DB_PASSWORD` | `root` | Database password |
| `JWT_SECRET` | Built-in default | JWT signing secret |
| `UPLOAD_DIR` | `uploads` | Upload directory |
| `GEMINI_ENABLED` | `false` | Enables Gemini calls |
| `GEMINI_API_KEY` | empty | Gemini API key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model name |

To enable Gemini in Docker:

```bash
set GEMINI_ENABLED=true
set GEMINI_API_KEY=your_api_key
docker-compose up --build
```

For PowerShell:

```powershell
$env:GEMINI_ENABLED="true"
$env:GEMINI_API_KEY="your_api_key"
docker-compose up --build
```

### Run Backend Locally

Start MySQL and create/use database `tpa_claims`, then:

```bash
cd backend
mvn spring-boot:run
```

Backend runs on:

```text
http://localhost:8080
```

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Vite usually runs on:

```text
http://localhost:5173
```

The frontend code currently calls:

```text
http://localhost:8080/api
```

So keep the backend running on port `8080`.

---

## Demo Guide

Use this order while explaining the project:

1. Start the app using Docker Compose.
2. Login as `carrier` / `carrier123`.
3. Create a policy from the Carrier dashboard.
4. Register a new customer from the login screen.
5. Login as that customer.
6. Browse policies and purchase the created policy.
7. Submit a claim using PDFs from `dummy_docs/`.
8. Review and edit OCR-extracted fields.
9. Submit the claim.
10. Login as `fmg` / `fmg123`.
11. Open the active queue and click **Run AI Validation**.
12. Explain rule results, approval chance, and SLA status.
13. Login as `carrier` / `carrier123`.
14. Open pending approvals.
15. Approve with settlement amount or reject with remarks.
16. Login as customer again and show final status, timeline, documents, and PDF export.

Sample documents are stored in:

```text
dummy_docs/
```

---

## Project Structure

```text
Final-Project/
|-- backend/
|   |-- Dockerfile
|   |-- pom.xml
|   `-- src/main/
|       |-- java/com/tpa/claim/
|       |   |-- controller/
|       |   |-- dto/
|       |   |-- model/
|       |   |-- repository/
|       |   |-- security/
|       |   |-- service/
|       |   `-- ClaimProcessingApplication.java
|       `-- resources/
|           `-- application.yml
|-- frontend/
|   |-- Dockerfile
|   |-- nginx.conf
|   |-- package.json
|   `-- src/
|       |-- components/
|       |-- pages/
|       |-- App.jsx
|       `-- main.jsx
|-- dummy_docs/
|   |-- claim_form.pdf
|   |-- combined_discharge_bill.pdf
|   |-- Dummy_Claim_Form.pdf
|   `-- Dummy_Combined_Doc.pdf
|-- uploads/
|-- docker-compose.yml
|-- e2e-test.ps1
`-- README.md
```

---

## Future Enhancements

- Add email/SMS notifications for claim status changes.
- Add payment gateway or settlement transaction module.
- Store uploaded files in S3/Azure Blob instead of local disk.
- Add stronger fraud analytics across customer claim history.
- Add admin dashboard for all carriers, FMG staff, and configuration.
- Add automated integration tests aligned with the current FMG validation flow.
- Add production profile with secured CORS, external secrets, and migration scripts.

---

## Quick Explanation Script

This project is a TPA insurance claim processing system. A carrier creates policies, a customer purchases a policy and submits claim documents, the system extracts claim data using OCR, the customer reviews the extracted data, FMG validates the claim using rules and optional AI, and the carrier makes the final settlement decision. The system keeps a complete timeline, stores decisions and rule results in MySQL, supports role-based dashboards, and allows PDF export of claim details.
