# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Checklist Triển Khai Production (Issue #17)

> **BẢN CẬP NHẬT CHÍNH XÁC (Sau Audit Toàn Diện & Sửa Lỗi Schema Migrations)**  
> **Trạng thái kỹ thuật hiện tại:**
> * **#17 Code Preparation:** `CODE_READY` (toàn bộ code frontend, Edge Functions, migrations 1..6, schema verification script và test suites đã hoàn tất 100%).
> * **PR #17:** PR #20 trên branch `ai/issue-17-production-integrations` (giữ trạng thái `PRODUCTION_CONFIG_PENDING` cho đến khi Owner thực hiện các bước triển khai live).
> * **Supabase Production Project Ref:** `dkvkhysnabhtbbuvommu`
> * **Production Domain:** `https://maisonmipa.io.vn`
>
> ⚠️ **LƯU Ý:** Do Supabase project `dkvkhysnabhtbbuvommu` là môi trường production thật và đòi hỏi quyền truy cập tài khoản Supabase / Resend / payOS của Owner, các hành động cấu hình live được gắn nhãn `[OWNER_ACTION_REQUIRED]`.

---

## Bảng Đối Chiếu Cấu Hình Chuẩn Xác

| Dịch vụ / Tham số | Giá trị chuẩn xác | Ghi chú quan trọng |
|---|---|---|
| **Supabase Project Ref** | `dkvkhysnabhtbbuvommu` | `https://dkvkhysnabhtbbuvommu.supabase.co` |
| **Ngân hàng** | **ACB** (Ngân hàng TMCP Á Châu) | BIN: `970416` |
| **Tên chủ tài khoản** | **`DINH TAN PHAT`** | ❌ **Tuyệt đối KHÔNG dùng** `MAISON MIPA MEMORIES` vì tài khoản ngân hàng thực tế đứng tên cá nhân. Nếu tên không khớp, ACB/payOS sẽ từ chối xác thực. |
| **Email Sender (From)** | `Maison MIPA Memories <no-reply@maisonmipa.io.vn>` | Yêu cầu domain `maisonmipa.io.vn` đã verify DNS trên Resend (Owner đã xác nhận thành công). |
| **Email Reply-To** | **`maisonmipamemories@gmail.com`** | ❌ **Không dùng** `contact@maisonmipa.io.vn` do mailbox này chưa tồn tại trên thực tế. |
| **Supabase Auth SMTP** | `Supabase → Authentication → Emails → SMTP Settings` | ❌ **Không nhầm với Email Templates**. Cấu hình custom SMTP của Resend để gửi email kích hoạt và reset mật khẩu không bị giới hạn. |
| **Edge Function `payment-webhook`** | `verify_jwt = false` | Đã cấu hình trong `supabase/config.toml`. payOS gọi từ bên ngoài không có Supabase JWT. Handler tự verify chữ ký HMAC-SHA256 với `PAYOS_CHECKSUM_KEY`. |
| **Edge Function `create-payos-link`** | `verify_jwt = true` | Bắt buộc xác thực user session; backend tự lấy số tiền cọc từ DB, client không được truyền số tiền tự do. |
| **Edge Function `send-email`** | `verify_jwt = true` (Private Internal) | Chỉ phục vụ backend worker / service role / outbox trigger, không cho phép public client gọi tùy ý. |

---

## Checklist Triển Khai Dành Cho Owner (`[OWNER_ACTION_REQUIRED]`)

### Bước 1: Đăng nhập & Link Project Supabase Production
Mở terminal trên máy có cài Supabase CLI (hoặc dùng `npx supabase`):
```bash
# 1. Đăng nhập vào tài khoản Supabase của Owner
npx supabase login

# 2. Link với project production
npx supabase link --project-ref dkvkhysnabhtbbuvommu
```

---

### Bước 2: Đẩy toàn bộ Database Migrations (1 → 6)
Áp dụng toàn bộ 6 file migration theo thứ tự vào database trống của project `dkvkhysnabhtbbuvommu`:
```bash
npx supabase db push
```

