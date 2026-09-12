# Hướng Dẫn Thiết Lập Google Drive Customer Delivery Production (Issue #8)

Tài liệu hướng dẫn chi tiết dành cho Owner/Admin của **Maison MIPA Memories** để thiết lập hạ tầng Google Drive API, Google Cloud OAuth 2.0 và Supabase Edge Functions theo mô hình bảo mật fail-closed chuẩn production.

---

## 1. Mô Hình Tích Hợp (Architecture Overview)

```text
SHOOT_COMPLETED
    ↓
Database trigger (trg_booking_shoot_completed)
    ↓
Tạo bền vững bản ghi booking_deliveries (status = 'NOT_CREATED')
    ↓
Backend Edge Function (drive-delivery) nhận claim công việc:
    - Tìm kiếm hoặc tự động khởi tạo Root Folder:
      Maison MIPA Memories - Customer Deliveries (appProperties: delivery_root)
    - Tạo child folder:
      <BOOKING_CODE> - Delivery (appProperties: bookingId = <UUID>)
    - Trạng thái: READY_FOR_UPLOAD
    ↓
Photographer / Editor mở folder upload ảnh hoàn thiện
    ↓
Editor chuyển trạng thái -> READY_FOR_REVIEW
    ↓
Manager / Admin chọn "Giao ảnh cho khách" (MARK_READY)
    ↓
Backend kiểm tra authoritative auth.users:
    - email_confirmed_at IS NOT NULL
    - profiles.status = 'ACTIVE'
    - Cấp quyền Google Drive: role = reader, type = user (KHÔNG BAO GIỜ dùng anyone)
    - Trạng thái: READY_FOR_CUSTOMER
    - Gửi email thông báo duy nhất qua Resend Outbox (idempotency: drive-delivery-ready:<id>)
    ↓
Customer Portal hiện nút "Lấy Ảnh Google Drive"
    ↓
Manager / Admin có thể thu hồi quyền (Revoke) bất cứ lúc nào
```

### Nguyên Tắc Bảo Mật Cốt Lõi:
1. **Quyền hạn tối thiểu (Least Privilege)**: Duy nhất scope `https://www.googleapis.com/auth/drive.file`. Hệ thống chỉ truy cập các folder do app tạo ra, không truy cập bất kỳ file cá nhân nào khác trong Google Drive.
2. **Không bao giờ lộ Refresh Token**: Refresh token được lưu trữ an toàn server-side trong bảng `google_drive_integrations` (bảo vệ bằng RLS chỉ `service_role` truy cập) hoặc cấu hình qua Supabase Secrets. Tuyệt đối không xuất hiện ở Frontend, logs, hay query params.
3. **Phân quyền Staff (Operational Model)**:
   - *Option A (Chủ đạo)*: Studio Photographer/Editor đăng nhập tài khoản tác nghiệp studio (`maisonmipamemories@gmail.com`) trên máy trạm studio.
   - *Option B (Phân quyền cá nhân)*: Backend hỗ trợ cấp quyền writer cho email Google của nhân sự được chỉ định khi cần.
4. **Fail-Closed & Idempotency**:
   - Sử dụng `appProperties` gắn với `bookingId` trên Google Drive để tìm kiếm chính xác, loại bỏ nguy cơ trùng lặp folder do timeout.
   - Mọi RPC lấy dữ liệu delivery đều qua `get_booking_delivery_secure(p_booking_id)` che giấu toàn bộ internal tokens/permission IDs.

---

## 2. Quy Trình Cấu Hình 8 Bước Cho Owner

### Bước 1: Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Đăng nhập bằng tài khoản Google Studio: `maisonmipamemories@gmail.com`.
3. Bấm **Select a project** → **New Project**.
4. Đặt tên: `Maison MIPA Memories Delivery`.
5. Bấm **Create**.

### Bước 2: Kích Hoạt Google Drive API
1. Vào menu **APIs & Services** → **Library**.
2. Tìm kiếm: `Google Drive API`.
3. Chọn và bấm **Enable**.

### Bước 3: Cấu Hình OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**.
2. Chọn User Type: **External** → Bấm **Create**.
3. Điền thông tin:
   - **App name**: `Maison MIPA Memories Delivery`
   - **User support email**: `maisonmipamemories@gmail.com`
   - **Developer contact information**: `maisonmipamemories@gmail.com`
