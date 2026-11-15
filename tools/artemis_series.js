// Code generated with an AI assistant (Claude) from our team's requirements.
// Sun and Earth azimuth/elevation every 2 h through 2027 at each Artemis III region coordinate (tools/artemis_regions.json),
// for tools/find_artemis_spots.py. Run from the repo root: node tools/artemis_series.js
const path = require('path'), R = path.join(__dirname, '..'); global.window = {};
const A = require(path.join(R, 'node_modules', 'astronomy-engine')); const E = require(path.join(R, 'src', 'engine.js'))(A);
const t0 = Date.UTC(2027, 0, 1), N = 365 * 12, out = {};
const regions = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'artemis_regions.json'), 'utf8')).regions;
for (const s of regions) {
  const a = [];
  for (let k = 0; k < N; k++) {
    const q = E.skyAt(new Date(t0 + k * 2 * 3600e3), s.lat, s.lon);
    a.push([q.sun.az, q.sun.el, q.earth.az, q.earth.el].map(v => +v.toFixed(3)));
  }
  out[s.id] = { lat: s.lat, lon: s.lon, name: s.name, series: a };
}
require('fs').writeFileSync(path.join(__dirname, 'artemis_series.json'), JSON.stringify(out));
console.log('Wrote tools/artemis_series.json for', Object.keys(out).length, 'regions');
