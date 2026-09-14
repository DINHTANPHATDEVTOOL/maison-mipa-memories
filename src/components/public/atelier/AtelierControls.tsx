// ==============================================================================
// Maison MIPA — Restrained Curatorial Editorial Controls (Blockers 24 & 31)
// ==============================================================================
import React, { useState, useEffect } from 'react';
import type {
  AtelierCameraMode,
  AtelierLightingMode,
} from './atelierTypes';
import { LIGHTING_PRESETS } from './atelierConfig';

interface AtelierControlsProps {
  activeLighting: AtelierLightingMode;
  activeCamera: AtelierCameraMode;
  onSelectLighting: (mode: AtelierLightingMode) => void;
  onSelectCamera: (mode: AtelierCameraMode) => void;
  onResetCamera: () => void;
}

export const AtelierControls: React.FC<AtelierControlsProps> = ({
  activeLighting,
  activeCamera,
  onSelectLighting,
  onSelectCamera,
  onResetCamera,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const cameraOptions: { id: AtelierCameraMode; desktopLabel: string; mobileLabel: string }[] = [
    { id: 'WIDE', desktopLabel: 'Toàn cảnh', mobileLabel: 'Toàn cảnh' },
    { id: 'EASEL', desktopLabel: 'Giá vẽ', mobileLabel: 'Ảnh' },
    { id: 'WINDOW', desktopLabel: 'Góc nắng', mobileLabel: 'Nắng' },
  ];

  const lightingModes: AtelierLightingMode[] = ['SUNSET', 'MORNING', 'AFTERNOON'];

  return (
    <div
      className="atelier-curatorial-controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.9rem 2rem',
        padding: '1rem 0.5rem 0.5rem 0.5rem',
        color: '#6A564A',
      }}
    >
      {/* 1. CURATORIAL CAMERA VIEWPOINTS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--editorial-font-heading, serif)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#8C6E53',
            fontWeight: 600,
            marginRight: '0.25rem',
          }}
        >
          Phối cảnh
        </span>

        {cameraOptions.map((opt, idx) => {
          const isActive = activeCamera === opt.id;
          return (
            <React.Fragment key={opt.id}>
              {idx > 0 && <span style={{ color: 'rgba(140, 110, 83, 0.3)', fontSize: '0.75rem' }}>/</span>}
              <button
                type="button"
                data-testid={`camera-btn-${opt.id.toLowerCase()}`}
                onClick={() => onSelectCamera(opt.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--editorial-font-body, sans-serif)',
                  letterSpacing: '0.04em',
                  color: isActive ? '#3D2619' : '#8C7768',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  position: 'relative',
                  borderBottom: isActive ? '1.5px solid #734B36' : '1.5px solid transparent',
                  transition: 'all 0.25s ease',
                }}
              >
                {isMobile ? opt.mobileLabel : opt.desktopLabel}
              </button>
            </React.Fragment>
          );
        })}

        <button
          type="button"
          onClick={onResetCamera}
          aria-label="Đặt lại góc nhìn camera 3D"
          data-testid="camera-btn-reset"
          style={{
            marginLeft: '0.35rem',
            background: 'none',
            border: '1px solid rgba(115, 75, 54, 0.35)',
            borderRadius: '4px',
            padding: '0.18rem 0.55rem',
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            color: '#734B36',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Toàn cảnh gốc
        </button>
      </div>

      {/* 2. ATMOSPHERIC LIGHTING PRESETS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--editorial-font-heading, serif)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#8C6E53',
            fontWeight: 600,
            marginRight: '0.25rem',
          }}
        >
          Thời khắc
        </span>

        {lightingModes.map((mode, idx) => {
          const preset = LIGHTING_PRESETS[mode];
          const isActive = activeLighting === mode;
          return (
            <React.Fragment key={mode}>
              {idx > 0 && <span style={{ color: 'rgba(140, 110, 83, 0.3)', fontSize: '0.75rem' }}>/</span>}
              <button
                type="button"
                data-testid={`lighting-btn-${mode.toLowerCase()}`}
                onClick={() => onSelectLighting(mode)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--editorial-font-body, sans-serif)',
                  letterSpacing: '0.04em',
                  color: isActive ? '#3D2619' : '#8C7768',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  borderBottom: isActive ? '1.5px solid #734B36' : '1.5px solid transparent',
                  transition: 'all 0.25s ease',
                }}
              >
                {isMobile ? preset.timeLabel : `${preset.timeLabel} · ${preset.name}`}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