4. Phần **Scopes**:
   - Bấm **Add or Remove Scopes**.
   - Chọn duy nhất: `https://www.googleapis.com/auth/drive.file`.
   - Bấm **Update**.
5. Phần **Test users** (trong giai đoạn Testing trước khi Publish):
   - Thêm email: `maisonmipamemories@gmail.com`.
   - Bấm **Save and Continue**.
6. *Lưu ý về Publishing State*: Sau khi kiểm thử thành công, Owner có thể bấm **Publish App** trong OAuth Consent Screen để token không bị hết hạn sau 7 ngày (chế độ Testing giới hạn refresh token 7 ngày đối với Google OAuth).

### Bước 4: Tạo OAuth 2.0 Client ID (Web Application)
1. Vào **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `Maison MIPA Production Web Client`.
4. **Authorized JavaScript origins**:
   - `https://maisonmipa.io.vn`
   - `https://dkvkhysnabhtbbuvommu.supabase.co`
5. **Authorized redirect URIs** (Chỉ nhập endpoint Edge Function chuẩn xác của server, không dùng redirect URI frontend tùy tiện):
   - `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/google-drive-oauth`
6. Bấm **Create** và lưu lại:
   - `Client ID` (dạng `xxxx.apps.googleusercontent.com`)
   - `Client Secret` (dạng `GOCSPX-xxxx`)

---

### Bước 5: Cấu Hình Secrets Trên Supabase
Chạy lệnh Supabase CLI hoặc vào Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

```bash
supabase secrets set \
  GOOGLE_DRIVE_CLIENT_ID="<YOUR_CLIENT_ID>" \
  GOOGLE_DRIVE_CLIENT_SECRET="<YOUR_CLIENT_SECRET>" \
  GOOGLE_DRIVE_REDIRECT_URI="https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/google-drive-oauth"
```

*(Lưu ý: Không bắt buộc set `GOOGLE_DRIVE_ROOT_FOLDER_ID` vì hệ thống sẽ tự động khởi tạo và gắn `appProperties: delivery_root`).*

---

### Bước 6: Kết Nối Tài Khoản Google Qua Production OAuth Flow
Thay vì dùng OAuth Playground thủ công:
1. Đăng nhập vào trang quản lý với quyền Admin:
   `https://maisonmipa.io.vn/management`
2. Tại khu vực cấu hình Google Drive, Admin bấm **"Kết Nối Google Drive Studio"**.
3. Hệ thống sinh one-time anti-CSRF token và điều hướng đến màn hình đăng nhập Google Accounts.
4. Đăng nhập bằng `maisonmipamemories@gmail.com` và bấm **Cho phép (Allow)**.
5. Google chuyển hướng về Edge Function:
   `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/google-drive-oauth?code=...&state=...`
6. Server tự động:
   - Xác thực state chống giả mạo CSRF.
   - Đổi mã lấy refresh token và lưu an toàn vào `google_drive_integrations` (service_role).
   - Tự động tạo thư mục gốc `Maison MIPA Memories - Customer Deliveries` với tag `delivery_root`.
   - Chuyển hướng Admin an toàn về `https://maisonmipa.io.vn/management?drive=connected`.
   - Refresh token không bao giờ xuất hiện trên trình duyệt của Admin.

---

### Bước 7: Áp Dụng Database Migration
Vào **Supabase SQL Editor** trên Dashboard và chạy nội dung file:
`supabase/migrations/20260912000001_booking_deliveries_google_drive.sql`

Kiểm tra trạng thái bằng lệnh:
```bash
npm run verify:schema
```

---

### Bước 8: Kiểm Thử Thực Tế (Smoke Test)
1. Tạo một đơn booking thử nghiệm và chuyển trạng thái sang `SHOOT_COMPLETED`.
2. Kiểm tra `booking_deliveries` hiển thị thư mục `<BOOKING_CODE> - Delivery`.
3. Chuyển sang `READY_FOR_REVIEW`.
4. Admin bấm **"Giao ảnh cho khách"** → Thư mục được chia sẻ quyền `reader` cho email khách hàng đã xác thực.
5. Kiểm tra email thông báo được gửi đi 1 lần duy nhất từ Resend Outbox.
6. Admin bấm **"Thu hồi quyền lấy ảnh"** → Quyền reader bị xóa, nút tải trên Customer Portal biến mất.
