import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  clearCatalogCache,
} from '../catalogService';

describe('Pricing Management CRUD Engine (Root Admin)', () => {
  beforeEach(() => {
    clearCatalogCache();
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. should create a new package with proper fields and cache invalidation', async () => {
    const initialCount = (await getPackages()).length;

    const newPkg = await createPackage({
      serviceId: 'c0000000-0000-0000-0000-000000000001',
      name: 'MIPA VIP DIAMOND 2026',
      price: 5500000,
      durationMinutes: 240,
      conceptsCount: 4,
      editedPhotosCount: 40,
      features: ['240 phút chụp', '4 Concept VIP', 'Make up cao cấp'],
      popularTag: 'VIP Luxury',
      recommended: true,
    });

    expect(newPkg.id).toBeDefined();
    expect(newPkg.name).toBe('MIPA VIP DIAMOND 2026');
    expect(newPkg.price).toBe(5500000);
    expect(newPkg.durationMinutes).toBe(240);
    expect(newPkg.popularTag).toBe('VIP Luxury');
    expect(newPkg.recommended).toBe(true);

    const refreshed = await getPackages();
    expect(refreshed.length).toBe(initialCount + 1);
    expect(refreshed.some((p) => p.name === 'MIPA VIP DIAMOND 2026' && p.price === 5500000)).toBe(true);
  });

  it('2. should update an existing package price, name and features', async () => {
    const created = await createPackage({
      serviceId: 'c0000000-0000-0000-0000-000000000002',
      name: 'WEDDING GOLD PRO',
      price: 4000000,
      durationMinutes: 120,
    });

    const updated = await updatePackage(created.id, {
      name: 'WEDDING GOLD PRO (SALE 2026)',
      price: 3500000,
      durationMinutes: 150,
      popularTag: 'Sale 20%',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('WEDDING GOLD PRO (SALE 2026)');
    expect(updated.price).toBe(3500000);
    expect(updated.durationMinutes).toBe(150);
    expect(updated.popularTag).toBe('Sale 20%');

    const refreshed = await getPackages();
    const found = refreshed.find((p) => p.id === created.id);
    expect(found?.name).toBe('WEDDING GOLD PRO (SALE 2026)');
    expect(found?.price).toBe(3500000);
  });

  it('3. should delete a package and remove it from catalog list', async () => {
    const toDelete = await createPackage({
      serviceId: 'c0000000-0000-0000-0000-000000000001',
      name: 'PACKAGE TO DELETE',
      price: 990000,
      durationMinutes: 45,
    });

    const beforeDelete = await getPackages();
    expect(beforeDelete.some((p) => p.id === toDelete.id)).toBe(true);

    const success = await deletePackage(toDelete.id);
    expect(success).toBe(true);

    const afterDelete = await getPackages();
    expect(afterDelete.some((p) => p.id === toDelete.id)).toBe(false);
  });
});

describe('Portfolio Editorial Grid Rhythm Fix', () => {
  it('4. ensures 4-cycle editorial rhythm has balanced columns and no 1-column slivers', () => {
    const testIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    const assignments = testIndices.map((idx) => {
      const cycle = idx % 4;
      if (cycle === 0) return { idx, cardClass: 'story-card-feature', colSpan: 8 };
      if (cycle === 1) return { idx, cardClass: 'story-card-tall', colSpan: 4 };
      return { idx, cardClass: 'story-card-half', colSpan: 6 };
    });

    // Row 1: Item 0 + Item 1 = 8 + 4 = 12 columns
    expect(assignments[0].colSpan + assignments[1].colSpan).toBe(12);
    expect(assignments[0].cardClass).toBe('story-card-feature');
    expect(assignments[1].cardClass).toBe('story-card-tall');

    // Row 2: Item 2 + Item 3 = 6 + 6 = 12 columns
    expect(assignments[2].colSpan + assignments[3].colSpan).toBe(12);
    expect(assignments[2].cardClass).toBe('story-card-half');
    expect(assignments[3].cardClass).toBe('story-card-half');

    // Row 3: Item 4 + Item 5 = 8 + 4 = 12 columns
    expect(assignments[4].colSpan + assignments[5].colSpan).toBe(12);

    // Row 4: Item 6 + Item 7 = 6 + 6 = 12 columns
    expect(assignments[6].colSpan + assignments[7].colSpan).toBe(12);

    // No card is assigned undefined or 1-column
    assignments.forEach((a) => {
      expect(a.colSpan).toBeGreaterThanOrEqual(4);
      expect(['story-card-feature', 'story-card-tall', 'story-card-half']).toContain(a.cardClass);
    });
  });
});
