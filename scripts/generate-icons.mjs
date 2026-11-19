import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/icons');

fs.mkdirSync(outDir, { recursive: true });

// Minimal pure-Node PNG encoder for RGBA buffers
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Signed distance to rounded box centered at (0,0) with half-size (bx, by) and corner radius r
function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
}

// Render Bonjorno icon: sleek obsidian rounded squircle with warm rising sun arc & horizon line
function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = 1.4 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized coords in [-1, 1]
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;

      const boxDist = sdRoundedBox(nx, ny, 0.92, 0.92, 0.42);
      const boxAlpha = 1 - smoothstep(-aa, aa, boxDist);

      if (boxAlpha <= 0.001) continue;

      // Deep indigo-charcoal background gradient
      const bgT = clamp((ny + 1) * 0.5);
      let r = lerp(24, 13, bgT);
      let g = lerp(28, 16, bgT);
      let b = lerp(38, 22, bgT);

      // Subtle warm glow behind the sun
      const sunCx = 0;
      const sunCy = 0.14;
      const distSun = Math.hypot(nx - sunCx, ny - sunCy);
      const glow = Math.exp(-distSun * distSun * 4.2) * 0.45;
      r = lerp(r, 255, glow);
      g = lerp(g, 132, glow);
      b = lerp(b, 76, glow);

      // Rising sun semicircle above horizon (y <= 0.14)
      const horizonY = 0.14;
      const sunRadius = 0.42;
      const sunDist = Math.max(distSun - sunRadius, ny - horizonY);
      const sunAlpha = 1 - smoothstep(-aa, aa, sunDist);

      if (sunAlpha > 0) {
        const sunGrad = clamp((ny - (horizonY - sunRadius)) / sunRadius);
        const sr = lerp(255, 249, sunGrad);
        const sg = lerp(196, 108, sunGrad);
        const sb = lerp(112, 68, sunGrad);
        r = lerp(r, sr, sunAlpha);
        g = lerp(g, sg, sunAlpha);
        b = lerp(b, sb, sunAlpha);
      }

      // Crisp horizon bar
      const barDist = sdRoundedBox(nx, ny - 0.27, 0.54, 0.048, 0.048);
      const barAlpha = 1 - smoothstep(-aa, aa, barDist);
      if (barAlpha > 0) {
        r = lerp(r, 244, barAlpha);
        g = lerp(g, 246, barAlpha);
        b = lerp(b, 251, barAlpha);
      }

      // Subtle secondary lower accent line
      const bar2Dist = sdRoundedBox(nx, ny - 0.45, 0.30, 0.036, 0.036);
      const bar2Alpha = (1 - smoothstep(-aa, aa, bar2Dist)) * 0.55;
      if (bar2Alpha > 0) {
        r = lerp(r, 200, bar2Alpha);
        g = lerp(g, 210, bar2Alpha);
        b = lerp(b, 230, bar2Alpha);
      }

      // Subtle 1px inner border highlight
      const borderAlpha =
        (1 - smoothstep(0, aa * 1.8, Math.abs(boxDist + 0.035))) * 0.14;
      if (borderAlpha > 0) {
        r = lerp(r, 255, borderAlpha);
        g = lerp(g, 255, borderAlpha);
        b = lerp(b, 255, borderAlpha);
      }

      const idx = (y * size + x) * 4;
      rgba[idx] = Math.round(clamp(r / 255) * 255);
      rgba[idx + 1] = Math.round(clamp(g / 255) * 255);
      rgba[idx + 2] = Math.round(clamp(b / 255) * 255);
      rgba[idx + 3] = Math.round(clamp(boxAlpha) * 255);
    }
  }

  return encodePng(size, size, rgba);
}

for (const size of [16, 32, 48, 128]) {
  const png = renderIcon(size);
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${path.relative(process.cwd(), filePath)} (${png.length} bytes)`);
}
