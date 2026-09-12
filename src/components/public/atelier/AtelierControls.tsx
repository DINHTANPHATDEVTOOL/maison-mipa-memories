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
        gap: '0.8rem 1.5rem',
        padding: '0.5rem 0.5rem 1rem 0.5rem',
        color: '#D1C4B7',
      }}
    >
      {/* 1. CAMERA VIEWS (Desktop: Bottom-Left feeling) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontWeight: 600,
            color: '#C6A45F',
            marginRight: '0.2rem',
          }}
        >
          GÓC NHÌN
        </span>

        {cameraOptions.map((opt, idx) => {
          const isActive = activeCamera === opt.id;
          return (
            <React.Fragment key={opt.id}>
              {idx > 0 && <span style={{ color: 'rgba(198, 164, 95, 0.3)', fontSize: '0.8rem' }}>·</span>}
              <button
                type="button"
                data-testid={`camera-btn-${opt.id.toLowerCase()}`}
                onClick={() => onSelectCamera(opt.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--editorial-font-body, sans-serif)',
                  color: isActive ? '#FBF6EE' : '#9E8D7F',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  position: 'relative',
                  borderBottom: isActive ? '1.5px solid #C6A45F' : '1.5px solid transparent',
                  transition: 'all 0.2s ease',
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
            marginLeft: '0.5rem',
            background: 'none',
            border: '1px solid rgba(198, 164, 95, 0.25)',
            borderRadius: '2px',
            padding: '0.2rem 0.5rem',
            fontSize: '0.72rem',
            color: '#C6A45F',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Đặt lại
        </button>
      </div>

      {/* 2. LIGHTING PRESETS (Desktop: Bottom-Right feeling) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontWeight: 600,
            color: '#A39385',
            marginRight: '0.2rem',
          }}
        >
          ÁNH SÁNG
        </span>

        {lightingModes.map((mode, idx) => {
          const preset = LIGHTING_PRESETS[mode];
          const isActive = activeLighting === mode;
          return (
            <React.Fragment key={mode}>
              {idx > 0 && <span style={{ color: 'rgba(198, 164, 95, 0.3)', fontSize: '0.8rem' }}>·</span>}
              <button
                type="button"
                data-testid={`lighting-btn-${mode.toLowerCase()}`}
                onClick={() => onSelectLighting(mode)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--editorial-font-body, sans-serif)',
                  color: isActive ? '#E0C287' : '#9E8D7F',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  borderBottom: isActive ? '1.5px solid #E0C287' : '1.5px solid transparent',
                  transition: 'all 0.2s ease',
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
