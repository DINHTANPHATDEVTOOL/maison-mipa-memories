// ==============================================================================
// Maison MIPA Memories — Pricing Preview Section (Homepage)
// Scannable price points grouped by service with actual database prices.
// Strict data integrity: zero packages from other services shown.
// Inclusions strictly derived from authoritative DB fields and pkg.features.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getPackages } from '../../services/catalogService';
import type { ServiceCategory, PackageItem } from '../../types';
import { ArrowRight, Check } from 'lucide-react';

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export const HomePricingPreview: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadPricingData() {
      try {
        const [srvs, pkgs] = await Promise.all([getServices(), getPackages()]);
        if (mounted) {
          setServices(srvs);
          setPackages(pkgs);
          if (srvs.length > 0) {
            setSelectedServiceId(srvs[0].id);
          }
        }
      } catch (err) {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadPricingData();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#70533C', fontSize: '0.9rem' }}>Đang tải bảng giá dịch vụ...</div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#70533C', fontSize: '0.9rem' }}>Không thể tải bảng giá vào lúc này.</div>
      </section>
    );
  }

  if (services.length === 0 || packages.length === 0) {
    return null;
  }

  // Filter packages strictly for selected service tab
  const displayPackages = selectedServiceId
    ? packages.filter((p) => p.serviceId === selectedServiceId)
    : [];

  return (
    <section
      id="bang-gia"
      aria-label="Bảng Giá Dịch Vụ"
      style={{
        padding: 'clamp(4rem, 8vw, 7.5rem) 1.5rem',
        backgroundColor: '#FFFDF9',
        borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'clamp(2rem, 4vw, 3.5rem)',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#70533C',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              BẢNG GIÁ DỊCH VỤ
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 0.75rem 0',
              }}
            >
              Bảng giá dịch vụ rõ ràng
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#604634',
                margin: 0,
                fontWeight: 300,
              }}
            >
              Chi tiết quyền lợi được hiển thị theo từng gói chụp và dịch vụ tương ứng.
            </p>
          </div>

          <Link
            to="/bang-gia"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#604634',
              fontSize: '0.92rem',
              fontWeight: 500,
              textDecoration: 'none',
              borderBottom: '1px solid #70533C',
              paddingBottom: '3px',
            }}
          >
            Xem toàn bộ bảng giá <ArrowRight size={15} />
          </Link>
        </div>

        {/* Service Category Tabs */}
        {services.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {services.map((srv) => {
              const isActive = srv.id === selectedServiceId;
              return (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServiceId(srv.id)}
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#29231F' : '#604634',
                    backgroundColor: isActive ? '#FAF8F3' : 'transparent',
                    border: isActive ? '1px solid #70533C' : '1px solid rgba(140, 110, 83, 0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {srv.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Editorial Pricing Rows Table */}
        {displayPackages.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              backgroundColor: '#FAF8F3',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              textAlign: 'center',
              color: '#70533C',
              fontSize: '0.92rem',
            }}
          >
            Hiện chưa có gói chụp được công bố cho dịch vụ này.
          </div>
        ) : (
          <div className="pricing-editorial-table">
            {displayPackages.map((pkg) => (
              <div key={pkg.id} className="pricing-editorial-row">
                {/* Column 1: Package Title & Inclusions */}
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: '1.45rem',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    {pkg.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#70533C' }}>
                    {pkg.features && pkg.features.length > 0
                      ? pkg.features.slice(0, 2).join(' • ')
                      : 'Chi tiết quyền lợi hiển thị theo gói'}
                  </div>
                </div>

                {/* Column 2: Duration & Concepts */}
                <div>
                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#70533C', fontWeight: 600 }}>
                    THỜI LƯỢNG
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#29231F', fontWeight: 500 }}>
                    {pkg.durationMinutes} phút • {pkg.conceptsCount} concept
                  </div>
                </div>

                {/* Column 3: Retouched Photos */}
                <div>
                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#70533C', fontWeight: 600 }}>
                    HẬU KỲ CHUYÊN SÂU
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#29231F', fontWeight: 500 }}>
                    {pkg.editedPhotosCount > 0 ? `${pkg.editedPhotosCount} ảnh hoàn thiện` : 'Tùy chọn bổ sung'}
                  </div>
                </div>

                {/* Column 4: Price */}
                <div>
                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#70533C', fontWeight: 600 }}>
                    GIÁ TRỌN GÓI
                  </div>
                  <div style={{ fontSize: '1.35rem', color: '#29231F', fontWeight: 600 }}>
                    {formatVnd(pkg.price)}
                  </div>
                </div>

                {/* Column 5: Action Button */}
                <div>
                  <button
                    onClick={() => {
                      if (pkg.serviceId) {
                        navigate(`/booking?service=${pkg.serviceId}&package=${pkg.id}`);
                      } else {
                        navigate(`/booking?package=${pkg.id}`);
                      }
                    }}
                    className="vc-primary-button"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Đặt gói này
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePricingPreview;
