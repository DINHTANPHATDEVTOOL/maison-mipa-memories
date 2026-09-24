// ==============================================================================
// Maison MIPA — The Living French Atelier Configuration & Constants
// ==============================================================================
import type {
  AtelierArtwork,
  AtelierCameraMode,
  AtelierLightingMode,
  CameraPresetConfig,
  LightingPresetConfig,
} from './atelierTypes';

export const ATELIER_PALETTE = {
  darkEspresso: '#15110E',
  espressoMedium: '#1A1411',
  espressoDeep: '#211915',
  maisonBrown: '#604634',
  warmBrass: '#C6A45F',
  ivoryPrint: '#F5EFE4',
  mutedLinen: '#D8CABA',
  warmAmber: '#B06F3A',
  goldHighlight: '#E0C287',
};

export const CAMERA_PRESETS_DESKTOP: Record<AtelierCameraMode, CameraPresetConfig> = {
  WIDE: {
    position: [-0.65, 0.25, 5.8],
    target: [-0.65, 0.15, 0],
    fov: 36,
  },
  EASEL: {
    position: [-0.85, 0.1, 3.4],
    target: [-0.85, 0.1, 0],
    fov: 32,
  },
  WINDOW: {
    position: [-1.8, 0.45, 4.2],
    target: [-2.0, 0.45, 0],
    fov: 35,
  },
};

export const CAMERA_PRESETS_MOBILE: Record<AtelierCameraMode, CameraPresetConfig> = {
  WIDE: {
    position: [-0.2, 0.1, 7.2],
    target: [-0.2, 0.05, 0],
    fov: 46,
  },
  EASEL: {
    position: [-0.2, 0.05, 4.6],
    target: [-0.2, 0.05, 0],
    fov: 40,
  },
  WINDOW: {
    position: [-1.2, 0.4, 5.2],
    target: [-1.4, 0.4, 0],
    fov: 42,
  },
};

export function getCameraPreset(mode: AtelierCameraMode, isMobile = false): CameraPresetConfig {
  return isMobile ? CAMERA_PRESETS_MOBILE[mode] : CAMERA_PRESETS_DESKTOP[mode];
}

export const CAMERA_PRESETS = CAMERA_PRESETS_DESKTOP;

export const LIGHTING_PRESETS: Record<AtelierLightingMode, LightingPresetConfig> = {
  SUNSET: {
    id: 'SUNSET',
    name: 'Hoàng Hôn Ấm Áp',
    timeLabel: '17:45',
    description: 'Ánh nắng mật ong chiều tà ôm trọn không gian vintage Pháp',
    ambientColor: '#F5E6D0',
    ambientIntensity: 0.32,
    sunColor: '#FFCB85',
    sunIntensity: 1.85,
    sunPosition: [-4.8, 6.0, 5.2],
    spotColor: '#FFE8C2',
    spotIntensity: 1.35,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#F0C59E',
    fillIntensity: 0.42,
    fogColor: '#E8DAC8',
    fogNear: 28,
    fogFar: 75,
    bgGradient: 'radial-gradient(ellipse at 50% 38%, #F7EFE4 0%, #EBDBC9 48%, #CDBAA2 100%)',
  },
  MORNING: {
    id: 'MORNING',
    name: 'Nắng Sớm Paris',
    timeLabel: '09:30',
    description: 'Ánh sáng tự nhiên trong trẻo, tinh khôi trên nền lụa kem',
    ambientColor: '#F4ECE0',
    ambientIntensity: 0.35,
    sunColor: '#FFF0D4',
    sunIntensity: 1.95,
    sunPosition: [-5.0, 6.5, 5.0],
    spotColor: '#FFF2DD',
    spotIntensity: 1.30,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#F5DCBA',
    fillIntensity: 0.44,
    fogColor: '#ECE0D0',
    fogNear: 30,
    fogFar: 80,
    bgGradient: 'radial-gradient(ellipse at 50% 38%, #FAF4EB 0%, #EFE3D3 48%, #D4C3AC 100%)',
  },
  AFTERNOON: {
    id: 'AFTERNOON',
    name: 'Chiều Lắng Đọng',
    timeLabel: '15:30',
    description: 'Tone caramel dịu êm, không gian thư thái nghệ thuật',
    ambientColor: '#F2E4D2',
    ambientIntensity: 0.30,
    sunColor: '#FFC67E',
    sunIntensity: 1.90,
    sunPosition: [-4.6, 5.8, 4.8],
    spotColor: '#FFE2B8',
    spotIntensity: 1.35,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#ECC094',
    fillIntensity: 0.40,
    fogColor: '#E5D6C2',
    fogNear: 28,
    fogFar: 75,
    bgGradient: 'radial-gradient(ellipse at 50% 38%, #F5ECE0 0%, #E8D7C3 48%, #C8B49B 100%)',
  },
};

