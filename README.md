# Maison MIPA Memories 📸

> **Tiệm Ảnh Nghệ Thuật Phong Cách Pháp — Living French Atelier**  
> *"Nhà là nơi lưu giữ ký ức"*

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20%7C%20620%20Passed-green?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## 🏛️ Giới Thiệu Thương Hiệu & Định Vị

Trong tiếng Pháp, **Maison** có nghĩa là *Ngôi Nhà*. **Maison MIPA Memories** định vị là một **tiệm ảnh nghệ thuật (Atelier)** mang phong cách Pháp cổ điển, ấm cúng và tinh tế tại Sài Gòn, nơi từng khung hình là một tác phẩm ghi dấu cảm xúc chân thật, độc bản và trường tồn cùng thời gian.

- **Không gian**: Tiệm ảnh nghệ thuật riêng tư với ánh sáng tự nhiên, góc cửa sổ Pháp lãng mạn và tone màu nâu ấm cinematic.
- **Địa chỉ**: 88 Phan Sào Nam, Phường 11, Quận Tân Bình, TP. Hồ Chí Minh
- **Hotline / Zalo**: 0966 616 546
- **Email**: maisonmipamemories@gmail.com
- **Website chính thức**: [https://maisonmipa.io.vn](https://maisonmipa.io.vn)

---

## 🎨 Danh Mục Dịch Vụ Nghệ Thuật

Tiệm ảnh tập trung chuyên sâu vào các dòng nhiếp ảnh nghệ thuật mang chiều sâu cảm xúc:

1. **Chân Dung Nghệ Thuật & Nàng Thơ**: Tôn vinh nét đẹp, thần thái và cá tính độc bản qua ánh sáng tự nhiên dịu dàng.
2. **Couple & Kỷ Niệm Tình Yêu**: Khung hình tự nhiên, ngọt ngào và rung cảm lãng mạn của hai bạn.
3. **Áo Dài Truyền Thống & Duyên Dáng**: Nét đẹp thanh lịch, trang nhã của tà áo dài Việt Nam kết hợp cùng không gian hoài niệm.
4. **Kỷ Yếu & Tốt Nghiệp Thanh Xuân**: Đánh dấu mốc son rực rỡ tuổi trẻ trong trang phục cử nhân thanh lịch.
5. **Tiệc Sinh Nhật & Tuổi Mới**: Ánh nến lung linh, hoa tươi và bánh kem xinh xắn ghi dấu ngày sinh nhật đáng nhớ.
6. **Gia Đình Sum Vầy**: Gắn kết các thế hệ trong không gian ấm áp, thân thuộc như chính phòng khách ngôi nhà bạn.

---

## 📅 Quy Trình Đặt Lịch V2 (Booking Flow V2)

Booking Flow V2 uses consultation-first booking with manual deposit confirmation by authorized staff. Online payment integrations are legacy and are not part of the active customer workflow.

```text
Khách hàng chọn Dịch vụ & Concept
      ↓
Chọn Ngày & Giờ chụp tại Tiệm ảnh (Atelier)
      ↓
Nhập Thông tin & Gửi Yêu Cầu Tư Vấn (CONSULTATION_REQUESTED)
      ↓
Nhân viên tư vấn liên hệ, trao đổi chi tiết & hướng dẫn cọc
      ↓
Nhân viên ủy quyền xác nhận cọc thủ công (CONFIRMED)
      ↓
Buổi chụp diễn ra tại Tiệm ảnh → Hậu kỳ → Bàn giao Album
```

- **Tối ưu hóa trải nghiệm**: Khách hàng không cần phải chọn phòng chụp hay setup bối cảnh phức tạp; toàn bộ không gian atelier được tiệm chuẩn bị riêng tư và chu đáo theo từng lịch hẹn.
- **Bảo toàn tính liên tục (Booking Continuity)**: Lưu trữ bản nháp (draft session) an toàn, cho phép khách hàng đăng nhập và tiếp tục hoàn thiện đơn đặt lịch mà không bị mất dữ liệu.

---

## 🛡️ Kiến Trúc Kỹ Thuật & Cơ Sở Dữ Liệu

### 1. Công nghệ (Technology Stack)
- **Frontend Core**: React 19, TypeScript 6, Vite 8
- **Styling**: Vanilla CSS tối ưu tải trang, responsive mượt mà trên mọi thiết bị
- **Animation & 3D**: Three.js, React Three Fiber, GSAP
- **Database & Backend**: PostgreSQL 15+ trên nền tảng Supabase
- **Kiểm thử**: Vitest (72 test suites, 620 tests), Playwright (E2E Smoke Tests)
- **Code Quality**: Oxlint (High-performance linter), TypeCheck nghiêm ngặt (`tsc -b`)

### 2. An toàn dữ liệu & Concurrency Control
- **Chống Đặt Trùng Giờ (Anti-Double-Booking)**: Sử dụng PostgreSQL GiST Exclusion Constraint trên khoảng thời gian nửa mở `[start_at, end_at)` kết hợp phòng atelier, ngăn chặn triệt để xung đột lịch chụp ở tầng database.
- **Advisory Locks**: Sử dụng `pg_advisory_xact_lock` cho các giao dịch phân bổ nhân sự và tài nguyên thiết bị, tránh tình trạng race-condition khi nhiều quản lý cùng thao tác đồng thời.
- **Row-Level Security (RLS)**: Phân quyền dữ liệu nghiêm ngặt giữa Khách hàng (Customer), Tiếp tân (Receptionist), Nhiếp ảnh gia (Photographer), Quản lý (Manager) và Quản trị viên (Admin).
- **PostgREST RPC Architecture**: Các hàm nghiệp vụ báo cáo, phân tích tài chính và vận hành được tối ưu bằng Common Table Expressions (CTE) ngăn ngừa lỗi Nested Aggregates.

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

### 1. Yêu cầu môi trường
- **Node.js**: >= 20.x
- **npm**: >= 10.x

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Cấu hình biến môi trường (`.env`)
Sao chép `.env.example` sang `.env.local` hoặc cấu hình các biến cơ bản:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ENABLE_DEMO_MODE=true
```

### 4. Chạy môi trường phát triển (Dev)
```bash
npm run dev
```
Ứng dụng sẽ khởi chạy tại: `http://localhost:5173`

### 5. Build cho Production
```bash
npm run build
```
Quá trình build bao gồm:
1. `tsc -b`: Kiểm tra toàn bộ kiểu dữ liệu TypeScript
2. `scripts/generate-sitemap.js`: Tạo sitemap.xml động với đầy đủ canonical routes
3. `vite build`: Đóng gói bundle tối ưu (Index bundle trong giới hạn cho phép)

---

## 🧪 Kiểm Thử & Quality Gates

Dự án áp dụng bộ quy chuẩn kiểm thử toàn diện:

```bash
# Chạy toàn bộ 72 test suites bằng Vitest
npm run test:run

# Kiểm tra cú pháp và kiểu dữ liệu TypeScript
npm run typecheck

# Quét mã nguồn với linter tốc độ cao
npm run lint

# Xác minh toàn vẹn migrations và hợp đồng RPC với Supabase
npm run verify:db-contracts

# Kiểm tra tính tương thích giữa kiểu Typescript và Database Schema
npm run db:types:check

# Kiểm tra ngân sách dung lượng bundle (Bundle Budget Check)
npm run check:budget

# Quét phát hiện mã bí mật và secrets trước khi commit
npm run scan:secrets

# Chạy kiểm thử End-to-End với Playwright
npm run test:e2e
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── public/                 # Favicon, robots.txt, sitemap.xml, assets tĩnh chính thức
├── scripts/                # Scripts kiểm thử schema, sitemap, bundle budget, security scan
├── src/
│   ├── components/         # Các components React theo phân hệ chức năng
│   │   ├── admin/          # Giao diện quản trị hệ thống
│   │   ├── auth/           # Quản lý phiên đăng nhập & phân quyền RBAC
│   │   ├── booking/        # Quy trình Booking Wizard 6 bước V2
│   │   ├── common/         # Image Editor, Dialogs, FocusTrap a11y
│   │   ├── customer/       # Cổng thông tin khách hàng & tra cứu album
│   │   ├── management/     # CRM, Lịch vận hành, Quản lý tài chính, BI Dashboard
│   │   ├── public/         # Giao diện công khai: Trang chủ, 3D Atelier, Portfolio, FAQ
│   │   └── staff/          # Giao diện dành riêng cho Photographer & Tiếp tân
│   ├── config/             # Cấu hình website, metadata, pricing source of truth
│   ├── context/            # React Contexts (Auth, Site Assets)
│   ├── lib/                # Khởi tạo Supabase client & utilities
│   ├── pages/              # Các trang chính của ứng dụng
│   ├── services/           # Tầng nghiệp vụ (Booking, Portfolio, CRM, Ledger, Staff)
│   ├── types/              # Định nghĩa Typescript toàn diện
│   └── utils/              # Helper functions, format tiền tệ, Correlation ID
├── supabase/
│   ├── functions/          # Edge Functions (request-otp, verify-otp, send-email)
│   └── migrations/         # 32 tệp SQL migrations kiểm soát toàn bộ vòng đời cơ sở dữ liệu
└── README.md
```

---

## 📄 Bản Quyền & Giấy Phép

Dự án thuộc sở hữu của **Tiệm Ảnh Maison MIPA Memories**. Mọi quyền được bảo lưu.
Mã nguồn phát hành theo giấy phép MIT.
