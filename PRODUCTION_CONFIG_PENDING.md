# PRODUCTION_CONFIG_PENDING — RESOLVED

Status:

[SUPERSEDED]
[RESOLVED]
[DO_NOT_USE_FOR_DEPLOYMENT]

Booking Flow V2 has been released to production.

Current authoritative production documentation:

[PRODUCTION_RELEASE_STATUS.md](./PRODUCTION_RELEASE_STATUS.md)

Current Booking Flow V2:

Customer
→ CONSULTATION_REQUESTED
→ CONSULTING
→ manual deposit confirmation by authorized admin
→ CONFIRMED
→ email
→ Google Drive workspace
→ operational shoot workflow

Web payment is no longer part of the active customer workflow.

The following components are legacy only:

- payment-webhook (LEGACY — DO NOT USE)
- create-payos-link (LEGACY — DO NOT USE)
- payOS (LEGACY — DO NOT USE)
- VietQR (LEGACY — DO NOT USE)
- payments (LEGACY — DO NOT USE FOR ACTIVE BOOKINGS)
- payment_settings (LEGACY — DO NOT USE FOR ACTIVE BOOKINGS)
- src/services/paymentService.ts (LEGACY — DO NOT USE)

Do not deploy or configure legacy payment integrations as a Booking Flow V2 prerequisite.

Historical payment data must remain preserved.

For current migration state, schema verification, integration status, and production evidence, use:

[PRODUCTION_RELEASE_STATUS.md](./PRODUCTION_RELEASE_STATUS.md)
