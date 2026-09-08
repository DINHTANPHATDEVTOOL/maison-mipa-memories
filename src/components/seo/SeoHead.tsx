import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_CONFIG, getCanonicalUrl } from '../../config/site';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title = `${SITE_CONFIG.siteName} | Studio Chụp Ảnh & Đặt Lịch Online`,
  description = `${SITE_CONFIG.siteName} – studio chụp ảnh phong cách Pháp ấm áp & tinh tế. Đặt lịch chụp Couple, Portrait, Family, Graduation trực tuyến nhanh chóng.`,
  canonicalPath = '/',
  ogImage = SITE_CONFIG.assets.defaultOgImage,
  ogType = 'website',
  noIndex = false,
  keywords = 'Maison MIPA, Maison MIPA Memories, studio chụp ảnh, chụp ảnh couple, chụp ảnh gia đình, chụp ảnh nghệ thuật, studio sài gòn, đặt lịch chụp ảnh online',
  jsonLd,
}) => {
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const robotsDirective = noIndex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet>
      {/* Primary HTML Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robotsDirective} />
      <meta name="googlebot" content={robotsDirective} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_CONFIG.siteName} />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data (JSON-LD) */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
};

// ==============================================================================
// Structured Data Schemas Generators
// ==============================================================================

/**
 * Generates PhotographicStudio / LocalBusiness schema for Homepage
 */
export function generateStudioLocalBusinessSchema(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'PhotographicStudio',
    name: SITE_CONFIG.siteName,
    legalName: SITE_CONFIG.legalName,
    image: SITE_CONFIG.assets.defaultOgImage,
    url: SITE_CONFIG.domain,
    telephone: SITE_CONFIG.contact.phoneE164,
    email: SITE_CONFIG.contact.email,
    priceRange: SITE_CONFIG.pricing.priceRangeSchema,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.contact.address.streetAddress,
      addressLocality: SITE_CONFIG.contact.address.addressLocality,
      addressRegion: SITE_CONFIG.contact.address.addressRegion,
      postalCode: SITE_CONFIG.contact.address.postalCode,
      addressCountry: SITE_CONFIG.contact.address.addressCountry,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SITE_CONFIG.contact.openingHours.daysOfWeek,
      opens: SITE_CONFIG.contact.openingHours.schemaOpens,
      closes: SITE_CONFIG.contact.openingHours.schemaCloses,
    },
    sameAs: [
      SITE_CONFIG.social.facebook,
      SITE_CONFIG.social.instagram,
    ],
  };
}

/**
 * Generates Service schema for Service detail pages
 */
export function generateServiceSchema(options: {
  name: string;
  description: string;
  url: string;
  image?: string;
  lowPrice?: number;
  highPrice?: number;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: options.name,
    description: options.description,
    provider: {
      '@type': 'PhotographicStudio',
      name: SITE_CONFIG.siteName,
      url: SITE_CONFIG.domain,
      telephone: SITE_CONFIG.contact.phoneE164,
      address: {
        '@type': 'PostalAddress',
        streetAddress: SITE_CONFIG.contact.address.streetAddress,
        addressLocality: SITE_CONFIG.contact.address.addressLocality,
        addressCountry: SITE_CONFIG.contact.address.addressCountry,
      },
    },
    serviceType: 'Photography',
    areaServed: {
      '@type': 'City',
      name: SITE_CONFIG.contact.address.addressLocality,
    },
    url: options.url,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: SITE_CONFIG.pricing.currency,
      lowPrice: options.lowPrice ?? SITE_CONFIG.pricing.minPrice,
      highPrice: options.highPrice ?? SITE_CONFIG.pricing.maxPrice,
    },
  };
}

/**
 * Generates BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
