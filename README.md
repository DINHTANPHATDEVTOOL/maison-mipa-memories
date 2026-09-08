# Maison MIPA Memories 📸

> Studio Chụp Ảnh Phong Cách Pháp & Nền Tảng Đặt Lịch Online

![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![AI Code Review](https://img.shields.io/badge/AI%20Review-GPT--4o-00A67E?logo=openai)
![License](https://img.shields.io/badge/License-MIT-green)

Maison MIPA Memories là nền tảng web ứng dụng dành cho studio chụp ảnh phong cách Pháp ấm áp & tinh tế, tích hợp quy trình đặt lịch trực tuyến, quản lý lịch chụp, CRM khách hàng, và cổng thông tin dành cho Staff / Admin / Khách hàng.

---

## 🤖 Tích Hợp AI & GPT Code Review

Repository này được cấu hình sẵn để **GPT (ChatGPT, GitHub Actions, AI Agent)** có thể:
1. **Tự động Review Pull Request**: Thông qua [GitHub Actions AI Code Review](.github/workflows/ai-code-review.yml).
2. **Thao tác quyền đầy đủ (Đọc, Commit, Tạo PR, Merge)**: Cấp quyền qua GitHub Fine-grained Personal Access Token.
3. **Tương tác trực tiếp qua CodeRabbit AI hoặc ChatGPT web**.

👉 **Xem hướng dẫn chi tiết tại**: [GPT_INTEGRATION_GUIDE.md](GPT_INTEGRATION_GUIDE.md)

---

## ✨ Tính Năng Nổi Bật

- **Booking Wizard**: Quy trình đặt lịch chụp ảnh online 4 bước trực quan (chọn gói, dịch vụ thêm, chọn ngày/giờ, thông tin cá nhân & thanh toán cọc).
- **Public Showcase**: Hero section sang trọng, danh mục dịch vụ (Couple, Portrait, Family, Graduation, Concept Signature), portfolio ảnh chất lượng cao.
- **Portals Đa Vai Trò**:
  - **Khách hàng**: Tra cứu lịch hẹn, trạng thái hợp đồng, link tải album ảnh.
  - **Nhân viên (Staff)**: Xem lịch làm việc theo ngày, check-in buổi chụp, cập nhật trạng thái trả ảnh.
  - **Quản lý (Admin & Manager)**: Studio calendar, doanh thu, thống kê, CRM khách hàng.
- **State Machine & SMS Gateway Mock**: Mô phỏng gửi SMS xác nhận và quy trình xử lý đơn đặt lịch chuẩn.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript
- **Bundler**: Vite
- **Styling**: Vanilla CSS (tối ưu hiệu năng, responsive mượt mà)
- **Icons**: Lucide React
- **Hiệu ứng**: Canvas Confetti
- **Linter**: Oxlint

---

## 🚀 Khởi Chạy Dự Án

### Cài đặt thư viện:
```bash
npm install
```

### Chạy môi trường phát triển (Dev):
```bash
npm run dev
```

### Build cho môi trường sản phẩm:
```bash
npm run build
```

### Typecheck độc lập:
```bash
npm run typecheck
```

### Kiểm thử Unit & Integration (Vitest):
```bash
# Chạy interactive
npm run test

# Chạy một lần (CI mode)
npm run test:run
```

### Kiểm thử E2E Smoke Tests (Playwright):
```bash
npm run test:e2e
```

---

## 🗄️ Kiến Trúc Cơ Sở Dữ Liệu & Supabase (Issue #1 & #2)

Hệ thống sử dụng **PostgreSQL + Supabase** làm nguồn dữ liệu chính thức duy nhất (Single Source of Truth) cho Đặt lịch, Catalog, RBAC và Ngăn chặn Đặt lịch trùng lặp.

### 1. Biến Môi Trường Cần Thiết (`.env`):
Sao chép `.env.example` sang `.env.local` hoặc `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ENABLE_DEMO_MODE=false
```

### 2. Chuỗi Migration:
- Migration #1: `supabase/migrations/20260908000001_auth_rbac_schema.sql` (Auth, Profiles, RBAC, RLS).
- Migration #2: `supabase/migrations/20260908000002_booking_persistence_schema.sql` (Services, Packages, Addons, Studio Rooms, Bookings, Anti-Double-Booking Exclusion Constraint, Authoritative RPC `create_booking`).

### 3. Thiết Lập Local Supabase & Reset Database:
```bash
# Khởi chạy local Supabase
npx supabase start

# Áp dụng toàn bộ migrations
npx supabase migration up

# Reset database về trạng thái sạch kèm seed data
npx supabase db reset
```

### 4. Cơ Chế Chống Double-Booking (P0):
Được bảo vệ trực tiếp ở tầng Database thông qua **PostgreSQL Exclusion Constraint**:
```sql
ALTER TABLE public.bookings
ADD CONSTRAINT prevent_double_booking
EXCLUDE USING gist (
  studio_room_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (booking_status NOT IN ('CANCELLED'));
```
- **Interval nửa mở `[)`**: Cho phép các ca chụp liền kề (10:00–11:00 và 11:00–12:00) hoạt động trơn tru.
- **Filter `booking_status NOT IN ('CANCELLED')`**: Tự động giải phóng khung giờ khi đơn trước bị huỷ.
- **RPC `create_booking`**: Tính toán giá dịch vụ, tiền cọc và thời lượng authoritatively trên server; client không thể giả mạo `totalAmount`.

---

## 🛡️ CI Quality Gate & Quy Trình Đóng Góp

Dự án áp dụng **Quality Gate** bắt buộc trên mọi Pull Request:
- **GitHub Actions CI Workflow** (`.github/workflows/ci.yml`): Tự động chạy `npm ci`, `npm run lint`, `npm run build`, `npm run test:run`, `npm run test:e2e`.
- **Merge Contract**: Chỉ merge khi toàn bộ checks xanh và review đạt chuẩn qua phương thức **Squash Merge**.

👉 **Xem hướng dẫn chi tiết tại**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📂 Cấu Trúc Thư Mục

```
├── public/                 # Favicon, robots.txt, sitemap, hình ảnh tĩnh
├── src/
│   ├── assets/             # Hình ảnh và media
│   ├── components/         # Các components React (Navbar, Footer, Wizard, Portals)
│   │   ├── admin/          # Giao diện Admin
│   │   ├── auth/           # Modal đăng nhập / Demo role
│   │   ├── booking/        # Wizard đặt lịch
│   │   ├── customer/       # Giao diện khách hàng
│   │   ├── management/     # CRM & Studio Calendar
│   │   ├── public/         # Giao diện trang chủ (Hero, Packages, Portfolio...)
│   │   └── staff/          # Giao diện nhân viên
│   ├── types/              # TypeScript definitions
│   ├── utils/              # State machine, SMS Gateway
│   ├── App.tsx             # Component chính điều phối view
│   └── main.tsx            # Entry point
├── .github/workflows/      # GitHub Actions CI & AI Code Review
└── GPT_INTEGRATION_GUIDE.md # Hướng dẫn cấp quyền và tương tác với GPT
```
