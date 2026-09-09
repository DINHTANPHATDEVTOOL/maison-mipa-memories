// ==============================================================================
// Maison MIPA Memories - Catalog Service Layer (Fail-Closed Production)
// Strict Rule: If Supabase is configured, DB returns are authoritative.
// No fallback to INITIAL_* mock data on error or empty table in production.
// ==============================================================================
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  ServiceCategory,
  PackageItem,
  Addon,
  StudioRoom,
  Promotion,
  Employee,
  Concept,
} from '../types';
import { getPublicConcepts } from './portfolioService';
export { getPublicConcepts as getConcepts };

import {
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_ADDONS,
  INITIAL_STUDIO_ROOMS,
  INITIAL_PROMOTIONS,
  INITIAL_EMPLOYEES,
} from '../mockData';

export async function getServices(): Promise<ServiceCategory[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to load services from database:', error.message);
      throw new Error(`Không thể tải danh mục dịch vụ: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description || '',
      icon: item.icon || 'Camera',
      image: item.image || '',
      badge: item.badge || undefined,
    }));
  }

  // Demo mode or unconfigured dev/test environment
  if (isDemoModeEnabled()) {
    return INITIAL_SERVICES;
  }

  return [];
}

export async function getPackages(serviceId?: string): Promise<PackageItem[]> {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('packages')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load packages from database:', error.message);
      throw new Error(`Không thể tải bảng giá gói chụp: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(p => ({
      id: p.id,
      serviceId: p.service_id,
      name: p.name,
      price: Number(p.price),
      durationMinutes: Number(p.duration_minutes),
      conceptsCount: Number(p.concepts_count || 1),
      editedPhotosCount: Number(p.edited_photos_count || 10),
      features: Array.isArray(p.features) ? p.features : [],
      recommended: Boolean(p.recommended),
      popularTag: p.popular_tag || undefined,
    }));
  }

  if (isDemoModeEnabled()) {
    return serviceId
      ? INITIAL_PACKAGES.filter(p => p.serviceId === serviceId)
      : INITIAL_PACKAGES;
  }

  return [];
}

export async function getAddons(): Promise<Addon[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('addons')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to load addons from database:', error.message);
      throw new Error(`Không thể tải dịch vụ kèm theo: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(a => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      description: a.description || '',
      category: a.category as any,
    }));
  }

  if (isDemoModeEnabled()) {
    return INITIAL_ADDONS;
  }

  return [];
}

export async function getStudioRooms(): Promise<StudioRoom[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('studio_rooms')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to load studio rooms from database:', error.message);
      throw new Error(`Không thể tải danh sách phòng studio: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      capacity: r.capacity,
      status: 'ACTIVE' as const,
      image: r.image || '',
      description: r.description || '',
    }));
  }

  if (isDemoModeEnabled()) {
    return INITIAL_STUDIO_ROOMS;
  }

  return [];
}

export async function getPromotions(): Promise<Promotion[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to load promotions from database:', error.message);
      throw new Error(`Không thể tải danh sách mã giảm giá: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(promo => ({
      id: promo.id,
      code: promo.code,
      discountPercent: Number(promo.discount_percent || 0),
      discountAmount: promo.discount_amount ? Number(promo.discount_amount) : undefined,
      minOrder: Number(promo.min_order || 0),
      maxDiscount: promo.max_discount ? Number(promo.max_discount) : undefined,
      startDate: promo.start_at || '',
      endDate: promo.end_at || '',
      usageCount: promo.usage_count,
      usageLimit: promo.usage_limit,
      applicableServiceId: promo.applicable_service_id || undefined,
      isActive: promo.active,
    }));
  }

  if (isDemoModeEnabled()) {
    return INITIAL_PROMOTIONS;
  }

  return [];
}

export async function getEmployees(): Promise<Employee[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('employees')
      .select('*, profiles(full_name, phone, email, avatar_url, role)')
      .eq('active', true);

    if (error) {
      console.error('Failed to load employees from database:', error.message);
      throw new Error(`Không thể tải danh sách nhân sự: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((e: any) => ({
      id: e.id,
      name: e.profiles?.full_name || 'Chuyên Viên MIPA',
      phone: e.profiles?.phone || '',
      email: e.profiles?.email || '',
      role: e.staff_role,
      avatar: e.profiles?.avatar_url || '/favicon.svg',
      skills: Array.isArray(e.skills) ? e.skills : [],
      rating: Number(e.rating || 5.0),
      totalSessions: e.total_sessions || 0,
      status: 'ACTIVE' as const,
      shiftSchedule: e.shift_schedule || {},
    }));
  }

  if (isDemoModeEnabled()) {
    return INITIAL_EMPLOYEES;
  }

  return [];
}
