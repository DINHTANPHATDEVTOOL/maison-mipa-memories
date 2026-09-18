// ==============================================================================
// Maison MIPA Memories — Database Contract Manifest V3
// Authoritative expected contracts for tables, columns, relations, and RPC signatures.
// ==============================================================================

export interface TableContract {
  name: string;
  requiredColumns: string[];
}

export interface RpcContract {
  name: string;
  expectedArgs: {
    name: string;
    type?: string;
    required: boolean;
  }[];
}

export const ACTIVE_DATABASE_CONTRACTS: {
  version: string;
  tables: TableContract[];
  rpcs: RpcContract[];
} = {
  version: '20260918-v3',
  tables: [
    {
      name: 'profiles',
      requiredColumns: ['id', 'email', 'full_name', 'role', 'staff_role', 'status'],
    },
    {
      name: 'services',
      requiredColumns: ['id', 'slug', 'name', 'category', 'is_active'],
    },
    {
      name: 'packages',
      requiredColumns: ['id', 'service_id', 'slug', 'name', 'price', 'is_active'],
    },
    {
      name: 'addons',
      requiredColumns: ['id', 'service_id', 'slug', 'name', 'price', 'duration_minutes', 'is_active'],
    },
    {
      name: 'studio_rooms',
      requiredColumns: ['id', 'slug', 'name', 'active'],
    },
    {
      name: 'employees',
      requiredColumns: ['id', 'profile_id', 'role', 'status', 'default_working_hours'],
    },
    {
      name: 'promotions',
      requiredColumns: ['id', 'code', 'discount_percent', 'discount_amount', 'min_order', 'max_discount', 'usage_count', 'usage_limit', 'start_at', 'end_at', 'is_active'],
    },
    {
      name: 'bookings',
      requiredColumns: [
        'id', 'booking_code', 'user_id', 'service_id', 'package_id', 'studio_room_id',
        'booking_status', 'start_at', 'end_at', 'deposit_amount', 'deposit_confirmed_at',
        'editing_due_at', 'delivery_due_at', 'crew_status', 'resource_status'
      ],
    },
    {
      name: 'booking_assignments',
      requiredColumns: ['id', 'booking_id', 'employee_id', 'assignment_role', 'start_at', 'end_at', 'notes', 'slot_index'],
    },
    {
      name: 'booking_proof_images',
      requiredColumns: ['id', 'booking_id', 'storage_path', 'preview_url', 'is_selected'],
    },
    {
      name: 'booking_photo_selections',
      requiredColumns: ['id', 'booking_id', 'submitted_at', 'selection_notes'],
    },
    {
      name: 'customer_crm_profiles',
      requiredColumns: ['id', 'full_name', 'email', 'phone', 'total_bookings', 'lifetime_value'],
    },
    {
      name: 'crm_interactions',
      requiredColumns: ['id', 'customer_id', 'channel', 'notes', 'actor_id'],
    },
    {
      name: 'crm_follow_up_tasks',
      requiredColumns: ['id', 'customer_id', 'due_date', 'status', 'title'],
    },
    {
      name: 'booking_financial_transactions',
      requiredColumns: ['id', 'booking_id', 'transaction_type', 'amount', 'recorded_by'],
    },
    {
      name: 'staff_skills',
      requiredColumns: ['id', 'code', 'name', 'category', 'active'],
    },
    {
      name: 'employee_skills',
      requiredColumns: ['employee_id', 'skill_id', 'proficiency_level'],
    },
    {
      name: 'staff_working_hours',
      requiredColumns: ['id', 'employee_id', 'day_of_week', 'start_time', 'end_time', 'is_day_off', 'timezone'],
    },
    {
      name: 'staff_leave_requests',
      requiredColumns: ['id', 'employee_id', 'leave_type', 'start_at', 'end_at', 'status'],
    },
    {
      name: 'staff_shifts',
      requiredColumns: ['id', 'employee_id', 'start_at', 'end_at', 'shift_type'],
    },
    {
      name: 'booking_crew_requirements',
      requiredColumns: ['id', 'role', 'required_count'],
    },
    {
      name: 'resource_categories',
      requiredColumns: ['id', 'code', 'name', 'active', 'is_consumable'],
    },
    {
      name: 'studio_resources',
      requiredColumns: [
        'id', 'category_id', 'asset_code', 'name', 'is_serialized', 'quantity_total',
        'quantity_available', 'current_location', 'condition', 'status', 'cleaning_status',
        'next_maintenance_date', 'props_metadata'
      ],
    },
    {
      name: 'booking_resource_reservations',
      requiredColumns: ['id', 'booking_id', 'resource_id', 'quantity', 'reserved_from', 'reserved_until', 'status'],
    },
    {
      name: 'booking_resource_handoffs',
      requiredColumns: ['id', 'reservation_id', 'resource_id', 'booking_id', 'checked_out_at', 'received_by_staff', 'condition_before'],
    },
    {
      name: 'resource_maintenance',
      requiredColumns: ['id', 'resource_id', 'maintenance_type', 'scheduled_at', 'status'],
    },
    {
      name: 'resource_incidents',
      requiredColumns: ['id', 'resource_id', 'reported_by', 'severity', 'description', 'status'],
    },
  ],
  rpcs: [
    {
      name: 'create_booking',
      expectedArgs: [
        { name: 'p_service_id', required: true },
        { name: 'p_package_id', required: true },
        { name: 'p_studio_room_id', required: true },
        { name: 'p_start_at', required: true },
      ],
    },
    {
      name: 'update_booking_consultation',
      expectedArgs: [
        { name: 'p_booking_id', required: true },
        { name: 'p_consultation_notes', required: false },
      ],
    },
    {
      name: 'confirm_booking_deposit',
      expectedArgs: [
        { name: 'p_booking_id', required: true },
        { name: 'p_deposit_amount', required: false },
        { name: 'p_note', required: false },
      ],
    },
    {
      name: 'assign_booking_staff_v2',
      expectedArgs: [
        { name: 'p_booking_id', required: true },
        { name: 'p_employee_id', required: true },
        { name: 'p_assignment_role', required: true },
        { name: 'p_start_at', required: false },
        { name: 'p_end_at', required: false },
        { name: 'p_notes', required: false },
      ],
    },
    {
      name: 'checkout_booking_resource',
      expectedArgs: [
        { name: 'p_reservation_id', required: true },
        { name: 'p_received_by_staff', required: true },
        { name: 'p_condition_before', required: false },
        { name: 'p_notes', required: false },
      ],
    },
    {
      name: 'return_booking_resource',
      expectedArgs: [
        { name: 'p_reservation_id', required: true },
        { name: 'p_condition_after', required: false },
        { name: 'p_damage_notes', required: false },
        { name: 'p_is_damaged', required: false },
        { name: 'p_damage_severity', required: false },
        { name: 'p_damage_description', required: false },
        { name: 'p_notes', required: false },
      ],
    },
    {
      name: 'get_available_staff_for_booking',
      expectedArgs: [
        { name: 'p_booking_id', required: true },
        { name: 'p_assignment_role', required: false },
      ],
    },
    {
      name: 'approve_staff_leave',
      expectedArgs: [
        { name: 'p_leave_id', required: true },
        { name: 'p_manager_note', required: false },
      ],
    },
    {
      name: 'reject_staff_leave',
      expectedArgs: [
        { name: 'p_leave_id', required: true },
        { name: 'p_manager_note', required: false },
      ],
    },
    {
      name: 'reserve_booking_resource',
      expectedArgs: [
        { name: 'p_booking_id', required: true },
        { name: 'p_resource_id', required: true },
        { name: 'p_quantity', required: false },
        { name: 'p_notes', required: false },
      ],
    },
    {
      name: 'get_operations_calendar_events',
      expectedArgs: [
        { name: 'p_start_at', required: true },
        { name: 'p_end_at', required: true },
      ],
    },
    {
      name: 'get_daily_operations_board',
      expectedArgs: [
        { name: 'p_target_date', required: false },
      ],
    },
  ],
};

export const DB_TABLE_CONTRACTS: Record<string, { columns: string[] }> = Object.fromEntries(
  ACTIVE_DATABASE_CONTRACTS.tables.map((t) => [t.name, { columns: t.requiredColumns }])
);

export const DB_RPC_CONTRACTS: Record<string, { arguments: string[] }> = Object.fromEntries(
  ACTIVE_DATABASE_CONTRACTS.rpcs.map((r) => [r.name, { arguments: r.expectedArgs.map((a) => a.name) }])
);
