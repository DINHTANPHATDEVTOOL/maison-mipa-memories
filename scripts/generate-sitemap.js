import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://maisonmipa.io.vn';
const TODAY = new Date().toISOString().split('T')[0];

/**
 * Dynamically extracts service slugs from src/config/site.ts
 */
export function extractServiceSlugs(rootDir = path.resolve(__dirname, '..')) {
  try {
    const siteConfigPath = path.join(rootDir, 'src/config/site.ts');
    if (fs.existsSync(siteConfigPath)) {
      const content = fs.readFileSync(siteConfigPath, 'utf-8');
      const matches = [...content.matchAll(/slug:\s*['"]([a-zA-Z0-9_-]+)['"]/g)];
      const slugs = [...new Set(matches.map((m) => m[1]))];
      if (slugs.length > 0) return slugs;
    }
  } catch (err) {
    console.warn('[sitemap] Notice reading site.ts:', err.message);
  }
  return ['portrait', 'couple', 'graduation', 'birthday', 'family'];
}

/**
 * Dynamically extracts concept and collection slugs from src/services/portfolioService.ts
 */
export function extractPortfolioCatalogSlugs(rootDir = path.resolve(__dirname, '..')) {
  const result = {
    concepts: [],
    collections: [],
  };

  try {
    const portfolioServicePath = path.join(rootDir, 'src/services/portfolioService.ts');
    if (fs.existsSync(portfolioServicePath)) {
      const content = fs.readFileSync(portfolioServicePath, 'utf-8');

      // Extract DEMO_CONCEPTS block
      const conceptBlockMatch = content.match(/export const DEMO_CONCEPTS[\s\S]*?\];/);
      if (conceptBlockMatch) {
        const matches = [...conceptBlockMatch[0].matchAll(/slug:\s*['"]([a-zA-Z0-9_-]+)['"]/g)];
        result.concepts = [...new Set(matches.map((m) => m[1]))];
      }

      // Extract DEMO_COLLECTIONS block
      const collectionBlockMatch = content.match(/export const DEMO_COLLECTIONS[\s\S]*?\];/);
      if (collectionBlockMatch) {
        const matches = [...collectionBlockMatch[0].matchAll(/slug:\s*['"]([a-zA-Z0-9_-]+)['"]/g)];
        result.collections = [...new Set(matches.map((m) => m[1]))];
      }
    }
  } catch (err) {
    console.warn('[sitemap] Notice reading portfolioService.ts:', err.message);
  }

  // Fallbacks if file parsing is interrupted
  if (result.concepts.length === 0) {
    result.concepts = [
      'parisian-romance',
      'vintage-cinematic',
      'nang-tho',
      'chup-ao-dai-duyen-dang',
      'chup-ky-yeu-tot-nghiep',
      'la-famille-douce',
      'sinh-nhat-lung-linh',
      'chup-chan-dung-nghe-thuat',
      'chup-le-tet-sum-vay',
      'chup-giang-sinh-noel-cozy',
    ];
  }
  if (result.collections.length === 0) {
    result.collections = [
      'parisian-romance-autumn',
      'vintage-loft-intimate',
      'nang-tho-tinh-khoi',
      'la-famille-douce-home',
      'sinh-nhat-tuoi-moi',
    ];
  }

  return result;
}

/**
 * Builds the comprehensive list of all canonical public routes dynamically
 */
export function getDynamicSitemapRoutes(rootDir = path.resolve(__dirname, '..')) {
  const serviceSlugs = extractServiceSlugs(rootDir);
  const { concepts, collections } = extractPortfolioCatalogSlugs(rootDir);

  const routes = [
    // Core Canonical Pages
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/concept', changefreq: 'daily', priority: '0.95' },
    { path: '/dich-vu', changefreq: 'weekly', priority: '0.9' },
    { path: '/bang-gia', changefreq: 'weekly', priority: '0.9' },
    { path: '/portfolio', changefreq: 'weekly', priority: '0.85' },
    { path: '/cam-nang', changefreq: 'weekly', priority: '0.8' },
    { path: '/atelier', changefreq: 'weekly', priority: '0.8' },
    { path: '/booking', changefreq: 'daily', priority: '0.9' },
  ];

  // Dynamic Service Detail Pages
  serviceSlugs.forEach((slug) => {
    routes.push({
      path: `/dich-vu/${slug}`,
      changefreq: 'weekly',
      priority: '0.85',
    });
  });

  // Dynamic Concept Detail Pages
  concepts.forEach((slug) => {
    routes.push({
      path: `/concept/${slug}`,
      changefreq: 'weekly',
      priority: '0.85',
    });
  });

  // Dynamic Collection Detail Pages
  collections.forEach((slug) => {
    routes.push({
      path: `/portfolio/${slug}`,
      changefreq: 'monthly',
      priority: '0.8',
    });
  });

  return routes;
}

export const PUBLIC_SITEMAP_ROUTES = getDynamicSitemapRoutes();

export function generateSitemapXml(routes = getDynamicSitemapRoutes(), domain = DOMAIN, lastmod = TODAY) {
  const urls = routes.map((r) => {
    const loc = r.path === '/' ? `${domain}/` : `${domain}${r.path}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function writeSitemap() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const dynamicRoutes = getDynamicSitemapRoutes();
  const sitemapContent = generateSitemapXml(dynamicRoutes);
  const targetPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(targetPath, sitemapContent, 'utf-8');
  console.log(`[sitemap] Successfully generated dynamic sitemap.xml with ${dynamicRoutes.length} canonical routes -> ${targetPath}`);
}

// Run when executed directly
writeSitemap();

