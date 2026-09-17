# MAISON MIPA MEMORIES — PRODUCT FLOW

> **Document type**: Authoritative product specification  
> **Last updated**: 2026-09-17  
> **Status**: Production-certified

---

## Overview

Maison MIPA Memories is a **premium photography studio website** operating a consultation-first booking model. All customer journeys begin with a consultation request — no online payment is ever triggered on the client side.

---

## Customer Journey

### 1. Discovery & Exploration
Customer visits the public website:
- `/` — Homepage with editorial hero, featured concepts, testimonials
- `/dich-vu` — Service catalogue (Pre-wedding, Maternity, Portrait, etc.)
- `/bang-gia` — Transparent pricing packages
- `/portfolio` — Editorial portfolio & real client galleries
- `/concept` — Studio concepts & mood boards
- `/atelier` — Studio story, philosophy, team

### 2. Consultation Booking Request (BookingWizard)
Customer fills out the 6-step wizard:
1. **Service** — select service category
2. **Package** — select package tier
3. **Concept** — select concept/theme
4. **Date & Time** — select preferred date, time slot, studio room
5. **Add-ons & Contact** — add-ons, contact info, occasion, notes
6. **Review & Confirm** — reviews summary, submits request

**Final step wording**: "Yêu cầu tư vấn đã được gửi" + "Chi phí dự kiến: X đ"  
**Non-negotiable**: No PayOS, VietQR, payment QR, payment polling CTA.

### 3. Consultation (Studio-side)
- Manager receives `CONSULTATION_REQUESTED` booking in Operations Dashboard
- Manager schedules consultation, calls customer
- Booking transitions to `CONSULTING`
- Manager edits consultation date/time/notes
- Customer acknowledged via notification email

### 4. Manual Deposit Confirmation
- Manager confirms customer has transferred deposit offline (bank transfer)
- Manager enters deposit amount + note in "Xác nhận đã nhận cọc" modal
- Booking transitions to `CONFIRMED`

### 5. Customer Account — Shoot Preparation
Customer logs into `/tai-khoan`:
- Views upcoming shoot details, date, time, room
- Acknowledges schedule confirmation
- Receives shot concept notes

---

## Shoot-to-Delivery Workflow

### Stage 1: Check-in (CONFIRMED → CHECKED_IN)
- Receptionist or Manager confirms customer arrival
- `check_in_booking` RPC called
- Staff timeline begins

### Stage 2: Shoot (CHECKED_IN → SHOOTING → SHOOT_COMPLETED)
- Photographer confirms shoot start: `start_booking_shoot`
- Photographer completes shoot: `complete_booking_shoot`

### Stage 3: Proof Sync (SHOOT_COMPLETED → AWAITING_SELECTION)
- Photographer uploads RAW files to Google Drive `01_RAW` folder
- Manager/Staff clicks "Đồng bộ ảnh proof"
- System calls `drive-delivery` Edge Function with `SYNC_PROOFS`
- Proof images (JPG/PNG, no RAW) loaded into `booking_proof_images`
- Booking transitions to `AWAITING_SELECTION`
- Customer notified by email

### Stage 4: Customer Photo Selection (AWAITING_SELECTION → EDITING)
- Customer logs in, navigates to CustomerProofGallery
- Views proofs (served via authenticated `photo-proof` Edge Function)
- Selects photos up to `selection_limit` (= `packages.edited_photos_count`)
- Confirmation dialog: "Đã chọn: X / N ảnh (Tối đa N ảnh)"
- `submit_photo_selection` RPC called — atomic, server-enforced limit
- Booking transitions to `EDITING`, `selection_submitted_at` recorded

**Bypass option**: Manager can bypass customer selection with mandatory reason  
**Reopen option**: Manager can reopen selection (EDITING → AWAITING_SELECTION) with reason

### Stage 5: Post-production Editing (EDITING → READY_FOR_REVIEW)
- Editor uploads retouched finals to Drive `03_FINAL` folder
- Editor calls "Hoàn tất & sẵn sàng duyệt"
- `complete_booking_editing` RPC called (fails-closed if 0 final files)
- Booking transitions to `READY_FOR_REVIEW`

### Stage 6: Manager Review (READY_FOR_REVIEW)
- Manager reviews finals in Drive
- **Approve → Deliver**: triggers `drive-delivery` `MARK_READY`
  - Grants Google Drive reader permission on `03_FINAL` folder to customer email
  - Idempotency check before permission grant
  - Compensation: if DB update fails after permission grant, auto-revoke; if revoke fails → `NEEDS_RECONCILE` flag + audit log
  - Booking → `DELIVERED`
- **Request revision**: mandatory revision note → `EDITING`

### Stage 7: Delivery (DELIVERED → COMPLETED)
- Customer receives secure Drive link to `03_FINAL`
- Customer views delivered photos via "Xem ảnh hoàn thiện" link in CustomerPortal
- Manager marks booking COMPLETED after confirming customer received

---

## Core Business Rules

| Rule | Detail |
|------|--------|
| No web payment | No PayOS, VietQR, QR, payment polling on client |
| No RAW delivery | Customer never receives RAW files |
| No public Drive links | Drive links shared only via authenticated email to `03_FINAL` |
| Proof security | Proofs served via `photo-proof` Edge Function — authenticated, identity-scoped |
| Selection enforced server-side | `submit_photo_selection` RPC validates `1 ≤ count ≤ limit` |
| State machine | All transitions validated by `update_booking_status` RPC |
| Audit trail | All lifecycle mutations logged to `audit_logs` table |
