# Maison MIPA Memories — Production Observability & Telemetry Architecture

This document describes the observability, privacy, security, and reliability engineering standards implemented in **Maison MIPA Memories** (Issue #9 Hardening).

---

## 1. Observability Abstraction & Monitoring

The monitoring subsystem (`src/utils/monitoring.ts`) uses a vendor-agnostic adapter pattern, preventing hard vendor lock-in to any external SDK.

### Core Interface
- `monitoring.captureException(error, context)`: Captures unhandled runtime errors.
- `monitoring.captureMessage(message, level, context)`: Records application checkpoints.
- `monitoring.addBreadcrumb(breadcrumb)`: Captures lightweight step breadcrumbs for diagnosis.
- `monitoring.setUser(user)`: **Strictly limited to internal UUID and RBAC role (`id`, `role`)**. Never captures customer email, telephone, full name, or payment details.
- `monitoring.trackEvent(eventName, data)`: Operational telemetry.

### Fallback Behavior
When an external monitoring provider (e.g., Sentry) is not configured (e.g. `VITE_SENTRY_DSN` is empty or in local development), the system automatically routes all calls through the sanitized `NoopMonitoringAdapter`. The application never crashes or degrades if monitoring is unavailable.

---

## 2. Privacy Filter & PII Redaction Standards

All data logged to the browser console, passed to monitoring, or sent to analytics is sanitized via `src/utils/privacyFilter.ts`.

### Strict Secret Redaction
Keys matching any of the following patterns are unconditionally replaced with `[REDACTED_SECRET]`:
- `password`, `passphrase`
- `token`, `refresh_token`, `access_token`
- `service_role_key`, `client_secret`, `api_key`
- `authorization`, `bearer`, `cookie`
- `bank`, `account_number`, `credit_card`, `cvv`
- `otp`, `otp_code`

### Customer PII Masking
- **Email**: Masked to retain only the first and last character of the username plus the domain (e.g. `minhanh.nguyen@gmail.com` -> `m***n@gmail.com`).
- **Phone**: Masked to retain only the last 4 digits (e.g. `0966616546` -> `***-***-6546`).
- **Customer Notes**: Notes containing special requests or private comments are sanitized to `[REDACTED_NOTE]`.

---

## 3. Correlation ID Specification

To match client events, backend mutations, audit logs, and monitoring entries across distributed components, operations generate a structured correlation ID (`src/utils/correlationId.ts`):

```
mipa_<operation>_<timestamp36>_<random8>
```

Examples:
- `mipa_booking_create_lm481a_9f8a1c2d`
- `mipa_manual_deposit_confirm_lm481b_4b2c8e1f`
- `mipa_drive_provisioning_lm481c_7d9a3e5b`
- `mipa_proof_sync_lm481d_2f6a8c4e`
- `mipa_selection_submit_lm481e_8a1b5c7d`
- `mipa_final_delivery_lm481f_3e7a9b1c`

*Correlation IDs are non-sensitive identifiers and must never be used as authentication tokens or authorization credentials.*

---

## 4. Structured Client Logging

All production logging passes through `src/utils/logger.ts`:
- `logger.debug()`: Suppressed in production builds (`process.env.NODE_ENV === 'production'`).
- `logger.info()`: High-level milestone logging.
- `logger.warn()`: Non-critical anomalies or recovered states.
- `logger.error()`: Exceptions and service failures (payloads automatically run through `redactSensitiveData`).

---

## 5. Product Analytics (Consultation-First)

Maison MIPA uses a consultation-first booking model. All web payment tracking and checkout events (`payos`, `vietqr`, `deposit_paid`) have been deprecated and are strictly rejected at runtime.

### Allowed Events
- `page_view`, `view_service`, `view_package`, `view_portfolio`
- `select_service`, `select_package`, `select_concept`, `select_addon`
- `booking_started`, `slot_selected`, `booking_auth_required`
- `consultation_submitted`, `consultation_started_admin`
- `manual_deposit_confirmed_admin`, `booking_confirmed`
- `proof_gallery_opened`, `proof_selected`, `photo_selection_submitted`, `delivery_opened`

---

## 6. Safe Retry Policy & Idempotency Rules

Defined in `src/utils/retryPolicy.ts`:
1. **Safe Idempotent Reads**: Catalog fetching, studio availability checks, Drive folder existence checks, and email outbox status checks utilize exponential backoff with full jitter (max 3–4 attempts, delay capped at 3000ms).
2. **Transactional Mutations**: Deposit confirmation, customer photo selection submission, and booking status transitions **must NOT** be blindly retried without an idempotency key. Any retry attempt with `isIdempotent: false` is rejected immediately to prevent duplicate state corruption.

---

## 7. Security Headers & Content Security Policy (CSP)

Configured in `public/_headers` and `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `img-src 'self' data: blob: https:`
  - `font-src 'self' https://fonts.gstatic.com data:`
  - `connect-src 'self' https://*.supabase.co wss://*.supabase.co https:`
  - `frame-ancestors 'self'`
  - `object-src 'none'`
  - `base-uri 'self'`

---

## 8. Runtime Health & Config Diagnostics

The client-safe health utility (`src/utils/healthCheck.ts`) checks service availability without ever exposing configuration secrets:
- Supabase connectivity (`OK` / `NOT_CONFIGURED`)
- Demo mode state (`boolean`)
- Monitoring subsystem state (`ENABLED` / `DISABLED`)
- Browser session storage availability (`boolean`)
- Online / Offline connection status (`boolean`)
