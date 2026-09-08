import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://maisonmipa.io.vn';
const TODAY = new Date().toISOString().split('T')[0];

export const PUBLIC_SITEMAP_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/dich-vu', changefreq: 'weekly', priority: '0.9' },
  { path: '/dich-vu/couple', changefreq: 'weekly', priority: '0.85' },
  { path: '/dich-vu/portrait', changefreq: 'weekly', priority: '0.85' },
  { path: '/dich-vu/family', changefreq: 'weekly', priority: '0.85' },
  { path: '/dich-vu/graduation', changefreq: 'weekly', priority: '0.85' },
  { path: '/bang-gia', changefreq: 'weekly', priority: '0.9' },
  { path: '/portfolio', changefreq: 'weekly', priority: '0.8' },
  { path: '/booking', changefreq: 'daily', priority: '0.8' },
];

export function generateSitemapXml(routes = PUBLIC_SITEMAP_ROUTES, domain = DOMAIN, lastmod = TODAY) {
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
  const sitemapContent = generateSitemapXml();
  const targetPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(targetPath, sitemapContent, 'utf-8');
  console.log(`[sitemap] Successfully generated sitemap.xml with ${PUBLIC_SITEMAP_ROUTES.length} canonical routes -> ${targetPath}`);
}

// Run when executed directly
writeSitemap();
