import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DB_TABLE_CONTRACTS, DB_RPC_CONTRACTS } from '../../contracts/databaseContract';

describe('Database Contract Parity & Type Drift Gate', () => {
  const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const combinedSql = migrationFiles
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf-8'))
    .join('\n');

  it('1. assign_booking_staff_v2 contract matches SQL exactly (supports notes and no role delete)', () => {
    const rpc = DB_RPC_CONTRACTS['assign_booking_staff_v2'];
    expect(rpc).toBeDefined();
    expect(rpc.arguments).toContain('p_booking_id');
    expect(rpc.arguments).toContain('p_employee_id');
    expect(rpc.arguments).toContain('p_assignment_role');
    expect(rpc.arguments).toContain('p_notes');

    // Migration 25 defines assign_booking_staff_v2 with p_notes
    const migration25 = fs.readFileSync(
      path.join(migrationsDir, '20260918000003_production_contract_reconciliation.sql'),
      'utf-8'
    );
    expect(migration25).toContain('FUNCTION public.assign_booking_staff_v2');
    expect(migration25).toContain('p_notes TEXT DEFAULT NULL');
  });

  it('2. checkout_booking_resource contract matches SQL canonical p_received_by_staff', () => {
    const rpc = DB_RPC_CONTRACTS['checkout_booking_resource'];
    expect(rpc).toBeDefined();
    expect(rpc.arguments).toContain('p_reservation_id');
    expect(rpc.arguments).toContain('p_received_by_staff');
    expect(rpc.arguments).not.toContain('p_employee_id');

    const migration25 = fs.readFileSync(
      path.join(migrationsDir, '20260918000003_production_contract_reconciliation.sql'),
      'utf-8'
    );
    expect(migration25).toContain('FUNCTION public.checkout_booking_resource');
    expect(migration25).toContain('p_received_by_staff UUID');
  });

  it('3. return_booking_resource contract matches canonical damage and condition arguments', () => {
    const rpc = DB_RPC_CONTRACTS['return_booking_resource'];
    expect(rpc).toBeDefined();
    expect(rpc.arguments).toContain('p_reservation_id');
    expect(rpc.arguments).toContain('p_condition_after');
    expect(rpc.arguments).toContain('p_damage_notes');
    expect(rpc.arguments).toContain('p_is_damaged');
    expect(rpc.arguments).toContain('p_damage_severity');
    expect(rpc.arguments).toContain('p_damage_description');
  });

  it('4. staff_skills table contract includes active column', () => {
    expect(DB_TABLE_CONTRACTS['staff_skills'].columns).toContain('active');
    expect(combinedSql).toContain('staff_skills');
  });

  it('5. staff_working_hours table contract includes timezone column', () => {
    expect(DB_TABLE_CONTRACTS['staff_working_hours'].columns).toContain('timezone');
  });

  it('6. resource_categories table contract includes active and is_consumable columns', () => {
    expect(DB_TABLE_CONTRACTS['resource_categories'].columns).toContain('active');
    expect(DB_TABLE_CONTRACTS['resource_categories'].columns).toContain('is_consumable');
  });

  it('7. studio_resources table contract includes next_maintenance_date and props_metadata', () => {
    expect(DB_TABLE_CONTRACTS['studio_resources'].columns).toContain('next_maintenance_date');
    expect(DB_TABLE_CONTRACTS['studio_resources'].columns).toContain('props_metadata');
  });

  it('8. booking_assignments table contract includes notes and slot_index for multi-person crew', () => {
    expect(DB_TABLE_CONTRACTS['booking_assignments'].columns).toContain('notes');
    expect(DB_TABLE_CONTRACTS['booking_assignments'].columns).toContain('slot_index');
  });

  it('9. authoritative availability RPC get_available_staff_for_booking exists in SQL and manifest', () => {
    const rpc = DB_RPC_CONTRACTS['get_available_staff_for_booking'];
    expect(rpc).toBeDefined();
    expect(rpc.arguments).toContain('p_booking_id');
    expect(rpc.arguments).toContain('p_assignment_role');
  });

  it('10. multi-person crew: composite unique index exists on booking_assignments', () => {
    const migration25 = fs.readFileSync(
      path.join(migrationsDir, '20260918000003_production_contract_reconciliation.sql'),
      'utf-8'
    );
    expect(migration25).toContain('idx_booking_assignments_booking_emp_role');
    expect(migration25).toContain('ON public.booking_assignments(booking_id, employee_id, assignment_role)');
  });
});
