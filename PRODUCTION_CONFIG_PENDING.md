# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Migration Audit Production

> **MIGRATION AUDIT & PRODUCTION STATUS**
>
> Trạng thái hiện tại: `[PRODUCTION_CONFIG_PENDING]` | `[PENDING_VERIFICATION]`
> Đã kiểm tra qua `npm run verify:schema`:
> - **21/21 Bảng ứng dụng & cấu hình**: PASS (bao gồm `root_owner_config` với RLS active).
> - **4/4 Schema Contract Columns**: PASS (`addons.duration_minutes`, `promotions` schema columns, `packages.concepts_count`, `studio_rooms.active`).
> - **Core RPCs**: `get_auth_role`, `get_auth_user_status`, `get_auth_staff_role`, `is_root_owner`, `create_booking` PASS.
> - **Availability RPC**: `get_studio_booked_slots` đang đợi Owner áp dụng các migration từ `20260911000001` trở đi.

---

## 1. Migration Audit

### LOCAL_MIGRATIONS (17)
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

---

### PRODUCTION_VERIFIED (6)
Đã được apply và kiểm chứng trên Supabase Production Project `dkvkhysnabhtbbuvommu`:
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

### PENDING_VERIFICATION (11)
Các migrations sau tồn tại trong codebase nhưng đang đợi Owner áp dụng lên production database:
```text
Migration           | Target Focus                                                    | Status
--------------------|-----------------------------------------------------------------|-----------------------
20260911000001      | Email verification hardening                                    | PENDING_VERIFICATION
20260911000002      | Root owner RBAC & root_owner_config table                       | PENDING_VERIFICATION
20260911000003      | Fix booking assignments RLS recursion                           | PENDING_VERIFICATION
20260911000004      | Booking package/service harmony & rich email                    | PENDING_VERIFICATION
20260911000005      | Fix booking concepts display order & columns                    | PENDING_VERIFICATION
20260911000006      | Fix payments columns & create get_studio_booked_slots RPC       | PENDING_VERIFICATION
20260911000007      | Rich email payload & realtime publication                       | PENDING_VERIFICATION
20260911000008      | Flexible concepts & availability grant                          | PENDING_VERIFICATION
20260911000009      | Sync staff profiles to employees                                | PENDING_VERIFICATION
20260911000010      | Seed and enhance employees table                                | PENDING_VERIFICATION
20260916000001      | Fix create_booking promotion schema contract (start_at, end_at) | PENDING_VERIFICATION
```

Lệnh thực thi khi Owner có database credentials / access token:
```bash
npx supabase db push --project-ref dkvkhysnabhtbbuvommu
```
Hoặc copy nội dung từng file migration vào Supabase SQL Editor theo thứ tự trên.

---

## 2. Các Bước Kế Tiếp Cho Owner (`[OWNER_ACTION_REQUIRED]`)

### Bước 1: Áp dụng các migration Pending
Áp dụng 11 migrations thuộc nhóm `PENDING_VERIFICATION` vào Supabase SQL Editor.
Chạy lại:
```bash
npm run verify:schema
```
để đảm bảo 100% RPCs (bao gồm `get_studio_booked_slots`) đều PASS.

### Bước 2: Deploy Edge Functions
```bash
npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
```

### Bước 3: Thiết lập Server Secrets Trên Supabase
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

### Bước 4: Cập nhật Số Tài Khoản ACB Thật
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

### Bước 5: Đăng Ký Webhook Trên payOS Dashboard
- Vào [payos.vn](https://payos.vn) → Cài đặt Webhook
- URL: `https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/payment-webhook`
- Bấm **Xác thực Webhook**.
