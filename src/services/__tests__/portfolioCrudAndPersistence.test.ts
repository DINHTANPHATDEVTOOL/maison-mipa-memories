import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPublicCollections,
  getCollectionBySlug,
  getCollectionBySlugSync,
  createCollection,
  updateCollection,
  deleteCollection,
  createPortfolioPhoto,
  deletePortfolioPhoto,
} from '../portfolioService';

describe('Portfolio CRUD and Persistent Storage Overrides', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates collection title and description and persists across queries', async () => {
    const slug = 'parisian-romance-autumn';
    const original = await getCollectionBySlug(slug);
    expect(original).not.toBeNull();

    const updated = await updateCollection(original!.id, {
      title: 'Parisian Romance — Thu Cổ Điển Sang Trọng',
      description: 'Mô tả bộ ảnh mới đã được cập nhật thành công.',
    });

    expect(updated.title).toBe('Parisian Romance — Thu Cổ Điển Sang Trọng');
    expect(updated.description).toBe('Mô tả bộ ảnh mới đã được cập nhật thành công.');

    // Verify getCollectionBySlug returns updated data (simulating page reload)
    const fetched = await getCollectionBySlug(slug);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Parisian Romance — Thu Cổ Điển Sang Trọng');
    expect(fetched?.description).toBe('Mô tả bộ ảnh mới đã được cập nhật thành công.');

    // Verify synchronous cache lookup
    const syncFetched = getCollectionBySlugSync(slug);
    expect(syncFetched).not.toBeNull();
    expect(syncFetched?.title).toBe('Parisian Romance — Thu Cổ Điển Sang Trọng');

    // Verify getPublicCollections includes the updated title
    const publicCols = await getPublicCollections();
    const targetInList = publicCols.find((c) => c.slug === slug);
    expect(targetInList).toBeDefined();
    expect(targetInList?.title).toBe('Parisian Romance — Thu Cổ Điển Sang Trọng');
  });

  it('creates a new portfolio collection and lists it in public collections', async () => {
    const newCol = await createCollection({
      title: 'Bộ Sưu Tập Mùa Đông Hạnh Phúc',
      slug: 'mua-dong-hanh-phuc',
      description: 'Bộ ảnh gia đình ấm áp bên lò sưởi mùa đông.',
      status: 'PUBLISHED',
      featured: true,
      coverPhotoUrl: 'https://images.unsplash.com/test-winter.jpg',
    });

    expect(newCol.id).toBeDefined();
    expect(newCol.title).toBe('Bộ Sưu Tập Mùa Đông Hạnh Phúc');

    // Verify getCollectionBySlug
    const fetched = await getCollectionBySlug('mua-dong-hanh-phuc');
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Bộ Sưu Tập Mùa Đông Hạnh Phúc');

    // Verify getPublicCollections includes new collection
    const publicList = await getPublicCollections();
    expect(publicList.some((c) => c.slug === 'mua-dong-hanh-phuc')).toBe(true);
  });

  it('deletes a collection and removes it from public queries and slug lookups', async () => {
    const slug = 'vintage-loft-intimate';
    const col = await getCollectionBySlug(slug);
    expect(col).not.toBeNull();

    await deleteCollection(col!.id);

    // Verify getCollectionBySlug returns null
    const afterDelete = await getCollectionBySlug(slug);
    expect(afterDelete).toBeNull();

    // Verify getPublicCollections excludes deleted collection
    const publicList = await getPublicCollections();
    expect(publicList.some((c) => c.id === col!.id || c.slug === slug)).toBe(false);
  });

  it('adds and deletes photos inside a collection persistently', async () => {
    const slug = 'parisian-romance-autumn';
    const col = await getCollectionBySlug(slug);
    expect(col).not.toBeNull();

    const initialPhotoCount = col!.photos?.length || 0;

    // Add photo
    const newPhoto = await createPortfolioPhoto({
      collectionId: col!.id,
      filename: 'test-new-photo.webp',
      url: 'https://cdn.maisonmipa.vn/test-new-photo.webp',
      caption: 'Khoảnh khắc hoàng hôn lãng mạn',
      altText: 'Cặp đôi dưới hoàng hôn',
      featured: false,
    });

    expect(newPhoto.id).toBeDefined();

    // Verify collection now has +1 photo
    const updatedCol = await getCollectionBySlug(slug);
    expect(updatedCol?.photos?.length).toBe(initialPhotoCount + 1);
    expect(updatedCol?.photos?.some((p) => p.id === newPhoto.id)).toBe(true);

    // Delete photo
    await deletePortfolioPhoto(newPhoto.id);

    // Verify photo is removed
    const colAfterDelete = await getCollectionBySlug(slug);
    expect(colAfterDelete?.photos?.length).toBe(initialPhotoCount);
    expect(colAfterDelete?.photos?.some((p) => p.id === newPhoto.id)).toBe(false);
  });
});
