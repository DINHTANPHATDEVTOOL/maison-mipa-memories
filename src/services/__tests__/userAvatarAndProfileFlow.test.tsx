import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadUserAvatar, removeUserAvatarFile, extractStoragePathFromAvatarUrl } from '../userAvatarService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn(),
  isDemoModeEnabled: vi.fn().mockReturnValue(false),
}));

describe('User Avatar Service & Profile Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  });

  it('1. extractStoragePathFromAvatarUrl correctly extracts storage path', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/portfolio-public/avatars/user_123/avatar_123.webp?t=999';
    expect(extractStoragePathFromAvatarUrl(url)).toBe('avatars/user_123/avatar_123.webp');

    expect(extractStoragePathFromAvatarUrl('https://example.com/other.png')).toBeNull();
  });

  it('2. uploadUserAvatar uploads to Supabase Storage and removes old avatar', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'avatars/usr_1/avatar_new.webp' }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://xyz.supabase.co/storage/v1/object/public/portfolio-public/avatars/usr_1/avatar_new.webp' } });
    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
    } as any);

    const fakeFile = new File(['fake image data'], 'my_avatar.png', { type: 'image/png' });
    const oldAvatar = 'https://xyz.supabase.co/storage/v1/object/public/portfolio-public/avatars/usr_1/avatar_old.webp';

    const result = await uploadUserAvatar(fakeFile, 'usr_1', oldAvatar);

    // Old avatar was removed
    expect(mockRemove).toHaveBeenCalledWith(['avatars/usr_1/avatar_old.webp']);
    // New avatar was uploaded
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/usr_1\/avatar_\d+_[a-z0-9]+\.webp$/),
      expect.anything(),
      expect.objectContaining({ contentType: 'image/webp' })
    );
    expect(result.url).toContain('avatars/usr_1/avatar_new.webp');
  });

  it('3. removeUserAvatarFile deletes file from cloud storage', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: mockRemove,
    } as any);

    const avatarUrl = 'https://xyz.supabase.co/storage/v1/object/public/portfolio-public/avatars/usr_abc/avatar_999.webp';
    await removeUserAvatarFile(avatarUrl);

    expect(mockRemove).toHaveBeenCalledWith(['avatars/usr_abc/avatar_999.webp']);
  });

  it('4. uploadUserAvatar rejects invalid file types or oversized files', async () => {
    const textFile = new File(['not an image'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadUserAvatar(textFile, 'usr_1')).rejects.toThrow(
      /Định dạng ảnh không hợp lệ/
    );

    const hugeFile = new File([new Uint8Array(9 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    await expect(uploadUserAvatar(hugeFile, 'usr_1')).rejects.toThrow(
      /Kích thước ảnh đại diện vượt quá 8MB/
    );
  });
});
