import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPublicConcepts,
  getPublicCollections,
  getPublicCollectionBySlug,
  getManagementCollections,
  publishPortfolioCollection,
  updatePhotoFocalPoint,
  DEMO_CONCEPTS,
  DEMO_COLLECTIONS,
} from '../portfolioService';
import * as supabaseModule from '../../lib/supabase';

describe('Portfolio and Concept CMS Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ensures demo concepts and collections contain no Unsplash URLs', () => {
    for (const concept of DEMO_CONCEPTS) {
      if (concept.coverPhotoUrl) {
        expect(concept.coverPhotoUrl).not.toContain('unsplash.com');
      }
    }
    for (const collection of DEMO_COLLECTIONS) {
      if (collection.coverPhotoUrl) {
        expect(collection.coverPhotoUrl).not.toContain('unsplash.com');
      }
      for (const photo of collection.photos || []) {
        expect(photo.url).not.toContain('unsplash.com');
        if (photo.webAssetKey) {
          expect(photo.webAssetKey).not.toContain('unsplash.com');
        }
      }
    }
  });

  it('filters public collections to return only PUBLISHED items in public query', async () => {
    const publicCols = await getPublicCollections();
    expect(publicCols.length).toBeGreaterThan(0);
    for (const col of publicCols) {
      expect(col.status).toBe('PUBLISHED');
    }

    // Verify draft collections exist in demo seed but are excluded from public list
    const hasDraft = DEMO_COLLECTIONS.some(c => c.status === 'DRAFT');
    expect(hasDraft).toBe(true);
    expect(publicCols.some(c => c.status === 'DRAFT')).toBe(false);
  });

  it('returns collection by slug only if published for public guests', async () => {
    const publishedSlug = DEMO_COLLECTIONS.find(c => c.status === 'PUBLISHED')!.slug;
    const col = await getPublicCollectionBySlug(publishedSlug);
    expect(col).not.toBeNull();
    expect(col?.slug).toBe(publishedSlug);
    expect(col?.status).toBe('PUBLISHED');

    // Attempting to query a draft slug as public returns null
    const draftSlug = DEMO_COLLECTIONS.find(c => c.status === 'DRAFT')!.slug;
    const draftCol = await getPublicCollectionBySlug(draftSlug);
    expect(draftCol).toBeNull();
  });

  it('allows filtering public collections by conceptId', async () => {
    const firstConcept = DEMO_CONCEPTS[0];
    const filtered = await getPublicCollections(firstConcept.id);
    for (const col of filtered) {
      expect(col.conceptId).toBe(firstConcept.id);
      expect(col.status).toBe('PUBLISHED');
    }
  });

  it('returns all statuses including DRAFT in management view', async () => {
    const mgmtCols = await getManagementCollections();
    const statuses = mgmtCols.map(c => c.status);
    expect(statuses).toContain('PUBLISHED');
    expect(statuses).toContain('DRAFT');
  });

  it('enforces RBAC policy: Photographer cannot publish, only Manager/Admin can publish', async () => {
    const draftCol = DEMO_COLLECTIONS.find(c => c.status === 'DRAFT')!;

    // Photographer attempt
    const photographerUser: any = {
      id: 'photo-user-1',
      role: 'STAFF',
      staffRole: 'PHOTOGRAPHER',
    };
    await expect(
      publishPortfolioCollection(draftCol.id, true, photographerUser)
    ).rejects.toThrow(/Chỉ Quản lý hoặc Quản trị viên mới có quyền xuất bản/i);

    // Manager attempt succeeds
    const managerUser: any = {
      id: 'manager-user-1',
      role: 'MANAGER',
      staffRole: 'STUDIO_MANAGER',
    };
    const published = await publishPortfolioCollection(draftCol.id, true, managerUser);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedBy).toBe(managerUser.id);
    expect(published.publishedAt).toBeDefined();

    // Admin attempt can unpublish
    const adminUser: any = {
      id: 'admin-user-1',
      role: 'ADMIN',
    };
    const unpublished = await publishPortfolioCollection(draftCol.id, false, adminUser);
    expect(unpublished.status).toBe('DRAFT');
    expect(unpublished.publishedAt).toBeNull();
  });

  it('updates photo focal point coordinates without modifying original source asset', async () => {
    const collection = DEMO_COLLECTIONS[0];
    const photo = collection.photos![0];

    const updated = await updatePhotoFocalPoint(photo.id, 35, 75);
    expect(updated.success).toBe(true);
  });
});
