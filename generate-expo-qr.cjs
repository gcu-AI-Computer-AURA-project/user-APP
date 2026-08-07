const fs = require('fs');
const path = require('path');
const { toQR } = require('toqr');

const content = 'exp://118.33.130.220:8081';
const data = toQR(content);
const size = Math.sqrt(data.length);
const scale = 10;
const pad = 4;
let rects = '';

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    if (data[y * size + x]) {
      rects += `<rect x="${(x + pad) * scale}" y="${(y + pad) * scale}" width="${scale}" height="${scale}"/>`;
    }
  }
}

const wh = (size + pad * 2) * scale;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wh}" height="${wh}" viewBox="0 0 ${wh} ${wh}">
  <rect width="100%" height="100%" fill="white"/>
  <g fill="#0B3566">${rects}</g>
</svg>`;

const out = path.join(__dirname, 'expo-qr.svg');
fs.writeFileSync(out, svg);
console.log(content);
console.log(out);
