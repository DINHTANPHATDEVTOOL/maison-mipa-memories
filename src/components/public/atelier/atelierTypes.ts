// ==============================================================================
// Maison MIPA — The Living French Atelier Types
// ==============================================================================

export type AtelierCameraMode = 'WIDE' | 'EASEL' | 'WINDOW';
export type AtelierLightingMode = 'SUNSET' | 'MORNING' | 'AFTERNOON';
export type QualityTier = 'high' | 'medium' | 'low';

export interface AtelierArtwork {
  id: string;
  title: string;
  frenchTitle?: string;
  conceptSlug?: string;
  imageUrl: string;
  dimensions?: string;
  description: string;
  plaqueNumber?: string;
  wallPosition: 'center' | 'left' | 'right';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface CameraPresetConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface LightingPresetConfig {
  id: AtelierLightingMode;
  name: string;
  timeLabel: string;
  description: string;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  spotColor: string;
  spotIntensity: number;
  spotPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  bgGradient: string;
}
