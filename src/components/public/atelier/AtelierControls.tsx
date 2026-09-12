// ==============================================================================
// Maison MIPA — Restrained Editorial Controls (Lighting & Camera Presets)
// ==============================================================================
import React from 'react';
import type {
  AtelierCameraMode,
  AtelierLightingMode,
  LightingPresetConfig,
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
  const cameraOptions: { id: AtelierCameraMode; label: string }[] = [
    { id: 'WIDE', label: 'Toàn cảnh' },
    { id: 'EASEL', label: 'Tiêu điểm giá vẽ' },
    { id: 'WINDOW', label: 'Góc nắng' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.65rem 1.25rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(21, 17, 14, 0.65)',
        border: '1px solid rgba(198, 164, 95, 0.22)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 1. CAMERA NAVIGATION MODES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontWeight: 600,
            color: '#C6A45F',
            marginRight: '0.3rem',
          }}
        >
          GÓC NHÌN
        </span>

        {cameraOptions.map((opt) => {
          const isActive = activeCamera === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`camera-btn-${opt.id.toLowerCase()}`}
              onClick={() => onSelectCamera(opt.id)}
              style={{
                padding: '0.32rem 0.75rem',
                borderRadius: '3px',
                fontSize: '0.78rem',
                border: isActive ? '1px solid #C6A45F' : '1px solid rgba(198, 164, 95, 0.2)',
                backgroundColor: isActive ? 'rgba(198, 164, 95, 0.18)' : 'transparent',
                color: isActive ? '#FBF6EE' : '#D1C4B7',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onResetCamera}
          aria-label="Đặt lại góc nhìn camera 3D"
          data-testid="camera-btn-reset"
          style={{
            padding: '0.32rem 0.65rem',
            fontSize: '0.76rem',
            borderRadius: '3px',
            border: '1px solid rgba(198, 164, 95, 0.25)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#E0C287',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Đặt lại
        </button>
      </div>

      {/* 2. LIGHTING PRESETS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 600,
            color: '#A39385',
            marginRight: '0.2rem',
          }}
        >
          ÁNH SÁNG
        </span>

        {(Object.keys(LIGHTING_PRESETS) as AtelierLightingMode[]).map((mode) => {
          const preset = LIGHTING_PRESETS[mode];
          const isActive = activeLighting === mode;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`lighting-btn-${mode.toLowerCase()}`}
              onClick={() => onSelectLighting(mode)}
              style={{
                padding: '0.32rem 0.75rem',
                borderRadius: '3px',
                fontSize: '0.78rem',
                border: isActive ? '1px solid #C6A45F' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: isActive ? '#E0C287' : 'transparent',
                color: isActive ? '#15110E' : '#D1C4B7',
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>
                {preset.name}{' '}
                <span style={{ opacity: 0.8, fontSize: '0.72rem', fontWeight: 400 }}>
                  ({preset.timeLabel})
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
