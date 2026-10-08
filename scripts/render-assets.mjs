// Deterministic software rasterizer; Node built-ins and macOS sips only.
// Run `npm run assets`. PNG inputs/decoded checks live in a disposable temp dir.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync, inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outputDir = fileURLToPath(new URL('../assets/', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'rhine-assets-'));
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
// Bars are authored in 1600×900 units and rendered at OUT× so they stay crisp
// on 2× (Retina) displays, where the field is shown ~1.8× larger than 1600px.
const OUT = 2, BARS_W = 1600 * OUT, BARS_H = 900 * OUT, FLAT_X = 576 * OUT;
const QUALITY = '82';

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length);
  name.copy(header, 4);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, data, footer]);
}
function writePng(path, width, height, pixels, channels = 3) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 1 ? 0 : 2;
  const stride = width * channels;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}

// Read sips' losslessly decoded PNGs, including all five PNG row filters.
function readPng(path) {
  const file = readFileSync(path);
  const parts = [];
  let width, height, channels;
  for (let p = 8; p < file.length;) {
    const length = file.readUInt32BE(p);
    const type = file.toString('ascii', p + 4, p + 8);
    const data = file.subarray(p + 8, p + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[data[9]];
      if (data[8] !== 8 || data[12] !== 0 || !channels) throw new Error('Unexpected decoded PNG format');
    }
    if (type === 'IDAT') parts.push(data);
    p += length + 12;
  }
  const packed = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const raw = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const p = y * stride + x;
      const a = x >= channels ? raw[p - channels] : 0;
      const b = y ? raw[p - stride] : 0;
      const c = y && x >= channels ? raw[p - stride - channels] : 0;
      const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
      if (predictor === undefined) throw new Error('Unexpected PNG row filter');
      raw[p] = (packed[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    for (let c = 0; c < 3; c++) rgb[p * 3 + c] = raw[p * channels + (channels < 3 ? 0 : c)];
  }
  return { width, height, pixels: rgb };
}
function jpeg(png, path) {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', QUALITY, png, '--out', path], { stdio: 'pipe' });
}
function decode(path, label) {
  const png = join(scratch, `${label}-decoded.png`);
  execFileSync('sips', ['-s', 'format', 'png', path, '--out', png], { stdio: 'pipe' });
  return readPng(png);
}

// Very low-contrast dark haze can acquire a one-level DCT undershoot even with
// blurred, floor-clamped input. Lift the affected 8×8 luminance blocks uniformly
// by the deficit: their DC changes without disturbing AC edges or chroma. This
// avoids visible halos. The protected flat left stays untouched.
function encodeBars(png, jpg, pixels, background) {
  for (let pass = 0; pass < 8; pass++) {
    writePng(png, BARS_W, BARS_H, pixels);
    jpeg(png, jpg);
    if (background[0] >= 100) return;
    const decoded = decode(jpg, 'dark-floor-check');
    const bad = [];
    for (let p = 0; p < BARS_W * BARS_H; p++) {
      const deficit = Math.max(...background.map((v, c) => v - decoded.pixels[p * 3 + c]));
      if (deficit > 0) bad.push({ x: p % BARS_W, y: Math.floor(p / BARS_W), deficit });
    }
    if (!bad.length) return;
    console.log(`dark JPEG floor guard: ${bad.length} rounding undershoots; correction pass ${pass + 1}`);
    const blocks = new Map();
    for (const { x, y, deficit } of bad) {
      if (x < FLAT_X) throw new Error('JPEG changed the protected background');
      const block = Math.floor(y / 8) * 8 * BARS_W + Math.floor(x / 8) * 8;
      blocks.set(block, Math.max(blocks.get(block) ?? 0, deficit));
    }
    for (const [block, nudge] of blocks) {
      const x = block % BARS_W, y = Math.floor(block / BARS_W);
      for (let yy = y; yy < Math.min(BARS_H, y + 8); yy++) for (let xx = x; xx < x + 8; xx++) {
        for (let c = 0; c < 3; c++) {
          const p = (yy * BARS_W + xx) * 3 + c;
          pixels[p] = Math.min(255, pixels[p] + nudge);
        }
      }
    }
  }
  throw new Error('Unable to enforce the dark JPEG floor');
}

// JPEG's RGB/YCbCr rounding can shift a uniform RGB input by one unit.
// Calibrate on aligned constant tiles using the exact same encoder/quality.
function calibratedBackground(target, label) {
  const candidates = [];
  for (let r = -4; r <= 4; r++) for (let g = -4; g <= 4; g++) for (let b = -4; b <= 4; b++) {
    candidates.push(target.map((v, c) => clamp(v + [r, g, b][c], 0, 255)));
  }
  const tile = 32, columns = 27, width = columns * tile, height = Math.ceil(candidates.length / columns) * tile;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const color = candidates[Math.floor(y / tile) * columns + Math.floor(x / tile)] ?? target;
    for (let c = 0; c < 3; c++) pixels[(y * width + x) * 3 + c] = color[c];
  }
  const png = join(scratch, `${label}-calibration.png`), jpg = join(scratch, `${label}-calibration.jpg`);
  writePng(png, width, height, pixels);
  jpeg(png, jpg);
  const decoded = decode(jpg, `${label}-calibration`);
  let best, distance = Infinity;
  candidates.forEach((candidate, i) => {
    const x = (i % columns) * tile + 16, y = Math.floor(i / columns) * tile + 16;
    const p = (y * width + x) * 3;
    if (target.every((v, c) => decoded.pixels[p + c] === v)) {
      const d = candidate.reduce((sum, v, c) => sum + (v - target[c]) ** 2, 0);
      if (d < distance) { best = candidate; distance = d; }
    }
  });
  if (!best) throw new Error(`sips cannot reproduce the ${label} background exactly`);
  console.log(`${label} JPEG background: input RGB ${best.join(',')} → decoded RGB ${target.join(',')}`);
  return best;
}

