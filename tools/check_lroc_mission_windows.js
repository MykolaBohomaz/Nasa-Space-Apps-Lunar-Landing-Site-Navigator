// Code written with AI assistance from our team's requirements (Anthropic Claude / OpenAI Codex; see docs/sources.md).
// Check proposed seven-day landing windows against observed lunar surface shadows.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const engine = require('../src/engine')(require('astronomy-engine'));
const T = require('../src/terrain');

global.window = {};
require('../src/terrain-grid');
require('../src/plugins/planner');
const terrain = T.loadNode(window.MW_TERRAIN_GRID, zlib.inflateSync);
const { findWindows } = window.MW_PLANNER;
const HOUR = 3600000, DAY = 24 * HOUR, DAYS = 7;
const periods = [['2010-02-15', '2010-03-01'], ['2010-08-15', '2010-08-29']];
const models = ['terrainCentre', 'terrainEdge', 'flatCentre', 'flatEdge'];
const file = path.join(__dirname, 'lroc-observations.csv.gz');
const data = zlib.gunzipSync(fs.readFileSync(file)).toString();
const sites = new Map();

for (const line of data.trimEnd().split('\n').slice(1)) {
  const [frame, start, stop, row, col, lat, lon, p3, , p7] = line.split(',');
  const key = `${row}:${col}`;
  if (!sites.has(key)) sites.set(key, { key, lat: +lat, lon: +lon, observations: [] });
  const obs = { frame, start: Date.parse(start + 'Z'), stop: Date.parse(stop + 'Z'), p3: +p3, p7: +p7 };
  sites.get(key).observations.push(obs);
}

function skylineAt(profile, az) {
  const index = az / 360 * profile.length;
  const left = Math.floor(index);
  const weight = index - left;
  return profile[left] * (1 - weight) + profile[(left + 1) % profile.length] * weight;
}

const rows = [];
for (const site of sites.values()) {
  site.observations.sort((a, b) => a.start - b.start);
  const { values } = terrain.profile(site.lat, site.lon);
  const cache = new Map();
  const hourlySky = date => {
    const t = +date;
    if (!cache.has(t)) cache.set(t, engine.skyAt(date, site.lat, site.lon));
    return cache.get(t);
  };
  const planners = Object.fromEntries(models.map(model => [model, {
    HOUR, engine: { skyAt: hourlySky },
    isUp(_, body) {
      const horizon = model.startsWith('terrain') ? skylineAt(values, body.az) : 0;
      const edge = model.endsWith('Edge') && body.kind === 'sun'
        ? engine.angularRadiusDeg(body.distKm, engine.SUN_RADIUS_KM) : 0;
      return body.el + edge > horizon;
    }
  }]));
  for (const [from, to] of periods) {
    for (let t = Date.parse(from); t + DAYS * DAY <= Date.parse(to); t += DAY) {
      const end = t + DAYS * DAY;
      const observed = site.observations.filter(o => o.start >= t && o.stop <= end);
      const dark = observed.filter(o => o.p7 <= 0.0005);
      const bright = observed.filter(o => o.p3 >= 0.002);
      const strictDark = observed.filter(o => o.p7 <= 0.00035);
      let latest = t, gap = 0;
      for (const obs of observed) {
        gap = Math.max(gap, obs.start - latest);
        latest = Math.max(latest, obs.stop);
      }
      gap = Math.max(gap, end - latest);
      const row = {
        site: site.key, lat: site.lat, lon: site.lon, startUTC: new Date(t).toISOString(),
        frameCount: observed.length, brightFrames: bright.length, darkFrames: dark.length,
        firstDarkFrame: dark[0]?.frame ?? '', strictDarkFrames: strictDark.length,
        maxGapHours: gap / HOUR
      };
      for (const model of models) {
        row[model] = findWindows(planners[model], { ...site, t }, DAYS, DAYS).windows.length > 0;
      }
      rows.push(row);
    }
  }
}

const observedDark = rows.filter(row => row.darkFrames > 0);
console.error(`${rows.length} site/start windows, ${observedDark.length} with at least one observed dark frame`);
for (const model of models) {
  const passes = rows.filter(row => row[model]);
  const contradiction = passes.filter(row => row.darkFrames > 0);
  const checked = passes.filter(row => row.maxGapHours <= 8);
  console.error(model, { passes: passes.length, contradicted: contradiction.length,
    contradictedStrict: passes.filter(row => row.strictDarkFrames > 0).length,
    wellSampled: checked.length, wellSampledContradicted: checked.filter(row => row.darkFrames > 0).length });
}

const columns = Object.keys(rows[0]);
console.log(columns.join(','));
for (const row of rows) console.log(columns.map(column => row[column]).join(','));
