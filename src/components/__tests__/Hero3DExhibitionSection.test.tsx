import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Hero3DExhibitionSection } from '../public/Hero3DExhibitionSection';

describe('Hero3DExhibitionSection Component', () => {
  it('renders flagship 3D hero title, 3D viewport, and atelier planes', () => {
    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Căn Phòng Triển Lãm Không Gian 3 Chiều/i)).toBeInTheDocument();
    expect(screen.getByText(/ATELIER VIRTUEL 3D/i)).toBeInTheDocument();
    expect(screen.getByTestId('virtual-exhibition-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('diorama-foreground-curtain')).toBeInTheDocument();
    expect(screen.getByTestId('diorama-foreground-camera')).toBeInTheDocument();
    expect(screen.getByTestId('diorama-studio-softbox')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-back-wall')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-parquet-floor')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-left-window')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-right-wall')).toBeInTheDocument();
    expect(screen.getByTestId('diorama-center-easel')).toBeInTheDocument();
  });

  it('renders all 3 museum artwork frames on the 3D gallery wall', () => {
    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('artwork-frame-art-01')).toBeInTheDocument();
    expect(screen.getByTestId('artwork-frame-art-02')).toBeInTheDocument();
    expect(screen.getByTestId('artwork-frame-art-03')).toBeInTheDocument();

    expect(screen.getByText(/PIÈCE MAÎTRESSE/i)).toBeInTheDocument();
    expect(screen.getByText(/Lumière du Matin à Paris/i)).toBeInTheDocument();
    expect(screen.getByText(/Élégance Contemporaine/i)).toBeInTheDocument();
  });

  it('allows quick focal jumping to individual artwork frames', () => {
    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    const focalBtn1 = screen.getByTestId('focal-btn-art-01');
    fireEvent.click(focalBtn1);
    expect(screen.getByTestId('virtual-exhibition-camera-rig')).toBeInTheDocument();

    const focalBtn2 = screen.getByTestId('focal-btn-art-02');
    fireEvent.click(focalBtn2);
    expect(screen.getByTestId('virtual-exhibition-camera-rig')).toBeInTheDocument();
  });

  it('opens curatorial exhibition modal and triggers booking', () => {
    const handleOpenBooking = vi.fn();

    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={handleOpenBooking} />
      </MemoryRouter>
    );

    const frame = screen.getByTestId('artwork-frame-art-02');
    fireEvent.click(frame);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/Vintage Loft & Cinematic — Chiều Sâu Điện Ảnh/i)).toBeInTheDocument();

    const bookBtn = screen.getByRole('button', { name: /Đặt Lịch Chụp Concept Này/i });
    fireEvent.click(bookBtn);
    expect(handleOpenBooking).toHaveBeenCalledWith('vintage-cinematic');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets camera when clicking standard perspective button', () => {
    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    const resetBtn = screen.getByRole('button', { name: /Đặt lại góc nhìn camera 3D/i });
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('virtual-exhibition-camera-rig')).toBeInTheDocument();
  });
});
