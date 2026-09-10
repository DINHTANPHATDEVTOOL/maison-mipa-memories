# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Checklist Triển Khai Production (Issue #17)

> **BẢN CẬP NHẬT CHÍNH XÁC (Sau Audit & Hiệu Chỉnh Từ Owner)**  
> **Trạng thái kỹ thuật hiện tại:**
> * **#17 Code preparation:** Đã hoàn tất (code, Edge Functions, migrations, test suites đều sẵn sàng để Owner audit).
> * **PR #17:** PR #20 trên branch `ai/issue-17-production-integrations` (giữ OPEN chờ Owner duyệt code).
> * **Migration #6 trên `main`:** Chưa (sẽ được squash-merge sau khi hoàn tất kiểm tra và cấu hình).
> * **Supabase deploy:** Chưa.
> * **Resend thật:** Chưa.
> * **payOS thật:** Chưa.
> * **ACB webhook E2E:** Chưa.
>
> ⚠️ **LƯU Ý:** Chưa chạy checklist nguyên bản trên môi trường live ngay. Owner sẽ audit code trên PR trước, sau đó mới thực hiện các bước cấu hình bên dưới từng bước có kiểm soát.

---

## Bảng Đối Chiếu Cấu Hình Chuẩn Xác

| Dịch vụ / Tham số | Giá trị chuẩn xác | Ghi chú quan trọng |
|---|---|---|
| **Ngân hàng** | **ACB** (Ngân hàng TMCP Á Châu) | BIN: `970416` |
| **Tên chủ tài khoản** | **`DINH TAN PHAT`** | ❌ **Tuyệt đối KHÔNG dùng** `MAISON MIPA MEMORIES` vì tài khoản ngân hàng thực tế đứng tên cá nhân. Nếu tên không khớp, ACB/payOS sẽ từ chối xác thực kênh thanh toán. |
| **Email Sender (From)** | `Maison MIPA Memories <no-reply@maisonmipa.io.vn>` | Yêu cầu domain `maisonmipa.io.vn` đã verify DNS trên Resend. |
| **Email Reply-To** | **`maisonmipamemories@gmail.com`** | ❌ **Không dùng** `contact@maisonmipa.io.vn` do mailbox này chưa tồn tại trên thực tế. |
| **Supabase Auth SMTP** | `Supabase → Authentication → Emails → SMTP Settings` | ❌ **Không nhầm với Email Templates** (chỉ dùng sửa HTML). Phải cấu hình custom SMTP của Resend vì SMTP mặc định của Supabase bị giới hạn (rate-limited) và không dùng cho production. |
| **Edge Function `payment-webhook`** | `verify_jwt = false` (`--no-verify-jwt`) | payOS gọi webhook từ Internet, không có Supabase JWT. Phải tắt platform JWT check để Supabase không chặn 401; handler tự verify signature qua HMAC-SHA256 với `PAYOS_CHECKSUM_KEY`. |
| **Edge Function `create-payos-link`** | `verify_jwt = true` | Bắt buộc xác thực user session; backend tự lấy booking/amount từ database, client không được truyền amount tự do. |
| **Edge Function `send-email`** | `verify_jwt = true` (Private Internal) | Chỉ phục vụ backend worker / service role / outbox trigger, không cho phép client public gọi tùy ý. |

---

## 1. Supabase Production Project (`dkvkhysnabhtbbuvommu`)

