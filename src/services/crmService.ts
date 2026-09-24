// ==============================================================================
// Maison MIPA Memories - CRM & Customer 360 Service
// Authoritative Customer CRM, Follow-up, Interaction Tracking, and Tagging
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  CrmCustomerListItem,
  Customer360,
  CrmInteraction,
  CrmFollowUpTask,
  CrmTag,
  CrmLifecycleStage,
  CrmInteractionType,
  CrmChannel,
  CrmTaskStatus,
  CrmTaskPriority,
} from '../types';

const INITIAL_CRM_CUSTOMERS: CrmCustomerListItem[] = [
  {
    id: 'user_cust_01',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh.nguyen@gmail.com',
    phone: '0908 123 456',
    accountStatus: 'ACTIVE',
    lifecycleStage: 'BOOKED',
    tags: [
      { id: 'tag-3', name: 'VIP', slug: 'vip', color: '#d97706', description: 'Khách hàng đặc biệt thân thiết', createdAt: new Date().toISOString() },
      { id: 'tag-5', name: 'Couple', slug: 'couple', color: '#db2777', description: 'Concept cặp đôi & kỷ niệm', createdAt: new Date().toISOString() },
    ],
    totalBookings: 3,
    confirmedBookings: 2,
    completedBookings: 1,
    confirmedBookingValue: 6970000,
    actualCashReceived: 4970000,
    outstandingBalance: 2000000,
    lastBookingAt: '2026-08-11',
    nextBookingAt: '2026-09-25',
    overdueTasksCount: 0,
    todayTasksCount: 1,
  },
  {
    id: 'user_cust_02',
    fullName: 'Trần Bảo Hải',
    email: 'haitran.design@yahoo.com',
    phone: '0918 654 321',
    accountStatus: 'ACTIVE',
    lifecycleStage: 'CONSULTATION',
    tags: [
      { id: 'tag-6', name: 'Cần follow-up', slug: 'can-follow-up', color: '#dc2626', description: 'Cần chăm sóc ngay', createdAt: new Date().toISOString() },
    ],
    totalBookings: 2,
    confirmedBookings: 1,
    completedBookings: 1,
    confirmedBookingValue: 4980000,
    actualCashReceived: 3000000,
    outstandingBalance: 1980000,
    lastBookingAt: '2026-08-11',
    overdueTasksCount: 1,
    todayTasksCount: 0,
  },
];

// In-memory data store for deterministic unit tests and demo mode
let inMemoryCustomers: CrmCustomerListItem[] = [...INITIAL_CRM_CUSTOMERS];
let inMemoryCustomer360: Map<string, Customer360> = new Map();
let inMemoryInteractions: CrmInteraction[] = [];
let inMemoryTasks: CrmFollowUpTask[] = [];
let inMemoryTags: CrmTag[] = [
  { id: 'tag-1', name: 'Khách cũ', slug: 'khach-cu', color: '#64748b', description: 'Đã từng sử dụng dịch vụ', createdAt: new Date().toISOString() },
  { id: 'tag-2', name: 'Khách quay lại', slug: 'khach-quay-lai', color: '#2563eb', description: 'Có nhiều hơn 1 booking', createdAt: new Date().toISOString() },
  { id: 'tag-3', name: 'VIP', slug: 'vip', color: '#d97706', description: 'Khách hàng đặc biệt thân thiết', createdAt: new Date().toISOString() },
  { id: 'tag-4', name: 'Gia đình', slug: 'gia-dinh', color: '#16a34a', description: 'Concept gia đình', createdAt: new Date().toISOString() },
  { id: 'tag-5', name: 'Couple', slug: 'couple', color: '#db2777', description: 'Concept cặp đôi & kỷ niệm', createdAt: new Date().toISOString() },
  { id: 'tag-6', name: 'Cần follow-up', slug: 'can-follow-up', color: '#dc2626', description: 'Cần chăm sóc ngay', createdAt: new Date().toISOString() },
];

export const resetInMemoryCrm = () => {
  inMemoryCustomers = [...INITIAL_CRM_CUSTOMERS];
  inMemoryCustomer360.clear();
  inMemoryInteractions = [];
  inMemoryTasks = [];
};

