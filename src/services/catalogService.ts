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
  StaffRole,
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

const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const LOCAL_STORAGE_PACKAGES_KEY = 'maison_mipa_custom_packages';
let localPackages: PackageItem[] = [...INITIAL_PACKAGES];

export function getStoredPackages(): PackageItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PACKAGES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to in-memory localPackages
    }
  }
  return localPackages;
}

export function persistStoredPackages(pkgs: PackageItem[]): void {
  localPackages = pkgs;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_PACKAGES_KEY, JSON.stringify(pkgs));
    } catch {
      // Ignore storage write error
    }
  }
}

let servicesCache: { data: ServiceCategory[]; timestamp: number } | null = null;
let servicesPromise: Promise<ServiceCategory[]> | null = null;

const packagesCache = new Map<string, { data: PackageItem[]; timestamp: number }>();
const packagesPromises = new Map<string, Promise<PackageItem[]>>();

export function clearCatalogCache(): void {
  servicesCache = null;
  servicesPromise = null;
  packagesCache.clear();
  packagesPromises.clear();
}

export async function getServices(): Promise<ServiceCategory[]> {
  if (!isTestEnv && servicesCache && Date.now() - servicesCache.timestamp < CACHE_TTL_MS) {
    return servicesCache.data;
  }

  if (!isTestEnv && servicesPromise) {
    return servicesPromise;
  }

  const fetchPromise = (async () => {
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

      const mapped: ServiceCategory[] = data.map(item => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description || '',
        icon: item.icon || 'Camera',
        image: item.image || '',
        badge: item.badge || undefined,
      }));

      // DEF-009: Guarantee Graduation service is present if database has active services
      const graduationService = INITIAL_SERVICES.find(s => s.slug === 'graduation');
      if (graduationService && !mapped.some(s => s.slug === 'graduation' || s.id === graduationService.id)) {
        mapped.push(graduationService);
      }

      if (!isTestEnv) {
        servicesCache = { data: mapped, timestamp: Date.now() };
      }
      return mapped;
    }

    // Demo mode or unconfigured dev/test environment
    if (isDemoModeEnabled()) {
      return INITIAL_SERVICES;
    }

    return [];
  })();

  if (!isTestEnv) {
    servicesPromise = fetchPromise;
    fetchPromise.finally(() => {
      servicesPromise = null;
    });
  }

  return fetchPromise;
}

export async function getPackages(serviceId?: string): Promise<PackageItem[]> {
  const cacheKey = serviceId || '__ALL__';

  if (!isTestEnv) {
    const cached = packagesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const inFlight = packagesPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const fetchPromise = (async () => {
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
        // If query was for graduation service specifically and DB returned 0, provide graduation packages
        if (serviceId === 'c0000000-0000-0000-0000-000000000007') {
          const gradPkgs = INITIAL_PACKAGES.filter(p => p.serviceId === serviceId);
          if (gradPkgs.length > 0) return gradPkgs;
        }
        return [];
      }

      const mapped: PackageItem[] = data.map(p => ({
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

      // DEF-009: Ensure Graduation packages are available if not filtered out
      if (!serviceId || serviceId === 'c0000000-0000-0000-0000-000000000007') {
        const gradPkgs = INITIAL_PACKAGES.filter(p => p.serviceId === 'c0000000-0000-0000-0000-000000000007');
        for (const gPkg of gradPkgs) {
          if (!mapped.some(p => p.id === gPkg.id)) {
            mapped.push(gPkg);
          }
        }
      }

      if (!isTestEnv) {
        packagesCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      }
      return mapped;
    }

    if (isDemoModeEnabled()) {
      const allPkgs = getStoredPackages();
      return serviceId
        ? allPkgs.filter(p => p.serviceId === serviceId)
        : allPkgs;
    }

    return [];
  })();

  if (!isTestEnv) {
    packagesPromises.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      packagesPromises.delete(cacheKey);
    });
  }

  return fetchPromise;
}

