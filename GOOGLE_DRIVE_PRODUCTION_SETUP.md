# Hướng Dẫn Thiết Lập Google Drive Customer Delivery Production (Issue #8)

Tài liệu hướng dẫn chi tiết dành cho Owner/Admin của **Maison MIPA Memories** để thiết lập hạ tầng Google Drive API, Google Cloud OAuth 2.0 và Supabase Edge Functions theo mô hình bảo mật fail-closed.

---

## 1. Mô Hình Tích Hợp (Architecture Overview)

```text
SHOOT_COMPLETED
    ↓
Edge Function (drive-delivery) tạo 1 folder:
    Maison MIPA Memories - Customer Deliveries (Root)
        └── <BOOKING_CODE> - Delivery (Child)
    ↓
Photographer / Editor mở folder upload ảnh
    ↓
Editor hoàn tất hậu kỳ -> READY_FOR_REVIEW
    ↓
Manager / Admin bấm "Giao ảnh cho khách"
    ↓
Backend cấp quyền Google Drive Reader trực tiếp cho Verified Customer Email
    ↓
Customer Portal hiện nút "Lấy ảnh"
    ↓
Manager có thể Thu Hồi Quyền (Revoke) bất cứ lúc nào
```

- **Quyền hạn tối thiểu (Least Privilege)**: Scope `https://www.googleapis.com/auth/drive.file`
- **Bảo mật tuyệt đối**: 
  - Không bao giờ cấp quyền `anyone-with-link`.
  - Toàn bộ token, client secrets lưu trữ tại **Supabase Secrets** (Server-side).
  - Không có bất kỳ Google secret nào lộ ra Frontend client bundle hay git.

---

## 2. Các Bước Thiết Lập Cho Owner

### Bước 1: Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Đăng nhập bằng tài khoản studio: `maisonmipamemories@gmail.com`.
3. Bấm **Select a project** → **New Project**.
4. Project name: `Maison MIPA Memories Delivery`.
5. Bấm **Create**.

### Bước 2: Bật Google Drive API
1. Vào menu **APIs & Services** → **Library**.
2. Tìm kiếm: `Google Drive API`.
3. Chọn Google Drive API và bấm **Enable**.

### Bước 3: Cấu Hình OAuth Consent Screen
1. Vào **APIs & Services** → **OAuth consent screen**.
2. Chọn User Type: **External** (hoặc Internal nếu dùng Google Workspace). Bấm **Create**.
3. Điền thông tin ứng dụng:
   - **App name**: `Maison MIPA Memories Delivery`
   - **User support email**: `maisonmipamemories@gmail.com`
   - **Developer contact information**: `maisonmipamemories@gmail.com`
4. Phần **Scopes**:
   - Bấm **Add or Remove Scopes**.
   - Thêm scope: `https://www.googleapis.com/auth/drive.file`
   - Bấm **Update**.
5. Phần **Test users** (nếu app ở trạng thái Testing):
   - Thêm email: `maisonmipamemories@gmail.com`
   - Bấm **Save and Continue**.

### Bước 4: Tạo OAuth 2.0 Credentials (Web Client)
1. Vào **APIs & Services** → **Credentials**.
2. Bấm **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Maison MIPA Supabase Integration`.
5. **Authorized JavaScript origins**:
   - `https://maisonmipa.io.vn`
   - `https://dkvkhysnabhtbbuvommu.supabase.co`
6. **Authorized redirect URIs**:
   - `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/google-drive-oauth`
   - `https://maisonmipa.io.vn/oauth/callback`
   - `https://developers.google.com/oauthplayground` *(để lấy refresh token ban đầu)*
7. Bấm **Create**.
8. Lưu lại:
   - `Client ID` (dạng `xxxx.apps.googleusercontent.com`)
   - `Client Secret` (dạng `GOCSPX-xxxx`)

---