export const setInMemoryCustomer360 = (customerId: string, data: Customer360) => {
  inMemoryCustomer360.set(customerId, data);
};

export const setInMemoryCustomers = (customers: CrmCustomerListItem[]) => {
  inMemoryCustomers = [...customers];
};

export const setInMemoryTasks = (tasks: CrmFollowUpTask[]) => {
  inMemoryTasks = [...tasks];
};

export interface GetCrmCustomersParams {
  search?: string;
  lifecycle?: string;
  tag?: string;
  repeatOnly?: boolean;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GetCrmCustomersResult {
  customers: CrmCustomerListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Lists CRM customers with search, filtering, and server-side pagination.
 */
export async function getCrmCustomers(
  params: GetCrmCustomersParams = {}
): Promise<GetCrmCustomersResult> {
  const {
    search = '',
    lifecycle = '',
    tag = '',
    repeatOnly = false,
    overdueOnly = false,
    page = 1,
    pageSize = 20,
  } = params;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_crm_customers', {
      p_search: search || null,
      p_lifecycle: lifecycle || null,
      p_tag_slug: tag || null,
      p_repeat_only: repeatOnly,
      p_overdue_only: overdueOnly,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });

    if (error) {
      console.warn('[CRM] get_crm_customers RPC error, attempting client derivation fallback:', error.message);
      try {
        const { data: profilesData } = await supabase.from('profiles').select('*').eq('role', 'CUSTOMER');
        const { data: bookingsData } = await supabase.from('bookings').select('*');
        if (profilesData && profilesData.length > 0) {
          let derived: CrmCustomerListItem[] = profilesData.map((p: any) => {
            const pBookings = (bookingsData || []).filter((b: any) => b.customer_id === p.id);
            const confirmedBks = pBookings.filter((b: any) =>
              ['CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(b.booking_status)
            );
            const completedBks = pBookings.filter((b: any) => ['DELIVERED', 'COMPLETED'].includes(b.booking_status));
            const totalSpent = confirmedBks.reduce((sum: number, b: any) => sum + (Number(b.subtotal || 0) - Number(b.discount_total || 0)), 0);
            const totalDeposit = confirmedBks.reduce((sum: number, b: any) => sum + Number(b.deposit_amount || 0), 0);
            const outstanding = Math.max(0, totalSpent - totalDeposit);
            let stage: any = 'NEW_INQUIRY';
            if (completedBks.length >= 2) stage = 'VIP_REPEAT';
            else if (completedBks.length === 1) stage = 'ACTIVE_POST_SHOOT';
            else if (confirmedBks.length >= 1) stage = 'BOOKED_UPCOMING';
            else if (pBookings.length >= 1) stage = 'LEAD_CONSULTING';

            return {
              id: p.id,
              fullName: p.full_name || 'Khách hàng',
              email: p.email || '',
              phone: p.phone || '',
              accountStatus: p.status || 'ACTIVE',
              lifecycleStage: stage,
              totalBookings: pBookings.length,
              confirmedBookings: confirmedBks.length,
              completedBookings: completedBks.length,
              confirmedBookingValue: totalSpent,
              actualCashReceived: totalDeposit,
              outstandingBalance: outstanding,
              tags: [],
              overdueTasksCount: 0,
              todayTasksCount: 0,
            };
          });

          if (search) {
            const s = search.toLowerCase();
            derived = derived.filter(c => c.fullName.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.includes(s));
          }
          if (lifecycle) {
            derived = derived.filter(c => c.lifecycleStage === lifecycle);
          }
          if (repeatOnly) {
            derived = derived.filter(c => c.completedBookings >= 2);
          }

          return {
            totalCount: derived.length,
            customers: derived.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
          };
        }
      } catch (fbErr) {
        console.error('[CRM] Fallback failed:', fbErr);
      }
      throw new Error(`Không thể tải danh sách khách hàng CRM: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    const totalCount = rows.length > 0 && rows[0].total_count !== undefined
      ? Number(rows[0].total_count)
      : rows.length;

    const customers: CrmCustomerListItem[] = rows.map((r: any) => ({
      id: r.id,
      fullName: r.full_name || 'Khách hàng',
      email: r.email || '',
      phone: r.phone || '',
      accountStatus: r.account_status || 'ACTIVE',
      lifecycleStage: (r.lifecycle_stage as CrmLifecycleStage) || 'NEW',
      crmOwnerId: r.crm_owner_id || undefined,
      crmOwnerName: r.crm_owner_name || undefined,
      firstContactAt: r.first_contact_at || undefined,
      lastContactAt: r.last_contact_at || undefined,
      nextFollowUpAt: r.next_follow_up_at || undefined,
      tags: Array.isArray(r.tags) ? r.tags : [],
      totalBookings: Number(r.total_bookings || 0),
      confirmedBookings: Number(r.confirmed_bookings || 0),
      completedBookings: Number(r.completed_bookings || 0),
      confirmedBookingValue: Number(r.confirmed_booking_value || 0),
      actualCashReceived: Number(r.actual_cash_received || 0),
      outstandingBalance: Number(r.outstanding_balance || 0),
      lastBookingAt: r.last_booking_at || undefined,
      nextBookingAt: r.next_booking_at || undefined,
      overdueTasksCount: Number(r.overdue_tasks_count || 0),
      todayTasksCount: Number(r.today_tasks_count || 0),
    }));

    return {
      customers,
      totalCount,
      page,
      pageSize,
    };
  }

  // Fallback to in-memory store for tests and demo mode
  let filtered = [...inMemoryCustomers];

  if (search.trim()) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(
      c =>
        c.fullName.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s)
    );
  }

  if (lifecycle) {
    filtered = filtered.filter(c => c.lifecycleStage === lifecycle);
  }

  if (tag) {
    filtered = filtered.filter(c => c.tags.some(t => t.slug === tag || t.name === tag));
  }

  if (repeatOnly) {
    filtered = filtered.filter(c => c.confirmedBookings > 1 || c.completedBookings > 1);
  }

  if (overdueOnly) {
    filtered = filtered.filter(c => c.overdueTasksCount > 0);
  }

  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    customers: paginated,
    totalCount,
    page,
    pageSize,
  };
}

/**
 * Retrieves full Customer 360 data including identity, bookings, CRM interactions,
 * follow-up tasks, and financial ledger summary.
 */
export async function getCustomer360(customerId: string): Promise<Customer360> {
  if (!customerId) {
    throw new Error('Mã khách hàng không được để trống.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_customer_360', {
      p_customer_id: customerId,
    });

    if (error) {
      console.error('[CRM] get_customer_360 RPC error:', error);
      throw new Error(`Không thể tải thông tin Customer 360: ${error.message}`);
    }

    if (!data) {
      throw new Error('Không tìm thấy thông tin khách hàng.');
    }

    return data as Customer360;
  }

  const memoryData = inMemoryCustomer360.get(customerId);
  if (memoryData) {
    return memoryData;
  }

  // Generate fallback structure from in-memory customer if available
  const existing = inMemoryCustomers.find(c => c.id === customerId);
  return {
    identity: {
      id: customerId,
      fullName: existing?.fullName || 'Khách hàng',
      email: existing?.email || '',
      phone: existing?.phone || '',
      status: existing?.accountStatus || 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    crm: {
      lifecycleStage: existing?.lifecycleStage || 'NEW',
      crmOwnerId: existing?.crmOwnerId,
      crmOwnerName: existing?.crmOwnerName,
      firstContactAt: existing?.firstContactAt || new Date().toISOString(),
      lastContactAt: existing?.lastContactAt || new Date().toISOString(),
      tags: existing?.tags || [],
      notesCount: 0,
    },
    bookingsSummary: {
      totalBookings: existing?.totalBookings || 0,
      consultationRequests: 0,
      consulting: 0,
      confirmedBookings: existing?.confirmedBookings || 0,
      completedBookings: existing?.completedBookings || 0,
      cancelledBookings: 0,
      isRepeatCustomer: (existing?.confirmedBookings || 0) > 1,
    },
    financialSummary: {
      confirmedBookingValue: existing?.confirmedBookingValue || 0,
      completedBookingValue: 0,
      confirmedDeposits: 0,
      actualCashReceived: existing?.actualCashReceived || 0,
      outstandingBalance: existing?.outstandingBalance || 0,
      totalRefunded: 0,
    },
    preferences: {
      topServices: [],
      topConcepts: [],
      topAddons: [],
    },
    bookings: [],
    interactions: inMemoryInteractions.filter(i => i.customerId === customerId),
    financialTransactions: [],
    followUpTasks: inMemoryTasks.filter(t => t.customerId === customerId),
  };
}

/**
 * Records a new structured CRM interaction.
 */
export async function recordCrmInteraction(input: {
  customerId: string;
  bookingId?: string;
  interactionType: CrmInteractionType;
  channel: CrmChannel;
  outcome?: string;
  summary: string;
  occurredAt?: string;
  nextFollowUpAt?: string;
}): Promise<CrmInteraction> {
  if (!input.customerId || !input.summary.trim()) {
    throw new Error('Thông tin tương tác không hợp lệ (thiếu khách hàng hoặc nội dung).');
  }

  const occurredAt = input.occurredAt || new Date().toISOString();

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: userData } = await supabase.auth.getUser();
    const actorId = userData?.user?.id;

    const { data, error } = await supabase
      .from('crm_interactions')
      .insert({
        customer_id: input.customerId,
        booking_id: input.bookingId || null,
        actor_id: actorId || null,
        interaction_type: input.interactionType,
        channel: input.channel,
        outcome: input.outcome || null,
        summary: input.summary.trim(),
        occurred_at: occurredAt,
        next_follow_up_at: input.nextFollowUpAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM] insert interaction error:', error);
      throw new Error(`Không thể ghi nhận tương tác: ${error.message}`);
    }

    return {
      id: data.id,
      customerId: data.customer_id,
      bookingId: data.booking_id || undefined,
      actorId: data.actor_id || undefined,
      interactionType: data.interaction_type as CrmInteractionType,
      channel: data.channel as CrmChannel,
      outcome: data.outcome || undefined,
      summary: data.summary,
      occurredAt: data.occurred_at,
      nextFollowUpAt: data.next_follow_up_at || undefined,
      createdAt: data.created_at,
    };
  }

  const interaction: CrmInteraction = {
    id: `interaction-${Date.now()}`,
    customerId: input.customerId,
    bookingId: input.bookingId,
    interactionType: input.interactionType,
    channel: input.channel,
    outcome: input.outcome,
    summary: input.summary.trim(),
    occurredAt,
    nextFollowUpAt: input.nextFollowUpAt,
    createdAt: new Date().toISOString(),
  };

  inMemoryInteractions.unshift(interaction);
  return interaction;
}

/**
 * Creates a new follow-up task.
 */
export async function createFollowUpTask(input: {
  customerId: string;
  bookingId?: string;
  assignedTo?: string;
  taskType?: string;
  title: string;
  description?: string;
  dueAt: string;
  priority?: CrmTaskPriority;
}): Promise<CrmFollowUpTask> {
  if (!input.customerId || !input.title.trim() || !input.dueAt) {
    throw new Error('Thông tin follow-up không hợp lệ (thiếu khách hàng, tiêu đề, hoặc hạn xử lý).');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: userData } = await supabase.auth.getUser();
    const createdBy = userData?.user?.id;

    const { data, error } = await supabase
      .from('crm_follow_up_tasks')
      .insert({
        customer_id: input.customerId,
        booking_id: input.bookingId || null,
        assigned_to: input.assignedTo || null,
        task_type: input.taskType || 'FOLLOW_UP',
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_at: input.dueAt,
        status: 'TODO',
        priority: input.priority || 'NORMAL',
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM] insert follow-up error:', error);
      throw new Error(`Không thể tạo nhiệm vụ follow-up: ${error.message}`);
    }

    return {
      id: data.id,
      customerId: data.customer_id,
      bookingId: data.booking_id || undefined,
      assignedTo: data.assigned_to || undefined,
      taskType: data.task_type,
      title: data.title,
      description: data.description || undefined,
      dueAt: data.due_at,
      status: data.status as CrmTaskStatus,
      priority: data.priority as CrmTaskPriority,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const task: CrmFollowUpTask = {
    id: `task-${Date.now()}`,
    customerId: input.customerId,
    bookingId: input.bookingId,
    assignedTo: input.assignedTo,
    taskType: input.taskType || 'FOLLOW_UP',
    title: input.title.trim(),
    description: input.description?.trim(),
    dueAt: input.dueAt,
    status: 'TODO',
    priority: input.priority || 'NORMAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryTasks.unshift(task);
  return task;
}

/**
 * Updates a follow-up task status (e.g. TODO -> DONE).
 */
export async function updateFollowUpTaskStatus(
  taskId: string,
  status: CrmTaskStatus
): Promise<void> {
  if (!taskId) {
    throw new Error('Mã nhiệm vụ không được để trống.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'DONE') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = userId || null;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }

    const { error } = await supabase
      .from('crm_follow_up_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('[CRM] update task status error:', error);
      throw new Error(`Không thể cập nhật trạng thái nhiệm vụ: ${error.message}`);
    }
    return;
  }

  const task = inMemoryTasks.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (status === 'DONE') {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = undefined;
      task.completedBy = undefined;
    }
  }
}

/**
 * Lists follow-up tasks with filter by status or time range.
 */
export async function getFollowUpTasks(filters?: {
  status?: CrmTaskStatus;
  assignedTo?: string;
  overdueOnly?: boolean;
  todayOnly?: boolean;
}): Promise<CrmFollowUpTask[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let query = supabase
      .from('crm_follow_up_tasks')
      .select(`
        *,
        customer:profiles!crm_follow_up_tasks_customer_id_fkey(full_name, phone)
      `)
      .order('due_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[CRM] getFollowUpTasks error:', error);
      throw new Error(`Không thể tải danh sách follow-up: ${error.message}`);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    let list: CrmFollowUpTask[] = (data || []).map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.customer?.full_name || undefined,
      customerPhone: r.customer?.phone || undefined,
      bookingId: r.booking_id || undefined,
      assignedTo: r.assigned_to || undefined,
      taskType: r.task_type,
      title: r.title,
      description: r.description || undefined,
      dueAt: r.due_at,
      status: r.status as CrmTaskStatus,
      priority: r.priority as CrmTaskPriority,
      completedAt: r.completed_at || undefined,
      completedBy: r.completed_by || undefined,
      createdBy: r.created_by || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    if (filters?.overdueOnly) {
      list = list.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueAt < now.toISOString());
    } else if (filters?.todayOnly) {
      list = list.filter(t => t.dueAt >= todayStart && t.dueAt <= todayEnd);
    }

    return list;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  let list = [...inMemoryTasks];
  if (filters?.status) {
    list = list.filter(t => t.status === filters.status);
  }
  if (filters?.overdueOnly) {
    list = list.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueAt < now.toISOString());
  } else if (filters?.todayOnly) {
    list = list.filter(t => t.dueAt >= todayStart && t.dueAt <= todayEnd);
  }

  return list;
}

/**
 * Retrieves all available CRM tags.
 */
export async function getCrmTags(): Promise<CrmTag[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('crm_tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[CRM] get tags error:', error);
      return inMemoryTags;
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      description: t.description || undefined,
      createdAt: t.created_at,
    }));
  }

  return inMemoryTags;
}

/**
 * Attaches a tag to a customer.
 */
export async function assignCustomerTag(customerId: string, tagId: string): Promise<void> {
  if (!customerId || !tagId) return;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('crm_customer_tags')
      .upsert({
        customer_id: customerId,
        tag_id: tagId,
        tagged_by: userData?.user?.id || null,
      });

    if (error) {
      console.error('[CRM] assign tag error:', error);
      throw new Error(`Không thể gắn thẻ khách hàng: ${error.message}`);
    }
  }
}

/**
 * Removes a tag from a customer.
 */
export async function removeCustomerTag(customerId: string, tagId: string): Promise<void> {
  if (!customerId || !tagId) return;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { error } = await supabase
      .from('crm_customer_tags')
      .delete()
      .eq('customer_id', customerId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('[CRM] remove tag error:', error);
      throw new Error(`Không thể gỡ thẻ khách hàng: ${error.message}`);
    }
  }
}