* **Project URL:** `https://dkvkhysnabhtbbuvommu.supabase.co`
* **File cấu hình:** [`supabase/config.toml`](file:///c:/Users/phatd/Downloads/maison-mipa-memories-main/supabase/config.toml)

### Các bước Owner triển khai:

1. **Apply Migrations vào Database:**
   Chạy lần lượt 6 migrations hiện có thông qua **Supabase Dashboard → SQL Editor** hoặc Supabase CLI (`supabase db push`):
   1. `supabase/migrations/20260908000001_auth_rbac_schema.sql`
   2. `supabase/migrations/20260908000002_booking_persistence_schema.sql`
   3. `supabase/migrations/20260908000003_otp_payment_schema.sql`
   4. `supabase/migrations/20260909000001_production_core_hardening.sql`
   5. `supabase/migrations/20260909000002_portfolio_cms_and_booking_concepts.sql`
   6. `supabase/migrations/20260910000001_production_payos_and_email_hardening.sql` *(chứa logic thứ tự sequence `order_code` và cấu hình tài khoản ACB `DINH TAN PHAT`)*

2. **Deploy Edge Functions với đúng JWT Flags:**
   ```bash
   # payment-webhook: Tắt verify_jwt vì payOS không gửi Supabase user JWT
   npx supabase functions deploy payment-webhook --no-verify-jwt --project-ref dkvkhysnabhtbbuvommu

   # create-payos-link: Bật verify_jwt, backend lấy authoritative payment từ DB
   npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu

   # send-email: Private service chỉ cho internal / service role gọi
   npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
   ```

3. **Lấy Public Anon Key cho Frontend:**
   * Lấy tại: *Project Settings → API → Project API keys (`anon` `public`)*.
   * Điền vào file `.env` trên môi trường deploy frontend:
     ```bash
     VITE_SUPABASE_URL=https://dkvkhysnabhtbbuvommu.supabase.co
     VITE_SUPABASE_ANON_KEY=<your_project_anon_key>
     VITE_ENABLE_DEMO_MODE=false
     ```

---

## 2. Resend Email & Supabase Auth SMTP

* **Nhà cung cấp:** Resend ([resend.com](https://resend.com))

### Các bước Owner triển khai:

1. **Xác thực Tên Miền trên Resend:**
   * Thêm domain `maisonmipa.io.vn` vào Resend Dashboard.
   * Cấu hình các bản ghi DNS (SPF, DKIM, MX/Return-Path) tại nhà cung cấp tên miền cho đến khi Resend báo `Verified`.

2. **Cấu hình Custom SMTP cho Supabase Auth:**
   * Truy cập: **Supabase Dashboard → Authentication → Emails → SMTP Settings**.
   * Bật **Enable Custom SMTP**.
   * Nhập thông số:
     * **Sender email:** `no-reply@maisonmipa.io.vn`
     * **Sender name:** `Maison MIPA Memories`
     * **Host:** `smtp.resend.com`
     * **Port:** `465` (hoặc `587`)
     * **Username:** `resend`
     * **Password:** `<RESEND_API_KEY>`

3. **Cấu hình Secrets cho Supabase Edge Functions:**
   ```bash
   npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
   npx supabase secrets set EMAIL_FROM="Maison MIPA Memories <no-reply@maisonmipa.io.vn>" --project-ref dkvkhysnabhtbbuvommu
   npx supabase secrets set EMAIL_REPLY_TO="maisonmipamemories@gmail.com" --project-ref dkvkhysnabhtbbuvommu
   ```

---

## 3. payOS & Ngân Hàng ACB (Auto-Confirm Webhook)

* **Nhà cung cấp:** payOS ([payos.vn](https://payos.vn)) & Ngân hàng ACB

### Các bước Owner triển khai:

1. **Liên kết tài khoản ACB trên payOS Dashboard:**
   * Thêm kênh thanh toán:
     * Ngân hàng: **Ngân hàng TMCP Á Châu (ACB)** (BIN: `970416`)
     * Số tài khoản: Số tài khoản ACB thực tế của Owner.
     * Tên chủ tài khoản: **`DINH TAN PHAT`** *(phải trùng khớp 100% với tên mở tại ACB)*.

2. **Cài đặt Webhook URL trên payOS Dashboard:**
   * Điền Webhook URL:
     ```
     https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook
     ```
   * Bấm nút xác thực webhook trên payOS.

3. **Lưu Secrets vào Supabase:**
   ```bash
   npx supabase secrets set PAYOS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
   npx supabase secrets set PAYOS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
   npx supabase secrets set PAYOS_CHECKSUM_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
   ```

4. **Cập nhật số tài khoản thật vào bảng `payment_settings`:**
   Chạy câu lệnh SQL trên Supabase (hoặc chỉnh sửa qua Admin Portal `/admin`):
   ```sql
   UPDATE public.payment_settings
   SET
     bank_code = 'ACB',
     bank_bin = '970416',
     bank_name = 'Ngân hàng TMCP Á Châu (ACB)',
     account_number = '<SO_TAI_KHOAN_ACB_THAT>',
     account_name = 'DINH TAN PHAT',
     active = true,
     is_default = true,
     updated_at = now()
   WHERE bank_code = 'ACB';
   ```

---

## 4. Kịch Bản Kiểm Thử E2E Sau Cấu Hình

Sau khi hoàn tất cấu hình bí mật trên:

1. **Đăng ký tài khoản mới** qua email thật → nhận email xác thực từ `no-reply@maisonmipa.io.vn` (Reply-To về `maisonmipamemories@gmail.com`) → bấm liên kết verify thành công.
2. **Quên mật khẩu** → nhận email reset branded Maison MIPA → truy cập `/auth/reset-password` → đặt mật khẩu mới thành công.
3. **Đặt lịch chụp mới** → giao diện hiển thị VietQR với số tiền cọc chuẩn từ DB, tên chủ tài khoản `DINH TAN PHAT`, nội dung chuyển khoản riêng biệt.
4. **Chuyển khoản test** từ ứng dụng ngân hàng → ACB ghi nhận → payOS gửi signed webhook tới Edge Function (`verify_jwt=false`) → handler verify HMAC-SHA256 checksum → `payments.status` chuyển thành `PAID` → nhận 1 email thông báo cọc duy nhất → giao diện khách hàng tự động chuyển sang trang Hoàn tất.