### Bước 5: Lấy Refresh Token Offline Bảo Mật
Cách nhanh và chuẩn xác nhất:
1. Mở [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Bấm vào biểu tượng **bánh răng** (OAuth 2.0 configuration) ở góc trên bên phải:
   - Tích chọn: **Use your own OAuth credentials**.
   - Điền **OAuth Client ID** và **OAuth Client secret** vừa tạo ở Bước 4.
3. Ở cột bên trái (Step 1 - Select & authorize APIs):
   - Kéo xuống tìm **Drive API v3** → chọn `https://www.googleapis.com/auth/drive.file`.
   - Bấm **Authorize APIs**.
4. Đăng nhập bằng `maisonmipamemories@gmail.com` và bấm **Cho phép (Allow)**.
5. Ở Step 2 (Exchange authorization code for tokens):
   - Tích chọn: **Auto-refresh the token before it expires**.
   - Bấm **Exchange authorization code for tokens**.
6. Sao chép chuỗi **Refresh token** (dạng `1//0xxxx...`).

---

### Bước 6: Tạo Thư Mục Gốc Trên My Drive (Root Folder)
1. Mở [Google Drive](https://drive.google.com) với tài khoản `maisonmipamemories@gmail.com`.
2. Tạo thư mục mới có tên:  
   `Maison MIPA Memories - Customer Deliveries`
3. Mở thư mục đó ra, nhìn vào thanh địa chỉ trình duyệt:  
   `https://drive.google.com/drive/folders/<ROOT_FOLDER_ID>`
4. Copy chuỗi `<ROOT_FOLDER_ID>`.

---

### Bước 7: Cài Đặt Secrets Trên Supabase Production
Mở Terminal và chạy lệnh:
```bash
npx supabase secrets set GOOGLE_DRIVE_CLIENT_ID="<CLIENT_ID_BUOC_4>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set GOOGLE_DRIVE_CLIENT_SECRET="<CLIENT_SECRET_BUOC_4>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set GOOGLE_DRIVE_REFRESH_TOKEN="<REFRESH_TOKEN_BUOC_5>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set GOOGLE_DRIVE_ROOT_FOLDER_ID="<ROOT_FOLDER_ID_BUOC_6>" --project-ref dkvkhysnabhtbbuvommu
```
*(Hoặc vào Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** để nhập trực tiếp).*

---

### Bước 8: Deploy Edge Functions Lên Supabase
```bash
npx supabase functions deploy drive-delivery --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy google-drive-oauth --project-ref dkvkhysnabhtbbuvommu
```

---

### Bước 9: Apply Migration Database
Chạy trong Supabase Dashboard → **SQL Editor**:
File: `supabase/migrations/20260912000001_booking_deliveries_google_drive.sql`

---

## 3. Kịch Bản Kiểm Thử E2E Live Sau Khi Cấu Hình

Sau khi Owner điền Secrets và Deploy, chạy chuỗi kiểm thử E2E:
1. **Buổi chụp hoàn tất**:
   - Booking chuyển sang `SHOOT_COMPLETED`.
   - Backend tự động tạo thư mục con `<BOOKING_CODE> - Delivery` dưới thư mục gốc.
   - Thư mục được đặt tên đúng chuẩn (không chứa tên/SĐT khách hàng).
2. **Staff upload**:
   - Photographer/Editor được phân công mở thư mục qua nút *"Mở Thư Mục Upload Ảnh"*.
   - Khách hàng đăng nhập vào `/account` **CHƯA THẤY** bất kỳ link ảnh nào (Timeline dừng ở bước 6).
3. **Quản lý giao ảnh**:
   - Editor bấm hoàn tất hậu kỳ (`READY_FOR_REVIEW`).
   - Manager bấm nút *"Giao Ảnh Cho Khách"*.
   - Google Drive API cấp quyền `role = reader`, `type = user` cho đúng email đã verified của khách.
   - Hệ thống tự động gửi 1 email duy nhất: *"Ảnh của bạn đã sẵn sàng — Maison MIPA Memories"*.
4. **Khách hàng lấy ảnh**:
   - Khách hàng truy cập `/account`, thấy Timeline bước 8 tích xanh và nút *"Lấy Ảnh Google Drive"*.
   - Bấm vào mở đúng thư mục ảnh cá nhân.
   - Khách hàng khác hoặc tài khoản Google khác truy cập link này sẽ nhận thông báo **Access Denied (403)** từ Google.
5. **Thu hồi quyền (Revoke)**:
   - Manager bấm *"Thu Hồi Quyền Lấy Ảnh Của Khách"*.
   - Nút *"Lấy Ảnh"* trên giao diện khách biến mất ngay lập tức.
   - Quyền reader trên Google Drive bị xóa bỏ, file ảnh của studio vẫn nguyên vẹn.
