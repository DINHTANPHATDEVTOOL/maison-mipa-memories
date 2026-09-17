# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Migration Audit Production (RESOLVED)

> **MIGRATION AUDIT & PRODUCTION STATUS**: `[SUPERSEDED & RESOLVED]`
> 
> Booking Flow V2 đã chính thức kích hoạt trên production Supabase project `dkvkhysnabhtbbuvommu` với trạng thái `[PRODUCTION_READY=YES]`.
> Toàn bộ 21/21 migrations đã được áp dụng và xác thực 1:1 (`MIGRATION_HISTORY=VERIFIED`).
>
> 📖 **Vui lòng tham khảo tài liệu phát hành chính thức mới nhất**:
> **[PRODUCTION_RELEASE_STATUS.md](./PRODUCTION_RELEASE_STATUS.md)**
>
> **Lưu ý về các thành phần thanh toán cũ:**
> - `payment-webhook`, `create-payos-link`, `payOS`, `VietQR`: **LEGACY / NOT USED BY BOOKING FLOW V2**.
> - Không cấu hình hoặc deploy các dịch vụ này cho Booking Flow V2.

---

## 1. Migration Audit

### LOCAL_MIGRATIONS (18)
1. `20260908000001_auth_rbac_schema.sql`
2. `20260908000002_booking_persistence_schema.sql`
3. `20260908000003_otp_payment_schema.sql`
4. `20260909000001_production_core_hardening.sql`
5. `20260909000002_portfolio_cms_and_booking_concepts.sql`
6. `20260910000001_production_payos_and_email_hardening.sql`
7. `20260911000001_email_verification_hardening.sql`
8. `20260911000002_root_owner_rbac_hardening.sql`
9. `20260911000003_fix_booking_assignments_rls_recursion.sql`
10. `20260911000004_booking_package_service_harmony_and_rich_email.sql`
11. `20260911000005_fix_booking_concepts_display_order_and_columns.sql`
12. `20260911000006_fix_payments_columns_and_availability_rpc.sql`
13. `20260911000007_rich_email_payload_and_realtime_publication.sql`
14. `20260911000008_flexible_concepts_and_availability_grant.sql`
15. `20260911000009_sync_staff_profiles_to_employees.sql`
16. `20260911000010_seed_and_enhance_employees_table.sql`
17. `20260916000001_fix_create_booking_promotion_contract.sql`
18. `20260916000002_atomic_promotion_and_pricing_parity.sql`

---

### HISTORY_VERIFIED (6)
Đã được ghi nhận có trong lịch sử xác nhận remote trên Supabase Production Project `dkvkhysnabhtbbuvommu`:
```text
Migration           | Remote Time (UTC)       | Status
--------------------|-------------------------|-------------------
20260908000001      | 2026-09-08 00:00:01     | APPLIED_VERIFIED
20260908000002      | 2026-09-08 00:00:02     | APPLIED_VERIFIED
20260908000003      | 2026-09-08 00:00:03     | APPLIED_VERIFIED
20260909000001      | 2026-09-09 00:00:01     | APPLIED_VERIFIED
20260909000002      | 2026-09-09 00:00:02     | APPLIED_VERIFIED
20260910000001      | 2026-09-10 00:00:01     | APPLIED_VERIFIED
```

---

