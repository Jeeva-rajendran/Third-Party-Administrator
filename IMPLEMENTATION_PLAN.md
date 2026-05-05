# TPA Insurance Claim Processing System — Multi-Role Overhaul

## Background

The existing system has 2 roles (`ROLE_AGENT`, `ROLE_ADMIN`) with a simple workflow: Agent uploads documents → OCR + Rules → Done. This overhaul transforms it into a **4-role enterprise workflow** with a strict claim status pipeline, policy lifecycle, AI validation, and full audit timeline.

## Current State vs. Target State

| Aspect | Current | Target |
|---|---|---|
| Roles | Agent, Admin | Customer, Client, FMG, Carrier |
| Workflow | Upload → OCR → Done | Submit → Client Verify → FMG Process → Carrier Decision |
| Policies | None | Full CRUD by Carrier, purchase by Customer via Client |
| AI | None | Gemini API integration for claim reasoning |
| Timeline | None | Full audit trail with timestamps per step |
| PDF | Basic | Comprehensive multi-step decision report |

---

## User Review Required

### IMPORTANT: Gemini API Key
The AI validation module requires a Gemini API key. I will implement it with a configurable environment variable (`GEMINI_API_KEY`). If no key is provided, the system will fall back to a mock AI response for demo purposes.

### WARNING: Database Reset
The schema changes are extensive (new tables, renamed columns, new role enum values). The existing PostgreSQL volume will need to be dropped (`docker volume rm final-project_postgres_data`) before the first run of the new system.

### IMPORTANT: Tesseract OCR
The previous build failed because Ubuntu package repos were unreachable inside Docker. The new plan keeps the Tesseract-free fallback (mock OCR) as default.

## Open Questions

1. **Gemini API Key** — Do you have a Gemini API key to provide, or should I implement with mock-only AI for now?
2. **Database** — PostgreSQL is currently used. Should I stick with PostgreSQL?
3. **Registration** — Should Customers be able to self-register, or should all users be seeded?

---

## Proposed Changes

### Phase 1: Backend — Models & Database Schema
- **Role.java** → Change to `ROLE_CUSTOMER, ROLE_CLIENT, ROLE_FMG, ROLE_CARRIER`
- **User.java** → Add `name`, `email` fields
- **NEW: Policy.java** → Insurance policies created by Carrier
- **NEW: CustomerPolicy.java** → Links Customer to purchased Policy
- **Claim.java** → Replace `agent` with `customer`, add `customerPolicy`, full status pipeline, `settlementAmount`, `aiExplanation`
- **ClaimAuditLog.java** → Add `role`, `comments`, change to ManyToOne Claim relationship

### Phase 2: Backend — Repositories
- Add `PolicyRepository`, `CustomerPolicyRepository`, `ClaimAuditLogRepository`
- Update existing repos with new query methods

### Phase 3: Backend — Services
- **ClaimService** → Multi-step workflow methods
- **PolicyService** (NEW) → CRUD + purchase workflow
- **AiValidationService** (NEW) → Gemini API + mock fallback
- **TimelineService** (NEW) → Audit log management
- **PdfExportService** → Enhanced multi-stage report
- **RuleEngineService** → Policy validity check

### Phase 4: Backend — Controllers
- **AuthController** → 4-role seed data + registration
- **DELETE AdminController** → Replaced by role-specific controllers
- **PolicyController** (NEW) → Policy CRUD + purchase
- **ClientController** (NEW) → Claim verification
- **FmgController** (NEW) → OCR + Rules + AI processing
- **CarrierController** (NEW) → Final payment decision

### Phase 5: Backend — Security
- Update SecurityConfig for role-specific endpoint authorization

### Phase 6: Frontend — Complete Overhaul
- Role-specific dashboards: Customer, Client, FMG, Carrier
- Policy browsing and purchase flow
- Claim timeline visualization
- Premium UI with gradient AppBar

### Phase 7: Docker & Deployment
- Add `GEMINI_API_KEY` env var
- Final `docker-compose up --build`

---

## Seeded Test Users
| Username | Password | Role |
|---|---|---|
| customer | customer123 | ROLE_CUSTOMER |
| client | client123 | ROLE_CLIENT |
| fmg | fmg123 | ROLE_FMG |
| carrier | carrier123 | ROLE_CARRIER |

---

## Verification Plan
1. Login as each of the 4 roles
2. Carrier → Create policy
3. Customer → Purchase policy
4. Client → Approve purchase
5. Customer → Submit claim
6. Client → Approve claim → FMG
7. FMG → Process (OCR+Rules+AI) → Approve → Carrier
8. Carrier → Approve payment
9. Customer → View timeline → Download PDF
