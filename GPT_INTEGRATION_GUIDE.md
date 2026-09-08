# Hướng Dẫn Tích Hợp & Cấp Quyền Cho GPT (ChatGPT / AI Agents) Thao Tác Trên Repository

Tài liệu này hướng dẫn chi tiết cách kết nối GPT (ChatGPT, Custom GPT, AI PR Bot, Copilot) với repository **[DINHTANPHATDEVTOOL/maison-mipa-memories](https://github.com/DINHTANPHATDEVTOOL/maison-mipa-memories)** để GPT có thể:
- 👁️ **Xem & Đọc mã nguồn** (Read)
- 📝 **Review code & Bắt lỗi** (Code Review)
- ✍️ **Sửa code & Commit trực tiếp** (Write / Commit)
- 🚀 **Tạo & Merge Pull Request** (Pull Request Management)

---

## 🌟 Phương Án 1: Cấp Quyền Đầy Đủ (Read + Write + PR) Cho ChatGPT Qua GitHub Token

Đây là cách mạnh mẽ nhất để bạn có thể chat với ChatGPT và yêu cầu: *"Hãy sửa lỗi ở file X rồi tạo PR lên GitHub giúp tôi"*.

### Bước 1: Tạo GitHub Fine-grained Personal Access Token (PAT)
1. Truy cập: [GitHub Token Settings](https://github.com/settings/tokens?type=beta)
2. Nhấn nút **Generate new token**.
3. Điền các thông tin:
   - **Token name**: `ChatGPT-Repo-Agent`
   - **Expiration**: Chọn thời hạn (ví dụ: 90 ngày hoặc tùy chọn).
   - **Repository access**: Chọn **Only select repositories** -> Chọn `DINHTANPHATDEVTOOL/maison-mipa-memories`.
4. Cấp các quyền trong mục **Repository permissions**:
   - **Contents**: Chọn **Read and write** *(cho phép GPT xem file, sửa code, tạo commit)*.
   - **Pull requests**: Chọn **Read and write** *(cho phép GPT tạo PR, review và merge PR)*.
   - **Issues**: Chọn **Read and write** *(cho phép GPT quản lý issue)*.
   - **Metadata**: Tự động được chọn (Read-only).
5. Cuộn xuống dưới cùng và nhấn **Generate token**.
6. **Sao chép mã token** (bắt đầu bằng `github_pat_...`).

### Bước 2: Sử Dụng Với ChatGPT / AI Coding Tools
- **Cách A - Dùng ChatGPT Custom GPT**:
  - Tạo hoặc sử dụng một Custom GPT có Action kết nối GitHub REST API (`https://api.github.com`).
  - Nhập Bearer Token vừa tạo vào phần Authentication.
  - Sau đó, trong cuộc trò chuyện, bạn có thể ra lệnh:
    > *"Đọc file `src/components/booking/BookingWizard.tsx` trên repo `DINHTANPHATDEVTOOL/maison-mipa-memories`, sửa lại bước chọn ngày và tạo commit lên nhánh `update-booking` giúp tôi."*
- **Cách B - Dùng AI IDE / Agent (Cursor, Claude Dev/Cline, Antigravity)**:
  - Cung cấp token hoặc đăng nhập GitHub CLI trên máy để agent tự động clone, tạo branch, commit và push lên repo.

---

## 🤖 Phương Án 2: Tự Động Review Code Qua GitHub Actions (Đã Cài Sẵn)

Repository này đã được trang bị sẵn workflow tại `.github/workflows/ai-code-review.yml`.

### Cách kích hoạt:
1. Vào repository trên GitHub: [Settings > Secrets and variables > Actions](https://github.com/DINHTANPHATDEVTOOL/maison-mipa-memories/settings/secrets/actions).
2. Nhấn **New repository secret**.
3. Điền:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Mã OpenAI API key của bạn (`sk-...`).
4. Nhấn **Add secret**.

👉 **Kết quả**: Mỗi khi bạn hoặc bất kỳ ai tạo một Pull Request, GPT-4o-mini sẽ tự động quét toàn bộ diff thay đổi, phân tích logic, bảo mật, clean code và đăng một bình luận review chi tiết ngay bên dưới PR!

---

## ⚡ Phương Án 3: Cài Đặt CodeRabbit AI (1-Click, Miễn Phí, Siêu Thông Minh)

Nếu bạn muốn có một bot AI review chuyên nghiệp hàng đầu thế giới và **có thể trò chuyện, bảo bot tự sửa code ngay trên PR**:

1. Truy cập: [CodeRabbit AI on GitHub](https://github.com/apps/coderabbitai)
2. Nhấn **Install** (Miễn phí 100% cho public repository).
3. Chọn tài khoản `DINHTANPHATDEVTOOL` và chọn repo `maison-mipa-memories`.
4. Nhấn **Save**.

### Quyền năng của CodeRabbit:
- Tự động tóm tắt PR, phát hiện bug, đề xuất code cải tiến.
- Bạn có thể tag bot ngay trong comment của PR:
  - `@coderabbitai review`: Yêu cầu bot review lại.
  - `@coderabbitai can you fix this component to add loading state?`: Bot sẽ viết code và commit thẳng vào PR cho bạn!

---

## 🌐 Phương Án 4: Chat Trực Tiếp Với ChatGPT Qua Đường Dẫn (Nhanh Nhất)

Do repository là **Public**, ChatGPT có thể đọc trực tiếp mã nguồn thông qua trình duyệt web:
1. Copy đường dẫn repo: `https://github.com/DINHTANPHATDEVTOOL/maison-mipa-memories`
2. Gửi vào ô chat của ChatGPT:
   > *"Hãy truy cập `https://github.com/DINHTANPHATDEVTOOL/maison-mipa-memories` và xem cấu trúc mã nguồn. Hãy review file `src/App.tsx` và đánh giá xem có thể cải thiện kiến trúc state management thế nào."*
3. ChatGPT sẽ fetch nội dung và phân tích chi tiết cho bạn mà không cần cài đặt thêm bất kỳ công cụ nào.
