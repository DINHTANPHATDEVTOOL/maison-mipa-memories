# PRODUCTION_RELEASE_STATUS: Booking Flow V2 Release Certification

> **PRODUCTION STATUS**: `[RELEASE_CERTIFIED]` | `[MIGRATION_HISTORY=VERIFIED]` | `[PRODUCTION_READY=YES]`
> **Verification Timestamp**: `2026-09-17T09:15:00Z` (16:15:00+07:00)
> **Authoritative Main SHA**: `69c40ee072b9b067fc7950e4a8170f299b49b201`
> **Supabase Project**: `dkvkhysnabhtbbuvommu` (AWS ap-southeast-1 Singapore)

---

## 1. Executive Summary

Maison MIPA Memories has officially activated **Booking Flow V2 (Consultation-First)** in production with **ZERO active customer online payment runtime**.

Customer Journey:
`CUSTOMER` → `CONSULTATION_REQUESTED` → `CONSULTING` → `ADMIN CONFIRMS DEPOSIT` → `CONFIRMED` → `CONFIRMATION EMAIL` → `GOOGLE DRIVE WORKSPACE` → `OPERATIONAL SHOOT FLOW`

All online payment dependencies (payOS, VietQR customer display, `createDepositPayment()`, payment polling, waiting screens) are permanently removed from customer runtime.

---

## 2. Migration Audit & History

- **Local Migrations**: 21
- **Remote Migrations**: 21
- **Diff**: `LOCAL_NOT_REMOTE = []`, `REMOTE_NOT_LOCAL = []`
- **Audit Tool**: `npx supabase migration list --project-ref dkvkhysnabhtbbuvommu`
- **Result**: `MIGRATION_HISTORY=VERIFIED` (100% 1:1 synchronization)

### Verified Migration Chain:
1. `20260908000001_auth_rbac_schema.sql`
2. `20260908000002_booking_persistence_schema.sql`
3. `20260908000003_otp_payment_schema.sql`
4. `20260909000001_production_core_hardening.sql`
5. `20260909000002_portfolio_cms_and_booking_concepts.sql`
6. `20260910000001_production_payos_and_email_hardening.sql`
7. `20260911000001_email_verification_hardening.sql`
8. `20260911000002_root_owner_rbac_hardening.sql`
9. `20260911000003_fix_booking_assignments_rls_recursion.sql`
10. `20260911000004_booking_package_service_harmony_and_rich_email.sql`
11. `20260911000005_fix_booking_concepts_display_order_and_columns.sql`
12. `20260911000006_fix_payments_columns_and_availability_rpc.sql`
13. `20260911000007_rich_email_payload_and_realtime_publication.sql`
14. `20260911000008_flexible_concepts_and_availability_grant.sql`
15. `20260911000009_sync_staff_profiles_to_employees.sql`
16. `20260911000010_seed_and_enhance_employees_table.sql`
17. `20260916000001_fix_create_booking_promotion_contract.sql`
18. `20260916000002_atomic_promotion_and_pricing_parity.sql`
19. `20260917000001_consultation_first_booking_flow.sql`
20. `20260917000002_google_drive_delivery.sql`
21. `20260917000003_audit_logs_actor_columns.sql`

---

## 3. Schema & RPC Verification

Verified via `npm run verify:schema`:
- **Tables (24/24 PASS)**: `profiles`, `services`, `packages`, `addons`, `studio_rooms`, `employees`, `promotions`, `bookings`, `booking_addons`, `booking_assignments`, `payments`, `payment_settings`, `notification_outbox`, `staff_tasks`, `concepts`, `portfolio_collections`, `portfolio_photos`, `booking_concepts`, `audit_logs`, `otp_challenges`, `root_owner_config`, `booking_deliveries`, `google_drive_integrations`, `google_drive_oauth_states`.
- **Contract Columns (6/6 PASS)**:
  - `addons.duration_minutes`
  - `promotions` (all voucher contract fields)
  - `packages.concepts_count`
  - `studio_rooms.active`
  - `bookings.deposit_fields` (`deposit_amount`, `deposit_confirmed_at`, `deposit_confirmed_by`, `deposit_note`)
  - `audit_logs.actor_columns` (`actor_id`, `actor_role`)
