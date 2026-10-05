const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICON_DIR = path.join(__dirname, '../icons');
if (!fs.existsSync(ICON_DIR)) {
  fs.mkdirSync(ICON_DIR, { recursive: true });
}

// Modern B2B SaaS Vault / Creator Concept
const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="card1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#4338ca" stop-opacity="0.9" />
    </linearGradient>
    <linearGradient id="card2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c7d2fe" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.9" />
    </linearGradient>
    <linearGradient id="card3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="100%" stop-color="#e0e7ff" stop-opacity="1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Base background with rounded corners for the extension icon look -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  
  <!-- Outer glowing ring / Vault door concept -->
  <rect x="80" y="80" width="352" height="352" rx="72" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" />

  <!-- Layered cards (CRM/Database concept) -->
  <rect x="140" y="120" width="232" height="232" rx="32" fill="url(#card1)" filter="url(#shadow)" opacity="0.6" />
  <rect x="140" y="160" width="232" height="232" rx="32" fill="url(#card2)" filter="url(#shadow)" opacity="0.8" />
  
  <!-- Main top card -->
  <rect x="140" y="200" width="232" height="232" rx="32" fill="url(#card3)" filter="url(#shadow)" />
  
  <!-- Abstract Creator/Person shape on the top card -->
  <circle cx="256" cy="276" r="32" fill="#4f46e5" />
  <path d="M192 376c0-35 28-64 64-64h0c35 0 64 29 64 64v8c0 8-7 16-16 16H208c-8 0-16-8-16-16v-8z" fill="#4f46e5" />
  
  <!-- Subtle upward growth/check indicator -->
  <path d="M304 220l24-24m0 0h-20m20 0v20" stroke="#10b981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

async function generateIcons() {
  const sizes = [16, 24, 32, 48, 128];
  const svgBuffer = Buffer.from(svg);

  for (const size of sizes) {
    const filename = path.join(ICON_DIR, `icon${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(filename);
    console.log(`Generated ${filename}`);
  }
}

generateIcons().catch(console.error);
