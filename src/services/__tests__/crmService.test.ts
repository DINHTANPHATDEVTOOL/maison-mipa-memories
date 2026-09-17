import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCrmCustomers,
  getCustomer360,
  recordCrmInteraction,
  createFollowUpTask,
  updateFollowUpTaskStatus,
  getFollowUpTasks,
  resetInMemoryCrm,
  setInMemoryCustomers,
  setInMemoryCustomer360,
} from '../crmService';
import type { CrmCustomerListItem, Customer360 } from '../../types';

describe('CRM Service & Customer 360 Logic', () => {
  beforeEach(() => {
    resetInMemoryCrm();
  });

  const mockCustomers: CrmCustomerListItem[] = [
    {
      id: 'cust-1',
      fullName: 'Trần Thị Mai',
      email: 'mai.tran@example.com',
      phone: '0901112233',
      accountStatus: 'ACTIVE',
      lifecycleStage: 'BOOKED',
      tags: [{ id: 'tag-1', name: 'VIP', slug: 'vip', color: '#d97706', createdAt: new Date().toISOString() }],
      totalBookings: 3,
      confirmedBookings: 2,
      completedBookings: 1,
      confirmedBookingValue: 12000000,
      actualCashReceived: 9000000,
      outstandingBalance: 3000000,
      overdueTasksCount: 0,
      todayTasksCount: 1,
    },
    {
      id: 'cust-2',
      fullName: 'Lê Hoàng Nam',
      email: 'nam.le@example.com',
      phone: '0988776655',
      accountStatus: 'ACTIVE',
      lifecycleStage: 'CONSULTATION',
      tags: [{ id: 'tag-2', name: 'Cần follow-up', slug: 'can-follow-up', color: '#dc2626', createdAt: new Date().toISOString() }],
      totalBookings: 1,
      confirmedBookings: 0,
      completedBookings: 0,
      confirmedBookingValue: 0,
      actualCashReceived: 0,
      outstandingBalance: 0,
      overdueTasksCount: 1,
      todayTasksCount: 0,
    },
  ];

  it('filters customers by search query (name, phone, email)', async () => {
    setInMemoryCustomers(mockCustomers);

    const resByName = await getCrmCustomers({ search: 'Trần' });
    expect(resByName.customers.length).toBe(1);
    expect(resByName.customers[0].id).toBe('cust-1');

    const resByPhone = await getCrmCustomers({ search: '0988' });
    expect(resByPhone.customers.length).toBe(1);
    expect(resByPhone.customers[0].id).toBe('cust-2');
  });

  it('filters customers by lifecycle and repeat status', async () => {
    setInMemoryCustomers(mockCustomers);

    const resLifecycle = await getCrmCustomers({ lifecycle: 'CONSULTATION' });
    expect(resLifecycle.customers.length).toBe(1);
    expect(resLifecycle.customers[0].fullName).toBe('Lê Hoàng Nam');

    const resRepeat = await getCrmCustomers({ repeatOnly: true });
    expect(resRepeat.customers.length).toBe(1);
    expect(resRepeat.customers[0].fullName).toBe('Trần Thị Mai');
  });

  it('filters customers by overdue tasks count', async () => {
    setInMemoryCustomers(mockCustomers);

    const resOverdue = await getCrmCustomers({ overdueOnly: true });
    expect(resOverdue.customers.length).toBe(1);
    expect(resOverdue.customers[0].id).toBe('cust-2');
  });

  it('retrieves Customer 360 data including commercial summary and preferences', async () => {
    const mock360: Customer360 = {
      identity: {
        id: 'cust-1',
        fullName: 'Trần Thị Mai',
        email: 'mai.tran@example.com',
        phone: '0901112233',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      crm: {
        lifecycleStage: 'BOOKED',
        firstContactAt: '2026-08-01T10:00:00Z',
        lastContactAt: '2026-09-15T14:00:00Z',
        tags: [],
        notesCount: 2,
      },
      bookingsSummary: {
        totalBookings: 2,
        consultationRequests: 2,
        consulting: 0,
        confirmedBookings: 2,
        completedBookings: 1,
        cancelledBookings: 0,
        isRepeatCustomer: true,
      },
      financialSummary: {
        confirmedBookingValue: 10000000,
        completedBookingValue: 5000000,
        confirmedDeposits: 4000000,
        actualCashReceived: 8000000,
        outstandingBalance: 2000000,
        totalRefunded: 0,
      },
      preferences: {
        topServices: [{ id: 'srv-1', name: 'Wedding', count: 2 }],
        topConcepts: [{ id: 'cpt-1', name: 'Parisian Chic', count: 2 }],
        topAddons: [],
      },
      bookings: [],
      interactions: [],
      financialTransactions: [],
      followUpTasks: [],
    };

    setInMemoryCustomer360('cust-1', mock360);

    const result = await getCustomer360('cust-1');
    expect(result.identity.fullName).toBe('Trần Thị Mai');
    expect(result.bookingsSummary.isRepeatCustomer).toBe(true);
    expect(result.financialSummary.actualCashReceived).toBe(8000000);
    expect(result.financialSummary.outstandingBalance).toBe(2000000);
  });

  it('records structured CRM interaction', async () => {
    const interaction = await recordCrmInteraction({
      customerId: 'cust-1',
      interactionType: 'CONSULTATION_CALL',
      channel: 'PHONE',
      summary: 'Khách gọi hỏi gói chụp cưới 2 concepts',
      outcome: 'Hẹn gửi báo giá qua Zalo',
    });

    expect(interaction.id).toBeDefined();
    expect(interaction.customerId).toBe('cust-1');
    expect(interaction.interactionType).toBe('CONSULTATION_CALL');
    expect(interaction.channel).toBe('PHONE');
    expect(interaction.summary).toBe('Khách gọi hỏi gói chụp cưới 2 concepts');
  });

  it('creates and completes follow-up tasks', async () => {
    const task = await createFollowUpTask({
      customerId: 'cust-1',
      title: 'Gọi nhắc khách lịch thử đồ',
      dueAt: new Date(Date.now() + 3600000).toISOString(),
      priority: 'HIGH',
    });

    expect(task.id).toBeDefined();
    expect(task.status).toBe('TODO');
    expect(task.priority).toBe('HIGH');

    // Update status to DONE
    await updateFollowUpTaskStatus(task.id, 'DONE');
    const tasks = await getFollowUpTasks();
    const updated = tasks.find(t => t.id === task.id);
    expect(updated?.status).toBe('DONE');
    expect(updated?.completedAt).toBeDefined();
  });
});
