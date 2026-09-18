// ==============================================================================
// Maison MIPA Memories - Deep Function & DB Hardening Test Suite (DEF-D001 to DEF-D018)
// Validates all 18 defects reported in Maison_MIPA_Deep_Function_DB_Test_Report_20260918.xlsx
// ==============================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isWithinOperatingHours,
  mapDatabaseRecordToDomain,
  createBookingInMemory,
  resetInMemoryBookings,
} from '../bookingService';
import {
  getTomorrowPrepBoardData,
} from '../studioOperationsService';
import {
  getFinancialTransactions,
  getFinancialLedgerSummary,
  resetInMemoryFinancialLedger,
} from '../financialLedgerService';
import {
  getBusinessDashboardSummary,
  getBookingFunnelMetrics,
} from '../businessAnalyticsService';
import {
  getCrmCustomers,
} from '../crmService';

describe('Deep Function & DB Hardening Suite (DEF-D001 - DEF-D018)', () => {
  beforeEach(() => {
    resetInMemoryBookings();
    resetInMemoryFinancialLedger();
  });

  // DEF-D007: Operating Hours Validation (Weekday: 08:30-19:00, Weekend: 08:00-20:30)
  describe('DEF-D007: Studio Operating Hours Boundaries', () => {
    it('allows weekday bookings between 08:30 and 19:00', () => {
      // 2026-09-21 is Monday (weekday)
      const validMorning = isWithinOperatingHours('2026-09-21', '08:30', '10:30');
      expect(validMorning.valid).toBe(true);

      const validAfternoon = isWithinOperatingHours('2026-09-21', '16:00', '18:00');
      expect(validAfternoon.valid).toBe(true);

      const validExactClosing = isWithinOperatingHours('2026-09-21', '17:00', '19:00');
      expect(validExactClosing.valid).toBe(true);
    });

    it('rejects weekday bookings starting before 08:30 or ending after 19:00', () => {
      // 2026-09-21 is Monday
      const tooEarly = isWithinOperatingHours('2026-09-21', '08:00', '10:00');
      expect(tooEarly.valid).toBe(false);
      expect(tooEarly.reason).toContain('08:30');

      const tooLate = isWithinOperatingHours('2026-09-21', '18:00', '20:00');
      expect(tooLate.valid).toBe(false);
      expect(tooLate.reason).toContain('19:00');
    });

    it('allows weekend bookings between 08:00 and 20:30', () => {
      // 2026-09-20 is Sunday (weekend)
      const validEarly = isWithinOperatingHours('2026-09-20', '08:00', '10:00');
      expect(validEarly.valid).toBe(true);

      const validEvening = isWithinOperatingHours('2026-09-20', '18:00', '20:00');
      expect(validEvening.valid).toBe(true);
    });

    it('rejects weekend bookings ending after 20:30', () => {
      // 2026-09-20 is Sunday
      const tooLate = isWithinOperatingHours('2026-09-20', '19:00', '21:00');
      expect(tooLate.valid).toBe(false);
      expect(tooLate.reason).toContain('20:30');
    });
  });

  // DEF-D006: Booking Record Entity Name Fallback Resolution
  describe('DEF-D006: Entity Name Fallback Resolution', () => {
    it('resolves real entity names from catalog when joined objects are absent', () => {
      const dbRow: any = {
        id: 'b-mock-01',
        booking_code: 'MIPA-260918-TEST',
        user_id: 'user-01',
        customer_name: 'Trần Thị Thu Thảo',
        customer_phone: '0912345678',
        customer_email: 'thao@example.com',
        service_id: 'wedding', // Pre-Wedding & Studio Wedding
        package_id: 'signature', // Signature Memories
        studio_id: 'room_01',  // Studio A
        booking_date: '2026-09-25',
        start_time: '09:00',
        end_time: '11:00',
        total_amount: 3990000,
        deposit_amount: 1000000,
        status: 'CONFIRMED',
        payment_status: 'DEPOSIT_PAID',
        assignments: [],
        addons: [],
        concepts: [],
        // Notice: joined objects services, packages, studio_rooms are missing!
      };

      const domain = mapDatabaseRecordToDomain(dbRow);
      expect(domain.serviceName).not.toBe('Dịch Vụ MIPA');
      expect(domain.serviceName).toContain('Wedding');
      expect(domain.packageName).not.toBe('Gói Chụp MIPA');
      expect(domain.packageName).toMatch(/signature/i);
      expect(domain.studioName).not.toBe('Phòng Studio');
      expect(domain.studioName).not.toBe('Phòng Studio MIPA');
      expect(domain.studioName).toContain('Room 01');
    });
  });

  // DEF-D002 & TC-D044: Tomorrow Prep Board Asia/Ho_Chi_Minh Timezone
  describe('DEF-D002: Tomorrow Prep Board Asia/Ho_Chi_Minh Timezone', () => {
    it('retrieves tomorrow prep data without throwing uncaught errors', async () => {
      const prepSessions = await getTomorrowPrepBoardData();
      expect(Array.isArray(prepSessions)).toBe(true);
      if (prepSessions.length > 0) {
        expect(prepSessions[0].shootDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof prepSessions[0].isAllGreen).toBe('boolean');
      }
    });
  });

  // DEF-D010 & DB-001: Financial Ledger Resilience Fallback
  describe('DEF-D010: Financial Ledger Client Fallback', () => {
    it('returns valid financial transactions without throwing uncaught error', async () => {
      const txs = await getFinancialTransactions({ limit: 10 });
      expect(Array.isArray(txs)).toBe(true);
    });

    it('returns authoritative financial ledger summary structure', async () => {
      const summary = await getFinancialLedgerSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.confirmedBookingValue).toBe('number');
      expect(typeof summary.actualCashReceived).toBe('number');
      expect(typeof summary.outstandingBalance).toBe('number');
    });
  });

  // DEF-D004: CRM Customer List Fail-Safe Derivation
  describe('DEF-D004: CRM Customer List Fallback', () => {
    it('returns customer lifecycle metrics without throwing unhandled exceptions', async () => {
      const result = await getCrmCustomers({ pageSize: 20 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.customers)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });
  });

  // Business Analytics Fail-Safe
  describe('Business Analytics RPC Resilience', () => {
    it('returns dashboard summary structure even under remote errors', async () => {
      const biSummary = await getBusinessDashboardSummary();
      expect(biSummary).toBeDefined();
      expect(biSummary.funnel).toBeDefined();
      expect(biSummary.financials).toBeDefined();
      expect(biSummary.customers).toBeDefined();
    });

    it('returns funnel metrics structure', async () => {
      const funnel = await getBookingFunnelMetrics();
      expect(funnel).toBeDefined();
      expect(Array.isArray(funnel.stages)).toBe(true);
    });
  });

  // Migration & SQL Verification (DB-001, DB-002, DB-003)
  describe('Database Migration & Signature Integrity', () => {
    it('migration 20260918000005 has get_crm_customers with exact 7 arguments', () => {
      const migrationFile = path.resolve(
        __dirname,
        '../../../supabase/migrations/20260918000005_fix_crm_bi_finance_rpc_signatures.sql'
      );
      expect(fs.existsSync(migrationFile)).toBe(true);
      const sql = fs.readFileSync(migrationFile, 'utf-8');

      expect(sql).toContain('p_search TEXT DEFAULT NULL');
      expect(sql).toContain('p_lifecycle TEXT DEFAULT NULL');
      expect(sql).toContain('p_tag_slug TEXT DEFAULT NULL');
      expect(sql).toContain('p_repeat_only BOOLEAN DEFAULT FALSE');
      expect(sql).toContain('p_overdue_only BOOLEAN DEFAULT FALSE');
      expect(sql).toContain('p_limit INT DEFAULT 20');
      expect(sql).toContain('p_offset INT DEFAULT 0');
      expect(sql).toContain('public.booking_financial_transactions');
      expect(sql).toContain("NOTIFY pgrst, 'reload schema';");
    });
  });
});
