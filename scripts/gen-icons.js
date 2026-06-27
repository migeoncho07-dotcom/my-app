// 의존성 없이 순수 Node로 앱 아이콘 PNG를 생성합니다.
// 디자인 시안 v2의 브랜드 마크를 그대로 사용:
//   코랄(#FF6B4A) 둥근 사각형 + 가운데 흰 원 + 오른쪽아래 복숭아(#FFB59E) 점(코랄 테두리).
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
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
// 둥근 사각형 내부 판정 (x,y 정규화 0..1, r = 반경 비율)
function roundedRectInside(x, y, r) {
  const dx = Math.min(x, 1 - x);
  const dy = Math.min(y, 1 - y);
  if (dx >= r || dy >= r) return true;
  const cx = x < 0.5 ? r : 1 - r;
  const cy = y < 0.5 ? r : 1 - r;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const CORAL = hexToRgb('#FF6B4A');
const WHITE = hexToRgb('#FFFFFF');

// 새 디자인: 코랄 둥근 사각형 + 가운데 흰 원 + 그 안 가운데 코랄 점 (심플 원형 로고)
const R_WHITE = 0.225;  // 흰 원 반지름(비율)
const R_DOT = 0.088;    // 가운데 코랄 점 반지름(비율)

// maskable: OS가 모서리를 깎으므로 꽉 찬 사각형. 일반(any): 둥근 사각형.
function renderIcon(size, { maskable }) {
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);
  const cornerR = maskable ? 0 : 24 / 74;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rs = 0, gs = 0, bs = 0, as = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (px + (sx + 0.5) / SS) / size;
          const fy = (py + (sy + 0.5) / SS) / size;
          let r, g, b, a;
          if (!roundedRectInside(fx, fy, cornerR)) {
            r = g = b = a = 0; // 모서리 밖(투명)
          } else {
            r = CORAL[0]; g = CORAL[1]; b = CORAL[2]; a = 255; // 코랄 배경
            const dCtr = Math.hypot(fx - 0.5, fy - 0.5);
            if (dCtr <= R_DOT) {
              r = CORAL[0]; g = CORAL[1]; b = CORAL[2];        // 가운데 코랄 점
            } else if (dCtr <= R_WHITE) {
              r = WHITE[0]; g = WHITE[1]; b = WHITE[2];        // 흰 원(도넛)
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
  { name: 'apple-touch-icon.png', size: 180, maskable: true },
];
for (const t of targets) {
  const png = renderIcon(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(OUT, t.name), png);
  console.log('wrote', t.name, png.length, 'bytes');
}
console.log('done');
