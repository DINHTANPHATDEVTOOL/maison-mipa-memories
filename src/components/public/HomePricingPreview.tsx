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
        <div style={{ color: '#8C6E53', fontSize: '0.9rem' }}>Đang tải bảng giá dịch vụ...</div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#8C6E53', fontSize: '0.9rem' }}>Không thể tải bảng giá vào lúc này.</div>
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
                color: '#8C6E53',
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
              borderBottom: '1px solid #8C6E53',
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
                    border: isActive ? '1px solid #8C6E53' : '1px solid rgba(140, 110, 83, 0.2)',
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

        {/* Truthful Package Cards or Honest Empty State */}
        {displayPackages.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              backgroundColor: '#FAF8F3',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              textAlign: 'center',
              color: '#8C6E53',
              fontSize: '0.92rem',
            }}
          >
            Hiện chưa có gói chụp được công bố cho dịch vụ này.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {displayPackages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  backgroundColor: '#FAF8F3',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  borderRadius: '4px',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8C6E53',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {pkg.durationMinutes} PHÚT / {pkg.conceptsCount} CONCEPT
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: '1.65rem',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: '0 0 0.75rem 0',
                    }}
                  >
                    {pkg.name}
                  </h3>

                  <div
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 600,
                      color: '#29231F',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {formatVnd(pkg.price)}
                  </div>

                  {/* Authoritative DB inclusions only */}
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 2rem 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    {pkg.editedPhotosCount > 0 && (
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                        <Check size={16} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Hậu kỳ chuyên sâu <strong>{pkg.editedPhotosCount} ảnh</strong></span>
                      </li>
                    )}
                    {pkg.features && pkg.features.length > 0 ? (
                      pkg.features.map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                          <Check size={16} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{feat}</span>
                        </li>
                      ))
                    ) : (
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#8C6E53', fontStyle: 'italic' }}>
                        Chi tiết quyền lợi được hiển thị theo từng gói.
                      </li>
                    )}
                  </ul>
                </div>

                {/* Direct Booking Link - only when authoritative service relation is present */}
                <button
                  onClick={() => {
                    if (pkg.serviceId) {
                      navigate(`/booking?service=${pkg.serviceId}&package=${pkg.id}`);
                    } else {
                      navigate(`/booking?package=${pkg.id}`);
                    }
                  }}
                  className="public-btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  Đặt gói này
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePricingPreview;