function renderBars(dark, background) {
  const width = BARS_W, height = BARS_H, samples = 2, w = width * samples, h = height * samples;
  const unit = OUT * samples; // 1600×900 design px → supersampled px
  const pixels = new Float32Array(w * h * 3);
  const depths = new Float32Array(w * h);
  const occlusion = new Float32Array(w * h);
  const castShadows = new Float32Array(w * h);
  const angle = 30 * Math.PI / 180, azimuth = 33 * Math.PI / 180;
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth), sd = Math.sin(angle), cd = Math.cos(angle);
  // Pinhole camera: 40° vertical FOV, 30° elevation, 30 world units from
  // the ground target. Rows converge to a vanishing point above the upper right.
  const distance = 30, cx = 1030 * unit, cy = 520 * unit;
  const focal = h / (2 * Math.tan(40 * Math.PI / 360));
  const atmosphere = (d) => (1 - smooth((d - 30) / 30)) * smooth((d - 10) / 5);
  const groundDepth = (y) => distance * sd / (sd + cd * (y - cy) / focal);
  const project = (x, y, z) => {
    const d = distance - sa * cd * x - sd * y + ca * cd * z;
    return {
      x: cx + focal * (ca * x + sa * z) / d,
      y: cy + focal * (sa * sd * x - cd * y - ca * sd * z) / d,
      d, inverse: 1 / d, v: y,
    };
  };
  const thickness = 0.20, halfLength = 1.06;
  const fins = [];
  function shadowSegment(a, b, sigma, strength, target) {
    const radius = Math.ceil(3 * sigma);
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius)), maxX = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x) + radius));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius)), maxY = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y) + radius));
    const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / Math.max(1e-6, lengthSquared));
      const r2 = (x - a.x - dx * t) ** 2 + (y - a.y - dy * t) ** 2;
      target[y * w + x] += strength * Math.exp(-r2 / (2 * sigma * sigma));
    }
  }
  // The lattice extends well beyond the view frustum; no finite field edge or
  // corner is visible. Atmosphere removes distant rows before the lattice ends.
  for (let i = -54; i <= 54; i++) for (let j = -15; j <= 46; j++) {
    const x = i * 0.62, z = j * 3.00;
    const wave = 2.90 + 0.70 * Math.sin(x * 0.60 + z * 0.17) + 0.28 * Math.sin(x * 0.28 - z * 0.19 + 0.7);
    const height = wave * (1 + (hash(i, j, 41) * 2 - 1) * 0.08);
    const baseDepth = project(x, 0, z).d;
    if (baseDepth < 13 || baseDepth - height * sd > 60) continue;
    const fin = { i, x, z, height, variation: 0.25 * Math.sin(i * 1.7 + j * 2.1) };
    const center = project(x, height * 0.5, z);
    if (center.x < 350 * unit || center.x > w + 450 * unit || center.y < -350 * unit || center.y > h + 450 * unit) continue;
    fins.push(fin);
    const scale = focal / baseDepth;
    shadowSegment(project(x + thickness * 0.5, 0, z - halfLength), project(x + thickness * 0.5, 0, z + halfLength),
      scale * 0.065, 0.62, occlusion);
    // The upper-left diffuse key casts broad, faint shadows toward the lower
    // right. Capsule kernels emulate a large area light without hard silhouettes.
    shadowSegment(project(x + height * 0.35, 0, z - halfLength + height * 0.11),
      project(x + height * 0.35, 0, z + halfLength + height * 0.11), scale * height * 0.15, 0.28, castShadows);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, fog = atmosphere(groundDepth(y));
    const contact = Math.min(1, occlusion[p]), cast = Math.min(1, castShadows[p]);
    for (let c = 0; c < 3; c++) {
      const offset = dark ? 3.2 - contact * 1.5 - cast * 0.8 : -contact * 7 - cast * 4;
      pixels[p * 3 + c] = background[c] + offset * fog;
    }
  }
  function triangle(a, b, c, shade) {
    const denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denom) < 1e-5) return;
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), maxX = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), maxY = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const u = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / denom;
      const v = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / denom;
      const t = 1 - u - v;
      if (u < 0 || v < 0 || t < 0) continue;
      const p = y * w + x, inverse = u * a.inverse + v * b.inverse + t * c.inverse;
      if (inverse <= depths[p]) continue;
      depths[p] = inverse;
      // Perspective-correct local height and depth, for both shading and fog.
      const color = shade((u * a.v * a.inverse + v * b.v * b.inverse + t * c.v * c.inverse) / inverse);
      const fog = atmosphere(1 / inverse);
      for (let channel = 0; channel < 3; channel++) pixels[p * 3 + channel] = mix(background[channel], color[channel], fog);
    }
  }
  function quad(vertices, shade) {
    triangle(vertices[0], vertices[1], vertices[2], shade);
    triangle(vertices[0], vertices[2], vertices[3], shade);
  }
  for (const { x, z, height: top, variation } of fins) {
    const face = (y, lit = false) => {
      const t = smooth(y / top), contact = Math.exp(-y * 5);
      const base = dark ? (lit ? [37, 38, 42] : [30, 31, 34]) : (lit ? [232, 230, 224] : [220, 218, 212]);
      return base.map((v) => v + (dark ? 3 : 10) * t - (dark ? 1 : 7) * contact + variation);
    };
    quad([
      project(x + thickness, 0, z - halfLength), project(x + thickness, 0, z + halfLength),
      project(x + thickness, top, z + halfLength), project(x + thickness, top, z - halfLength),
    ], (y) => face(y));
    quad([
      project(x, 0, z - halfLength), project(x + thickness, 0, z - halfLength),
      project(x + thickness, top, z - halfLength), project(x, top, z - halfLength),
    ], (y) => face(y, true));
    quad([
      project(x, top, z - halfLength), project(x + thickness, top, z - halfLength),
      project(x + thickness, top, z + halfLength), project(x, top, z + halfLength),
    ], () => (dark ? [42, 43, 47] : [249, 248, 243]).map((v) => v + variation));
    // Only a thin strip along the upper edge carries the cool graphite glint.
    if (dark) quad([
      project(x + thickness - 0.022, top + 0.001, z - halfLength), project(x + thickness, top + 0.001, z - halfLength),
      project(x + thickness, top + 0.001, z + halfLength), project(x + thickness - 0.022, top + 0.001, z + halfLength),
    ], () => [52, 55, 61]);
  }
  const resolved = new Float32Array(width * height * 3), distances = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let inverse = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
      const p = (y * samples + sy) * w + x * samples + sx;
      inverse = Math.max(inverse, depths[p]);
      for (let c = 0; c < 3; c++) resolved[(y * width + x) * 3 + c] += pixels[p * 3 + c] / (samples * samples);
    }
    distances[y * width + x] = inverse ? 1 / inverse : groundDepth(y * samples);
  }
  // Three optical point-spread functions, blended by actual camera distance.
  // Focused fins remain individually legible; distant rows soften into haze.
  // At OUT× these sigmas are in output pixels: the in-focus band is nearly
  // untouched (supersampling already anti-aliases it).
  const focused = gaussian(resolved, width, height, 0.3 * OUT);
  const distant = gaussian(resolved, width, height, 1.9 * OUT);
  const foreground = gaussian(resolved, width, height, 0.8 * OUT);
  const result = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x, d = distances[p];
    const farBlur = smooth((d - 32) / 26), nearBlur = (1 - smooth((d - 15) / 7)) * 0.45;
    // Apply the curved, 300px composition feather *after* filtering, so no blur
    // can contaminate the JPEG-aligned 36% flat region protecting the left 35%.
    const start = FLAT_X + 30 * OUT * (1 + Math.cos((y / OUT - 430) / 470 * Math.PI));
    const fade = smooth((x - start) / (300 * OUT));
    for (let c = 0; c < 3; c++) {
      const index = p * 3 + c;
      const optical = mix(mix(focused[index], distant[index], farBlur), foreground[index], nearBlur);
      result[index] = Math.round(clamp(mix(background[c], optical, fade), dark ? background[c] : 0, 255));
    }
  }
  const foregroundFins = fins.filter(({ x, z }) => {
    const p = project(x, 0, z);
    return p.x > 850 * unit && p.x < 1550 * unit && p.y > 650 * unit && p.y < 900 * unit;
  });
  const rowCount = new Set(foregroundFins.map(({ i }) => i)).size;
  const heights = foregroundFins.map(({ x, z, height }) => (project(x, 0, z).y - project(x, height, z).y) / unit);
  const widths = foregroundFins.map(({ x, z, height }) => (project(x + thickness, height, z).x - project(x, height, z).x) / unit);
  console.log(`${dark ? 'dark' : 'light'} perspective: ${rowCount} foreground row tracks; fins ${Math.min(...heights).toFixed(0)}–${Math.max(...heights).toFixed(0)}px tall, ${Math.min(...widths).toFixed(1)}–${Math.max(...widths).toFixed(1)}px thick`);
  return result;
}

