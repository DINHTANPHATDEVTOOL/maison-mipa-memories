import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DarkroomLightbox } from '../public/DarkroomLightbox';
import type { PortfolioPhoto } from '../../types';

const mockPhotos: PortfolioPhoto[] = [
  {
    id: 'photo_1',
    collectionId: 'col_1',
    url: 'https://example.com/photo1.jpg',
    filename: 'photo1.jpg',
    width: 1200,
    height: 800,
    focalX: 50,
    focalY: 50,
    altText: 'Photo 1 description',
    caption: 'Photo 1 caption',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'photo_2',
    collectionId: 'col_1',
    url: 'https://example.com/photo2.jpg',
    filename: 'photo2.jpg',
    width: 800,
    height: 1200,
    focalX: 40,
    focalY: 60,
    altText: 'Photo 2 description',
    caption: 'Photo 2 caption',
    sortOrder: 2,
    featured: false,
  },
];

describe('DarkroomLightbox Component', () => {
  it('renders modal dialog with accessibility attributes and counter', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <DarkroomLightbox
        photos={mockPhotos}
        currentIndex={0}
        collectionTitle="Test Collection"
        onClose={handleClose}
        onSelectIndex={handleSelect}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Photo 1 caption')).toBeInTheDocument();
  });

  it('navigates next and previous using buttons and keyboard', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <DarkroomLightbox
        photos={mockPhotos}
        currentIndex={0}
        collectionTitle="Test Collection"
        onClose={handleClose}
        onSelectIndex={handleSelect}
      />
    );

    // Click next
    const nextBtn = screen.getByRole('button', { name: /Ảnh kế tiếp/i });
    fireEvent.click(nextBtn);
    expect(handleSelect).toHaveBeenCalledWith(1);

    // ArrowRight key
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleSelect).toHaveBeenCalledWith(1);

    // ArrowLeft key
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(handleSelect).toHaveBeenCalledWith(1); // (0 - 1 + 2) % 2 = 1
  });

  it('closes when pressing Escape key or clicking close button', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <DarkroomLightbox
        photos={mockPhotos}
        currentIndex={0}
        collectionTitle="Test Collection"
        onClose={handleClose}
        onSelectIndex={handleSelect}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng xem ảnh/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('traps focus inside dialog and restores focus and body overflow on unmount', () => {
    // Setup initial trigger button
    const triggerBtn = document.createElement('button');
    triggerBtn.textContent = 'Open Lightbox';
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const initialOverflow = document.body.style.overflow;

    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    const { unmount } = render(
      <DarkroomLightbox
        photos={mockPhotos}
        currentIndex={0}
        collectionTitle="Test Collection"
        onClose={handleClose}
        onSelectIndex={handleSelect}
      />
    );

    // Close button should receive initial focus
    const closeBtn = screen.getByRole('button', { name: /Đóng xem ảnh/i });
    expect(document.activeElement).toBe(closeBtn);

    // Body overflow should be locked
    expect(document.body.style.overflow).toBe('hidden');

    // Tab navigation: focus wraps between first and last controls
    const prevBtn = screen.getByRole('button', { name: /Ảnh trước đó/i });
    const nextBtn = screen.getByRole('button', { name: /Ảnh kế tiếp/i });

    // Focus last element and press Tab -> should cycle to first
    nextBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    // Press Shift+Tab from first element -> should cycle to last
    closeBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(nextBtn);

    // Unmount lightbox -> original focus and overflow must be restored
    unmount();
    expect(document.body.style.overflow).toBe(initialOverflow);
    expect(document.activeElement).toBe(triggerBtn);

    document.body.removeChild(triggerBtn);
  });
});
