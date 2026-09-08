// ==============================================================================
// Maison MIPA Memories - Catalog Service Layer
// Loads services, packages, addons, studio rooms, promotions from Supabase
// with seamless fallback to verified defaults when offline/unconfigured.
// ==============================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ServiceCategory,
  PackageItem,
  Addon,
  StudioRoom,
  Promotion,
  Employee,
} from '../types';
import {
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_ADDONS,
  INITIAL_STUDIO_ROOMS,
  INITIAL_PROMOTIONS,
  INITIAL_EMPLOYEES,
} from '../mockData';

export async function getServices(): Promise<ServiceCategory[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_SERVICES;
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_SERVICES;
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
  } catch {
    return INITIAL_SERVICES;
  }
}

export async function getPackages(serviceId?: string): Promise<PackageItem[]> {
  if (!isSupabaseConfigured()) {
    return serviceId
      ? INITIAL_PACKAGES.filter(p => p.serviceId === serviceId)
      : INITIAL_PACKAGES;
  }

  try {
    let query = supabase
      .from('packages')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return serviceId
        ? INITIAL_PACKAGES.filter(p => p.serviceId === serviceId)
        : INITIAL_PACKAGES;
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
  } catch {
    return serviceId
      ? INITIAL_PACKAGES.filter(p => p.serviceId === serviceId)
      : INITIAL_PACKAGES;
  }
}

export async function getAddons(): Promise<Addon[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_ADDONS;
  }

  try {
    const { data, error } = await supabase
      .from('addons')
      .select('*')
      .eq('active', true);

    if (error || !data || data.length === 0) {
      return INITIAL_ADDONS;
    }

    return data.map(a => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      description: a.description || '',
      category: a.category as Addon['category'],
    }));
  } catch {
    return INITIAL_ADDONS;
  }
}

export async function getStudioRooms(): Promise<StudioRoom[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_STUDIO_ROOMS;
  }

  try {
    const { data, error } = await supabase
      .from('studio_rooms')
      .select('*')
      .eq('active', true);

    if (error || !data || data.length === 0) {
      return INITIAL_STUDIO_ROOMS;
    }

    return data.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      capacity: Number(s.capacity || 6),
      status: s.active ? 'ACTIVE' : 'MAINTENANCE',
      image: s.image || '/studio.png',
      description: s.description || '',
    }));
  } catch {
    return INITIAL_STUDIO_ROOMS;
  }
}

export async function getPromotions(): Promise<Promotion[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_PROMOTIONS;
  }

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true);

    if (error || !data || data.length === 0) {
      return INITIAL_PROMOTIONS;
    }

    return data.map(pr => ({
      id: pr.id,
      code: pr.code,
      discountPercent: Number(pr.discount_percent || 0),
      discountAmount: Number(pr.discount_amount || 0),
      minOrder: Number(pr.min_order || 0),
      maxDiscount: pr.max_discount ? Number(pr.max_discount) : undefined,
      startDate: pr.start_at || '',
      endDate: pr.end_at || '',
      usageCount: Number(pr.usage_count || 0),
      usageLimit: Number(pr.usage_limit || 100),
      applicableServiceId: pr.applicable_service_id || undefined,
      isActive: Boolean(pr.active),
    }));
  } catch {
    return INITIAL_PROMOTIONS;
  }
}

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured()) {
    return INITIAL_EMPLOYEES;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['STAFF', 'MANAGER', 'ADMIN'])
      .eq('status', 'ACTIVE');

    if (error || !data || data.length === 0) {
      return INITIAL_EMPLOYEES;
    }

    return data.map(profile => ({
      id: profile.id,
      name: profile.full_name || 'Nhân viên MIPA',
      email: profile.email,
      phone: profile.phone || '',
      role: (profile.staff_role || 'PHOTOGRAPHER') as Employee['role'],
      avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      skills: ['Chụp ảnh Studio', 'Ánh sáng nghệ thuật'],
      rating: 5.0,
      totalSessions: 24,
      status: 'ACTIVE',
      shiftSchedule: { T2: '09:00 - 18:00', T4: '09:00 - 18:00', T6: '09:00 - 18:00' },
    }));
  } catch {
    return INITIAL_EMPLOYEES;
  }
}
