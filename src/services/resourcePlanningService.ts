// ==============================================================================
// Maison MIPA Memories - Resource Planning & Inventory Management Service
// Authoritative Equipment, Props, Wardrobe, Consumables, Handoffs & Maintenance
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import { normalizeError } from '../utils/AppError';
import type {
  ResourceCategory,
  StudioResource,
  ResourceReservation,
  ResourceHandoff,
  ResourceMaintenance,
  ResourceIncident,
  ResourceCondition,
} from '../types';

const DEFAULT_CATEGORIES: ResourceCategory[] = [
  { id: 'cat-cam', code: 'CAMERA_BODY', name: 'Thân máy ảnh', icon: 'camera', isConsumable: false, active: true },
  { id: 'cat-lens', code: 'LENS', name: 'Ống kính (Lenses)', icon: 'disc', isConsumable: false, active: true },
  { id: 'cat-light', code: 'LIGHTING', name: 'Đèn & Ánh sáng Studio', icon: 'sun', isConsumable: false, active: true },
  { id: 'cat-mod', code: 'MODIFIER', name: 'Softbox & Dù tản sáng', icon: 'maximize', isConsumable: false, active: true },
  { id: 'cat-prop', code: 'PROP', name: 'Đạo cụ decor nghệ thuật', icon: 'box', isConsumable: false, active: true },
  { id: 'cat-ward', code: 'WARDROBE', name: 'Trang phục & Phụ kiện', icon: 'shirt', isConsumable: false, active: true },
  { id: 'cat-con', code: 'CONSUMABLE', name: 'Vật tư tiêu hao (Pin/Phim/Giấy)', icon: 'battery-charging', isConsumable: true, active: true },
];

let inMemoryResources: StudioResource[] = [
  {
    id: 'res-cam-001',
    assetCode: 'CAM-001',
    categoryId: 'cat-cam',
    categoryName: 'Thân máy ảnh',
    name: 'Sony Alpha A7 IV Body',
    brand: 'Sony',
    model: 'ILCE-7M4',
    serialNumber: 'SN-7849102',
    currentLocation: 'Studio A',
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'chiếc',
    reorderThreshold: 0,
    nextMaintenanceDate: '2026-10-15',
    notes: 'Máy chính chụp Portrait Studio',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-cam-002',
    assetCode: 'CAM-002',
    categoryId: 'cat-cam',
    categoryName: 'Thân máy ảnh',
    name: 'Fujifilm GFX 100S II Medium Format',
    brand: 'Fujifilm',
    model: 'GFX100SII',
    serialNumber: 'SN-GFX99120',
    currentLocation: 'Studio B',
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'chiếc',
    reorderThreshold: 0,
    nextMaintenanceDate: '2026-11-01',
    notes: 'Máy cao cấp cho Haute Couture & Fine Art',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-lens-001',
    assetCode: 'LENS-001',
    categoryId: 'cat-lens',
    categoryName: 'Ống kính (Lenses)',
    name: 'Sony FE 50mm f/1.2 GM',
    brand: 'Sony',
    model: 'SEL50F12GM',
    currentLocation: 'Tủ chống ẩm A',
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'chiếc',
    reorderThreshold: 0,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-lens-002',
    assetCode: 'LENS-002',
    categoryId: 'cat-lens',
    categoryName: 'Ống kính (Lenses)',
    name: 'Sony FE 85mm f/1.4 GM II',
    brand: 'Sony',
    model: 'SEL85F14GM2',
    currentLocation: 'Tủ chống ẩm A',
    condition: 'GOOD',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'chiếc',
    reorderThreshold: 0,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-light-001',
    assetCode: 'LIGHT-001',
    categoryId: 'cat-light',
    categoryName: 'Đèn & Ánh sáng Studio',
    name: 'Profoto B10X Plus 500W Kit (2 đèn)',
    brand: 'Profoto',
    model: 'B10X Plus',
    currentLocation: 'Studio A',
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'bộ',
    reorderThreshold: 0,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-prop-001',
    assetCode: 'PROP-001',
    categoryId: 'cat-prop',
    categoryName: 'Đạo cụ decor nghệ thuật',
    name: 'Ghế bành Cổ điển Pháp Vintage Louis XVI',
    currentLocation: 'Studio A',
    condition: 'GOOD',
    status: 'AVAILABLE',
    isSerialized: true,
    quantityTotal: 1,
    quantityAvailable: 1,
    unit: 'chiếc',
    reorderThreshold: 0,
    propsMetadata: { color: 'Kem cổ điển', style: 'French Classical', tags: ['portrait', 'vintage'] },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'res-bat-001',
    assetCode: 'BAT-001',
    categoryId: 'cat-con',
    categoryName: 'Vật tư tiêu hao (Pin/Phim/Giấy)',
    name: 'Pin Sony NP-FZ100 sạc đầy',
    brand: 'Sony',
    model: 'NP-FZ100',
    currentLocation: 'Kệ pin sạc Studio',
    condition: 'EXCELLENT',
    status: 'AVAILABLE',
    isSerialized: false,
    quantityTotal: 12,
    quantityAvailable: 10,
    unit: 'viên',
    reorderThreshold: 4,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
];

let inMemoryReservations: ResourceReservation[] = [];
let inMemoryHandoffs: ResourceHandoff[] = [];
let inMemoryIncidents: ResourceIncident[] = [];
let _inMemoryMaintenance: ResourceMaintenance[] = [];

/**
 * Fetch all resource categories
 */
export async function getResourceCategories(): Promise<ResourceCategory[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('active', true)
      .order('code', { ascending: true });

    if (error) {
      throw normalizeError(error, 'getResourceCategories');
    }

    return (data || []).map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      icon: c.icon,
      isConsumable: c.is_consumable,
      active: c.active,
    }));
  }
  return DEFAULT_CATEGORIES;
}

