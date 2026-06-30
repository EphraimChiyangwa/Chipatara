const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '..', 'frontend', 'public', 'favicon.svg')
const outDir  = path.join(__dirname, '..', 'frontend', 'public')

const svgRaw = fs.readFileSync(svgPath, 'utf8')

// Wrap the existing SVG in a rounded square background matching the brand
function wrapSvg(size) {
  const pad = Math.round(size * 0.1)
  const inner = size - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A1B6E"/>
      <stop offset="100%" stop-color="#1A0D3E"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" ry="${Math.round(size * 0.22)}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>
  <g clip-path="url(#round)">
    <image href="data:image/svg+xml;base64,${Buffer.from(svgRaw).toString('base64')}"
      x="${pad}" y="${pad}" width="${inner}" height="${inner}"/>
  </g>
</svg>`
}

for (const size of [192, 512]) {
  const wrapped = wrapSvg(size)
  const resvg = new Resvg(wrapped, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
  const png = resvg.render().asPng()
  const outFile = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(outFile, png)
  console.log(`  wrote  ${outFile}  (${png.length} bytes)`)
}

console.log('\nDone.')
