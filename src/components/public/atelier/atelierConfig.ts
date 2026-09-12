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
    position: [0, 1.25, 9.8],
    target: [0, 1.05, 0],
    fov: 38,
  },
  EASEL: {
    position: [0, 0.95, 4.4],
    target: [0, 0.95, 0],
    fov: 34,
  },
  WINDOW: {
    position: [-1.9, 1.15, 6.8],
    target: [-3.2, 1.25, -4.5],
    fov: 36,
  },
};

export const CAMERA_PRESETS_MOBILE: Record<AtelierCameraMode, CameraPresetConfig> = {
  WIDE: {
    position: [0, 1.15, 12.0],
    target: [0, 1.0, 0],
    fov: 46,
  },
  EASEL: {
    position: [0, 0.95, 5.0],
    target: [0, 0.95, 0],
    fov: 38,
  },
  WINDOW: {
    position: [-1.5, 1.15, 7.8],
    target: [-3.2, 1.25, -4.5],
    fov: 40,
  },
};

export function getCameraPreset(mode: AtelierCameraMode, isMobile = false): CameraPresetConfig {
  return isMobile ? CAMERA_PRESETS_MOBILE[mode] : CAMERA_PRESETS_DESKTOP[mode];
}

export const CAMERA_PRESETS = CAMERA_PRESETS_DESKTOP;

export const LIGHTING_PRESETS: Record<AtelierLightingMode, LightingPresetConfig> = {
  SUNSET: {
    id: 'SUNSET',
    name: 'Hoàng Hôn Nghệ Thuật',
    timeLabel: '17:45',
    description: 'Ánh đèn rọi triển lãm ấm áp, độ tương phản điện ảnh sâu lắng',
    ambientColor: '#2B1E15',
    ambientIntensity: 0.55,
    sunColor: '#E68C3A',
    sunIntensity: 2.8,
    sunPosition: [-6, 4.5, -4],
    spotColor: '#FFE0B2',
    spotIntensity: 3.6,
    spotPosition: [0.3, 4.2, 2.2],
    fillColor: '#9C623A',
    fillIntensity: 0.65,
    fogColor: '#17120E',
    fogNear: 8,
    fogFar: 24,
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #342820 0%, #1E1712 55%, #15110E 100%)',
  },
  MORNING: {
    id: 'MORNING',
    name: 'Nắng Sớm Paris',
    timeLabel: '09:30',
    description: 'Ánh sáng tự nhiên trong trẻo đón qua vòm cửa sổ atelier',
    ambientColor: '#4A3B2C',
    ambientIntensity: 0.85,
    sunColor: '#FFF4E0',
    sunIntensity: 3.4,
    sunPosition: [-7, 5.5, -3.5],
    spotColor: '#FFF8EA',
    spotIntensity: 2.4,
    spotPosition: [0.3, 4.2, 2.2],
    fillColor: '#C4B59E',
    fillIntensity: 0.95,
    fogColor: '#241D17',
    fogNear: 10,
    fogFar: 28,
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #45372C 0%, #271E18 55%, #171310 100%)',
  },
  AFTERNOON: {
    id: 'AFTERNOON',
    name: 'Chiều Lắng Đọng',
    timeLabel: '15:30',
    description: 'Tone vàng mật ong êm đềm, không gian thư thái tĩnh lặng',
    ambientColor: '#382B20',
    ambientIntensity: 0.68,
    sunColor: '#F5B064',
    sunIntensity: 3.0,
    sunPosition: [-6.5, 4.0, -4.0],
    spotColor: '#FFE8C8',
    spotIntensity: 3.0,
    spotPosition: [0.3, 4.2, 2.2],
    fillColor: '#B08055',
    fillIntensity: 0.8,
    fogColor: '#1C1510',
    fogNear: 9,
    fogFar: 25,
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #3D3025 0%, #231B15 55%, #15110E 100%)',
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

  let position: [number, number, number] = [0, 0.95, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  let scale: [number, number, number] = [1.8, 1.25, 1];

  if (wallPosition === 'left') {
    position = [-2.4, 0.9, -0.6];
    rotation = [0, 0.18, 0];
    scale = [1.2, 1.6, 1];
  } else if (wallPosition === 'right') {
    position = [2.3, 0.9, -0.8];
    rotation = [0, -0.18, 0];
    scale = [1.2, 1.6, 1];
  }

  return {
    id: concept.id,
    title: concept.name || concept.title || 'Tác phẩm nghệ thuật',
    conceptSlug: concept.slug,
    imageUrl: concept.coverPhotoUrl || concept.imageUrl || '/studio.png',
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
    imageUrl: '/studio.png',
    description: 'Tone nâu ấm, ánh sáng điện ảnh tương phản nhẹ tôn vinh cảm xúc chân thật và chiều sâu.',
    wallPosition: 'center',
    position: [0, 0.95, 0],
    rotation: [0, 0, 0],
    scale: [1.8, 1.25, 1],
  },
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    title: 'Parisian Romance',
    conceptSlug: 'parisian-romance',
    imageUrl: '/hero.png',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel và phong cách cổ điển lãng mạn nước Pháp.',
    wallPosition: 'left',
    position: [-2.4, 0.9, -0.6],
    rotation: [0, 0.18, 0],
    scale: [1.2, 1.6, 1],
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    title: 'French Haute Couture',
    conceptSlug: 'french-haute-couture',
    imageUrl: '/hero.png',
    description: 'Váy cưới tối giản sang trọng, khăn voan bay bổng và tạo dáng nghệ thuật thời trang cao cấp.',
    wallPosition: 'right',
    position: [2.3, 0.9, -0.8],
    rotation: [0, -0.18, 0],
    scale: [1.2, 1.6, 1],
  },
];
