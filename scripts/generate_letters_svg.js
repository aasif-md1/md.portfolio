import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch/exact_letters_isolated.png';

const LETTER_DEFS = [
  { id: 'P',  char: 'P', left: 4,   top: 46,  width: 92,  height: 146, hasHole: true  },
  { id: 'O1', char: 'O', left: 94,  top: 74,  width: 100, height: 146, hasHole: true  },
  { id: 'R',  char: 'R', left: 209, top: 108, width: 101, height: 145, hasHole: true  },
  { id: 'T',  char: 'T', left: 333, top: 142, width: 103, height: 147, hasHole: false },
  { id: 'F',  char: 'F', left: 463, top: 184, width: 89,  height: 147, hasHole: false },
  { id: 'O2', char: 'O', left: 574, top: 232, width: 98,  height: 145, hasHole: true  },
  { id: 'L',  char: 'L', left: 713, top: 273, width: 91,  height: 148, hasHole: false },
  { id: 'I',  char: 'I', left: 846, top: 321, width: 39,  height: 145, hasHole: false },
  { id: 'O3', char: 'O', left: 919, top: 367, width: 98,  height: 145, hasHole: true  },
];

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

function traceContour(valFn, bw, bh) {
  // Directed boundary edges
  const edges = new Map();
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (valFn(x, y) === 1) {
        if (valFn(x, y - 1) === 0) edges.set(`${x},${y}`, `${x + 1},${y}`);
        if (valFn(x + 1, y) === 0) edges.set(`${x + 1},${y}`, `${x + 1},${y + 1}`);
        if (valFn(x, y + 1) === 0) edges.set(`${x + 1},${y + 1}`, `${x},${y + 1}`);
        if (valFn(x - 1, y) === 0) edges.set(`${x},${y + 1}`, `${x},${y}`);
      }
    }
  }

  // Find longest closed loop
  const visited = new Set();
  const loops = [];
  for (const startKey of edges.keys()) {
    if (visited.has(startKey)) continue;
    let curr = startKey;
    const loop = [];
    while (curr && !visited.has(curr) && loop.length < 5000) {
      visited.add(curr);
      const [px, py] = curr.split(',').map(Number);
      loop.push([px, py]);
      curr = edges.get(curr);
      if (curr === startKey) break;
    }
    if (loop.length > 20) {
      loops.push(loop);
    }
  }
  loops.sort((a, b) => b.length - a.length);
  return loops[0] || null;
}

function pathToSmoothD(pts) {
  if (!pts || pts.length < 3) return '';
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
  const resultLetters = [];

  LETTER_DEFS.forEach((l, lIdx) => {
    const { left: bx, top: by, width: bw, height: bh, hasHole } = l;
    const grid = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const gIdx = ((by + y) * width + (bx + x)) * 4 + 3;
        if (data[gIdx] > 0) grid[y * bw + x] = 1;
      }
    }

    // Flood fill from outside
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
    while (head < q.length) {
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

    // Outer contour: val = 1 where ext === 0
    const outerVal = (x, y) => (x >= 0 && x < bw && y >= 0 && y < bh && ext[y * bw + x] === 0) ? 1 : 0;
    const outerLoop = traceContour(outerVal, bw, bh);
    const outerSimplified = outerLoop ? rdp(outerLoop, 0.9) : [];
    let pathString = pathToSmoothD(outerSimplified);

    // If letter has hole (P, O1, R, O2, O3):
    if (hasHole) {
      // Find all transparent components inside
      const comp = new Int32Array(bw * bh).fill(0);
      let cur = 0;
      const holeRegions = [];
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const idx = y * bw + x;
          if (grid[idx] === 0 && ext[idx] === 0 && comp[idx] === 0) {
            cur++;
            let hq = [x, y];
            comp[idx] = cur;
            let count = 0;
            let hHead = 0;
            while(hHead < hq.length) {
              const cx = hq[hHead++];
              const cy = hq[hHead++];
              count++;
              for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < bw && ny >= 0 && ny < bh) {
                  const nIdx = ny * bw + nx;
                  if (grid[nIdx] === 0 && ext[nIdx] === 0 && comp[nIdx] === 0) {
                    comp[nIdx] = cur;
                    hq.push(nx, ny);
                  }
                }
              }
            }
            holeRegions.push({ id: cur, count });
          }
        }
      }

      // The hole is the smaller region (or regions)
      holeRegions.sort((a, b) => a.count - b.count);
      if (holeRegions.length > 0) {
        // Find the eye hole (smallest region that is at least 300 pixels)
        const eyeHole = holeRegions.find(r => r.count > 300) || holeRegions[0];
        const eyeVal = (x, y) => (x >= 0 && x < bw && y >= 0 && y < bh && comp[y * bw + x] === eyeHole.id) ? 1 : 0;
        const eyeLoop = traceContour(eyeVal, bw, bh);
        if (eyeLoop) {
          const eyeSimplified = rdp(eyeLoop, 0.9);
          const eyeD = pathToSmoothD(eyeSimplified);
          pathString += ' ' + eyeD;
        }
      }
    }

    resultLetters.push({
      id: l.id,
      char: l.char,
      viewBox: `0 0 ${bw} ${bh}`,
      width: bw,
      height: bh,
      // Target percentage positions in the 1024x518 hero scene
      leftPct: ((bx / 1024) * 100).toFixed(2),
      topPct: ((by / 518) * 100).toFixed(2),
      widthPct: ((bw / 1024) * 100).toFixed(2),
      heightPct: ((bh / 518) * 100).toFixed(2),
      d: pathString,
    });
  });

  const outputJs = `// Generated 100% pixel-perfect SVG letter paths extracted directly from reference screenshot
export interface LetterVector {
  id: string
  char: string
  viewBox: string
  width: number
  height: number
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
  d: string
}

export const PORTFOLIO_VECTORS: LetterVector[] = ${JSON.stringify(resultLetters, null, 2).replace(/"(leftPct|topPct|widthPct|heightPct)": "([0-9.]+)"/g, '"$1": $2')}
`;

  fs.writeFileSync('src/components/portfolioVectors.ts', outputJs);
  console.log('Successfully generated src/components/portfolioVectors.ts with all 9 letters!');
});