/**
 * Fetch studio inventory with optional filtering
 */
export async function getStudioResources(params?: {
  categoryId?: string;
  status?: string;
  searchQuery?: string;
  lowStockOnly?: boolean;
}): Promise<StudioResource[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let query = supabase
      .from('studio_resources')
      .select(`
        *,
        resource_categories:category_id (name)
      `)
      .order('asset_code', { ascending: true });

    if (params?.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.searchQuery) {
      query = query.or(`name.ilike.%${params.searchQuery}%,asset_code.ilike.%${params.searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw normalizeError(error, 'getStudioResources');
    }

    let items = (data || []).map(r => ({
      id: r.id,
      assetCode: r.asset_code,
      categoryId: r.category_id,
      categoryName: (r.resource_categories as any)?.name || 'Thiết bị',
      name: r.name,
      brand: r.brand,
      model: r.model,
      serialNumber: r.serial_number,
      purchaseDate: r.purchase_date,
      purchaseCost: r.purchase_cost,
      currentLocation: r.current_location,
      condition: r.condition as any,
      status: r.status as any,
      cleaningStatus: r.cleaning_status as any,
      isSerialized: r.is_serialized,
      quantityTotal: r.quantity_total,
      quantityAvailable: r.quantity_available,
      unit: r.unit,
      reorderThreshold: r.reorder_threshold,
      nextMaintenanceDate: r.next_maintenance_date,
      propsMetadata: r.props_metadata as any,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    if (params?.lowStockOnly) {
      items = items.filter(i => !i.isSerialized && i.quantityAvailable <= i.reorderThreshold);
    }

    return items;
  }

  let result = [...inMemoryResources];
  if (params?.categoryId) {
    result = result.filter(r => r.categoryId === params.categoryId);
  }
  if (params?.status) {
    result = result.filter(r => r.status === params.status);
  }
  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase();
    result = result.filter(r => r.name.toLowerCase().includes(q) || r.assetCode.toLowerCase().includes(q));
  }
  if (params?.lowStockOnly) {
    result = result.filter(r => !r.isSerialized && r.quantityAvailable <= r.reorderThreshold);
  }
  return result;
}

/**
 * Fetch reservations for a booking
 */
export async function getBookingReservations(bookingId: string): Promise<ResourceReservation[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('booking_resource_reservations')
      .select(`
        *,
        studio_resources:resource_id (name, asset_code)
      `)
      .eq('booking_id', bookingId)
      .neq('status', 'CANCELLED');

    if (error) {
      throw normalizeError(error, 'getBookingReservations');
    }

    return (data || []).map(r => ({
      id: r.id,
      bookingId: r.booking_id,
      resourceId: r.resource_id,
      resourceName: (r.studio_resources as any)?.name || 'Tài nguyên',
      assetCode: (r.studio_resources as any)?.asset_code || '',
      quantity: r.quantity,
      reservedFrom: r.reserved_from,
      reservedUntil: r.reserved_until,
      status: r.status as any,
      notes: r.notes,
      reservedBy: r.reserved_by,
    }));
  }

  return inMemoryReservations.filter(r => r.bookingId === bookingId);
}

/**
 * Authoritatively reserve a resource for a booking via transactional advisory-locked RPC
 */
export async function reserveBookingResource(params: {
  bookingId: string;
  resourceId: string;
  quantity?: number;
  notes?: string;
}): Promise<ResourceReservation> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('reserve_booking_resource', {
      p_booking_id: params.bookingId,
      p_resource_id: params.resourceId,
      p_quantity: params.quantity || 1,
      p_notes: params.notes || null,
    });

    if (error) {
      throw normalizeError(error, 'reserveBookingResource');
    }

    const res = data as any;
    if (res && res.success === false) {
      throw normalizeError(new Error(res.error || 'Đặt giữ thiết bị thất bại do trùng thời gian hoặc đã hết số lượng.'), 'reserveBookingResource');
    }

    const reservation = res.reservation || res;
    return {
      id: reservation.id,
      bookingId: reservation.booking_id,
      resourceId: reservation.resource_id,
      resourceName: reservation.resource_name || 'Thiết bị',
      assetCode: reservation.asset_code || '',
      quantity: reservation.quantity,
      reservedFrom: reservation.reserved_from,
      reservedUntil: reservation.reserved_until,
      status: reservation.status,
      notes: reservation.notes,
    };
  }

  // In-memory logic
  const res = inMemoryResources.find(r => r.id === params.resourceId);
  if (!res) throw new Error('Không tìm thấy thiết bị.');

  const newReservation: ResourceReservation = {
    id: `resv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookingId: params.bookingId,
    resourceId: params.resourceId,
    resourceName: res.name,
    assetCode: res.assetCode,
    quantity: params.quantity || 1,
    reservedFrom: new Date().toISOString(),
    reservedUntil: new Date().toISOString(),
    status: 'RESERVED',
    notes: params.notes || null,
  };
  inMemoryReservations.push(newReservation);
  return newReservation;
}

/**
 * Check out equipment physically to an assigned staff member
 */
export async function checkoutBookingResource(params: {
  reservationId: string;
  employeeId: string;
  conditionBefore?: ResourceCondition;
  notes?: string;
}): Promise<ResourceHandoff> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('checkout_booking_resource', {
      p_reservation_id: params.reservationId,
      p_received_by_staff: params.employeeId,
      p_condition_before: params.conditionBefore || 'EXCELLENT',
      p_notes: params.notes || null,
    });

    if (error) throw normalizeError(error, 'checkoutBookingResource');
    const res = data as any;
    if (res && res.success === false) {
      throw normalizeError(new Error(res.error || 'Bàn giao xuất kho thất bại.'), 'checkoutBookingResource');
    }

    const handoff = res.handoff || res;
    return {
      id: handoff.id,
      reservationId: handoff.reservation_id,
      resourceId: handoff.resource_id,
      bookingId: handoff.booking_id,
      employeeId: handoff.employee_id || handoff.received_by_staff || params.employeeId,
      handoffType: 'CHECKOUT',
      conditionState: handoff.condition_state || params.conditionBefore || 'EXCELLENT',
      actorId: handoff.actor_id || handoff.checked_out_by,
      notes: handoff.notes,
      createdAt: handoff.created_at || new Date().toISOString(),
    };
  }

  // In-memory
  let reservation = inMemoryReservations.find(r => r.id === params.reservationId);
  if (!reservation) {
    reservation = inMemoryReservations.find(r => r.resourceId === params.reservationId);
  }
  if (!reservation) {
    reservation = {
      id: params.reservationId,
      bookingId: 'book-default',
      resourceId: params.reservationId,
      quantity: 1,
      reservedFrom: new Date().toISOString(),
      reservedUntil: new Date().toISOString(),
      status: 'RESERVED',
    };
    inMemoryReservations.push(reservation);
  }

  reservation.status = 'CHECKED_OUT';
  const handoff: ResourceHandoff = {
    id: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reservationId: params.reservationId,
    resourceId: reservation.resourceId,
    bookingId: reservation.bookingId,
    employeeId: params.employeeId,
    handoffType: 'CHECKOUT',
    conditionState: params.conditionBefore || 'EXCELLENT',
    actorId: 'mgr-01',
    notes: params.notes || null,
    createdAt: new Date().toISOString(),
  };
  inMemoryHandoffs.push(handoff);
  return handoff;
}

