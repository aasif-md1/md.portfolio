import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch/exact_letters_isolated.png';

// Exact bounding boxes in 1024x518 image
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

sharp(imgPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
  const { width } = info;

  LETTER_DEFS.forEach(l => {
    const { left: bx, top: by, width: bw, height: bh } = l;
    const grid = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const gIdx = ((by + y) * width + (bx + x)) * 4 + 3;
        if (data[gIdx] > 0) grid[y * bw + x] = 1;
      }
    }

    // Find transparent components
    const comp = new Int32Array(bw * bh).fill(0);
    let cur = 0;
    const regions = [];
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const idx = y * bw + x;
        if (grid[idx] === 0 && comp[idx] === 0) {
          cur++;
          let q = [x, y];
          comp[idx] = cur;
          let count = 0;
          let touchesBorder = false;
          let head = 0;
          let minX = x, maxX = x, minY = y, maxY = y;
          while(head < q.length) {
            const cx = q[head++];
            const cy = q[head++];
            count++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            if (cx === 0 || cx === bw - 1 || cy === 0 || cy === bh - 1) touchesBorder = true;
            for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < bw && ny >= 0 && ny < bh) {
                const nIdx = ny * bw + nx;
                if (grid[nIdx] === 0 && comp[nIdx] === 0) {
                  comp[nIdx] = cur;
                  q.push(nx, ny);
                }
              }
            }
          }
          regions.push({ id: cur, count, touchesBorder, minX, maxX, minY, maxY });
        }
      }
    }
    console.log(l.id, 'regions:', regions.map(r => `[id:${r.id}, cnt:${r.count}, border:${r.touchesBorder}]`).join(' '));
  });
});

