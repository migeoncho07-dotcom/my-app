// 의존성 없이 순수 Node로 앱 아이콘 PNG를 생성합니다.
// 브랜드 색(#FF6B4A) 배경 + 흰 하트.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

// --- PNG 인코더 (RGBA, color type 6) ---
function crc32(buf) {
  let c, table = crc32._t;
  if (!table) {
    table = crc32._t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // 필터 바이트(0) + 각 행
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- 그리기 도구 (안티앨리어싱: 4x4 슈퍼샘플) ---
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
// 점(px,py)이 하트 안인지 (단위 좌표계, 중심 0,0 범위 약 ±1.2)
function insideHeart(x, y) {
  // 표준 하트 음함수: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}
function roundedRectInside(x, y, w, h, r) {
  // x,y in [0,1] 정규화 좌표, 사각형 전체(0..1), 반경 r(0..0.5)
  const dx = Math.min(x, 1 - x);
  const dy = Math.min(y, 1 - y);
  if (dx >= r && dy >= r) return true;
  if (dx >= r || dy >= r) return true;
  const cx = x < 0.5 ? r : 1 - r;
  const cy = y < 0.5 ? r : 1 - r;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const BRAND = hexToRgb('#FF6B4A');
const BRAND2 = hexToRgb('#E85C2E'); // 약간의 그라데이션 깊이
const WHITE = [255, 255, 255];

// maskable: 모서리 둥글림 없이 꽉 찬 배경 + 하트를 안전영역(80%) 안으로 축소
function renderIcon(size, { maskable }) {
  const SS = 4; // 슈퍼샘플
  const N = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  const cornerR = maskable ? 0 : 0.235; // iOS superellipse 근사
  const heartScale = maskable ? 0.46 : 0.40; // 하트 크기(반경 비율)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rs = 0, gs = 0, bs = 0, as = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (px + (sx + 0.5) / SS) / size; // 0..1
          const fy = (py + (sy + 0.5) / SS) / size;
          let r, g, b, a;
          if (!roundedRectInside(fx, fy, 1, 1, cornerR)) {
            r = g = b = a = 0; // 투명(모서리 밖)
          } else {
            // 배경: 위->아래 부드러운 그라데이션
            const t = fy;
            r = Math.round(BRAND[0] + (BRAND2[0] - BRAND[0]) * t);
            g = Math.round(BRAND[1] + (BRAND2[1] - BRAND[1]) * t);
            b = Math.round(BRAND[2] + (BRAND2[2] - BRAND[2]) * t);
            a = 255;
            // 하트 좌표 변환: 중심(0.5,0.46), 위로 살짝
            const hx = (fx - 0.5) / heartScale;
            const hy = (fy - 0.47) / heartScale;
            // y축 뒤집고 스케일 (하트 음함수는 위가 +y)
            if (insideHeart(hx * 1.25, -hy * 1.25 + 0.0)) {
              r = WHITE[0]; g = WHITE[1]; b = WHITE[2];
            }
          }
          rs += r; gs += g; bs += b; as += a;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      rgba[i] = Math.round(rs / n);
      rgba[i + 1] = Math.round(gs / n);
      rgba[i + 2] = Math.round(bs / n);
      rgba[i + 3] = Math.round(as / n);
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: true }, // iOS는 자체적으로 둥글게 처리
];
for (const t of targets) {
  const png = renderIcon(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(OUT, t.name), png);
  console.log('wrote', t.name, png.length, 'bytes');
}
console.log('done');
