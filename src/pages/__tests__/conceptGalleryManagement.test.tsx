import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConceptDetailPage } from '../ConceptDetailPage';
import * as portfolioService from '../../services/portfolioService';
import * as catalogService from '../../services/catalogService';
import * as AuthContext from '../../context/AuthContext';

describe('ConceptDetailPage Gallery Management & Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockConcept = {
    id: 'concept-test-id-123',
    slug: 'ao-dai-viet-nam',
    name: 'Áo Dài Việt Nam',
    description: 'Nét duyên dáng truyền thống',
    serviceId: 'srv-aodai',
    coverPhotoUrl: '/cover-aodai.webp',
    active: true,
    bookable: true,
    displayOrder: 1,
  };

  const mockCollections = [
    {
      id: 'col-1',
      slug: 'aodai-col-1',
      title: 'Áo Dài Collection',
      conceptId: mockConcept.id,
      status: 'PUBLISHED' as const,
      featured: true,
      photos: [
        {
          id: 'p-1',
          collectionId: 'col-1',
          url: '/gallery-1.webp',
          altText: 'Bối cảnh 1',
        },
        {
          id: 'p-2',
          collectionId: 'col-1',
          url: '/gallery-2.webp',
          altText: 'Bối cảnh 2',
        },
      ],
    },
  ];

  it('allows root/admin to see "+ Thêm ảnh bối cảnh", add a photo, and persist it across reload', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'root-1', email: 'owner@maisonmipa.vn' },
      role: 'ADMIN',
      isRootOwner: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(mockConcept as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue(mockCollections as any);
    vi.spyOn(catalogService, 'getServices').mockResolvedValue([]);
    vi.spyOn(catalogService, 'getPackages').mockResolvedValue([]);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/concept/ao-dai-viet-nam']}>
        <Routes>
          <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify concept is rendered
    expect(await screen.findByRole('heading', { name: 'Áo Dài Việt Nam' })).toBeInTheDocument();

    // Verify "+ Thêm ảnh bối cảnh" button exists
    const addBtn = screen.getByRole('button', { name: /Thêm ảnh bối cảnh/i });
    expect(addBtn).toBeInTheDocument();

    // Click "Thêm ảnh bối cảnh"
    fireEvent.click(addBtn);

    // Modal opens
    expect(await screen.findByText('Thêm góc nhìn & bối cảnh mới')).toBeInTheDocument();

    // Enter URL and alt text
    const urlInput = screen.getByPlaceholderText(/https:\/\/images\.unsplash\.com/i);
    const altInput = screen.getByPlaceholderText(/Ví dụ: Góc ban công đón nắng sớm/i);

    fireEvent.change(urlInput, { target: { value: 'https://example.com/new-photo.jpg' } });
    fireEvent.change(altInput, { target: { value: 'Bối cảnh hoa sen mới' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Lưu góc nhìn mới/i });
    fireEvent.click(submitBtn);

    // Verify modal closes and new photo appears
    await waitFor(() => {
      expect(screen.queryByText('Thêm ảnh bối cảnh / góc chụp mới')).not.toBeInTheDocument();
      expect(screen.getByText('Bối cảnh hoa sen mới')).toBeInTheDocument();
    });

    // Check localStorage persistence
    const storedRaw = localStorage.getItem('maison_mipa_concept_gallery_photos');
    expect(storedRaw).toBeTruthy();
    const storedMapping = JSON.parse(storedRaw || '{}');
    expect(storedMapping['ao-dai-viet-nam']).toBeDefined();
    expect(storedMapping['ao-dai-viet-nam'].some((p: any) => p.url === 'https://example.com/new-photo.jpg')).toBe(true);

    // Check global image override
    const overridesRaw = localStorage.getItem('mipa_global_image_overrides');
    expect(overridesRaw).toBeTruthy();

    // Now unmount and remount (simulating page reload)
    unmount();

    render(
      <MemoryRouter initialEntries={['/concept/ao-dai-viet-nam']}>
        <Routes>
          <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify that after remounting, the newly added photo still displays
    expect(await screen.findByRole('heading', { name: 'Áo Dài Việt Nam' })).toBeInTheDocument();
    expect(screen.getByText('Bối cảnh hoa sen mới')).toBeInTheDocument();

    // Now test deletion: find delete buttons with title "Xóa góc nhìn"
    const deleteButtons = screen.getAllByTitle(/Xóa góc nhìn/i);
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);

    // Delete the first photo
    fireEvent.click(deleteButtons[0]);

    // Check that localStorage updated after deletion
    const updatedRaw = localStorage.getItem('maison_mipa_concept_gallery_photos');
    const updatedMapping = JSON.parse(updatedRaw || '{}');
    expect(updatedMapping['ao-dai-viet-nam'].length).toBe(storedMapping['ao-dai-viet-nam'].length - 1);
  });
});