function gaussian(pixels, width, height, sigma) {
  const radius = Math.ceil(sigma * 3), kernel = [];
  let total = 0;
  for (let i = -radius; i <= radius; i++) { const weight = Math.exp(-i * i / (2 * sigma * sigma)); kernel.push(weight); total += weight; }
  const horizontal = new Float32Array(pixels.length), result = new Float32Array(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += pixels[(y * width + clamp(x + k, 0, width - 1)) * 3 + c] * kernel[k + radius];
    horizontal[(y * width + x) * 3 + c] = sum / total;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += horizontal[(clamp(y + k, 0, height - 1) * width + x) * 3 + c] * kernel[k + radius];
    result[(y * width + x) * 3 + c] = sum / total;
  }
  return result;
}

function hash(x, y, salt = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, salt = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smooth(x - ix), v = smooth(y - iy);
  return mix(mix(hash(ix, iy, salt), hash(ix + 1, iy, salt), u),
    mix(hash(ix, iy + 1, salt), hash(ix + 1, iy + 1, salt), u), v);
}
// A soft SEM-style cell culture: rounded, slightly elliptical cells whose
// domes merge smoothly (no polygonal borders), lit the way an SEM reads —
// slopes and rims glow (edge effect), flat tops stay mid-grey, the substrate
// between cells is dark. Uneven illumination, a touch of defocus and grain
// finish it. Deterministic.
function renderSpecimen() {
  const size = 320, pitch = 46, k = 10;
  const fbm = (x, y, salt, octaves = 4) => {
    let amp = 0.5, freq = 1, sum = 0;
    for (let o = 0; o < octaves; o++) { sum += amp * noise(x * freq, y * freq, salt + o); freq *= 2.03; amp *= 0.5; }
    return sum / (1 - 0.5 ** octaves);
  };
  const sites = [];
  for (let gy = -1; gy <= size / pitch + 1; gy++) for (let gx = -1; gx <= size / pitch + 1; gx++) {
    if (hash(gx, gy, 31) < 0.14) continue; // gaps let the substrate show through
    sites.push({
      x: (gx + 0.2 + 0.6 * hash(gx, gy, 32)) * pitch,
      y: (gy + 0.2 + 0.6 * hash(gx, gy, 33)) * pitch,
      r: pitch * (0.42 + 0.3 * hash(gx, gy, 34)),
      stretch: 0.8 + 0.4 * hash(gx, gy, 35),
      cos: Math.cos(hash(gx, gy, 36) * Math.PI),
      sin: Math.sin(hash(gx, gy, 36) * Math.PI),
    });
    if (hash(gx, gy, 37) < 0.4) { // debris particles on the substrate
      sites.push({
        x: (gx + hash(gx, gy, 38)) * pitch,
        y: (gy + hash(gx, gy, 39)) * pitch,
        r: pitch * (0.07 + 0.07 * hash(gx, gy, 41)),
        stretch: 1, cos: 1, sin: 0,
      });
    }
  }

  // Height field: smooth union (soft max) of cell domes over a flat substrate.
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const wx = x + 15 * (fbm(x / 40, y / 40, 40) - 0.5);
    const wy = y + 15 * (fbm(x / 40, y / 40, 50) - 0.5);
    let sum = 0;
    for (const s of sites) {
      const dx = wx - s.x, dy = wy - s.y;
      if (Math.abs(dx) > s.r * 1.3 || Math.abs(dy) > s.r * 1.3) continue;
      const u = (dx * s.cos + dy * s.sin) / (s.r * s.stretch);
      const v = (-dx * s.sin + dy * s.cos) / (s.r / s.stretch);
      const d2 = u * u + v * v;
      if (d2 >= 1) continue;
      const dome = (1 - d2) ** 1.5 + 0.14 * Math.exp(-d2 / 0.05); // body + nucleus bump
      sum += Math.exp(k * dome) - 1;
    }
    let h = Math.log(1 + sum) / k;
    const cover = smooth(h / 0.12);
    h += cover * 0.06 * (fbm(x / 4.5, y / 4.5, 60, 3) - 0.5); // granular membrane
    h += (1 - cover) * 0.025 * fbm(x / 14, y / 3.5, 70, 3);   // fibrous substrate
    height[y * size + x] = h;
  }

  // SEM shading: edge brightening on slopes + soft key light from upper left.
  const lit = new Float32Array(size * size);
  const L = [-0.55, -0.55, 0.63];
  const at = (x, y) => height[clamp(y, 0, size - 1) * size + clamp(x, 0, size - 1)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * 22;
    const gy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * 22;
    const inv = 1 / Math.hypot(gx, gy, 1);
    const nx = -gx * inv, ny = -gy * inv, nz = inv;
    const lambert = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const edge = (1 - nz) ** 0.85;
    const h = height[y * size + x];
    const r = Math.hypot(x - size * 0.46, y - size * 0.42) / (size * 0.72);
    const illumination = 0.78 + 0.22 * (1 - r * r);
    lit[y * size + x] = (16 + 50 * lambert + 190 * edge + 40 * h) * illumination;
  }

  // Slight defocus, then sensor grain.
  const kernel = [1, 4, 6, 4, 1], horizontal = new Float32Array(size * size), pixels = Buffer.alloc(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (let i = -2; i <= 2; i++) horizontal[y * size + x] += lit[y * size + clamp(x + i, 0, size - 1)] * kernel[i + 2] / 16;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0;
    for (let i = -2; i <= 2; i++) value += horizontal[clamp(y + i, 0, size - 1) * size + x] * kernel[i + 2] / 16;
    const grain = (hash(x, y, 20) - 0.5) * 7 + (noise(x / 1.7, y / 1.7, 21) - 0.5) * 5;
    pixels[y * size + x] = Math.round(clamp(value + grain, 0, 255));
  }
  return pixels;
}

