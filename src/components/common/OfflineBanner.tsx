// ==============================================================================
// Maison MIPA Memories — Offline Connection Banner
// Listens to network connectivity events and notifies the user with safe retry.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        backgroundColor: '#29231F',
        color: '#EFE6C9',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontSize: '0.85rem',
        borderBottom: '1px solid #C6A45F',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}
    >
      <WifiOff size={16} color="#C6A45F" />
      <span>Không thể kết nối. Kiểm tra Internet và thử lại.</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'none',
          border: '1px solid #C6A45F',
          color: '#EFE6C9',
          borderRadius: '4px',
          padding: '0.2rem 0.6rem',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <RefreshCw size={12} />
        <span>Thử lại</span>
      </button>
    </div>
  );
};
