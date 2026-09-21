import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConceptDetailPage } from '../ConceptDetailPage';
import * as portfolioService from '../../services/portfolioService';
import * as catalogService from '../../services/catalogService';

describe('ConceptDetailPage Lightbox and Cover Photo Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConcept = {
    id: 'c1000000-0000-0000-0000-000000000001',
    slug: 'parisian-romance',
    name: 'Parisian Romance',
    description: 'Ánh sáng cửa sổ thơ mộng...',
    serviceId: 'srv-couple',
    coverPhotoUrl: '/hero-couple.jpg',
    active: true,
    bookable: true,
    displayOrder: 1,
  };

  const mockCollections = [
    {
      id: 'col-1',
      slug: 'parisian-col-1',
      title: 'Parisian Romance Collection',
      conceptId: mockConcept.id,
      status: 'PUBLISHED' as const,
      featured: true,
      photos: [
        {
          id: 'p-1',
          collectionId: 'col-1',
          url: '/hero-couple.jpg',
          filename: 'couple-1.webp',
          width: 1920,
          height: 1080,
          focalX: 50,
          focalY: 50,
          altText: 'Parisian Romance — Góc nhìn 1',
          sortOrder: 1,
          featured: true,
        },
        {
          id: 'p-2',
          collectionId: 'col-1',
          url: '/studio.png',
          filename: 'couple-2.webp',
          width: 1920,
          height: 1080,
          focalX: 50,
          focalY: 50,
          altText: 'Parisian Romance — Góc nhìn 2',
          sortOrder: 2,
          featured: false,
        },
      ],
    },
  ];

  it('renders concept detail and opens Darkroom Lightbox when clicking a gallery photo', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(mockConcept as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue(mockCollections as any);
    vi.spyOn(catalogService, 'getServices').mockResolvedValue([]);
    vi.spyOn(catalogService, 'getPackages').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/concept/parisian-romance']}>
        <Routes>
          <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    // Concept title should appear
    expect(await screen.findByRole('heading', { name: 'Parisian Romance' })).toBeInTheDocument();

    // Section 02 "Góc nhìn & bối cảnh" should be rendered
    expect(screen.getByText('Góc nhìn & bối cảnh')).toBeInTheDocument();

    // Lightbox should not be open initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Find gallery cards (button with aria-label containing "Phóng to xem")
    const zoomButtons = screen.getAllByRole('button', { name: /Phóng to xem/i });
    expect(zoomButtons.length).toBeGreaterThanOrEqual(2);

    // Click the second photo to zoom
    fireEvent.click(zoomButtons[1]);

    // Darkroom Lightbox modal should now be open
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Verify counter shows 2 / 2
    expect(screen.getByText(/2 \/ 2/i)).toBeInTheDocument();

    // Close button should close the lightbox
    const closeBtn = screen.getByRole('button', { name: /Đóng xem ảnh/i });
    fireEvent.click(closeBtn);

    // Lightbox should now be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('allows clicking the main hero image to zoom in lightbox', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(mockConcept as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue(mockCollections as any);
    vi.spyOn(catalogService, 'getServices').mockResolvedValue([]);
    vi.spyOn(catalogService, 'getPackages').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/concept/parisian-romance']}>
        <Routes>
          <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Parisian Romance' })).toBeInTheDocument();

    // Find the hero image frame
    const heroImage = screen.getByAltText('Parisian Romance');
    expect(heroImage).toBeInTheDocument();

    // Click the hero image frame
    fireEvent.click(heroImage);

    // Lightbox opens
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2/i)).toBeInTheDocument();
  });
});
