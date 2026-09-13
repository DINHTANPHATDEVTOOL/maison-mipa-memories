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
    ambientColor: '#FDF5EA',
    ambientIntensity: 1.25,
    sunColor: '#FFE0B2',
    sunIntensity: 3.2,
    sunPosition: [-4.8, 6.0, 5.2],
    spotColor: '#FFF3DB',
    spotIntensity: 3.5,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#F5DEBE',
    fillIntensity: 0.95,
    fogColor: '#F5EDE1',
    fogNear: 22,
    fogFar: 60,
    bgGradient: 'radial-gradient(ellipse at 45% 45%, #FDF9F2 0%, #F5EDE1 60%, #EBE0D0 100%)',
  },
  MORNING: {
    id: 'MORNING',
    name: 'Nắng Sớm Paris',
    timeLabel: '09:30',
    description: 'Ánh sáng tự nhiên trong trẻo, tinh khôi trên nền lụa kem',
    ambientColor: '#FFFBF5',
    ambientIntensity: 1.35,
    sunColor: '#FFF8EA',
    sunIntensity: 3.6,
    sunPosition: [-5.0, 6.5, 5.0],
    spotColor: '#FFFBF2',
    spotIntensity: 3.0,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#FCEFD8',
    fillIntensity: 1.1,
    fogColor: '#F7F1E7',
    fogNear: 25,
    fogFar: 65,
    bgGradient: 'radial-gradient(ellipse at 45% 45%, #FFFFFF 0%, #F8F2E8 60%, #EFE5D6 100%)',
  },
  AFTERNOON: {
    id: 'AFTERNOON',
    name: 'Chiều Lắng Đọng',
    timeLabel: '15:30',
    description: 'Tone caramel dịu êm, không gian thư thái nghệ thuật',
    ambientColor: '#FBF3E6',
    ambientIntensity: 1.2,
    sunColor: '#FFDFAC',
    sunIntensity: 3.4,
    sunPosition: [-4.6, 5.8, 4.8],
    spotColor: '#FFF1D6',
    spotIntensity: 3.4,
    spotPosition: [-0.6, 4.2, 2.5],
    fillColor: '#F5D6B5',
    fillIntensity: 1.0,
    fogColor: '#F4ECE0',
    fogNear: 22,
    fogFar: 60,
    bgGradient: 'radial-gradient(ellipse at 45% 45%, #FAF4EB 0%, #F3E9DA 60%, #E8DCCB 100%)',
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
    imageUrl: '/hero-bride.jpg',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel và phong cách cổ điển lãng mạn nước Pháp.',
    wallPosition: 'left',
    position: [-3.0, 1.45, -3.42],
    rotation: [0, 0, 0],
    scale: [1.15, 1.5, 1], // Subtle secondary print on boiserie
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    title: 'French Haute Couture',
    conceptSlug: 'french-haute-couture',
    imageUrl: '/hero-baby.jpg',
    description: 'Váy cưới tối giản sang trọng, khăn voan bay bổng và tạo dáng nghệ thuật thời trang cao cấp.',
    wallPosition: 'right',
    position: [3.4, 1.45, -3.42],
    rotation: [0, 0, 0],
    scale: [1.15, 1.5, 1],
  },
];
