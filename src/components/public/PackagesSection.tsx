// ==============================================================================
// Maison MIPA Memories — Editorial Pricing Menu
// Art Direction: Contemporary editorial price list separated by horizontal rules.
// No SaaS cards, no gold borders, no floating POPULAR pills, no star icons.
// Dynamic catalog data from catalogService.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { getPackages } from '../../services/catalogService';
import type { PackageItem } from '../../types';

interface PackagesSectionProps {
  onOpenBooking: () => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({ onOpenBooking }) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadPackagesData() {
      try {
        const data = await getPackages();
        if (mounted) setPackages(data);
      } catch (err) {
        console.error('Lỗi tải bảng giá gói chụp:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadPackagesData();
    return () => { mounted = false; };
  }, []);

  if (isLoading || packages.length === 0) return null;

  return (
    <section id="packages" className="editorial-section" style={{ backgroundColor: 'var(--editorial-paper)' }}>
      <div className="editorial-container">
        {/* Editorial Section Header */}
        <div style={{ marginBottom: '4rem', maxWidth: '640px' }}>
          <span className="editorial-overline">BẢNG GIÁ & QUYỀN LỢI</span>
          <h2 className="editorial-h2">Các gói chụp tại studio</h2>
          <p className="editorial-copy">
            Chi phí minh bạch, không phát sinh phụ phí ẩn. Toàn bộ các gói chụp đều bao gồm trọn bộ file ảnh gốc chất lượng cao bàn giao qua Google Drive.
          </p>
        </div>

        {/* Editorial Price Menu Rows */}
        <div className="editorial-price-menu">
          {packages.map((pkg) => (
            <div key={pkg.id} className="editorial-price-row">
              {/* Col 1: Package Title & Category */}
              <div>
                <h3 className="editorial-price-name">{pkg.name}</h3>
                <div className="editorial-price-meta">
                  {pkg.recommended ? 'Được chọn nhiều' : 'Gói tiêu chuẩn'}
                </div>
              </div>

              {/* Col 2: Inclusions / Features */}
              <div>
                <ul className="editorial-price-inclusions">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>

              {/* Col 3: Price */}
              <div>
                <div className="editorial-price-amount">
                  {pkg.price.toLocaleString('vi-VN')} <span className="editorial-price-currency">VNĐ</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--editorial-text-muted)', marginTop: '0.2rem' }}>
                  Đặt cọc 30% khi giữ lịch
                </div>
              </div>

              {/* Col 4: Action Button */}
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={onOpenBooking}
                  className="public-btn-primary"
                  style={{ width: '100%', maxWidth: '160px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                >
                  Chọn gói này
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
