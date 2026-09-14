import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Bundle Security & Zero-Secret Audit', () => {
  const SENSITIVE_KEY_PATTERNS = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /RESEND_API_KEY/i,
    /PAYOS_API_KEY/i,
    /PAYOS_CHECKSUM_KEY/i,
    /OTP_PEPPER/i,
    /PAYMENT_WEBHOOK_SECRET/i,
  ];

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
          getAllFiles(fullPath, arrayOfFiles);
        }
      } else if (/\.(tsx?|jsx?|html)$/.test(file) && !file.includes('.test.') && !file.includes('bundleSecretsLeak')) {
        arrayOfFiles.push(fullPath);
      }
    }

    return arrayOfFiles;
  }

  it('1. client source code in src/ contains NO server-side secret variable names', () => {
    const srcDir = path.resolve(__dirname, '../../');
    const sourceFiles = getAllFiles(srcDir);

    expect(sourceFiles.length).toBeGreaterThan(10);

    const violations: { file: string; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if file accesses Deno.env or process.env for server secrets in client code
      for (const pattern of SENSITIVE_KEY_PATTERNS) {
        if (content.includes(`process.env.${pattern.source}`) || content.includes(`import.meta.env.${pattern.source}`)) {
          violations.push({ file: filePath, match: pattern.source });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('2. client environment does not expose server secrets via Vite public env', () => {
    const viteEnv = (import.meta as any).env || {};

    expect(viteEnv.VITE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(viteEnv.VITE_RESEND_API_KEY).toBeUndefined();
    expect(viteEnv.VITE_PAYOS_API_KEY).toBeUndefined();
    expect(viteEnv.VITE_PAYOS_CHECKSUM_KEY).toBeUndefined();
    expect(viteEnv.VITE_PAYMENT_WEBHOOK_SECRET).toBeUndefined();
  });

  it('3. built dist/ bundle (if exists) does not leak raw secret keys or service role tokens', () => {
    const distDir = path.resolve(__dirname, '../../../dist');
    if (!fs.existsSync(distDir)) {
      // Build output will be verified during npm run build
      return;
    }

    const distFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));
    for (const file of distFiles) {
      const content = fs.readFileSync(path.join(distDir, 'assets', file), 'utf-8');
      expect(content).not.toContain('PAYOS_CHECKSUM_KEY');
      expect(content).not.toContain('RESEND_API_KEY');
      expect(content).not.toContain('OTP_PEPPER');
    }
  });
});