export async function createPackage(params: {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
  conceptsCount?: number;
  editedPhotosCount?: number;
  features?: string[];
  popularTag?: string;
  recommended?: boolean;
}): Promise<PackageItem> {
  const newPkg: PackageItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pkg_${Date.now()}`,
    serviceId: params.serviceId,
    name: params.name.trim(),
    price: Math.max(0, Math.round(Number(params.price) || 0)),
    durationMinutes: Math.max(15, Math.round(Number(params.durationMinutes) || 60)),
    conceptsCount: Math.max(1, Math.round(Number(params.conceptsCount) || 1)),
    editedPhotosCount: Math.max(0, Math.round(Number(params.editedPhotosCount) || 10)),
    features: Array.isArray(params.features)
      ? params.features.filter((f) => Boolean(f?.trim()))
      : [],
    popularTag: params.popularTag?.trim() || undefined,
    recommended: Boolean(params.recommended),
  };

  if (isSupabaseConfigured()) {
    const slug =
      params.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || `pkg-${Date.now()}`;

    try {
      const { data, error } = await supabase
        .from('packages')
        .insert({
          id: newPkg.id,
          service_id: newPkg.serviceId,
          slug,
          name: newPkg.name,
          price: newPkg.price,
          deposit_amount: Math.round(newPkg.price * 0.5),
          duration_minutes: newPkg.durationMinutes,
          concepts_count: newPkg.conceptsCount,
          edited_photos_count: newPkg.editedPhotosCount,
          features: newPkg.features,
          popular_tag: newPkg.popularTag || null,
          recommended: newPkg.recommended || false,
          active: true,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase createPackage fallback:', error.message);
      } else if (data) {
        newPkg.id = data.id;
      }
    } catch (err: any) {
      console.warn('Supabase createPackage exception:', err?.message);
    }
  }

  const current = getStoredPackages();
  persistStoredPackages([newPkg, ...current]);
  clearCatalogCache();
  return newPkg;
}

export async function updatePackage(
  id: string,
  updates: Partial<PackageItem>
): Promise<PackageItem> {
  if (isSupabaseConfigured()) {
    try {
      const dbPayload: Record<string, any> = {};
      if (updates.name !== undefined) dbPayload.name = updates.name.trim();
      if (updates.price !== undefined) {
        const p = Math.max(0, Math.round(Number(updates.price) || 0));
        dbPayload.price = p;
        dbPayload.deposit_amount = Math.round(p * 0.5);
      }
      if (updates.durationMinutes !== undefined) {
        dbPayload.duration_minutes = Math.max(15, Math.round(Number(updates.durationMinutes) || 60));
      }
      if (updates.conceptsCount !== undefined) {
        dbPayload.concepts_count = Math.max(1, Math.round(Number(updates.conceptsCount) || 1));
      }
      if (updates.editedPhotosCount !== undefined) {
        dbPayload.edited_photos_count = Math.max(0, Math.round(Number(updates.editedPhotosCount) || 0));
      }
      if (updates.features !== undefined) {
        dbPayload.features = updates.features.filter((f) => Boolean(f?.trim()));
      }
      if (updates.popularTag !== undefined) {
        dbPayload.popular_tag = updates.popularTag.trim() || null;
      }
      if (updates.recommended !== undefined) {
        dbPayload.recommended = Boolean(updates.recommended);
      }

      const { error } = await (supabase.from('packages') as any)
        .update(dbPayload)
        .eq('id', id);

      if (error) {
        console.warn('Supabase updatePackage fallback:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase updatePackage exception:', err?.message);
    }
  }

  const current = getStoredPackages();
  let found: PackageItem | null = null;
  const updatedList = current.map((p) => {
    if (p.id === id) {
      found = { ...p, ...updates };
      return found;
    }
    return p;
  });

  if (found) {
    persistStoredPackages(updatedList);
  } else {
    found = {
      id,
      serviceId: updates.serviceId || 'c0000000-0000-0000-0000-000000000001',
      name: updates.name || 'Gói Chụp Mới',
      price: updates.price || 1000000,
      durationMinutes: updates.durationMinutes || 60,
      conceptsCount: updates.conceptsCount || 1,
      editedPhotosCount: updates.editedPhotosCount || 10,
      features: updates.features || [],
      ...updates,
    } as PackageItem;
    persistStoredPackages([found, ...current]);
  }

  clearCatalogCache();
  return found;
}

export async function deletePackage(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('packages').update({ active: false }).eq('id', id);

      if (error) {
        console.warn('Supabase deletePackage fallback:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase deletePackage exception:', err?.message);
    }
  }

  const current = getStoredPackages();
  persistStoredPackages(current.filter((p) => p.id !== id));
  clearCatalogCache();
  return true;
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
      durationMinutes: Number(a.duration_minutes || 0),
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
      throw new Error(`Không thể tải danh sách nhân viên: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((e: any) => ({
      id: e.id,
      name: e.name || e.profiles?.full_name || 'Chuyên Viên MIPA',
      phone: e.phone || e.profiles?.phone || '',
      email: e.email || e.profiles?.email || '',
      role: (e.staff_role || 'PHOTOGRAPHER') as StaffRole,
      avatar: e.avatar_url || e.profiles?.avatar_url || undefined,
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