> **Cách thay thế (Qua Supabase Dashboard SQL Editor):**  
> Nếu không dùng CLI, Owner có thể mở [Supabase SQL Editor](https://supabase.com/dashboard/project/dkvkhysnabhtbbuvommu/sql) và lần lượt copy-paste nội dung 6 file trong thư mục `supabase/migrations/`:
> 1. `20260908000001_auth_rbac_schema.sql`
> 2. `20260908000002_booking_persistence_schema.sql`
> 3. `20260908000003_otp_payment_schema.sql`
> 4. `20260909000001_production_core_hardening.sql`
> 5. `20260909000002_portfolio_cms_and_booking_concepts.sql`
> 6. `20260910000001_production_payos_and_email_hardening.sql`

---

### Bước 3: Xác minh Schema Sau Khi Migration
Sau khi chạy migration xong, chạy một trong hai cách sau để kiểm tra:

* **Cách 1 (Khuyên dùng - Supabase SQL Editor):**  
  Mở file [`scripts/verify-production-schema.sql`](scripts/verify-production-schema.sql), copy toàn bộ nội dung và dán vào **Supabase SQL Editor** rồi bấm **Run**.  
  Kết quả phải trả về danh sách tất cả 20 bảng, các ràng buộc và 15 hàm RPC đều có trạng thái **`PASS`**.

* **Cách 2 (Node.js CLI):**  
  ```bash
  npm run verify:schema
  ```
  Script sẽ kết nối trực tiếp đến Supabase và thông báo kết quả kiểm tra từng bảng.

---

### Bước 4: Deploy 3 Edge Functions Lên Production
Chạy các lệnh deploy sau:
```bash
# payment-webhook: Nhận webhook từ payOS (verify_jwt=false đã khai báo trong config.toml)
npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu

# send-email: Gửi email giao dịch qua Resend
npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu

# create-payos-link: Tạo link thanh toán / VietQR chuẩn payOS
npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
```

---

### Bước 5: Cấu hình Server-Side Secrets Trên Supabase
Chạy lệnh cấu hình secrets (thay thế bằng API key và secret thật của Owner):
```bash
# 1. Cấu hình Email Resend
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_FROM="Maison MIPA Memories <no-reply@maisonmipa.io.vn>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_REPLY_TO="maisonmipamemories@gmail.com" --project-ref dkvkhysnabhtbbuvommu

# 2. Cấu hình payOS
npx supabase secrets set PAYOS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_CHECKSUM_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
```

---

### Bước 6: Cấu hình Custom SMTP Cho Supabase Auth
1. Truy cập: **Supabase Dashboard → Authentication → Emails → SMTP Settings**.
2. Bật **Enable Custom SMTP**.
3. Điền thông tin SMTP từ Resend:
   * **Sender email:** `no-reply@maisonmipa.io.vn`
   * **Sender name:** `Maison MIPA Memories`
   * **Host:** `smtp.resend.com`
   * **Port:** `465` (hoặc `587`)
   * **Username:** `resend`
   * **Password:** `<RESEND_API_KEY>`

---

### Bước 7: Cập nhật Số Tài Khoản ACB Thật
Chạy câu lệnh sau trong Supabase SQL Editor (hoặc đăng nhập tài khoản Admin vào `/admin` để cập nhật):
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

---

### Bước 8: Cài đặt Webhook URL Trên payOS Dashboard
1. Đăng nhập vào [payos.vn](https://payos.vn).
2. Vào phần Cài đặt Webhook, điền URL:
   ```
   https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook
   ```
3. Bấm nút **Xác thực Webhook** trên payOS (payOS sẽ gửi request test và nhận phản hồi 200).

---

## 4. Kịch Bản Kiểm Thử E2E Sau Triển Khai Live

Chỉ đánh dấu Issue #17 hoàn tất khi chuỗi kiểm thử thực tế sau PASS trên production:

```text
1. Đăng ký tài khoản khách hàng mới trên https://maisonmipa.io.vn
   → Nhận email xác thực từ: Maison MIPA Memories <no-reply@maisonmipa.io.vn>
   → Reply-To trỏ về: maisonmipamemories@gmail.com
   → Bấm liên kết kích hoạt email thành công.

2. Quên mật khẩu
   → Nhận email reset mật khẩu
   → Truy cập https://maisonmipa.io.vn/auth/reset-password
   → Cập nhật mật khẩu mới thành công và đăng nhập lại.

3. Đặt lịch chụp (Booking Wizard)
   → Chọn gói chụp, dịch vụ thêm, ngày/giờ
   → Đến bước thanh toán: hiển thị VietQR với số tiền cọc chuẩn từ DB, tên chủ tài khoản DINH TAN PHAT.

4. Chuyển khoản thật từ App ngân hàng (10.000đ - 50.000đ test)
   → Tài khoản ACB nhận tiền
   → payOS phát hiện và gửi signed webhook tới Edge Function payment-webhook
   → payments.status = 'PAID'
   → booking_status = 'CONFIRMED' và payment_status = 'DEPOSIT_PAID'
   → Đúng 1 email xác nhận đặt lịch được gửi tới khách hàng
   → Màn hình khách hàng tự động cập nhật sang trạng thái Hoàn tất.
```
