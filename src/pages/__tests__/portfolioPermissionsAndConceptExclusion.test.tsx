import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { SiteAssetProvider } from '../../context/SiteAssetContext';
import { PortfolioPage } from '../PortfolioPage';
import { CollectionDetailPage } from '../CollectionDetailPage';
import ConceptCatalogPage from '../ConceptCatalogPage';
import ServicesPage from '../ServicesPage';
import PricingPage from '../PricingPage';
import { getPublicConcepts } from '../../services/portfolioService';

describe('Permissions & Concept Exclusion Regression Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('1. PortfolioPage: Unauthenticated guest NEVER sees QUẢN TRỊ PORTFOLIO or Thêm Bộ Sưu Tập Mới', async () => {
    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <AuthProvider>
          <SiteAssetProvider>
            <PortfolioPage />
          </SiteAssetProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/QUẢN TRỊ PORTFOLIO/i)).toBeNull();
      expect(screen.queryByText(/Thêm Bộ Sưu Tập Mới/i)).toBeNull();
      expect(screen.queryByText(/Chỉnh sửa thông tin/i)).toBeNull();
      expect(screen.queryByText(/Xóa bộ sưu tập/i)).toBeNull();
    });
  });

  it('2. CollectionDetailPage: Unauthenticated guest NEVER sees collection management bar', async () => {
    render(
      <MemoryRouter initialEntries={['/portfolio/parisian-romance-autumn']}>
        <AuthProvider>
          <SiteAssetProvider>
            <Routes>
              <Route path="/portfolio/:slug" element={<CollectionDetailPage />} />
            </Routes>
          </SiteAssetProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/QUẢN TRỊ BỘ SƯU TẬP/i)).toBeNull();
      expect(screen.queryByText(/Chỉnh Sửa Bộ Sưu Tập/i)).toBeNull();
      expect(screen.queryByText(/Thêm Ảnh Mới/i)).toBeNull();
      expect(screen.queryByText(/Xóa Bộ Sưu Tập/i)).toBeNull();
    });
  });

  it('3. ServicesPage: Unauthenticated guest NEVER sees service management bar', async () => {
    render(
      <MemoryRouter initialEntries={['/dich-vu']}>
        <AuthProvider>
          <SiteAssetProvider>
            <ServicesPage onOpenBooking={() => {}} />
          </SiteAssetProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Quản Lý Dịch Vụ/i)).toBeNull();
      expect(screen.queryByText(/Thêm Dịch Vụ/i)).toBeNull();
    });
  });

  it('4. PricingPage: Unauthenticated guest NEVER sees pricing admin controls', async () => {
    render(
      <MemoryRouter initialEntries={['/bang-gia']}>
        <AuthProvider>
          <SiteAssetProvider>
            <PricingPage onOpenBooking={() => {}} />
          </SiteAssetProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Quản Lý Bảng Giá/i)).toBeNull();
      expect(screen.queryByText(/Thêm Gói Mới/i)).toBeNull();
    });
  });

  it('5. ConceptCatalogPage: Unauthenticated guest NEVER sees concept management buttons and NO french-haute-couture', async () => {
    render(
      <MemoryRouter initialEntries={['/concept']}>
        <AuthProvider>
          <SiteAssetProvider>
            <ConceptCatalogPage onOpenBooking={() => {}} />
          </SiteAssetProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Thêm Concept Mới/i)).toBeNull();
      expect(screen.queryByText(/French Haute Couture/i)).toBeNull();
    });
  });

  it('6. portfolioService: getPublicConcepts does NOT contain french-haute-couture and has photo concepts', async () => {
    const concepts = await getPublicConcepts();
    const slugs = concepts.map(c => c.slug);
    expect(slugs).not.toContain('french-haute-couture');
    expect(slugs).toContain('nang-tho');
    expect(slugs).toContain('chup-ao-dai-duyen-dang');
    expect(slugs).toContain('chup-ky-yeu-tot-nghiep');
  });
});
