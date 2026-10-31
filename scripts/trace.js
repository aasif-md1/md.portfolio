import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch/exact_letters_isolated.png';
const outDir = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch';

function rdp(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let d;
    if (lenSq === 0) {
      d = Math.hypot(px - x1, py - y1);
    } else {
      const u = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      const nx = x1 + u * dx, ny = y1 + u * dy;
      d = Math.hypot(px - nx, py - ny);
    }
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const r1 = rdp(pts.slice(0, idx + 1), eps);
    const r2 = rdp(pts.slice(idx), eps);
    return r1.slice(0, -1).concat(r2);
  }
  return [pts[0], pts[pts.length - 1]];
}

function polygonToSmoothPath(pts) {
  if (pts.length < 3) return '';
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    d += ` Q ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  d += ' Z';
  return d;
}

sharp(imgPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
  const { width } = info;
  const bx = 330, by = 140, bw = 110, bh = 155;
  const grid = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const gIdx = ((by + y) * width + (bx + x)) * 4 + 3;
      if (data[gIdx] > 0) grid[y * bw + x] = 1;
    }
  }

  const ext = new Uint8Array(bw * bh);
  const q = [];
  for (let x = 0; x < bw; x++) {
    if (grid[0 * bw + x] === 0) { ext[0 * bw + x] = 1; q.push(x, 0); }
    if (grid[(bh - 1) * bw + x] === 0) { ext[(bh - 1) * bw + x] = 1; q.push(x, bh - 1); }
  }
  for (let y = 0; y < bh; y++) {
    if (grid[y * bw + 0] === 0) { ext[y * bw + 0] = 1; q.push(0, y); }
    if (grid[y * bw + (bw - 1)] === 0) { ext[y * bw + (bw - 1)] = 1; q.push(bw - 1, y); }
  }
  let head = 0;
  while(head < q.length) {
    const cx = q[head++];
    const cy = q[head++];
    for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < bw && ny >= 0 && ny < bh) {
        const nIdx = ny * bw + nx;
        if (grid[nIdx] === 0 && ext[nIdx] === 0) {
          ext[nIdx] = 1;
          q.push(nx, ny);
        }
      }
    }
  }

  const val = (x, y) => (x >= 0 && x < bw && y >= 0 && y < bh && ext[y * bw + x] === 0) ? 1 : 0;
  const edges = new Map();
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (val(x, y) === 1) {
        if (val(x, y - 1) === 0) edges.set(x + ',' + y, (x + 1) + ',' + y);
        if (val(x + 1, y) === 0) edges.set((x + 1) + ',' + y, (x + 1) + ',' + (y + 1));
        if (val(x, y + 1) === 0) edges.set((x + 1) + ',' + (y + 1), x + ',' + (y + 1));
        if (val(x - 1, y) === 0) edges.set(x + ',' + (y + 1), x + ',' + y);
      }
    }
  }

  const startKey = edges.keys().next().value;
  let curr = startKey;
  const loop = [];
  while(curr && loop.length < 5000) {
    const [px, py] = curr.split(',').map(Number);
    loop.push([px, py]);
    curr = edges.get(curr);
    if (curr === startKey) break;
  }

  const simplified = rdp(loop, 1.0);
  console.log('Original vertices:', loop.length, 'Simplified:', simplified.length);
  const pathD = polygonToSmoothPath(simplified);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" width="${bw}" height="${bh}">
    <path d="${pathD}" fill="none" stroke="#8A0000" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`;
  fs.writeFileSync(outDir + '/test_T.svg', svg);
  console.log('Successfully wrote test_T.svg');
});

