// ==============================================================================
// Maison MIPA Memories - Root CRUD & Persistent Real Notifications Test Suite
// Validates:
// 1. Root Service CRUD (createService, updateService, deleteService)
// 2. Root Concept CRUD (createConcept, updateConcept, deleteConcept)
// 3. Site Media & In-Place Quick Edit operations
// 4. Real notifications derived from bookings, persistent read status, zero resurrect
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from '../catalogService';
import {
  getPublicConcepts,
  createConcept,
  updateConcept,
  deleteConcept,
} from '../portfolioService';
import {
  createCustomSiteAsset,
  updateSiteAssetWithUrl,
  deleteCustomSiteAsset,
  getSiteAssets,
  resetSiteAssetToDefault,
} from '../siteAssetService';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  clearAllNotifications,
  getReadNotificationIds,
  getDismissedNotificationIds,
} from '../notificationService';

describe('Root Owner / Admin CRUD & Persistent Notifications Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. Service CRUD for Root Owner / Admin
  // ============================================================================
  describe('Service CRUD', () => {
    it('allows creating, updating, and deleting services in catalog', async () => {
      const initialServices = await getServices();
      const initialCount = initialServices.length;

      // Create service
      const newService = await createService({
        name: 'Dịch Vụ Chụp Doanh Nhân VIP',
        description: 'Chụp chân dung lãnh đạo và profile doanh nghiệp cao cấp.',
        image: '/hero.png',
        displayOrder: 99,
      });

      expect(newService).toBeDefined();
      expect(newService.name).toBe('Dịch Vụ Chụp Doanh Nhân VIP');

      const afterCreate = await getServices();
      expect(afterCreate.length).toBe(initialCount + 1);
      expect(afterCreate.some((s) => s.id === newService.id)).toBe(true);

      // Update service
      const updatedService = await updateService(newService.id, {
        name: 'Dịch Vụ Chụp Doanh Nhân VIP (Updated)',
        description: 'Mô tả đã được cập nhật bởi Root Owner.',
      });

      expect(updatedService.name).toBe('Dịch Vụ Chụp Doanh Nhân VIP (Updated)');
      const afterUpdate = await getServices();
      const foundUpdated = afterUpdate.find((s) => s.id === newService.id);
      expect(foundUpdated?.name).toBe('Dịch Vụ Chụp Doanh Nhân VIP (Updated)');

      // Delete service
      await deleteService(newService.id);
      const afterDelete = await getServices();
      expect(afterDelete.length).toBe(initialCount);
      expect(afterDelete.some((s) => s.id === newService.id)).toBe(false);
    });
  });

  // ============================================================================
  // 2. Concept CRUD for Root Owner / Admin
  // ============================================================================
  describe('Concept CRUD', () => {
    it('allows creating, updating, and deleting concepts in portfolio', async () => {
      const initialConcepts = await getPublicConcepts();
      const initialCount = initialConcepts.length;

      // Create concept
      const createdConcept = await createConcept({
        name: 'Concept Cổ Điển Đông Dương 2026',
        slug: 'co-dien-dong-duong-2026',
        description: 'Phong cách Indochine hoài niệm với ánh sáng nghệ thuật.',
        coverPhotoUrl: '/concept-aodai.webp',
        bookable: true,
      });

      expect(createdConcept).toBeDefined();
      expect(createdConcept.name).toBe('Concept Cổ Điển Đông Dương 2026');

      const afterCreate = await getPublicConcepts();
      expect(afterCreate.length).toBe(initialCount + 1);
      expect(afterCreate.some((c) => c.id === createdConcept.id)).toBe(true);

      // Update concept
      const updatedConcept = await updateConcept(createdConcept.id, {
        name: 'Concept Cổ Điển Đông Dương 2026 (Chỉnh Sửa)',
        bookable: false,
      });

      expect(updatedConcept.name).toBe('Concept Cổ Điển Đông Dương 2026 (Chỉnh Sửa)');
      expect(updatedConcept.bookable).toBe(false);

      // Delete concept
      await deleteConcept(createdConcept.id);
      const afterDelete = await getPublicConcepts();
      expect(afterDelete.length).toBe(initialCount);
      expect(afterDelete.some((c) => c.id === createdConcept.id)).toBe(false);
    });
  });

  // ============================================================================
  // 3. Site Media & In-Place Quick Edit Assets
  // ============================================================================
  describe('Site Media & In-Place Quick Edit', () => {
    it('allows creating custom media slots and updating image URLs directly', async () => {
      // Create custom media slot
      const customAsset = await createCustomSiteAsset(
        {
          id: 'custom_banner_tet_2026',
          page: 'CUSTOM',
          label: 'Banner Tết 2026',
          description: 'Ảnh chào đón xuân 2026',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        },
        'user_admin'
      );

      expect(customAsset.id).toBe('custom_banner_tet_2026');
      expect(customAsset.page).toBe('CUSTOM');

      // Update URL directly
      const updatedAsset = await updateSiteAssetWithUrl(
        'custom_banner_tet_2026',
        'https://images.unsplash.com/photo-custom-updated',
        'user_admin'
      );
      expect(updatedAsset.imageUrl).toBe('https://images.unsplash.com/photo-custom-updated');

      // Verify in getSiteAssets
      const assets = await getSiteAssets();
      expect(assets['custom_banner_tet_2026']?.imageUrl).toBe(
        'https://images.unsplash.com/photo-custom-updated'
      );

      // Delete custom asset
      await deleteCustomSiteAsset('custom_banner_tet_2026');
      const assetsAfterDelete = await getSiteAssets();
      expect(assetsAfterDelete['custom_banner_tet_2026']).toBeUndefined();
    });
  });

  // ============================================================================
  // 4. Real Notifications & Permanent Read Tracking
  // ============================================================================
  describe('Real Notifications & Persistent Read State', () => {
    const testUserId = 'user_root_owner_test';

    it('generates real notifications and maintains read status across page reloads', async () => {
      // 1. Initial load generates real notifications from bookings
      const initialNotifs = await getUserNotifications(testUserId, 'ADMIN');
      expect(initialNotifs.length).toBeGreaterThan(0);

      const targetNotif = initialNotifs[0];
      expect(targetNotif.read).toBe(false);

      // 2. Mark target notification as read
      markNotificationAsRead(targetNotif.id, testUserId);

      const readIds = getReadNotificationIds(testUserId);
      expect(readIds.has(targetNotif.id)).toBe(true);

      // 3. Simulating page refresh / reopening web:
      // getUserNotifications re-runs with the same user ID
      const reloadedNotifs = await getUserNotifications(testUserId, 'ADMIN');
      const targetReloaded = reloadedNotifs.find((n) => n.id === targetNotif.id);

      expect(targetReloaded).toBeDefined();
      expect(targetReloaded?.read).toBe(true); // MUST stay read!
    });

    it('marks all notifications as read and retains status permanently', async () => {
      const notifs = await getUserNotifications(testUserId, 'ADMIN');
      const allIds = notifs.map((n) => n.id);

      markAllNotificationsAsRead(allIds, testUserId);

      const refreshedNotifs = await getUserNotifications(testUserId, 'ADMIN');
      const unreadCount = refreshedNotifs.filter((n) => !n.read).length;
      expect(unreadCount).toBe(0);
    });

    it('excludes dismissed notifications upon browser reload', async () => {
      const notifs = await getUserNotifications(testUserId, 'ADMIN');
      expect(notifs.length).toBeGreaterThan(1);
      const toDismiss = notifs[0];

      // Dismiss target notification
      dismissNotification(toDismiss.id, testUserId);
      expect(getDismissedNotificationIds(testUserId).has(toDismiss.id)).toBe(true);

      // Reloading notifications should not contain dismissed ID
      const afterDismiss = await getUserNotifications(testUserId, 'ADMIN');
      expect(afterDismiss.some((n) => n.id === toDismiss.id)).toBe(false);
    });

    it('clears all notifications when clearAll is triggered', async () => {
      const notifs = await getUserNotifications(testUserId, 'ADMIN');
      const allIds = notifs.map((n) => n.id);

      clearAllNotifications(allIds, testUserId);

      const afterClear = await getUserNotifications(testUserId, 'ADMIN');
      expect(afterClear.length).toBe(0);
    });
  });
});
