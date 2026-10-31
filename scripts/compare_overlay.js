import sharp from 'sharp';
import fs from 'fs';

const targetRef = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/.user_uploaded/media_1793450015324_02b2924b.jpg';
const vectorCanvas = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch/rendered_vectors_canvas.png';
const outDir = 'C:/Users/Aasif/.gemini/antigravity/brain/54f46703-1cce-4590-a183-f792e809e780/scratch';

sharp(targetRef)
  .composite([{ input: vectorCanvas, blend: 'over' }])
  .toFile(outDir + '/overlay_comparison.png')
  .then(() => console.log('Saved overlay_comparison.png'));

