import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Hero3DExhibitionSection } from '../public/Hero3DExhibitionSection';
import { AtelierControls } from '../public/atelier/AtelierControls';
import { ArtworkInspection } from '../public/atelier/ArtworkInspection';
import type { AtelierArtwork } from '../public/atelier/atelierTypes';

describe('Hero3DExhibitionSection Component (Flagship Atelier V4)', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('renders flagship 3D hero title, editorial overline, and viewport', () => {
    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Bước vào căn phòng của những ký ức/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MAISON MIPA \/ ATELIER/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('virtual-exhibition-viewport')).toBeInTheDocument();
  });

  it('renders elegant editorial fallback when WebGL context is unavailable', () => {
    // In jsdom, getContext('webgl') returns null by default
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

    render(
      <MemoryRouter>
        <Hero3DExhibitionSection onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('atelier-fallback-view')).toBeInTheDocument();
    expect(screen.getAllByText(/MAISON MIPA \/ ATELIER/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Không gian nhiếp ảnh nghệ thuật phong cách Pháp ấm áp & tinh tế./i)).toBeInTheDocument();
  });

  it('allows switching between all 3 camera modes and resetting to wide', () => {
    const handleSelectCamera = vi.fn();
    const handleResetCamera = vi.fn();

    render(
      <AtelierControls
        activeCamera="WIDE"
        activeLighting="SUNSET"
        onSelectCamera={handleSelectCamera}
        onResetCamera={handleResetCamera}
        onSelectLighting={vi.fn()}
      />
    );

    // Camera mode buttons
    const wideBtn = screen.getByTestId('camera-btn-wide');
    const easelBtn = screen.getByTestId('camera-btn-easel');
    const windowBtn = screen.getByTestId('camera-btn-window');
    const resetBtn = screen.getByTestId('camera-btn-reset');

    expect(wideBtn).toBeInTheDocument();
    expect(easelBtn).toBeInTheDocument();
    expect(windowBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(easelBtn);
    expect(handleSelectCamera).toHaveBeenCalledWith('EASEL');

    fireEvent.click(windowBtn);
    expect(handleSelectCamera).toHaveBeenCalledWith('WINDOW');

    fireEvent.click(wideBtn);
    expect(handleSelectCamera).toHaveBeenCalledWith('WIDE');

    fireEvent.click(resetBtn);
    expect(handleResetCamera).toHaveBeenCalled();
  });

  it('allows switching between all 3 lighting modes (Sunset, Morning, Afternoon)', () => {
    const handleSelectLighting = vi.fn();

    render(
      <AtelierControls
        activeCamera="WIDE"
        activeLighting="SUNSET"
        onSelectCamera={vi.fn()}
        onResetCamera={vi.fn()}
        onSelectLighting={handleSelectLighting}
      />
    );

    const sunsetBtn = screen.getByTestId('lighting-btn-sunset');
    const morningBtn = screen.getByTestId('lighting-btn-morning');
    const afternoonBtn = screen.getByTestId('lighting-btn-afternoon');

    expect(sunsetBtn).toBeInTheDocument();
    expect(morningBtn).toBeInTheDocument();
    expect(afternoonBtn).toBeInTheDocument();

    fireEvent.click(morningBtn);
    expect(handleSelectLighting).toHaveBeenCalledWith('MORNING');

    fireEvent.click(afternoonBtn);
    expect(handleSelectLighting).toHaveBeenCalledWith('AFTERNOON');

    fireEvent.click(sunsetBtn);
    expect(handleSelectLighting).toHaveBeenCalledWith('SUNSET');
  });

  it('renders Curatorial Artwork Inspection without fake technical claims and triggers booking CTA', () => {
    const handleClose = vi.fn();
    const handleOpenBooking = vi.fn();

    const testArtwork: AtelierArtwork = {
      id: 'art-02',
      title: 'Lumière du Matin à Paris',
      frenchTitle: 'PIÈCE MAÎTRESSE • HUILERIE & CADRE CHÊNE',
      description: 'Chùm sáng tự nhiên xiên qua ô cửa sổ kính cổ kính, đọng lại từng hạt bụi mộc và nét thanh tao trên tà lụa.',
      dimensions: '80 × 120 cm (Gỗ sồi Pháp nguyên khối)',
      imageUrl: '/studio.png',
      conceptSlug: 'vintage-cinematic',
      plaqueNumber: 'N° 02 / COLLECTION ATELIER',
      wallPosition: 'center',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    render(
      <MemoryRouter>
        <ArtworkInspection
          artwork={testArtwork}
          onClose={handleClose}
          onOpenBooking={handleOpenBooking}
        />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Lumière du Matin à Paris')).toBeInTheDocument();
    expect(screen.getByText('PIÈCE MAÎTRESSE • HUILERIE & CADRE CHÊNE')).toBeInTheDocument();
    expect(screen.getByText(/Chùm sáng tự nhiên xiên qua ô cửa sổ kính cổ kính/i)).toBeInTheDocument();

    // Verify genuine dimensions and concept are displayed
    expect(screen.getByText(/80 × 120 cm/i)).toBeInTheDocument();
    expect(screen.getByText(/vintage-cinematic/i)).toBeInTheDocument();

    // Verify NO fake technical claims are present (Hahnemühle, ISO, shutter speed, f-stop)
    expect(screen.queryByText(/Hahnemühle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ISO 100/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/f\/2.8/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\/250s/i)).not.toBeInTheDocument();

    // Trigger booking CTA (Sentence-cased per Blocker 32)
    const bookBtn = screen.getByRole('button', { name: /Đặt lịch concept này/i });
    fireEvent.click(bookBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenBooking).toHaveBeenCalledWith('vintage-cinematic');

    // Close button triggers handleClose
    const closeBtn = screen.getByTestId('close-inspection-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
