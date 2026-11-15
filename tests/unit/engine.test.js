// MK-1: unit tests for the position engine and the generated NASA data.
// Run: npm test   (or: node --test tests/unit/)
// Code generated with an AI assistant (Claude) from our team's requirements.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const A = require(path.join(ROOT, 'node_modules', 'astronomy-engine'));
const E = require(path.join(ROOT, 'src', 'engine.js'))(A);

// The data files are browser scripts that set window.* globals.
global.window = {};
require(path.join(ROOT, 'src', 'sites.js'));
require(path.join(ROOT, 'src', 'horizon-data.js'));
require(path.join(ROOT, 'src', 'validation-data.js'));
const SITES = window.MW_SITES;
const HZ = window.MW_HORIZONS;
const VAL = window.MW_VALIDATION;
const site = id => SITES.find(s => s.id === id);

// Same skyline interpolation as src/app.js (horizonAt).
function skyline(values, az) {
  const n = values.length, f = (((az % 360) + 360) % 360) / 360 * n;
  const i = Math.floor(f) % n, j = (i + 1) % n, w = f - Math.floor(f);
  return values[i] * (1 - w) + values[j] * w;
}

// Fixed spread of test moments (2026-2028) so results are repeatable.
const TIMES = Array.from({ length: 10 }, (_, k) => new Date(Date.UTC(2026, 10, 15) + k * 73.3 * 86400e3 + k * 3.7 * 3600e3));

// Hourly sunlight fraction over one year, with the site's LOLA skyline and with flat ground.
function yearSunlight(s) {
  const prof = HZ.sites[s.id].values;
  let terrain = 0, flat = 0, n = 0;
  const t0 = Date.UTC(2026, 10, 14);
  for (let h = 0; h < 24 * 365; h++) {
    const sun = E.skyAt(new Date(t0 + h * 3600e3), s.lat, s.lon).sun;
    if (sun.el > skyline(prof, sun.az)) terrain++;
    if (sun.el > 0) flat++;
    n++;
  }
  return { terrain: terrain / n, flat: flat / n };
}

test('Apollo 11 landing: Sun low in the east', () => {
  const sun = E.skyAt(new Date('1969-07-20T20:17:40Z'), 0.674, 23.473).sun;
  assert.ok(sun.el > 10 && sun.el < 12, `Sun elevation ${sun.el}`);
  assert.ok(sun.az > 85 && sun.az < 95, `Sun azimuth ${sun.az}`);
});

test("Chang'e 6 (far side): Earth is never above the horizon", () => {
  const s = site('ce6');
  for (const t of TIMES) {
    const earth = E.skyAt(t, s.lat, s.lon).earth;
    assert.ok(earth.el < 0, `Earth at ${earth.el} on ${t.toISOString()}`);
  }
});

// Earth sits about 66° up at Apollo 11 and swings roughly ±8° with libration (57.7° to 74.5° over 2020-2039).
test('Apollo 11: Earth always high in the sky', () => {
  const s = site('a11');
  for (const t of TIMES) {
    const earth = E.skyAt(t, s.lat, s.lon).earth;
    assert.ok(earth.el > 55 && earth.el < 77, `Earth at ${earth.el} on ${t.toISOString()}`);
  }
});

test('Longitude -30 and 330 give the same answer; the exact pole does not crash', () => {
  const t = TIMES[3];
  const a = E.skyAt(t, -45, -30), b = E.skyAt(t, -45, 330);
  for (const body of ['sun', 'earth']) {
    assert.ok(Math.abs(a[body].el - b[body].el) < 1e-9);
    assert.ok(Math.abs(a[body].az - b[body].az) < 1e-9);
  }
  const p = E.skyAt(t, -90, 0);
  assert.ok(Number.isFinite(p.sun.el) && Number.isFinite(p.earth.az));
});

test('Distances are physical: Earth 356,000-407,000 km, Sun 0.98-1.02 AU', () => {
  const AU = 149597870.7;
  for (const t of TIMES) {
    const k = E.skyAt(t, -84.79, 29.2);
    assert.ok(k.earth.distKm > 356000 && k.earth.distKm < 407000, `Earth ${k.earth.distKm} km`);
    assert.ok(k.sun.distKm / AU > 0.98 && k.sun.distKm / AU < 1.02, `Sun ${k.sun.distKm / AU} AU`);
  }
});