function verify(path, width, height, limit, background) {
  const decoded = decode(path, basename(path));
  if (decoded.width !== width || decoded.height !== height) throw new Error(`Wrong dimensions: ${path}`);
  const bytes = statSync(path).size;
  if (bytes > limit) throw new Error(`${path} exceeds ${limit} bytes: ${bytes}`);
  if (background) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width * 0.35; x++) for (let c = 0; c < 3; c++) {
      if (decoded.pixels[(y * width + x) * 3 + c] !== background[c]) throw new Error(`Background mismatch at ${x},${y} in ${path}`);
    }
    const minimum = [255, 255, 255], maximum = [0, 0, 0];
    let graphitePixels = 0;
    for (let p = 0; p < width * height; p++) {
      const rgb = decoded.pixels.subarray(p * 3, p * 3 + 3);
      for (let c = 0; c < 3; c++) {
        minimum[c] = Math.min(minimum[c], rgb[c]);
        maximum[c] = Math.max(maximum[c], rgb[c]);
      }
      if (rgb[0] >= 29 && rgb[0] <= 42 && rgb[1] >= 30 && rgb[1] <= 43 && rgb[2] >= 33 && rgb[2] <= 47) graphitePixels++;
    }
    const floor = background[0] < 100 ? background : [201, 199, 192];
    if (minimum.some((v, c) => v < floor[c])) throw new Error(`${basename(path)} decoded below material floor: ${minimum.join(',')}`);
    const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
    console.log(`${basename(path)} decoded channel minima ${hex(minimum)}, maxima ${hex(maximum)}${background[0] < 100 ? `; ${graphitePixels} pixels in the specified graphite range` : ''}`);
  } else {
    for (let p = 0; p < width * height; p++) {
      const [r, g, b] = decoded.pixels.subarray(p * 3, p * 3 + 3);
      if (r !== g || g !== b) throw new Error(`Specimen is not grayscale at pixel ${p}`);
    }
  }
  console.log(`${basename(path)}: ${width}×${height}, ${bytes} bytes; ${background ? 'every pixel in left 35% matches background' : 'all decoded pixels are grayscale'}`);
}

try {
  mkdirSync(outputDir, { recursive: true });
  // `node scripts/render-assets.mjs specimen` re-renders only the specimen.
  const only = process.argv[2];
  if (only !== "specimen") for (const [label, dark, target] of [['bars-light', false, [237, 236, 232]], ['bars-dark', true, [21, 21, 23]]]) {
    const background = calibratedBackground(target, label);
    const png = join(scratch, `${label}.png`), jpg = join(outputDir, `${label}.jpg`);
    encodeBars(png, jpg, renderBars(dark, background), background);
    verify(jpg, BARS_W, BARS_H, 360000, target);
  }
  const png = join(scratch, 'specimen.png'), jpg = join(outputDir, 'specimen.jpg');
  writePng(png, 320, 320, renderSpecimen(), 1);
  jpeg(png, jpg);
  verify(jpg, 320, 320, 40000);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
