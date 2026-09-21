// ==============================================================================
// Maison MIPA Memories - Site Asset Context & Reactive Hook
// Provides live updated URLs for all site-wide images across all pages
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type SiteAsset,
  DEFAULT_SITE_ASSETS,
  getInitialSiteAssets,
  getSiteAssets,
  updateSiteAssetImage,
  updateSiteAssetWithUrl,
  createCustomSiteAsset,
  deleteCustomSiteAsset,
  resetSiteAssetToDefault,
  deleteSiteAssetImage,
  subscribeSiteAssets,
  bustSiteAssetsCache,
} from '../services/siteAssetService';
import { useAuth } from './AuthContext';

interface SiteAssetContextType {
  assets: Record<string, SiteAsset>;
  getAssetUrl: (assetId: string, fallbackUrl?: string) => string;
  updateAsset: (assetId: string, file: File) => Promise<SiteAsset>;
  updateAssetUrl: (assetId: string, url: string) => Promise<SiteAsset>;
  createAsset: (params: { id: string; page?: any; label: string; imageUrl: string; description?: string }) => Promise<SiteAsset>;
  deleteCustomAsset: (assetId: string) => Promise<void>;
  resetAsset: (assetId: string) => Promise<SiteAsset>;
  deleteAsset: (assetId: string) => Promise<SiteAsset>;
  refreshAssets: () => Promise<void>;
  loading: boolean;
  isQuickEditModeActive: boolean;
  setQuickEditModeActive: (active: boolean | ((prev: boolean) => boolean)) => void;
}

const SiteAssetContext = createContext<SiteAssetContextType | null>(null);

export const SiteAssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize with cached assets from localStorage to eliminate 1s flash on page reload
  const [assets, setAssets] = useState<Record<string, SiteAsset>>(() => getInitialSiteAssets());
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuickEditModeActive, setIsQuickEditModeActiveState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mipa_quick_edit_mode');
      return saved !== 'false';
    }
    return true;
  });

  const setQuickEditModeActive = useCallback((valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setIsQuickEditModeActiveState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mipa_quick_edit_mode', String(next));
      }
      return next;
    });
  }, []);

  const { user } = useAuth();

  const refreshAssets = useCallback(async () => {
    try {
      // Bust in-memory module cache so getSiteAssets re-fetches from Supabase
      bustSiteAssetsCache();
      const fresh = await getSiteAssets();
      setAssets(fresh);
    } catch (err) {
      console.warn('Error fetching site assets in provider:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAssets();
    const unsubscribe = subscribeSiteAssets((newAssets) => {
      setAssets(newAssets);
    });
    return () => unsubscribe();
  }, [refreshAssets]);

  const getAssetUrl = useCallback(
    (assetId: string, fallbackUrl?: string): string => {
      const found = assets[assetId];
      if (found?.imageUrl) return found.imageUrl;
      const def = DEFAULT_SITE_ASSETS[assetId];
      if (def?.imageUrl) return def.imageUrl;
      return fallbackUrl || '/hero.png';
    },
    [assets]
  );

  const updateAsset = useCallback(
    async (assetId: string, file: File): Promise<SiteAsset> => {
      const updated = await updateSiteAssetImage(assetId, file, user?.id);
      // Immediately update React state so UI reflects the new image without waiting for subscriber
      setAssets((prev) => ({ ...prev, [assetId]: updated }));
      return updated;
    },
    [user?.id]
  );

  const updateAssetUrl = useCallback(
    async (assetId: string, url: string): Promise<SiteAsset> => {
      const updated = await updateSiteAssetWithUrl(assetId, url, user?.id);
      setAssets((prev) => ({ ...prev, [assetId]: updated }));
      return updated;
    },
    [user?.id]
  );

  const createAsset = useCallback(
    async (params: { id: string; page?: any; label: string; imageUrl: string; description?: string }): Promise<SiteAsset> => {
      const created = await createCustomSiteAsset(params, user?.id);
      setAssets((prev) => ({ ...prev, [created.id]: created }));
      return created;
    },
    [user?.id]
  );

  const deleteCustomAsset = useCallback(async (assetId: string): Promise<void> => {
    await deleteCustomSiteAsset(assetId);
    setAssets((prev) => {
      const copy = { ...prev };
      delete copy[assetId];
      return copy;
    });
  }, []);

  const resetAsset = useCallback(async (assetId: string): Promise<SiteAsset> => {
    const reset = await resetSiteAssetToDefault(assetId);
    // Immediately update React state
    setAssets((prev) => ({ ...prev, [assetId]: reset }));
    return reset;
  }, []);

  const deleteAsset = useCallback(async (assetId: string): Promise<SiteAsset> => {
    const deleted = await deleteSiteAssetImage(assetId);
    setAssets((prev) => ({ ...prev, [assetId]: deleted }));
    return deleted;
  }, []);

  return (
    <SiteAssetContext.Provider
      value={{
        assets,
        getAssetUrl,
        updateAsset,
        updateAssetUrl,
        createAsset,
        deleteCustomAsset,
        resetAsset,
        deleteAsset,
        refreshAssets,
        loading,
        isQuickEditModeActive,
        setQuickEditModeActive,
      }}
    >
      {children}
    </SiteAssetContext.Provider>
  );
};

export const useSiteAssets = (): SiteAssetContextType => {
  const context = useContext(SiteAssetContext);
  if (!context) {
    // Fallback if rendered outside provider
    const initialFallback = getInitialSiteAssets();
    return {
      assets: initialFallback,
      getAssetUrl: (assetId: string, fallbackUrl?: string) => {
        return initialFallback[assetId]?.imageUrl || DEFAULT_SITE_ASSETS[assetId]?.imageUrl || fallbackUrl || '/hero.png';
      },
      updateAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      updateAssetUrl: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      createAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      deleteCustomAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      resetAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      deleteAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      refreshAssets: async () => {},
      loading: false,
      isQuickEditModeActive: false,
      setQuickEditModeActive: () => {},
    };
  }
  return context;
};
