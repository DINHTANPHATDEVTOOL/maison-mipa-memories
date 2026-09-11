# PRODUCTION_CONFIG_PENDING: Kế Hoạch & Checklist Triển Khai Production (Issue #17)

> **LIVE BLOCKER DISCOVERED DURING REAL `supabase db push`**
>
> Production push reached migration `20260909000002_portfolio_cms_and_booking_concepts.sql` and failed with PostgreSQL `42P13: cannot remove parameter defaults from existing function` at the 11-argument `public.create_booking(...)` backward-compatibility wrapper.
>
> **Do not merge PR #20 or mark #17 complete until this migration is fixed and a real clean migration apply passes.**

## Required migration fixes

1. Migration #2 already creates an 11-argument `public.create_booking(...)` with defaults. Migration #5 attempts `CREATE OR REPLACE` on that same signature without defaults, which PostgreSQL rejects.
2. Preferred fix in migration #5: explicitly `DROP FUNCTION IF EXISTS public.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);`, then create only the 12-argument concept-aware function with `p_concept_ids UUID[] DEFAULT '{}'`. Remove the redundant 11-argument wrapper; 11-argument callers remain compatible because the 12th argument has a default.
3. Fix runtime schema mismatches inside migration #5's `create_booking` implementation:
   - `public.booking_addons` columns are `quantity`, `unit_price`, `line_total`; there is no `price` column.
   - `public.audit_logs` columns are `actor_user_id`, `old_data`, `new_data`; there are no `performed_by`, `old_values`, `new_values` columns.
4. Re-run a real fresh database migration test (`supabase db reset` or equivalent) before claiming migrations 1..6 pass.
5. Re-run lint, typecheck, unit tests, E2E, and build after the migration fix.

## Current production retry sequence

Before retrying, inspect migration history:

```bash
npx supabase migration list
```

Expected after the failed push: migrations 1..4 applied remotely; migrations 5..6 pending. If migration 5 is shown as applied, stop and inspect history before proceeding.

After the branch fix is pulled:

```bash
git pull origin ai/issue-17-production-integrations
npx supabase db push
```

After a successful push:

```bash
npm run verify:schema
npx supabase functions deploy payment-webhook --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy send-email --project-ref dkvkhysnabhtbbuvommu
npx supabase functions deploy create-payos-link --project-ref dkvkhysnabhtbbuvommu
```

Then configure server-side Resend/payOS secrets, update the real ACB account number, register the payOS webhook, and run the live E2E flow before merge.