- **Core RPCs (10/10 EXISTS/REACHABLE)**:
  - `get_auth_role`, `get_auth_user_status`, `get_auth_staff_role`, `is_root_owner`
  - `create_booking`: Creates initial status `CONSULTATION_REQUESTED`, zero payment rows
  - `get_studio_booked_slots`: Excludes unconfirmed consultation requests; blocks confirmed bookings
  - `update_booking_consultation`: Authoritative package and pricing updates
  - `confirm_booking_deposit`: Role-enforced, atomic slot recheck, audit logging
  - `update_booking_status`: Operational stage transitions
  - `get_booking_delivery_secure`: Authenticated Drive metadata retrieval

---

## 4. Edge Functions & External Integrations

### A. Transactional Email (`send-email`)
- **Status**: `ACTIVE` (Version 8, deployed 2026-09-17)
- **Provider**: Resend API
- **Secrets**: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` configured
- **Idempotency**: Enforced via `idempotency_key = booking-confirmed:<booking_id>`
- **Template Content**: Authoritative booking code, package, concepts, addons, schedule, total amount, deposit received, remaining balance ($max(total - deposit, 0)$). Zero payment links.

### B. Google Drive Delivery (`drive-delivery` & `google-drive-oauth`)
- **Status**: `ACTIVE` (deployed 2026-09-17)
- **Integration**: Primary account `maisonmipamemories@gmail.com` connected
- **Root Folder**: `14VjLJJD5x-YYph6r6ZBOi32Sqaes_9uj`
- **Scope**: `https://www.googleapis.com/auth/drive.file`
- **Security**: Refresh token stored server-side only in `public.google_drive_integrations`. Customer reader access remains `ZERO` at `CONFIRMED` until final photo delivery (`DELIVERED`).

---

## 5. Live Production E2E Verification Evidence

Fresh verification executed directly on production database:
- **Test Booking**: `MIPA-260917-2DBD` (`id: b8bf89ea-561c-4d51-8442-94346137965f`)
- **Customer Smoke**: Initial status `CONSULTATION_REQUESTED`, payment rows count = 0.
- **Consultation Transition**: Transitioned to `CONSULTING`, upgraded to `MIPA SIGNATURE` package (total: `2,490,000 VND`).
- **Slot Semantics**: Preferred slot was simultaneously requestable by a second consultation without collision.
- **Deposit Confirmation**: Admin confirmed deposit of `500,000 VND` via bank transfer. Booking transitioned to `CONFIRMED`.
- **Slot Conflict Protection**: Attempting to confirm overlapping second booking was rejected with slot conflict error (`SLOT_CONFLICT_PROTECTION=PASS`).
- **Audit Logging**: Verified event recorded with `actor_id = 2d26a2f5-f258-4b3a-a395-d5fe90acb990` and `actor_role = ADMIN` (verifying PR #26).
- **Email Outbox**: `notification_outbox` event created with `remainingBalance: 1,990,000 VND`. Duplicate retry rejected (`CONFIRMATION_EMAIL_COUNT=1`).
- **Drive Intent**: `booking_deliveries` created with `status = NOT_CREATED` and `customer_permission_id = null`.
- **Operational Flow**: Successfully stepped through `CONFIRMED` → `CHECKED_IN` → `SHOOTING` → `SHOOT_COMPLETED` → `EDITING` → `READY_FOR_REVIEW`.
- **Legacy Compatibility**: Historical records with `PENDING_PAYMENT` and `DEPOSIT_PAID` load cleanly without crash.

---

## 6. Runtime Payment Network Audit

During Booking Flow V2 operations:
- `create_deposit_payment`: **0 calls**
- `mark_transfer_submitted`: **0 calls**
- `create-payos-link`: **0 calls**
- `payment-webhook`: **0 calls**
- `payOS API`: **0 calls**
- `VietQR generation`: **0 calls**

---

## 7. Legacy Components Notice

The following source files, database tables, and edge functions are retained exclusively for historical record preservation and must **NOT** be deployed or required by future operators:
- Edge Functions: `payment-webhook` (DELETED), `create-payos-link` (DELETED)
- Database Tables: `payments`, `payment_settings` (`LEGACY READ-ONLY ARCHIVE`)
- Frontend: `src/services/paymentService.ts` (`LEGACY`)

Operators must **never** configure payOS API keys or webhook URLs as prerequisites for Booking Flow V2.

---

## 8. Release Sign-off

- **PRODUCTION_READY**: `YES`
- **BLOCKERS**: `NONE`
