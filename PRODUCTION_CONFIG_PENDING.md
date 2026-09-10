# PRODUCTION_CONFIG_PENDING: Checklist Triển Khai Production (Issue #17)

> **Trạng thái:** Code, Edge Functions, Database Migrations và Automated Tests đã hoàn thiện 100%.  
> Để hệ thống vận hành thực tế trên môi trường live, Owner cần cung cấp hoặc cấu hình các thông tin bí mật (secrets) và liên kết tài khoản dịch vụ bên thứ ba theo danh sách dưới đây.

---

## 1. Supabase Production Project (`dkvkhysnabhtbbuvommu`)

* **Supabase Project URL:** `https://dkvkhysnabhtbbuvommu.supabase.co`
* **Vị trí cấu hình:** Supabase Dashboard -> Project Settings -> API & Edge Functions

### Các bước Owner cần thực hiện:

- [ ] **Chạy Migrations vào Database:**
  Truy cập **SQL Editor** trong Supabase Dashboard hoặc dùng Supabase CLI (`supabase db push`) để apply lần lượt 6 migrations hiện có:
  1. `supabase/migrations/20260908000001_auth_rbac_schema.sql`
  2. `supabase/migrations/20260908000002_booking_persistence_schema.sql`
  3. `supabase/migrations/20260908000003_otp_payment_schema.sql`
  4. `supabase/migrations/20260909000001_production_core_hardening.sql`
  5. `supabase/migrations/20260909000002_portfolio_cms_and_booking_concepts.sql`
  6. `supabase/migrations/20260910000001_production_payos_and_email_hardening.sql`

- [ ] **Lấy Public Anon Key cho Frontend:**
  - Lấy `anon` `public` key tại: *Project Settings -> API -> Project API keys*.
  - Điền vào file `.env` trên môi trường deploy (Vercel / Cloudflare Pages / VPS):
    ```bash
    VITE_SUPABASE_URL=https://dkvkhysnabhtbbuvommu.supabase.co
    VITE_SUPABASE_ANON_KEY=<your_project_anon_key>
    VITE_ENABLE_DEMO_MODE=false
    ```

- [ ] **Deploy Edge Functions:**
  Chạy lệnh deploy Edge Functions lên Supabase:
  ```bash
  npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu
  npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
  npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
  ```

---

## 2. Resend Email Provider (Transactional Emails & Auth)

* **Nhà cung cấp:** Resend ([resend.com](https://resend.com))
* **Vị trí cấu hình:** Resend Dashboard -> Domains & API Keys

### Các bước Owner cần thực hiện:

- [ ] **Tạo API Key Resend:**
  - Tạo key với quyền gửi email tại Resend Dashboard.
- [ ] **Xác thực Tên Miền (Domain Verification):**
  - Thêm domain `maisonmipa.io.vn` vào Resend.
  - Cấu hình các bản ghi DNS (SPF, DKIM, MX/Return-Path) theo hướng dẫn của Resend tại nhà cung cấp tên miền.
- [ ] **Cấu hình Secrets trong Supabase Edge Functions:**
  Chạy lệnh hoặc cấu hình trong Supabase Dashboard (*Edge Functions -> Secrets*):
  ```bash
  npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
  npx supabase secrets set EMAIL_FROM="Maison MIPA Memories <contact@maisonmipa.io.vn>" --project-ref dkvkhysnabhtbbuvommu
  npx supabase secrets set EMAIL_REPLY_TO="contact@maisonmipa.io.vn" --project-ref dkvkhysnabhtbbuvommu
  ```
- [ ] **Bật Custom SMTP / Resend trong Supabase Auth (Tùy chọn):**
  - Trong Supabase Dashboard -> *Authentication -> Email Templates*: có thể cấu hình SMTP server của Resend để email xác nhận tài khoản / quên mật khẩu dùng chung sender branded Maison MIPA.

---

## 3. payOS & Ngân Hàng ACB (Auto-Confirm Webhook)

* **Nhà cung cấp:** payOS ([payos.vn](https://payos.vn)) & Ngân hàng TMCP Á Châu (ACB)
* **Vị trí cấu hình:** payOS Dashboard -> Kênh thanh toán & Cài đặt Webhook

### Các bước Owner cần thực hiện:

- [ ] **Kết nối tài khoản ngân hàng ACB với payOS:**
  - Đăng nhập payOS Dashboard.
  - Thêm tài khoản ngân hàng thụ hưởng:
    * Ngân hàng: **Ngân hàng TMCP Á Châu (ACB)** (BIN: `970416`)
    * Số tài khoản ACB chính thức của studio.
    * Tên chủ tài khoản: `MAISON MIPA MEMORIES` (hoặc tên doanh nghiệp).
- [ ] **Lấy bộ API Credentials:**
  - Trong payOS Dashboard, copy:
    * `Client ID`
    * `API Key`
    * `Checksum Key`
- [ ] **Cài đặt Webhook URL trên payOS Dashboard:**
  - Điền URL Webhook của Supabase Edge Function:
    ```
    https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook
    ```
  - Bấm xác thực Webhook trên payOS để hoàn tất gắn webhook signature.
- [ ] **Lưu Secrets vào Supabase:**
  ```bash
  npx supabase secrets set PAYOS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
  npx supabase secrets set PAYOS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
  npx supabase secrets set PAYOS_CHECKSUM_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --project-ref dkvkhysnabhtbbuvommu
  ```
- [ ] **Cập nhật số tài khoản thật vào bảng `payment_settings`:**
  Chạy lệnh SQL trên Supabase (hoặc chỉnh sửa qua Admin Portal `/admin`):
  ```sql
  UPDATE public.payment_settings
  SET
    bank_code = 'ACB',
    bank_bin = '970416',
    bank_name = 'Ngân hàng TMCP Á Châu (ACB)',
    account_number = '<SO_TAI_KHOAN_ACB_THAT>',
    account_name = '<TEN_CHU_TAI_KHOAN>',
    active = true,
    is_default = true,
    updated_at = now()
  WHERE bank_code = 'ACB';
  ```

---

## 4. Kiểm tra E2E sau khi cấu hình

Sau khi Owner điền đầy đủ các thông số trên, tiến hành kiểm tra trên môi trường thật:

1. **Đăng ký tài khoản mới** bằng email thật -> nhận email xác thực branded Maison MIPA -> bấm verify thành công.
2. **Quên mật khẩu** -> nhận email reset -> truy cập `/auth/reset-password` -> đổi mật khẩu mới thành công.
3. **Đặt lịch chụp mới** -> hiển thị mã VietQR ACB với đúng số tiền cọc và nội dung `MIPA <code...>`.
4. **Chuyển khoản từ App ngân hàng** -> ACB báo nhận tiền -> payOS bắn signed webhook -> backend verify signature & checksum -> `payments.status` chuyển thành `PAID` -> nhận email thông báo xác nhận cọc thành công -> giao diện khách hàng tự động chuyển sang trang Hoàn tất kèm pháo hoa confetti.
