# Maison MIPA Memories — Production Incident Response Runbook

This runbook provides actionable standard operating procedures (SOPs) for resolving production anomalies without causing data corruption or customer friction.

---

## 1. Supabase Database Connectivity Outage

### Symptoms
- UI displays top-level `ErrorBoundary` fallback ("Maison MIPA gặp sự cố khi tải trang") or OfflineBanner.
- Client logs report `NETWORK_DISCONNECTED` or PostgreSQL connection timeouts.
- Booking and catalog pages fail to load.

### How to Identify
1. Check Supabase cloud status dashboard (AWS ap-southeast-1 region).
2. Inspect `getSystemHealthReport()` on client console: `supabase: 'NOT_CONFIGURED'` or connection timeout.
3. Check PostgreSQL connection pool metrics in Supabase dashboard.

### Customer Impact
- Guest users cannot view dynamic concepts or submit consultation requests.
- Staff and managers cannot update booking statuses.

### Safe Recovery
1. Verify Supabase compute pool is healthy. If pooler exhausted, restart Supabase connection pooler.
2. Ensure client offline banner is showing informative retry guidance.
3. Once connectivity recovers, advise users to click "Thử lại".

### What NOT To Do
- **DO NOT** run ad-hoc raw SQL scripts or bypass RLS policies directly in production.
- **DO NOT** reset database migrations.

---

## 2. Google Drive OAuth Token Revocation or Expiry

### Symptoms
- Booking confirmations succeed in database, but Drive folder provisioning fails (`driveFolderStatus = 'ERROR'`).
- Staff or manager sees warning: "Thao tác Google Drive chưa hoàn thành."
- Edge function `drive-delivery` logs `invalid_grant` or `401 Unauthorized`.

### How to Identify
1. Inspect Edge Function logs for `google-drive-oauth` and `drive-delivery`.
2. Check `google_drive_integrations` table in Supabase for status: `REAUTH_REQUIRED`.

### Customer Impact
- Booking confirmation remains **ACTIVE and CONFIRMED** (booking is NOT reverted).
- Subfolders (`01_RAW`, `02_PROOFS`, `03_FINAL`) are temporarily delayed.

### Safe Recovery
1. Studio Admin navigates to `/admin` or initiates Google OAuth re-authentication via the authorized studio account.
2. In Studio Manager Dashboard, click **"Thử tạo lại thư mục"** / **"Đồng bộ lại Drive"**. This action is completely idempotent and will create only missing subfolders without duplicating assets.

### What NOT To Do
- **DO NOT** cancel or delete customer bookings due to Drive provisioning issues.
- **DO NOT** share raw personal Drive links with customers directly.

---

## 3. Google Drive Quota / Rate Limit Exceeded

### Symptoms
- Batch proof photo synchronization fails with HTTP 403 / 429 (`User Rate Limit Exceeded`).
- Manager dashboard displays `DRIVE_OPERATION_FAILED` with retryable flag.

### How to Identify
1. Check Google Cloud Console API quotas for Google Drive API v3.
2. Inspect client logs for AppError with category `DRIVE`.

### Customer Impact
- Uploaded proofs take longer to populate in customer proof selection gallery.

### Safe Recovery
1. Wait 5–10 minutes for Google API rate limit quota window to reset.
2. Use exponential backoff retry in photoWorkflowService (`withSafeRetry`).
3. Re-trigger "Đồng bộ lại Drive" from Studio Manager.

### What NOT To Do
- **DO NOT** spam manual sync repeatedly during an active quota backoff window.

---

## 4. Transactional Email (Resend) Provider Outage

### Symptoms
- Bookings confirmed successfully, but confirmation emails are delayed.
- `notification_outbox` contains rows with `status = 'FAILED'` or `status = 'PENDING'`.

### How to Identify
1. Query `notification_outbox`:
   ```sql
   SELECT id, event_type, status, retry_count, last_error FROM notification_outbox WHERE status = 'FAILED';
   ```
2. Check Resend status page (https://status.resend.com).

### Customer Impact
- Customer does not immediately receive the rich HTML confirmation email.
- Booking status in customer portal remains valid and confirmed.

### Safe Recovery
1. The Edge Function `send-email` runs on an idempotent schedule and processes pending outbox rows with exponential backoff.
2. Rows with `retry_count < 5` will automatically retry once Resend service is restored.
3. Every email has a unique `idempotency_key` (format: `booking_confirmed_<booking_id>`), guaranteeing zero duplicate emails sent to customers.

### What NOT To Do
- **DO NOT** manually re-insert duplicate rows into `notification_outbox`.

---

## 5. Frontend Chunk Deploy Mismatch (Stale Assets)

### Symptoms
- Users navigating between routes after a new release encounter dynamic import error: `Failed to fetch dynamically imported module`.
- Browser console reports 404 on old hash chunk (e.g. `BookingPage-XXXX.js`).

### How to Identify
- Check `RouteErrorBoundary` activation: UI displays "Phiên bản trang vừa được cập nhật. Vui lòng tải lại trang để tiếp tục."

### Customer Impact
- User is prompted to refresh their page.

### Safe Recovery
- `RouteErrorBoundary` automatically offers a "Tải lại trang" action and protects against infinite reload loops (capped at 2 reloads, then navigates home).
- Hosting cache headers (`public/_headers` / `vercel.json`) ensure `index.html` is served with `no-cache` while hashed assets are cached immutably.

---

## 6. Studio Availability RPC Outage

### Symptoms
- Booking wizard step 3 displays: "Hệ thống đang bận hoặc có lỗi kết nối khi tải lịch phòng."
- `get_studio_booked_slots` RPC fails with 500 or 503.

### How to Identify
1. Test RPC directly in Supabase SQL editor:
   ```sql
   SELECT * FROM get_studio_booked_slots('2026-09-20', 'studio_01');
   ```
2. Check database CPU/memory usage.

### Customer Impact
- Customer cannot pick specific time slots during outage.
- Booking wizard fail-closed policy activates: does NOT display fake available slots.

### Safe Recovery
1. Investigate and resolve RPC lock or index congestion on `bookings` table.
2. User draft in BookingWizard is preserved in React state; user clicks "Thử lại".

### What NOT To Do
- **DO NOT** enable mock data in production or display fake slots.
