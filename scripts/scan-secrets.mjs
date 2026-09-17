// ==============================================================================
// Maison MIPA Memories — Production Bundle Secret & Leak Scanner
// Ensures zero service role keys, Drive secrets, or email API keys leak into dist/
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist/ directory not found! Run npm run build first.');
  process.exit(1);
}

const PROHIBITED_PATTERNS = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g },
  { name: 'SERVICE_ROLE_LITERAL', regex: /service_role/i },
  { name: 'GOOGLE_DRIVE_CLIENT_SECRET', regex: /GOCSPX-[A-Za-z0-9-_]{20,}/g },
  { name: 'GOOGLE_DRIVE_REFRESH_TOKEN', regex: /1\/\/[A-Za-z0-9-_]{30,}/g },
  { name: 'RESEND_API_KEY', regex: /re_[A-Za-z0-9]{24,}/g },
  { name: 'PAYOS_RUNTIME_SECRET', regex: /PAYOS_CHECKSUM_KEY|PAYOS_API_KEY/i },
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const findings = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html') || entry.name.endsWith('.css'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of PROHIBITED_PATTERNS) {
        // Skip benign mentions of string 'service_role' in standard text if not accompanied by key
        if (pattern.name === 'SERVICE_ROLE_LITERAL') {
          if (content.includes('service_role_key') || content.includes('supabase_service_role')) {
            findings.push({ file: entry.name, pattern: pattern.name });
          }
        } else if (pattern.regex.test(content)) {
          findings.push({ file: entry.name, pattern: pattern.name });
        }
      }
    }
  }

  return findings;
}

console.log('--- MAISON MIPA PRODUCTION SECRET SCAN ---');
const findings = scanDirectory(DIST_DIR);

if (findings.length > 0) {
  console.error(`❌ CRITICAL SECURITY LEAK: Found ${findings.length} secret occurrence(s) in production build:`);
  for (const f of findings) {
    console.error(` - [${f.pattern}] in ${f.file}`);
  }
  process.exit(1);
} else {
  console.log('✅ PASS: ZERO secret keys or sensitive tokens found in production bundle.');
  process.exit(0);
}
