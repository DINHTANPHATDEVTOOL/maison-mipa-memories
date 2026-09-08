## 📋 Summary
<!-- Tóm tắt ngắn gọn mục tiêu của Pull Request (2-3 câu). -->

## 🔗 Related Issue
<!-- Liên kết Issue cần đóng, ví dụ: Closes #4 -->
Closes #

## 🧪 Test Evidence
<!-- Bằng chứng kiểm thử: kết quả chạy lint, typecheck, unit tests, E2E smoke tests. -->
```text
npm run lint: PASS
npm run build: PASS
npm run test:run: PASS (Vitest unit & integration)
npm run test:e2e: PASS (Playwright smoke tests)
```

## 🛡️ Security Impact
<!-- Đánh giá tác động an ninh: xác thực, phân quyền (RBAC/ABAC), bảo vệ endpoint/route, secrets. -->

## 📦 Migration & Environment Changes
<!-- Có thay đổi biến môi trường (.env), database schema, hay package dependencies không? -->

## 📸 Screenshots (nếu có thay đổi UI)
<!-- Đính kèm ảnh chụp màn hình hoặc GIF minh họa giao diện trước/sau thay đổi. -->

## ✅ Quality Gate Checklist
- [ ] Clean install dependencies thành công (`npm ci`)
- [ ] Lint không có lỗi (`npm run lint`)
- [ ] Typecheck & build bundle thành công (`npm run build`)
- [ ] Toàn bộ Unit & Integration tests pass (`npm run test:run`)
- [ ] Toàn bộ E2E smoke tests pass (`npm run test:e2e`)
- [ ] Không commit trực tiếp vào nhánh `main`
- [ ] PR liên kết đúng issue (`Closes #...`)