test('Site list: unique ids, valid coordinates', () => {
  const ids = new Set();
  for (const s of SITES) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`); ids.add(s.id);
    assert.ok(s.lat >= -90 && s.lat <= 90, `${s.id} latitude ${s.lat}`);
    assert.ok(s.lon >= -360 && s.lon <= 360, `${s.id} longitude ${s.lon}`);
  }
});

test('LOLA terrain data: every south polar site has a sane 0.5° skyline', () => {
  assert.match(HZ.meta.source, /LOLA/);
  require(path.join(ROOT, 'src', 'terrain-grid.js'));
  const { loadNode } = require(path.join(ROOT, 'src', 'terrain.js'));
  const grid = loadNode(window.MW_TERRAIN_GRID, require('node:zlib').inflateSync);
  for (const s of SITES.filter(s => s.lat <= -60.5)) {
    const stored = HZ.sites[s.id];
    if (stored) {
      assert.ok(Math.abs(stored.lat - s.lat) < 1e-6 && Math.abs(stored.lon - s.lon) < 1e-6,
        `${s.id} moved: re-run tools/make_horizons.py`);
    }
    // The Artemis region centers use the same grid fallback as the browser.
    let profile = stored;
    if (!profile && s.group === 'Artemis III candidate regions' && grid.covers(s.lat)) {
      profile = grid.profile(s.lat, s.lon);
    }
    assert.ok(profile, `${s.id} has no terrain profile: re-run tools/make_horizons.py (MK-6)`);
    assert.equal(profile.values.length, 720, `${s.id} profile length`);
    assert.ok(profile.values.every(v => Number.isFinite(v) && v > -15 && v < 30), `${s.id} has out-of-range skyline values`);
  }
});

test('Skyline interpolation matches the stored values and wraps at 360°', () => {
  const v = HZ.sites.im2.values;
  assert.equal(skyline(v, 0), v[0]);
  assert.equal(skyline(v, 90), v[180]);
  assert.ok(Math.abs(skyline(v, 0.25) - (v[0] + v[1]) / 2) < 1e-9);
  assert.ok(Math.abs(skyline(v, 359.75) - (v[719] + v[0]) / 2) < 1e-9);
});

test('Connecting ridge crest: 85-95% yearly sunlight with terrain (Gläser et al. 2014 found up to 92.3%)', () => {
  const r = yearSunlight(site('shk'));
  assert.ok(r.terrain > 0.85 && r.terrain < 0.95, `terrain ${r.terrain}`);
  assert.ok(r.terrain > r.flat, 'a ridge crest should see more Sun than flat ground');
});

test('IM-1 Odysseus: its crater costs sunlight compared with flat ground', () => {
  const r = yearSunlight(site('im1'));
  assert.ok(r.terrain < r.flat - 0.05, `terrain ${r.terrain} vs flat ${r.flat}`);
});

test('JPL Horizons validation result is present and within 0.05°', () => {
  assert.ok(VAL, 'run tools/compare_horizons.js');
  assert.ok(VAL.comparisons >= 64, `only ${VAL.comparisons} comparisons`);
  assert.ok(VAL.maxElDiffDeg < 0.05, `max elevation difference ${VAL.maxElDiffDeg}°`);
  assert.equal(VAL.upDownMatches, VAL.comparisons);
});

test('MK-3: visible fraction of the Sun and Earth disks', () => {
  const k = E.skyAt(TIMES[0], -84.79, 29.2);
  const rSun = E.angularRadiusDeg(k.sun.distKm, E.SUN_RADIUS_KM);
  const rEarth = E.angularRadiusDeg(k.earth.distKm, E.EARTH_RADIUS_KM);
  assert.ok(rSun > 0.26 && rSun < 0.275, `Sun radius ${rSun}°`);       // Sun is ~0.53° wide
  assert.ok(rEarth > 0.89 && rEarth < 1.03, `Earth radius ${rEarth}°`); // Earth is ~1.9° wide seen from the Moon
  const f = el => E.sunVisible({ ...k.sun, el }, 2);                     // skyline at 2°
  assert.ok(Math.abs(f(2) - 0.5) < 1e-9, 'centre on the skyline = half visible');
  assert.ok(f(2 + rSun) > 1 - 1e-6 && f(2 + rSun + 0.01) === 1, 'top edge on the skyline = fully visible');
  assert.ok(f(2 - rSun) < 1e-6 && f(2 - rSun - 0.01) === 0, 'bottom edge on the skyline = hidden');
  assert.ok(f(2.1) > 0.5 && f(2.1) < 1 && f(1.9) > 0 && f(1.9) < 0.5);
  assert.ok(Math.abs(f(2 + 0.1) + f(2 - 0.1) - 1) < 1e-9, 'symmetric around the skyline');
  let prev = -1;                                                         // grows steadily as the Sun rises
  for (let el = 2 - rSun; el <= 2 + rSun; el += rSun / 20) { const v = f(el); assert.ok(v >= prev - 1e-12); prev = v; }
  assert.ok(Math.abs(E.earthVisible({ ...k.earth, el: 0 }, 0) - 0.5) < 1e-9);
});

// MK-10: terrain computed in the browser from the LOLA grids, for custom coordinates.
test('MK-10: LOLA terrain grids decode and give skylines that match the precomputed ones on plateaus', () => {
  require(path.join(ROOT, 'src', 'terrain-grid.js'));
  const T = require(path.join(ROOT, 'src', 'terrain.js'));
  const grid = T.loadNode(window.MW_TERRAIN_GRID, require('zlib').inflateSync);
  const h = grid.heightAt(-80.13, 1.44);
  assert.ok(Math.abs(h - 2579) < 40, `IM-1 ground ${h} m (LROC: 2579 m)`);
  assert.ok(grid.covers(-80) && grid.covers(-89.9) && !grid.covers(-70), 'coverage limit is 77S');
  assert.equal(grid.resAt(-85, 30), 240);
  assert.equal(grid.resAt(-80, 30), 960);
  // IM-2 sits on the broad Mons Mouton plateau: the 240 m grid skyline should match the 80 m site skyline closely.
  const p = grid.profile(site('im2').lat, site('im2').lon);
  const ref = HZ.sites.im2.values;
  assert.equal(p.values.length, 720);
  const mad = p.values.reduce((a, v, i) => a + Math.abs(v - ref[i]), 0) / 720;
  assert.ok(mad < 0.3, `IM-2 mean skyline difference ${mad.toFixed(3)}°`);
  assert.ok(p.values.every(v => Number.isFinite(v) && v > -15 && v < 30));
});

// 14. Every browser script parses. The other tests never load app.js or the plugins,
// so a typo there would only show up as a blank page.
test('every script in src/ parses', () => {
  const fs = require('fs'), path = require('path');
  const files = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(f => {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js')) files.push(p);
  });
  walk(path.join(__dirname, '..', '..', 'src'));
  assert.ok(files.length >= 5);
  for (const f of files) assert.doesNotThrow(() => new Function(fs.readFileSync(f, 'utf8')), f);
});

// 15. NASA Artemis III landing rules at our best landing spots (tools/find_artemis_spots.py):
// slope under 10 deg, Earth in view at least 25% of the year, at least 6.5 days of unbroken sunlight,
// and as close to the pole as NASA's regions (LROC puts Peak near Cabeus B's center at 83.6S, 6.4 deg away).
test('Artemis III best spots meet NASA landing rules over 2027', () => {
  const up = (v, b) => b.el > skyline(v, b.az);
  for (const s of SITES.filter(s => s.id.startsWith('artemis'))) {
    const h = HZ.sites[s.id];
    assert.ok(h && h.resM === 80, `${s.id} needs an 80 m precomputed skyline`);
    assert.ok(h.slopeDeg < 10, `${s.id} slope ${h.slopeDeg}`);
    assert.ok(s.lat <= -83.5, `${s.id} farther from the pole than NASA's regions`);
    let earth = 0, run = 0, best = 0; const n = 365 * 12;
    for (let i = 0; i < n; i++) {
      const k = E.skyAt(new Date(Date.UTC(2027, 0, 1) + i * 2 * 3600e3), s.lat, s.lon);
      earth += up(h.values, k.earth); run = up(h.values, k.sun) ? run + 1 : 0; best = Math.max(best, run);
    }
    assert.ok(earth / n >= 0.25, `${s.id} Earth ${(earth / n * 100).toFixed(0)}%`);
    assert.ok(best * 2 >= 156, `${s.id} longest sunlight ${best * 2} h`);
  }
});

// 16. Slope check against a real landing: NASA estimated a 12 deg slope where IM-1 Odysseus came to rest
// (and tipped over), from LRO images. Our 100 m LOLA slope there must agree within 1.5 deg.
test('IM-1 slope matches NASA estimate of 12 deg', () => {
  const s = HZ.sites.im1.slopeDeg;
  assert.ok(Math.abs(s - 12) <= 1.5, `IM-1 slope ${s}`);
});
