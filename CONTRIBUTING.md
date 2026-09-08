# Quy Trình Đóng Góp & Merge Code (Contributing Guide)

Tài liệu này quy định quy trình tiêu chuẩn dành cho các nhà phát triển (Developers) và AI Coding Agents khi đóng góp mã nguồn vào dự án **Maison MIPA Memories**.

---

## 🔄 Vòng Đời Phát Triển (Development Lifecycle)

Quy trình phát triển tuân theo chuẩn 6 bước nghiêm ngặt:
$$\text{branch} \longrightarrow \text{code} \longrightarrow \text{tests} \longrightarrow \text{PR} \longrightarrow \text{review} \longrightarrow \text{merge}$$

### 1. Phân Nhánh (Branching)
- **Quy tắc bất di bất dịch**: **KHÔNG commit trực tiếp vào nhánh `main`**.
- Luôn cập nhật code mới nhất từ `main` trước khi tạo branch:
  ```bash
  git checkout main
  git pull origin main
  ```
- Định dạng tên nhánh:
  - AI Tasks: `ai/issue-<number>-<slug>` (Ví dụ: `ai/issue-4-ci-tests`)
  - Feature: `feature/<slug>`
  - Bugfix: `fix/<slug>`

### 2. Lập Trình (Coding)
- Tuân thủ cấu trúc thư mục hiện hữu (`src/components`, `src/utils`, `src/types`).
- Giữ code sạch, có type rõ ràng với TypeScript.
- Chạy kiểm tra linting định kỳ bằng Oxlint:
  ```bash
  npm run lint
  ```

### 3. Kiểm Thử Tự Động (Testing)
Trước khi push hoặc mở Pull Request, bắt buộc phải chạy bộ kiểm tra toàn diện tại local:
```bash
# 1. Cài đặt sạch dependencies
npm ci

# 2. Kiểm tra lint
npm run lint

# 3. Typecheck và build bundle
npm run build

# 4. Chạy Unit & Integration tests (Vitest)
npm run test:run

# 5. Chạy E2E Smoke tests (Playwright)
npm run test:e2e
```
Tất cả các lệnh trên **PHẢI PASS 100%**.

### 4. Tạo Pull Request (PR)
- Push nhánh lên remote:
  ```bash
  git push -u origin <tên-nhánh>
  ```
- Tạo PR trên GitHub hướng vào nhánh `main`.
- Điền đầy đủ thông tin theo [Pull Request Template](.github/pull_request_template.md).
- **Bắt buộc**: Thêm cú pháp liên kết issue:
  ```markdown
  Closes #<issue-number>
  ```

### 5. Review & CI Quality Gate
Mọi PR đều phải trải qua 2 hệ thống kiểm tra:
1. **CI Quality Gate (`ci.yml`)**:
   - Chạy `lint`, `build/typecheck`, `test:run` (Vitest) và `test:e2e` (Playwright Chromium).
   - Hoạt động độc lập hoàn toàn, không phụ thuộc vào API key của bên thứ ba.
   - Bắt buộc phải **GREEN (Pass)**.
2. **AI Code Reviewer (`ai-code-review.yml`)**:
   - Đánh giá kiến trúc, clean code, bảo mật và hiệu năng bằng GPT.
   - Nếu kết quả review là **Needs Work**: Tự sửa đổi code trên branch và push lại để CI chạy lại.

### 6. Hợp Nhất Mã Nguồn (Merge Contract)
Chỉ được phép hợp nhất khi:
- ✅ Toàn bộ GitHub Actions checks xanh (Pass).
- ✅ Không có review nào ở trạng thái `Needs Work`.
- ✅ PR có mô tả rõ ràng và liên kết `Closes #...`.

**Phương thức merge bắt buộc**:
- **SQUASH MERGE** vào `main`.
- Xóa branch sau khi merge thành công.
- Xác nhận Issue liên quan đã được đóng tự động.
- Kiểm tra lại workflow CI trên `main` để đảm bảo không bị regression.
