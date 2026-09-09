import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CollectionDetailPage } from '../../pages/CollectionDetailPage';
import { DEMO_COLLECTIONS } from '../../services/portfolioService';
import { HelmetProvider } from 'react-helmet-async';

describe('CollectionDetailPage and Accessible Lightbox', () => {
  const publishedCol = DEMO_COLLECTIONS.find(c => c.status === 'PUBLISHED')!;

  const renderComponent = (slug: string = publishedCol.slug, onOpenBooking = vi.fn()) => {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/portfolio/${slug}`]}>
          <Routes>
            <Route
              path="/portfolio/:slug"
              element={<CollectionDetailPage onOpenBooking={onOpenBooking} />}
            />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );
  };

  it('renders cinematic cover, collection title, and photo gallery', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: publishedCol.title })).toBeInTheDocument();
    });

    // Check gallery photos exist
    const photoButtons = screen.getAllByRole('button', { name: /Xem ảnh/i });
    expect(photoButtons.length).toBe(publishedCol.photos!.length);
  });

  it('renders bookable CTA button linking to booking funnel when concept is bookable', async () => {
    const onOpenBooking = vi.fn();
    renderComponent(publishedCol.slug, onOpenBooking);

    await waitFor(() => {
      const bookingBtn = screen.getAllByRole('button', { name: /Đặt Concept Này/i })[0];
      expect(bookingBtn).toBeInTheDocument();
      fireEvent.click(bookingBtn);
    });
  });

  it('opens accessible lightbox on photo click and supports ArrowRight, ArrowLeft, Escape', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: publishedCol.title })).toBeInTheDocument();
    });

    const photoButtons = screen.getAllByRole('button', { name: /Xem ảnh/i });
    fireEvent.click(photoButtons[0]);

    // Lightbox should now be open
    const lightboxDialog = screen.getByRole('dialog', { name: /Chi tiết ảnh/i });
    expect(lightboxDialog).toBeInTheDocument();

    // Check counter within dialog
    expect(within(lightboxDialog).getByText(new RegExp(`1 / ${publishedCol.photos!.length}`, 'i'))).toBeInTheDocument();

    // Press ArrowRight to advance
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(within(lightboxDialog).getByText(new RegExp(`2 / ${publishedCol.photos!.length}`, 'i'))).toBeInTheDocument();

    // Press ArrowLeft to go back
    fireEvent.keyDown(window, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(within(lightboxDialog).getByText(new RegExp(`1 / ${publishedCol.photos!.length}`, 'i'))).toBeInTheDocument();

    // Press Escape to close lightbox
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Chi tiết ảnh/i })).not.toBeInTheDocument();
  });
});
