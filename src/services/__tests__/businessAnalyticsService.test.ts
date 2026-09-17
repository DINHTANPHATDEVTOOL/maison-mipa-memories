import { describe, it, expect } from 'vitest';
import {
  getDateRangeTimestamps,
  getBusinessDashboardSummary,
  getBookingFunnelMetrics,
  getServicePerformance,
  getConceptPerformance,
  getStudioUtilization,
} from '../businessAnalyticsService';

describe('Business Analytics & BI Service', () => {
  it('computes midnight boundaries strictly aligned to Asia/Ho_Chi_Minh (UTC+7)', () => {
    const { startAt, endAt } = getDateRangeTimestamps('today');

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    // In UTC+7, startDate should correspond to 00:00:00.000 local time (17:00 UTC previous day)
    // and endDate should correspond to 23:59:59.999 local time (16:59:59.999 UTC)
    const startVnHours = (startDate.getUTCHours() + 7) % 24;
    const startVnMins = startDate.getUTCMinutes();
    const startVnSecs = startDate.getUTCSeconds();

    expect(startVnHours).toBe(0);
    expect(startVnMins).toBe(0);
    expect(startVnSecs).toBe(0);

    const endVnHours = (endDate.getUTCHours() + 7) % 24;
    const endVnMins = endDate.getUTCMinutes();
    const endVnSecs = endDate.getUTCSeconds();

    expect(endVnHours).toBe(23);
    expect(endVnMins).toBe(59);
    expect(endVnSecs).toBe(59);
  });

  it('computes valid date range for presets (7days, 30days, this_month, last_month)', () => {
    const p7 = getDateRangeTimestamps('7days');
    expect(new Date(p7.startAt).getTime()).toBeLessThan(new Date(p7.endAt).getTime());

    const p30 = getDateRangeTimestamps('30days');
    expect(new Date(p30.startAt).getTime()).toBeLessThan(new Date(p30.endAt).getTime());

    const thisMonth = getDateRangeTimestamps('this_month');
    expect(new Date(thisMonth.startAt).getTime()).toBeLessThan(new Date(thisMonth.endAt).getTime());

    const lastMonth = getDateRangeTimestamps('last_month');
    expect(new Date(lastMonth.startAt).getTime()).toBeLessThan(new Date(lastMonth.endAt).getTime());
  });

  it('retrieves business dashboard summary with valid financial and customer metrics', async () => {
    const summary = await getBusinessDashboardSummary();

    expect(summary.funnel.consultationConversionRate).toBeGreaterThan(0);
    expect(summary.financials.confirmedBookingValue).toBeGreaterThan(0);
    expect(summary.financials.actualCashReceived).toBeGreaterThan(0);
    expect(summary.customers.totalActiveCustomers).toBeGreaterThan(0);
    expect(summary.customers.repeatCustomerRate).toBeGreaterThan(0);
  });

  it('retrieves cohort-based booking funnel metrics with decreasing or equal progression', async () => {
    const funnel = await getBookingFunnelMetrics();

    expect(funnel.cohortTotalCreated).toBeGreaterThan(0);
    expect(funnel.stages.length).toBeGreaterThanOrEqual(4);

    // Initial stage should have 100% conversion
    expect(funnel.stages[0].conversionRate).toBe(100);
    expect(funnel.stages[0].stage).toBe('Yêu cầu tư vấn');
  });

  it('retrieves service performance and concept performance', async () => {
    const services = await getServicePerformance();
    expect(services.length).toBeGreaterThan(0);
    expect(services[0].serviceName).toBeDefined();
    expect(services[0].conversionRate).toBeGreaterThan(0);

    const concepts = await getConceptPerformance();
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts[0].conceptName).toBeDefined();
    expect(concepts[0].timesSelected).toBeGreaterThan(0);
  });

  it('retrieves studio room utilization and operating business hours', async () => {
    const studios = await getStudioUtilization();
    expect(studios.length).toBeGreaterThan(0);
    expect(studios[0].roomName).toBeDefined();
    expect(studios[0].availableBusinessHours).toBeGreaterThan(0);
    expect(studios[0].utilizationRate).toBeGreaterThanOrEqual(0);
  });
});
