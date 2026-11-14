// Yearly sunlight / Earth visibility for every site with LOLA terrain, real terrain vs flat ground.
// Usage: node tools/terrain_report.js [startISO] [days]   -> prints a Markdown table
// Code generated with an AI assistant (Claude) from our team's requirements.
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'src', 'sites.js'));
require(path.join(ROOT, 'src', 'horizon-data.js'));
const A = require(path.join(ROOT, 'node_modules', 'astronomy-engine'));
const E = require(path.join(ROOT, 'src', 'engine.js'))(A);

const start = Date.parse(process.argv[2] || '2026-11-14T00:00:00Z');
const days = Number(process.argv[3] || 365);
const HZ = window.MW_HORIZONS;

function skyline(v, az) {
  const n = v.length, f = (((az % 360) + 360) % 360) / 360 * n;
  const i = Math.floor(f) % n, j = (i + 1) % n, w = f - Math.floor(f);
  return v[i] * (1 - w) + v[j] * w;
}

const pct = x => (100 * x).toFixed(1) + '%';
const rows = [];
for (const s of window.MW_SITES) {
  const h = HZ.sites[s.id];
  if (!h) continue;
  let n = 0, sun = 0, sunFlat = 0, earth = 0, both = 0, run = 0, maxNight = 0, sunDisk = 0;
  for (let k = 0; k < days * 24; k++) {
    const sky = E.skyAt(new Date(start + k * 3600e3), s.lat, s.lon);
    const hs = skyline(h.values, sky.sun.az), he = skyline(h.values, sky.earth.az);
    const su = sky.sun.el > hs, eu = sky.earth.el > he;
    n++; if (su) sun++; if (sky.sun.el > 0) sunFlat++; if (eu) earth++; if (su && eu) both++;
    sunDisk += E.sunVisible(sky.sun, hs);
    run = su ? 0 : run + 1; maxNight = Math.max(maxNight, run);
  }
  rows.push(`| ${s.name} | ${h.resM || HZ.meta.resolutionM} m | ${pct(sun / n)} | ${pct(sunFlat / n)} | ${pct(sunDisk / n)} | ${pct(earth / n)} | ${pct(both / n)} | ${(maxNight / 24).toFixed(1)} d |`);
}
console.log(`Real terrain vs flat ground, ${days} days from ${new Date(start).toISOString().slice(0, 10)} (hourly)\n`);
console.log('| Site | Map at site | Sunlight, terrain | Sunlight, flat | Average share of Sun disk visible | Earth in view | Both | Longest night |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
console.log(rows.join('\n'));
