# MAISON MIPA — Authoritative Business & Financial Metric Definitions

This document defines the formal calculations, denominators, and boundaries for all CRM, Operations, and Business Intelligence metrics in Maison MIPA.

---

## 1. Funnel & Consultation Metrics

### 1.1 Consultation Request
- **Definition**: A booking record created by a customer with initial status `CONSULTATION_REQUESTED`.
- **Authoritative Source**: `bookings.created_at` within reporting range `[start_at, end_at]`.

### 1.2 Consultation Conversion Rate
- **Definition**: Percentage of consultation requests within a cohort that progressed to `CONFIRMED` status.
- **Formula**:
  $$\text{Consultation Conversion Rate} = \frac{\text{Cohort Bookings that reached CONFIRMED or later}}{\text{Cohort Total Consultation Requests}} \times 100\%$$
- **Cohort Rule**: Denominator is strictly bookings created in the given date range. Progression is verified via `booking_status_history` or authoritative status $\ge \text{CONFIRMED}$.

### 1.3 Confirmed Booking
- **Definition**: Booking where customer consultation has completed, slot is scheduled, and initial deposit has been manually confirmed by staff (`deposit_amount > 0` and status $\in \{\text{CONFIRMED}, \text{CHECKED\_IN}, \dots, \text{COMPLETED}\}$).
- **Exclusions**: `CANCELLED` bookings are excluded from active confirmed counts.

### 1.4 Completed Booking
- **Definition**: Booking that has reached final state `COMPLETED` after final photo delivery and client handover.

---

## 2. Financial Ledger & Revenue Metrics

> **CRITICAL RULE**: `total_amount` is booking value, NOT proof of collected cash. The dashboard strictly distinguishes booking value from actual cash receipts.

### 2.1 Confirmed Booking Value (`BOOKING_VALUE_CONFIRMED`)
- **Definition**: Total contractual value of all operational bookings confirmed within the period.
- **Formula**:
  $$\text{Confirmed Booking Value} = \sum_{\text{bookings}} \text{total\_amount} \quad \text{where status} \in \{\text{CONFIRMED}, \text{CHECKED\_IN}, \dots, \text{COMPLETED}\}$$
- **Snapshot Rule**: Uses historical `total_amount` stored on the booking row, not current catalog pricing.

### 2.2 Completed Booking Value (`COMPLETED_BOOKING_VALUE`)
- **Definition**: Total value of bookings that have reached status `COMPLETED`.
- **Formula**:
  $$\text{Completed Booking Value} = \sum_{\text{bookings}} \text{total\_amount} \quad \text{where status} = \text{'COMPLETED'}$$

### 2.3 Deposit Confirmed (`DEPOSIT_CONFIRMED`)
- **Definition**: Sum of manual deposit collections confirmed by staff.
- **Formula**:
  $$\text{Deposit Confirmed} = \sum_{\text{transactions}} \text{amount} \quad \text{where transaction\_type} = \text{'DEPOSIT' and direction} = \text{'IN'}$$
- **Idempotency**: Seeded and synchronized with deterministic key `booking-deposit:<booking_id>` to ensure zero double-counting.

### 2.4 Actual Cash Received (`CASH_RECEIVED`)
- **Definition**: Net cash physically collected into studio accounts via internal receipts (deposits + remaining balances + additional charges minus refunds).
- **Formula**:
  $$\text{Cash Received} = \sum_{\text{IN}} \text{amount} - \sum_{\text{OUT}} \text{amount}$$
- **Authority**: Computed exclusively from `booking_financial_transactions`.

### 2.5 Outstanding Balance (`OUTSTANDING_BALANCE`)
- **Definition**: Remaining balance due across all active operational bookings.
- **Formula**:
  $$\text{Outstanding Balance} = \sum_{\text{active bookings}} \max(0, \text{total\_amount} - \text{net\_cash\_collected})$$
- **Guardrail**: Never negative. Over-collections are recorded as adjustments.

---

## 3. Customer Lifecycle & Retention Metrics

### 3.1 New Customer
- **Definition**: Customer whose first authoritative confirmed booking occurred within the selected period.

### 3.2 Returning Customer (`RETURNING_CUSTOMER`)
- **Definition**: Customer who has $\ge 2$ lifetime confirmed/completed bookings.
- **Formula**:
  $$\text{Repeat Customer Rate} = \frac{\text{Returning Customers with booking in period}}{\text{Total Unique Customers with booking in period}} \times 100\%$$

### 3.3 Customer Lifecycle Stages
- `NEW`: Account created or first consultation requested.
- `CONSULTATION`: Staff actively discussing concept, date, and packages.
- `QUALIFIED`: Customer agreed on concept and awaiting deposit confirmation.
- `BOOKED`: Deposit confirmed, shooting slot locked.
- `ACTIVE`: Currently in shoot or post-production delivery lifecycle.
- `DELIVERED`: Full high-res gallery delivered via Google Drive.
- `RETURNING`: Satisfied client returning for future photo sessions.
- `INACTIVE`: No interaction or booking within 180 days.

---

## 4. Studio Operations & Capacity Metrics

### 4.1 Studio Room Utilization (`STUDIO_UTILIZATION`)
- **Definition**: The proportion of available operating business hours that studio rooms were occupied by confirmed bookings.
- **Formula**:
  $$\text{Studio Utilization} = \frac{\sum \text{confirmed shoot duration (hours)}}{\text{Available Operating Hours (10h/day } \times \text{ days in period)}} \times 100\%$$
- **Note**: Operating window is 08:00 to 18:00 (10 hours daily) in `Asia/Ho_Chi_Minh` timezone. Unconfirmed requests do NOT count toward room occupancy.

### 4.2 Editing Turnaround
- **Definition**: Median time elapsed between `AWAITING_SELECTION` (proof images uploaded) and `READY_FOR_REVIEW` / `DELIVERED`.
- **Source**: Timestamps from `booking_status_history` and `booking_deliveries`.

---

## 5. Timezone & Boundary Enforcement
All reporting dates and filters strictly adhere to `Asia/Ho_Chi_Minh` (UTC+7). Midnight boundaries ($00:00:00$ to $23:59:59.999$) are computed in UTC+7 before converting to ISO strings for database queries.