/**
 * Adapter from real concept/portfolio entity to AtelierArtwork scene model
 */
export function adaptConceptToAtelierArtwork(
  concept: {
    id: string;
    slug?: string;
    name?: string;
    title?: string;
    description?: string;
    coverPhotoUrl?: string;
    imageUrl?: string;
  },
  index: number
): AtelierArtwork {
  const wallPositions: ('center' | 'left' | 'right')[] = ['center', 'left', 'right'];
  const wallPosition = wallPositions[index % 3];

  let position: [number, number, number] = [0, 1.05, 0.05];
  let rotation: [number, number, number] = [0, 0, 0];
  let scale: [number, number, number] = [2.0, 2.6, 1]; // Centerpiece Master Portrait size

  if (wallPosition === 'left') {
    // Elegant smaller framed print hung against the boiserie wall
    position = [-3.0, 1.45, -3.42];
    rotation = [0, 0, 0];
    scale = [1.15, 1.5, 1];
  } else if (wallPosition === 'right') {
    position = [3.4, 1.45, -3.42];
    rotation = [0, 0, 0];
    scale = [1.15, 1.5, 1];
  }

  return {
    id: concept.id,
    title: concept.name || concept.title || 'Tác phẩm nghệ thuật',
    conceptSlug: concept.slug,
    imageUrl: concept.coverPhotoUrl || concept.imageUrl || (wallPosition === 'center' ? '/studio.png' : '/hero.png'),
    description: concept.description || 'Không gian studio phong cách Pháp với ánh sáng tự nhiên và chiều sâu cảm xúc.',
    wallPosition,
    position,
    rotation,
    scale,
  };
}

export const DEFAULT_ATELIER_ARTWORKS: AtelierArtwork[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    title: 'Vintage Loft & Cinematic',
    conceptSlug: 'vintage-cinematic',
    imageUrl: '/hero-couple.jpg',
    description: 'Tone nâu ấm, ánh sáng điện ảnh tương phản nhẹ tôn vinh cảm xúc chân thật và chiều sâu.',
    wallPosition: 'center',
    position: [0, 1.05, 0.05],
    rotation: [0, 0, 0],
    scale: [2.0, 2.6, 1], // Dominant Master Portrait
  },
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    title: 'Parisian Romance',
    conceptSlug: 'parisian-romance',
    imageUrl: '/hero-couple.jpg',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel và phong cách cổ điển lãng mạn nước Pháp.',
    wallPosition: 'left',
    position: [-3.0, 1.45, -3.42],
    rotation: [0, 0, 0],
    scale: [1.15, 1.5, 1], // Subtle secondary print on boiserie
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    title: 'Nàng Thơ Trong Trẻo',
    conceptSlug: 'nang-tho',
    imageUrl: '/hero-camera.jpg',
    description: 'Ánh sáng ban mai dịu dàng, hoa tươi và phong cách mộng mơ trong trẻo tại tiệm ảnh Maison MIPA.',
    wallPosition: 'right',
    position: [3.4, 1.45, -3.42],
    rotation: [0, 0, 0],
    scale: [1.15, 1.5, 1],
  },
];
