// ==============================================================================
// Maison MIPA Memories — Concept Catalog Page (/concept)
// Data-driven category filters, varied editorial rhythm, bookable/non-bookable states.
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPublicConcepts } from '../services/portfolioService';
import { getServices } from '../services/catalogService';
import type { Concept, ServiceCategory } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { ArrowRight, Home, ChevronRight } from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';

interface ConceptCatalogPageProps {
  onOpenBooking: () => void;
}

export const ConceptCatalogPage: React.FC<ConceptCatalogPageProps> = ({ onOpenBooking: _onOpenBooking }) => {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function initCatalog() {
      try {
        const [conceptsData, servicesData] = await Promise.all([
          getPublicConcepts(),
          getServices(),
        ]);
        if (mounted) {
          setConcepts(conceptsData);
          setServices(servicesData);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err?.message || 'Không thể tải danh mục concept.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    initCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Create a service map: serviceId -> ServiceCategory
  const serviceMap = useMemo(() => {
    const map = new Map<string, ServiceCategory>();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  // Data-driven categories from actual concepts data
  const categoryFilters = useMemo(() => {
    const uniqueServiceIds = new Set<string>();
    concepts.forEach((c) => {
      if (c.serviceId) uniqueServiceIds.add(c.serviceId);
    });

    const list: { id: string; name: string }[] = [{ id: 'ALL', name: 'Tất cả' }];
    uniqueServiceIds.forEach((sId) => {
      const srv = serviceMap.get(sId);
      if (srv) {
        list.push({ id: srv.id, name: srv.name });
      }
    });

    return list;
  }, [concepts, serviceMap]);

  // Filter concepts based on selected data-driven category
  const filteredConcepts = useMemo(() => {
    if (selectedCategory === 'ALL') return concepts;
    return concepts.filter((c) => c.serviceId === selectedCategory);
  }, [concepts, selectedCategory]);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Concept', url: getCanonicalUrl('/concept') },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Danh Mục Concept Chụp Ảnh Nghệ Thuật | Maison MIPA Memories"
        description="Khám phá toàn bộ concept chụp ảnh độc bản tại Maison MIPA Memories: Chân dung, Couple, Wedding, Gia đình với ánh sáng tự nhiên và bối cảnh tinh tế."
        canonicalPath="/concept"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '1.5rem 1.5rem 0',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#8C6E53',
          }}
        >
          <li>
            <Link
              to="/"
              style={{
                color: '#8C6E53',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li>
            <ChevronRight size={13} color="#8C6E53" />
          </li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            Concept
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 2.5rem',
          padding: '0 1.5rem',
        }}
      >
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
          MAISON MIPA MEMORIES &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>
        <h1
          style={{
            fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 500,
            color: '#29231F',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}
        >
          Concept Nghệ Thuật & Không Gian Ký Ức
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: '#604634',
            maxWidth: '720px',
            margin: 0,
            fontWeight: 300,
          }}
        >
          Mỗi concept tại Maison MIPA được lấy cảm hứng từ những khoảnh khắc đời thường thiêng liêng nhất trong một tổ ấm — từ góc ban công đón nắng mai, phòng khách ấm cúng đến những nốt lặng đầy thi vị của tình yêu.
        </p>
      </header>

      {/* Data-Driven Category Filters */}
      {categoryFilters.length > 1 && (
        <div
          style={{
            maxWidth: '1350px',
            margin: '0 auto 3rem',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}
          >
            {categoryFilters.map((cat) => {
              const isActive = cat.id === selectedCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#FAF8F3' : '#604634',
                    backgroundColor: isActive ? '#29231F' : '#FFFDF9',
                    border: isActive ? '1px solid #29231F' : '1px solid rgba(140, 110, 83, 0.25)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area: Loading / Error / Empty / Grid */}
      <div
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(140, 110, 83, 0.2)',
                borderTopColor: '#8C6E53',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            Đang tải danh mục concept...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.3)',
              borderRadius: '4px',
              color: '#604634',
            }}
          >
            <p style={{ margin: '0 0 1rem 0' }}>{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="public-btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem' }}
            >
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && filteredConcepts.length === 0 && (
          <div
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              borderRadius: '4px',
              color: '#604634',
            }}
          >
            <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
              Hiện chưa có concept nào trong danh mục này.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#8C6E53', margin: 0 }}>
              Quý khách vui lòng chọn danh mục khác hoặc liên hệ studio để được tư vấn thiết kế riêng.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && filteredConcepts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'clamp(1.75rem, 3vw, 2.75rem)',
            }}
          >
            {filteredConcepts.map((concept) => {
              const service = concept.serviceId ? serviceMap.get(concept.serviceId) : undefined;
              const categoryLabel = service ? service.name : 'Concept Maison MIPA';

              return (
                <article
                  key={concept.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(140, 110, 83, 0.18)',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  {/* Image Frame */}
                  <Link
                    to={`/concept/${concept.slug}`}
                    style={{
                      display: 'block',
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '4/3',
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                      textDecoration: 'none',
                    }}
                  >
                    {concept.coverPhotoUrl ? (
                      <img
                        src={concept.coverPhotoUrl}
                        alt={concept.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.55s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1.0)';
                        }}
                      />
                    ) : (
                      <EditorialImagePlaceholder
                        aspectRatio="4/3"
                        caption={concept.name}
                      />
                    )}

                    {/* Bookable State Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '2px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        backgroundColor: concept.bookable ? '#FAF8F3' : 'rgba(41, 35, 31, 0.85)',
                        color: concept.bookable ? '#29231F' : '#FFFDF9',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      {concept.bookable ? 'Có thể đặt lịch' : 'Hiện chưa mở đặt lịch'}
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#8C6E53',
                          fontWeight: 500,
                          marginBottom: '0.35rem',
                        }}
                      >
                        {categoryLabel}
                      </span>

                      <h2
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '1.55rem',
                          fontWeight: 500,
                          color: '#29231F',
                          margin: '0 0 0.6rem 0',
                          lineHeight: 1.2,
                        }}
                      >
                        <Link
                          to={`/concept/${concept.slug}`}
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                          }}
                        >
                          {concept.name}
                        </Link>
                      </h2>

                      <p
                        style={{
                          fontSize: '0.88rem',
                          lineHeight: 1.55,
                          color: '#604634',
                          margin: '0 0 1.25rem 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontWeight: 300,
                        }}
                      >
                        {concept.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(140, 110, 83, 0.15)',
                      }}
                    >
                      <Link
                        to={`/concept/${concept.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.85rem',
                          color: '#29231F',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Xem concept <ArrowRight size={14} />
                      </Link>

                      {concept.bookable ? (
                        <button
                          onClick={() => navigate(`/booking?concept=${concept.slug}`)}
                          className="public-btn-primary"
                          style={{
                            padding: '0.45rem 0.95rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                          }}
                        >
                          Đặt lịch
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#8C6E53' }}>
                          Hiện chưa mở đặt lịch
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptCatalogPage;