/**
 * Return equipment, recording condition and automatically logging damage if needed
 */
export async function returnBookingResource(params: {
  reservationId: string;
  conditionAfter?: ResourceCondition;
  isDamaged?: boolean;
  damageSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  damageDescription?: string;
  notes?: string;
}): Promise<ResourceHandoff> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('return_booking_resource', {
      p_reservation_id: params.reservationId,
      p_condition_after: params.conditionAfter || 'EXCELLENT',
      p_damage_notes: params.damageDescription || null,
      p_is_damaged: params.isDamaged || false,
      p_damage_severity: params.damageSeverity || null,
      p_damage_description: params.damageDescription || null,
      p_notes: params.notes || null,
    });

    if (error) throw normalizeError(error, 'returnBookingResource');
    const res = data as any;
    if (res && res.success === false) {
      throw normalizeError(new Error(res.error || 'Thu hồi thiết bị thất bại.'), 'returnBookingResource');
    }

    const handoff = res.handoff || res;
    return {
      id: handoff.id,
      reservationId: handoff.reservation_id,
      resourceId: handoff.resource_id,
      bookingId: handoff.booking_id,
      employeeId: handoff.employee_id || 'staff',
      handoffType: 'RETURN',
      conditionState: handoff.condition_state || params.conditionAfter || 'EXCELLENT',
      actorId: handoff.actor_id || 'manager',
      notes: handoff.notes,
      createdAt: handoff.created_at || new Date().toISOString(),
    };
  }

  // In-memory
  let reservation = inMemoryReservations.find(r => r.id === params.reservationId);
  if (!reservation) {
    reservation = inMemoryReservations.find(r => r.resourceId === params.reservationId);
  }
  if (!reservation) {
    reservation = {
      id: params.reservationId,
      bookingId: 'book-default',
      resourceId: params.reservationId,
      quantity: 1,
      reservedFrom: new Date().toISOString(),
      reservedUntil: new Date().toISOString(),
      status: 'CHECKED_OUT',
    };
    inMemoryReservations.push(reservation);
  }

  reservation.status = 'RETURNED';
  const resource = inMemoryResources.find(r => r.id === reservation!.resourceId);
  if (resource) {
    resource.condition = params.conditionAfter || 'EXCELLENT';
    resource.status = params.isDamaged ? 'DAMAGED' : 'AVAILABLE';
  }

  if (params.isDamaged && resource) {
    inMemoryIncidents.push({
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId: resource.id,
      resourceName: resource.name,
      bookingId: reservation.bookingId,
      reportedBy: 'mgr-01',
      description: params.damageDescription || 'Hỏng hóc ghi nhận khi hoàn trả thiết bị',
      severity: params.damageSeverity || 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });
  }

  const handoff: ResourceHandoff = {
    id: `handoff-${Date.now()}`,
    reservationId: params.reservationId,
    resourceId: reservation.resourceId,
    bookingId: reservation.bookingId,
    employeeId: 'emp-01',
    handoffType: 'RETURN',
    conditionState: params.conditionAfter || 'EXCELLENT',
    actorId: 'mgr-01',
    notes: params.notes || null,
    createdAt: new Date().toISOString(),
  };
  inMemoryHandoffs.push(handoff);
  return handoff;
}

/**
 * Fetch incidents / damage tickets
 */
export async function getResourceIncidents(): Promise<ResourceIncident[]> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase
      .from('resource_incidents')
      .select(`
        *,
        studio_resources:resource_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw normalizeError(error, 'getResourceIncidents');
    }

    return (data || []).map(i => ({
      id: i.id,
      resourceId: i.resource_id,
      resourceName: (i.studio_resources as any)?.name || 'Thiết bị',
      bookingId: i.booking_id,
      reportedBy: i.reported_by,
      description: i.description,
      severity: i.severity as any,
      status: i.status as any,
      resolutionNote: i.resolution_note,
      resolvedBy: i.resolved_by,
      resolvedAt: i.resolved_at,
      createdAt: i.created_at,
    }));
  }
  return [...inMemoryIncidents];
}
