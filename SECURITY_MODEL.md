# MAISON MIPA MEMORIES — SECURITY MODEL

> **Document type**: Security architecture reference  
> **Last updated**: 2026-09-17

---

## Authentication

- **Provider**: Supabase Auth (email + password)
- **Session management**: JWT tokens, managed by Supabase client
- **MFA**: Optional TOTP available for staff/admin roles
- **Root Owner**: Special root-owner flag stored in `auth.users.raw_user_meta_data` — cannot be impersonated or promoted via normal RBAC paths

---

## Role-Based Access Control (RBAC)

| Role | Portal | Capabilities |
|------|--------|-------------|
| `GUEST` | Public site only | View public pages, submit consultation request |
| `CUSTOMER` | CustomerPortal | View own bookings, select photos, view delivery |
| `STAFF` | StaffPortal (role-scoped) | Role-specific operations (PHOTOGRAPHER/EDITOR/MAKEUP/RECEPTIONIST) |
| `MANAGER` | ManagerDashboard | Full studio operations, deposit confirmation, delivery |
| `ADMIN` | AdminPortal | Studio configuration, catalog CRUD, team management |
| `ROOT_OWNER` | Admin + special tabs | All admin capabilities + security audit, root integrations |

---

## Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

### `bookings`
- Customers can `SELECT` only their own bookings (`customer_id = auth.uid()`)
- Staff/Manager/Admin can `SELECT` all bookings via service role
- Direct `INSERT/UPDATE/DELETE` from client is prohibited — all mutations go through RPCs

### `booking_photo_selections`
- `INSERT/UPDATE/DELETE` from `authenticated` role are **REVOKED**
- Customer selections must use `submit_photo_selection` RPC (`SECURITY DEFINER`)
- Customers can `SELECT` their own selection records

### `booking_proof_images`
- Customers can `SELECT` active proof images for their own bookings
- Staff/Manager can `SELECT/INSERT/UPDATE`

### `audit_logs`
- Append-only for authenticated roles
- `SELECT` restricted to ADMIN/ROOT_OWNER

---

## Authoritative RPCs (SECURITY DEFINER)

All state-mutating functions run as `SECURITY DEFINER` in the `public` schema:

| RPC | From Status | To Status | Notes |
|-----|------------|-----------|-------|
| `check_in_booking` | CONFIRMED | CHECKED_IN | — |
| `start_booking_shoot` | CHECKED_IN | SHOOTING | — |
| `complete_booking_shoot` | SHOOTING | SHOOT_COMPLETED | — |
| `submit_photo_selection` | AWAITING_SELECTION | EDITING | Server-enforced limit, idempotent |
| `reopen_photo_selection` | EDITING | AWAITING_SELECTION | Requires reason |
| `complete_booking_editing` | EDITING | READY_FOR_REVIEW | Fails-closed if 0 final files |
| `request_booking_revision` | READY_FOR_REVIEW | EDITING | Requires revision notes |
| `complete_booking` | DELIVERED | COMPLETED | — |
| `update_booking_status` | (general) | validated | Strict transition matrix |
| `confirm_booking_deposit` | CONSULTING | CONFIRMED | Manager-only |

---

## Google Drive Security

| Rule | Detail |
|------|--------|
| No root folder sharing | Drive root folder never shared with customers |
| No RAW folder sharing | `01_RAW` and `02_PROOFS` folders never shared with customers |
| Customer delivery | Only `03_FINAL` subfolder gets reader permission — scoped to customer email |
| Idempotency | Permission existence checked before grant (via Drive API `permissions.list`) |
| Compensation | If DB update fails post-permission-grant → auto-revoke attempt. If revoke fails → `NEEDS_RECONCILE` flag + audit log |

---

## Proof Image Security (photo-proof Edge Function)

- Proofs served via `supabase/functions/photo-proof/index.ts`
- Requires valid JWT (`Authorization: Bearer <token>`)
- Validates `auth.uid()` matches `bookings.customer_id` for the requested proof
- **RAW file filter**: Rejects `.cr2`, `.arw`, `.nef`, `.dng`, `.raw`, `.raf` extensions
- **Thumbnail sizing**: Returns controlled `=s1600` max dimension (not unbounded full-res)
- **Cache headers**: `Cache-Control: private, max-age=3600`, `X-Content-Type-Options: nosniff`

---

## Web Payment Runtime

> **ZERO web payment runtime in production.**

- No PayOS SDK loaded
- No VietQR generation
- No payment polling endpoints
- No payment success/failure pages
- Deposit confirmation is **manual manager action only** (bank transfer verification)