### HISTORY_NOT_VERIFIED (12)
Các migrations sau tồn tại trong codebase nhưng chưa được đối chiếu trực tiếp với bảng lịch sử migration từ xa (`supabase_migrations.schema_migrations`):
```text
Migration           | Target Focus                                                    | Status
--------------------|-----------------------------------------------------------------|-----------------------
20260911000001      | Email verification hardening                                    | HISTORY_NOT_VERIFIED
20260911000002      | Root owner RBAC & root_owner_config table                       | HISTORY_NOT_VERIFIED
20260911000003      | Fix booking assignments RLS recursion                           | HISTORY_NOT_VERIFIED
20260911000004      | Booking package/service harmony & rich email                    | HISTORY_NOT_VERIFIED
20260911000005      | Fix booking concepts display order & columns                    | HISTORY_NOT_VERIFIED
20260911000006      | Fix payments columns & create get_studio_booked_slots RPC       | HISTORY_NOT_VERIFIED
20260911000007      | Rich email payload & realtime publication                       | HISTORY_NOT_VERIFIED
20260911000008      | Flexible concepts & availability grant                          | HISTORY_NOT_VERIFIED
20260911000009      | Sync staff profiles to employees                                | HISTORY_NOT_VERIFIED
20260911000010      | Seed and enhance employees table                                | HISTORY_NOT_VERIFIED
20260916000001      | Fix create_booking promotion schema contract (start_at, end_at) | HISTORY_NOT_VERIFIED
20260916000002      | Atomic promotion usage limit (FOR UPDATE) & pricing parity      | HISTORY_NOT_VERIFIED
```

> [!IMPORTANT]
> **Quy định đối chiếu lịch sử migration:**
> Trạng thái `HISTORY_NOT_VERIFIED` **không đồng nghĩa** với việc migration chưa được áp dụng (`NOT_APPLIED`). Nhiều đối tượng database (ví dụ bảng `root_owner_config` từ migration `20260911000002`) đã tồn tại trên production.
> Lịch sử migration phải được xác nhận bằng Supabase CLI:
> ```bash
> npx supabase migration list --project-ref dkvkhysnabhtbbuvommu
> ```
> Chỉ sau khi có bằng chứng thực tế từ remote migration history thì một migration mới được gán nhãn `APPLIED` hoặc `NOT_APPLIED`.
> **Tuyệt đối không chạy `db push` một cách mù quáng** để tránh rủi ro re-apply hoặc xung đột với database đã được chỉnh sửa.

---

## 2. Quy Trình 5 Bước An Toàn Cho Owner (`[OWNER_ACTION_REQUIRED]`)

### Bước 1: Kiểm tra danh sách migration từ xa
```bash
npx supabase migration list --project-ref dkvkhysnabhtbbuvommu
```

### Bước 2: So sánh LOCAL vs REMOTE
Đối chiếu danh sách migration cục bộ trong `supabase/migrations/` với bảng remote history hiển thị từ Bước 1.

### Bước 3: Xác định chính xác các migration thực sự còn thiếu
Chỉ chọn những migration chưa xuất hiện ở cột Remote.

### Bước 4: Áp dụng có kiểm soát
Áp dụng các migration còn thiếu theo đúng thứ tự timestamp bằng Supabase CLI hoặc dán vào Supabase SQL Editor sau khi đã xác nhận schema state.

### Bước 5: Kiểm thử lại toàn diện
```bash
npm run verify:schema
```
Đảm bảo tất cả bảng, cột contract và RPCs (bao gồm `get_studio_booked_slots`) đều PASS.

---

## 3. Cấu Hình Dịch Vụ Phụ Trợ (Edge Functions & Secrets)

### Deploy Edge Functions
```bash
npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
```

### Thiết lập Server Secrets Trên Supabase
```bash
# Email (Resend)
npx supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_FROM="Maison MIPA Memories <no-reply@maisonmipa.io.vn>" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set EMAIL_REPLY_TO="maisonmipamemories@gmail.com" --project-ref dkvkhysnabhtbbuvommu

# payOS
npx supabase secrets set PAYOS_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_API_KEY="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
npx supabase secrets set PAYOS_CHECKSUM_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" --project-ref dkvkhysnabhtbbuvommu
```

### Cập nhật Số Tài Khoản ACB Thật
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

### Đăng Ký Webhook Trên payOS Dashboard
- Vào [payos.vn](https://payos.vn) → Cài đặt Webhook
- URL: `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook`
- Bấm **Xác thực Webhook**.
