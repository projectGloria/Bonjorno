import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const zipPath = path.join(releaseDir, 'bonjorno-extension.zip');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

if (process.platform === 'win32') {
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path "${distDir}\\*" -DestinationPath "${zipPath}" -Force`,
    ],
    { stdio: 'inherit' }
  );
} else {
  execFileSync('zip', ['-r', '-q', zipPath, '.'], {
    cwd: distDir,
    stdio: 'inherit',
  });
}

const stat = fs.statSync(zipPath);
console.log(`Packaged ${path.relative(rootDir, zipPath)} (${(stat.size / 1024).toFixed(1)} KB)`);
