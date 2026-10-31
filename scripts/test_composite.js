import sharp from 'sharp';
import fs from 'fs';
import { PORTFOLIO_VECTORS } from '../src/components/portfolioVectors.ts';

// Let's create an SVG that places all 9 letters at their exact percentage positions on a 1024x518 canvas
let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="518" viewBox="0 0 1024 518">`;

PORTFOLIO_VECTORS.forEach(l => {
  const x = (l.leftPct / 100) * 1024;
  const y = (l.topPct / 100) * 518;
  svgContent += `
    <g transform="translate(${x}, ${y})">
      <path d="${l.d}" fillRule="evenodd" fill="none" stroke="#8A0000" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    </g>
  `;
});
svgContent += `</svg>`;

const targetRef = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/.user_uploaded/media_1793450015324_02b2924b.jpg';
const outDir = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch';

sharp(Buffer.from(svgContent))
  .png()
  .toFile(outDir + '/rendered_vectors_canvas.png')
  .then(() => {
    console.log('Saved rendered_vectors_canvas.png');
  });

