// ==============================================================================
// Maison MIPA Memories — Bundle Regression Budget Enforcer
// Evaluates dist/ directory against performance & code-splitting limits.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';

const DIST_ASSETS = path.resolve('dist/assets');

if (!fs.existsSync(DIST_ASSETS)) {
  console.error('❌ dist/assets directory not found! Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_ASSETS);
console.log('--- MAISON MIPA BUNDLE REGRESSION AUDIT ---');

let hasFailure = false;

// 1. Check entry bundle size (must be <= 350 kB raw after code splitting)
const entryFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
if (!entryFile) {
  console.error('❌ Entry bundle index-*.js not found!');
  hasFailure = true;
} else {
  const stat = fs.statSync(path.join(DIST_ASSETS, entryFile));
  const sizeKb = stat.size / 1024;
  console.log(`📦 Entry bundle (${entryFile}): ${sizeKb.toFixed(2)} kB`);
  if (sizeKb > 350) {
    console.error(`❌ REGRESSION: Entry bundle exceeded budget limit (350 kB): got ${sizeKb.toFixed(2)} kB`);
    hasFailure = true;
  } else {
    console.log(`✅ Entry bundle within budget (< 350 kB)`);
  }
}

// 2. Verify Three.js vendor isolation
const threeFile = files.find((f) => f.startsWith('three-vendor-') && f.endsWith('.js'));
if (threeFile) {
  console.log(`✅ Three.js isolated into dedicated vendor chunk: ${threeFile}`);
} else {
  console.warn('⚠️ Dedicated three-vendor chunk not found.');
}

// 3. Verify private management route is split
const mgmtFile = files.find((f) => f.startsWith('ManagementPage-') && f.endsWith('.js'));
if (mgmtFile) {
  console.log(`✅ Management portal split into dedicated lazy chunk: ${mgmtFile}`);
} else {
  console.error('❌ REGRESSION: ManagementPage not split into lazy chunk!');
  hasFailure = true;
}

// 4. Verify booking page is split
const bookingFile = files.find((f) => f.startsWith('BookingPage-') && f.endsWith('.js'));
if (bookingFile) {
  console.log(`✅ Booking wizard split into dedicated lazy chunk: ${bookingFile}`);
} else {
  console.error('❌ REGRESSION: BookingPage not split into lazy chunk!');
  hasFailure = true;
}

// 5. Total CSS budget
const cssFiles = files.filter((f) => f.endsWith('.css'));
let totalCssBytes = 0;
for (const f of cssFiles) {
  totalCssBytes += fs.statSync(path.join(DIST_ASSETS, f)).size;
}
const cssKb = totalCssBytes / 1024;
console.log(`🎨 Total CSS size: ${cssKb.toFixed(2)} kB`);
if (cssKb > 60) {
  console.error(`❌ REGRESSION: CSS bundle exceeded budget limit (60 kB): got ${cssKb.toFixed(2)} kB`);
  hasFailure = true;
} else {
  console.log(`✅ CSS within budget (< 60 kB)`);
}

if (hasFailure) {
  console.error('\n❌ BUNDLE BUDGET AUDIT FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL BUNDLE BUDGETS PASSED!');
  process.exit(0);
}
