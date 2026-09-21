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
  resetAsset: (assetId: string) => Promise<SiteAsset>;
  deleteAsset: (assetId: string) => Promise<SiteAsset>;
  refreshAssets: () => Promise<void>;
  loading: boolean;
}

const SiteAssetContext = createContext<SiteAssetContextType | null>(null);

export const SiteAssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize with cached assets from localStorage to eliminate 1s flash on page reload
  const [assets, setAssets] = useState<Record<string, SiteAsset>>(() => getInitialSiteAssets());
  const [loading, setLoading] = useState<boolean>(true);
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
        resetAsset,
        deleteAsset,
        refreshAssets,
        loading,
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
      resetAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      deleteAsset: async () => {
        throw new Error('SiteAssetProvider not mounted');
      },
      refreshAssets: async () => {},
      loading: false,
    };
  }
  return context;
};
