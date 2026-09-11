# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Checklist Triển Khai Production (Issue #17)

> **MIGRATION STATUS: RESOLVED & APPLIED TO PRODUCTION**
>
> Tất cả 6 migrations (từ `20260908000001` đến `20260910000001`) đã được apply thành công 100% lên Supabase Production Project `dkvkhysnabhtbbuvommu`.
> Lệnh `npm run verify:schema` đã xác nhận **20/20 bảng ứng dụng** tồn tại và sẵn sàng trên production database.
>
> Trạng thái hiện tại: `[CODE_READY]` | `[PRODUCTION_CONFIG_PENDING]`. PR #20 sẵn sàng sau khi Owner hoàn tất cấu hình Secrets và chạy thử E2E live.

---

## 1. Kết Quả Audit & Hotfix Migrations

1. **Migration #5 (`20260909000002_portfolio_cms_and_booking_concepts.sql`)**:
   - Thêm `DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);` trước khi khai báo function 12-argument mới với `p_concept_ids UUID[] DEFAULT '{}'`.
   - Loại bỏ wrapper 11-argument trùng lặp gây lỗi `SQLSTATE 42P13`.
   - Sửa `booking_addons` insert: dùng đúng các cột `(booking_id, addon_id, quantity, unit_price, line_total)` (không dùng cột `price`).
   - Sửa `audit_logs` insert: dùng đúng các cột `(actor_user_id, entity_type, entity_id, action, old_data, new_data)`.
   - Sửa UUID seeds: đổi `col00000-...` và `pho00000-...` sang chuẩn UUID hex hợp lệ `c2000000-...` và `c3000000-...`.

2. **Migration History Verification (`npx supabase migration list`)**:
   ```text
   Local            | Remote           | Time (UTC)
   -----------------|------------------|-----------------------
   20260908000001   | 20260908000001   | 2026-09-08 00:00:01
   20260908000002   | 20260908000002   | 2026-09-08 00:00:02
   20260908000003   | 20260908000003   | 2026-09-08 00:00:03
   20260909000001   | 20260909000001   | 2026-09-09 00:00:01
   20260909000002   | 20260909000002   | 2026-09-09 00:00:02
   20260910000001   | 20260910000001   | 2026-09-10 00:00:01
   ```

3. **Schema Verification (`npm run verify:schema`)**:
   - Đã kiểm tra qua PostgREST API trên live endpoint `https://dkvkhysnabhtbbuvommu.supabase.co`:
   - Kết quả: **20/20 bảng PASS** (`profiles`, `services`, `packages`, `addons`, `studio_rooms`, `employees`, `promotions`, `bookings`, `booking_addons`, `booking_assignments`, `payments`, `payment_settings`, `notification_outbox`, `staff_tasks`, `concepts`, `portfolio_collections`, `portfolio_photos`, `booking_concepts`, `audit_logs`, `otp_challenges`).

---

## 2. Các Bước Kế Tiếp Cho Owner (`[OWNER_ACTION_REQUIRED]`)

Do migrations đã được apply hoàn tất, Owner chỉ cần thực hiện các bước triển khai Edge Functions & Secrets:

### Bước 1: Deploy 3 Edge Functions
```bash
npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
```

### Bước 2: Thiết lập Server Secrets Trên Supabase
```bash
# Email (Resend)
npx supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_FROM="Maison MIPA Memories <no-reply@maisonmipa.io.vn>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_REPLY_TO="maisonmipamemories@gmail.com" --project-ref dkvkhysnabhtbbuvommu

# payOS
npx supabase secrets set PAYOS_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_API_KEY="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_CHECKSUM_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
```

### Bước 3: Cập nhật Số Tài Khoản ACB Thật
Chạy trong Supabase SQL Editor:
```sql
UPDATE public.payment_settings
SET
  bank_code = 'ACB',
  bank_bin = '970416',
  bank_name = 'Ngân hàng TMCP Á Châu (ACB)',
  account_number = '<SO_TAI_KHOAN_ACB_THAT_CUA_OWNER>',
  account_name = 'DINH TAN PHAT',
  active = true,
  is_default = true,
  updated_at = now()
WHERE bank_code = 'ACB';
```

### Bước 4: Đăng Ký Webhook Trên payOS Dashboard
- Vào [payos.vn](https://payos.vn) → Cài đặt Webhook
- URL: `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook`
- Bấm **Xác thực Webhook**.

---

## 3. Kịch Bản Kiểm Thử E2E Live Trước Khi Merge PR #20

Chỉ đánh dấu Issue #17 hoàn thành và merge PR #20 khi chuỗi flow thực tế sau PASS trên production:
```text
1. Đăng ký tài khoản mới trên https://maisonmipa.io.vn
   → Nhận email xác thực từ: Maison MIPA Memories <no-reply@maisonmipa.io.vn>
   → Bấm liên kết kích hoạt email thành công.
2. Quên mật khẩu → nhận email reset → đặt mật khẩu mới thành công.
3. Đặt lịch chụp (Booking Wizard) → hiển thị QR ACB VietQR.
4. Chuyển khoản thật test từ App ngân hàng (10.000đ - 50.000đ)
   → ACB nhận tiền → payOS gửi signed webhook
   → payments.status = 'PAID'
   → Nhận đúng 1 email xác nhận đặt cọc
   → Giao diện khách hàng tự động cập nhật sang trạng thái Hoàn tất.
```

