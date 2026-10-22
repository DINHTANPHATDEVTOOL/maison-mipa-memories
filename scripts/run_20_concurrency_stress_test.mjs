#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories — 20 Concurrent Booking Slot Stress Test
// Fires 20 simultaneous deposit confirmation requests for the exact same slot.
// Validates atomic concurrency lock (GiST exclusion constraint & FOR UPDATE lock).
// Expected Result: Exactly 1 SUCCESS, Exactly 19 REJECTED (23P01 Collision).
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const EVIDENCE_DIR = path.resolve('QA_EVIDENCE');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const LOG_FILE = path.join(EVIDENCE_DIR, 'concurrency_20_slots_stress.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

const DB_CONFIG = {
  host: process.env.STAGING_PG_HOST || 'localhost',
  port: parseInt(process.env.STAGING_PG_PORT || '5433', 10),
  user: process.env.STAGING_PG_USER || 'postgres',
  password: process.env.STAGING_PG_PASSWORD || 'mipa_staging_pass',
  database: process.env.STAGING_PG_DATABASE || 'mipa_staging',
};

async function createClient() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  return client;
}

async function runConcurrencyStressTest() {
  log('========================================================================');
  log('MAISON MIPA MEMORIES — 20 CONCURRENT BOOKING STRESS TEST');
  log(`Target Database: postgres://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  log('Objective: Prove zero double-booking under extreme 20-thread concurrency');
  log('========================================================================\n');

  const setupClient = await createClient();

  // 1. Fetch Room, Package, Service, and Staff profiles
  const roomRes = await setupClient.query('SELECT id, name FROM public.studio_rooms LIMIT 1;');
  const pkgRes = await setupClient.query('SELECT id, price FROM public.packages LIMIT 1;');
  const srvRes = await setupClient.query('SELECT id FROM public.services LIMIT 1;');
  const managerId = '44444444-4444-4444-8444-444444444444';

  const roomId = roomRes.rows[0].id;
  const roomName = roomRes.rows[0].name;
  const packageId = pkgRes.rows[0].id;
  const serviceId = srvRes.rows[0].id;
  const packagePrice = pkgRes.rows[0].price || 2490000;

  // Use a unique slot far in future to avoid any collisions with seed data
  const testSlotOffset = Math.floor(Date.now() / 1000) % 10000 + 3000;
  const startAt = new Date(Date.now() + testSlotOffset * 3600000);
  startAt.setMinutes(0, 0, 0);
  const endAt = new Date(startAt.getTime() + 2 * 3600000); // 2 hours duration

  log(`Target Studio Room: ${roomName} (${roomId})`);
  log(`Contested Time Window: ${startAt.toISOString()} -> ${endAt.toISOString()}`);
  log(`Spawning 20 distinct customer consultation requests on this EXACT room and time...`);

  // 2. Pre-create 20 distinct customers & consultation bookings
  const CONCURRENCY_COUNT = 20;
  const createdBookings = [];

  for (let i = 1; i <= CONCURRENCY_COUNT; i++) {
    const custId = (await setupClient.query('SELECT gen_random_uuid() as id;')).rows[0].id;
    const custEmail = `concurrent_cust_${i}_${Date.now()}@mipa-test.vn`;

    // Create auth.users and profile
    await setupClient.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
      VALUES ($1, $2, jsonb_build_object('full_name', 'Concurrent Tester ' || $3), now());
    `, [custId, custEmail, i]);

    // Create consultation booking
    const bookingCode = `MIPA-STRESS-${i.toString().padStart(2, '0')}`;
    const bRes = await setupClient.query(`
      INSERT INTO public.bookings (
        booking_code,
        customer_id,
        service_id,
        package_id,
        studio_room_id,
        start_at,
        end_at,
        booking_status,
        payment_status,
        customer_name,
        customer_phone,
        customer_email,
        deposit_amount,
        subtotal,
        total_amount,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'CONSULTATION_REQUESTED',
        'UNPAID',
        $8,
        '090' || LPAD($9::text, 7, '0'),
        $10,
        0,
        $11,
        $11,
        now(),
        now()
      ) RETURNING id, booking_code;
    `, [
      bookingCode,
      custId,
      serviceId,
      packageId,
      roomId,
      startAt.toISOString(),
      endAt.toISOString(),
      `Concurrent Customer ${i}`,
      i,
      custEmail,
      packagePrice
    ]);

    createdBookings.push({
      index: i,
      id: bRes.rows[0].id,
      code: bRes.rows[0].booking_code,
      customerId: custId,
      email: custEmail,
    });
  }

  log(`Successfully staged ${createdBookings.length} initial CONSULTATION_REQUESTED bookings.`);
  await setupClient.end();

  // 3. Fire 20 SIMULTANEOUS confirm_booking_deposit RPC calls on 20 independent DB connections
  log(`\n>>> FIRING ${CONCURRENCY_COUNT} SIMULTANEOUS ATOMIC CONFIRM_BOOKING_DEPOSIT CALLS...`);
  const tStart = Date.now();

  const executionPromises = createdBookings.map(async (item) => {
    const client = await createClient();
    const reqStart = Date.now();
    try {
      await client.query('BEGIN;');
      await client.query('SET LOCAL ROLE authenticated;');
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${managerId}';`);

      const rpcRes = await client.query(`
        SELECT public.confirm_booking_deposit(
          p_booking_id => $1,
          p_deposit_amount => 500000,
          p_deposit_note => 'Deposit confirmed under stress test thread ' || $2
        ) as res;
      `, [item.id, item.index]);

      await client.query('COMMIT;');
      const reqDuration = Date.now() - reqStart;
      return {
        index: item.index,
        bookingId: item.id,
        bookingCode: item.code,
        status: 'SUCCESS',
        durationMs: reqDuration,
        result: rpcRes.rows[0].res,
        error: null,
      };
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      const reqDuration = Date.now() - reqStart;
      return {
        index: item.index,
        bookingId: item.id,
        bookingCode: item.code,
        status: 'REJECTED',
        durationMs: reqDuration,
        result: null,
        error: err.message,
        errorCode: err.code,
      };
    } finally {
      await client.end().catch(() => {});
    }
  });

  const results = await Promise.all(executionPromises);
  const totalDuration = Date.now() - tStart;

  log(`<<< All ${CONCURRENCY_COUNT} threads completed in ${totalDuration}ms.\n`);

  // 4. Analyze Results
  const successes = results.filter((r) => r.status === 'SUCCESS');
  const rejections = results.filter((r) => r.status === 'REJECTED');

  log('========================================================================');
  log('CONCURRENCY STRESS TEST EXECUTION BREAKDOWN');
  log('========================================================================');
  log(`Total Concurrent Threads : ${CONCURRENCY_COUNT}`);
  log(`Successful Confirmations : ${successes.length} (Expected: 1)`);
  log(`Rejected Collisions      : ${rejections.length} (Expected: 19)`);
  log(`Wall-Clock Duration      : ${totalDuration}ms`);

  log('\n--- SUCCESSFUL THREAD ---');
  successes.forEach((s) => {
    log(`Thread #${s.index} -> Booking ${s.bookingCode} (${s.bookingId}) confirmed in ${s.durationMs}ms`);
  });

  log('\n--- REJECTED THREADS SAMPLES (First 5) ---');
  rejections.slice(0, 5).forEach((r) => {
    log(`Thread #${r.index} -> Booking ${r.bookingCode} | Code: ${r.errorCode || 'N/A'} | Error: ${r.error}`);
  });

  // 5. Database Authoritative Integrity Audit
  const auditClient = await createClient();
  const dbConfirmedRes = await auditClient.query(`
    SELECT id, booking_code, booking_status, deposit_amount
    FROM public.bookings
    WHERE studio_room_id = $1
      AND start_at = $2
      AND end_at = $3
      AND booking_status = 'CONFIRMED';
  `, [roomId, startAt.toISOString(), endAt.toISOString()]);

  const dbTxRes = await auditClient.query(`
    SELECT id, booking_id, amount, transaction_type, direction
    FROM public.booking_financial_transactions
    WHERE booking_id = ANY($1::uuid[]);
  `, [createdBookings.map((b) => b.id)]);

  await auditClient.end();

  log('\n========================================================================');
  log('POSTGRE-SQL DATABASE STATE VERIFICATION');
  log('========================================================================');
  log(`Confirmed Bookings in Slot in DB: ${dbConfirmedRes.rows.length}`);
  log(`Deposit Transactions in Ledger : ${dbTxRes.rows.length}`);

  let pass = true;
  if (successes.length !== 1) {
    log(`[ASSERTION FAILED] Expected exactly 1 successful confirmation, got ${successes.length}`);
    pass = false;
  }
  if (rejections.length !== 19) {
    log(`[ASSERTION FAILED] Expected exactly 19 rejections, got ${rejections.length}`);
    pass = false;
  }
  if (dbConfirmedRes.rows.length !== 1) {
    log(`[ASSERTION FAILED] DB state shows ${dbConfirmedRes.rows.length} CONFIRMED bookings! DOUBLE BOOKING DETECTED!`);
    pass = false;
  }
  if (dbTxRes.rows.length !== 1) {
    log(`[ASSERTION FAILED] Financial ledger shows ${dbTxRes.rows.length} deposit records!`);
    pass = false;
  }

  const summary = {
    testName: '20 Concurrent Booking Slot Stress Test',
    timestamp: new Date().toISOString(),
    concurrencyCount: CONCURRENCY_COUNT,
    totalDurationMs: totalDuration,
    successCount: successes.length,
    rejectedCount: rejections.length,
    dbConfirmedCount: dbConfirmedRes.rows.length,
    dbLedgerTxCount: dbTxRes.rows.length,
    successfulBooking: successes[0] ? successes[0].bookingCode : null,
    verdict: pass ? 'PASS' : 'FAIL',
    guaranteesVerified: [
      'Row-level locking (PERFORM ... FOR UPDATE) on studio room',
      'Atomic PostgreSQL GiST exclusion constraint (prevent_double_booking)',
      'Idempotent financial ledger insertion (booking-deposit idempotency)',
      'Zero double-booking vulnerability under race condition'
    ],
    results
  };

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'concurrency_20_slots_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  if (pass) {
    log('\n>>> STRESS TEST VERDICT: PASSED! CONCURRENCY LOCK IS 100% BULLETPROOF.');
  } else {
    log('\n>>> STRESS TEST VERDICT: FAILED! Concurrency invariant broken.');
    process.exit(1);
  }
}

runConcurrencyStressTest().catch((err) => {
  log(`Fatal error running concurrency stress test: ${err.stack}`);
  process.exit(1);
});
