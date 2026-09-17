# MAISON MIPA MEMORIES — OPERATIONS WORKFLOW

> **Document type**: Studio operations reference  
> **Last updated**: 2026-09-17

---

## Studio Roles & Workspaces

| Role | Portal | Primary Duties |
|------|--------|----------------|
| Receptionist | ReceptionistPortal | Today's arrivals, check-in confirmation |
| Photographer | PhotographerPortal | Assigned shoots, start/complete shoot, Drive upload |
| Editor | EditorPortal | Hậu kỳ tasks, revision notes, complete editing |
| Manager | ManagerDashboard | Full operations control, deposit confirmation, delivery |
| Admin | AdminPortal | Studio config, catalog, team management |

---

## Operations Pipeline (9 Queues)

The ManagerDashboard Operations Pipeline shows 9 real-time queues:

```
① Sắp chụp     — CONFIRMED        — Upcoming scheduled shoots
② Check-in     — CHECKED_IN       — Customer arrived & checked in
③ Đang chụp    — SHOOTING         — Active shoot in progress
④ Sync ảnh     — SHOOT_COMPLETED  — Waiting for proofs upload & sync
⑤ Chọn ảnh    — AWAITING_SELECTION — Customer photo selection pending
⑥ Hậu kỳ      — EDITING          — Editor retouching in progress
⑦ Chờ duyệt   — READY_FOR_REVIEW — Awaiting manager approval
⑧ Đã giao     — DELIVERED        — Finals delivered to customer
⑨ Hoàn tất    — COMPLETED        — Fully completed booking
```

---

## Manager Action Flows

### Confirm Deposit
1. Click "Xác nhận đã nhận cọc" on consultation card
2. Enter deposit amount (VND) + note
3. System calls `confirm_booking_deposit` RPC → `CONFIRMED`
4. Customer receives confirmation email

### Sync Proofs (after photographer uploads to Drive)
1. Click "Đồng bộ ảnh proof" on shoot-completed booking
2. `drive-delivery` Edge Function called with `SYNC_PROOFS`
3. Non-RAW files loaded into `booking_proof_images`
4. Booking → `AWAITING_SELECTION`, customer notified

### Bypass Customer Selection
- Used when customer gives blanket approval (Studio selects)
- Requires mandatory written reason
- `update_booking_status` RPC → `EDITING` skipping `AWAITING_SELECTION`

### Reopen Selection
- If customer wants to change selections after submission
- Manager confirms with reason → `EDITING` → `AWAITING_SELECTION`
- Existing selections cleared by new `submit_photo_selection` call

### Request Revision (after READY_FOR_REVIEW)
- Manager reviews finals in Drive
- If unsatisfied: enter mandatory revision notes → `EDITING`
- Editor receives notification with revision notes highlighted

### Approve & Deliver Finals
1. Click "Duyệt & Giao ảnh" on READY_FOR_REVIEW booking
2. `drive-delivery` Edge Function called with `MARK_READY`
3. Google Drive reader permission granted on `03_FINAL` folder to customer email
4. Booking → `DELIVERED`
5. Delivery email sent to customer (idempotent: `booking-delivered:{id}`)

---

## Staff Assignment

Manager assigns crew via "Gán Kíp" modal on any booking:
- **PHOTOGRAPHER** — Lead photographer for the shoot
- **MAKEUP** — Hair & makeup artist
- **EDITOR** — Post-production retoucher

Each staff portal (Photographer/Makeup/Editor) shows **only their assigned bookings** (ABAC-filtered by `booking_assignments`).

---

## State Transition Matrix

```
CONSULTATION_REQUESTED
  ↓ (manager schedules)
CONSULTING
  ↓ (manual deposit confirmed)
CONFIRMED
  ↓ (check-in)
CHECKED_IN
  ↓ (photographer)
SHOOTING
  ↓ (photographer)
SHOOT_COMPLETED
  ↓ (sync proofs)
AWAITING_SELECTION ←──────────────────── (reopen selection)
  ↓ (customer selects)                              ↑
EDITING ──────────────────────────────────────────── (revision)
  ↓ (editor completes)                              ↑
READY_FOR_REVIEW ──────────────────────────────────┘
  ↓ (manager approves)
DELIVERED
  ↓ (manager closes)
COMPLETED

Any stage → CANCELLED (manager/admin only)
```

---

## Audit Log Events

All lifecycle mutations write to `audit_logs`:

| Event | Trigger |
|-------|---------|
| `SELECTION_SUBMITTED` | `submit_photo_selection` RPC |
| `BOOKING_STATUS_CHANGED` | Any `update_booking_status` call |
| `DEPOSIT_CONFIRMED` | `confirm_booking_deposit` |
| `DELIVERY_GRANTED` | `drive-delivery` MARK_READY success |
| `NEEDS_RECONCILE` | Drive delivery compensation failure |
