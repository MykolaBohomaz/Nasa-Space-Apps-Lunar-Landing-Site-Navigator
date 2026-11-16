// Code written with AI assistance from our team's requirements (Anthropic Claude / OpenAI Codex; see docs/sources.md).
// Score the shipped Sun-centre visibility rule against LROC WAC image pairs.
'use strict';
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const E = require('../src/engine')(require('astronomy-engine'));
const T = require('../src/terrain');

global.window = {};
require('../src/terrain-grid');
const terrain = T.loadNode(window.MW_TERRAIN_GRID, zlib.inflateSync);
const hour = 3600000;
const minute = 60000;
const file = process.argv[2] ?? path.join(__dirname, 'lroc-observations.csv.gz');
const input = fs.readFileSync(file);
const csv = file.endsWith('.gz') ? zlib.gunzipSync(input).toString() : input.toString();
const sites = new Map();

for (const line of csv.trimEnd().split('\n').slice(1)) {
  const [frame, start, stop, row, col, lat, lon, p3, , p7] = line.split(',');
  const key = `${row}:${col}`;
  if (!sites.has(key)) sites.set(key, { row, col, lat: +lat, lon: +lon, observations: [] });
  sites.get(key).observations.push({ frame, start: Date.parse(start + 'Z'), stop: Date.parse(stop + 'Z'),
    p3: +p3, p7: +p7 });
}

function skylineAt(profile, az) {
  const f = az / 360 * profile.length;
  const i = Math.floor(f);
  return profile[i] * (1 - (f - i)) + profile[(i + 1) % profile.length] * (f - i);
}

// Same hourly search and one-minute refinement as the app's next-change countdown.
function crossings(start, end, isLit) {
  const events = [];
  let previous = isLit(start);
  for (let t = start + hour; t <= end; t += hour) {
    const lit = isLit(t);
    if (lit === previous) continue;
    let lo = t - hour, hi = t;
    while (hi - lo > minute) {
      const mid = (lo + hi) / 2;
      if (isLit(mid) === previous) lo = mid;
      else hi = mid;
    }
    events.push({ at: hi, lit });
    previous = lit;
  }
  return events;
}

function scoreEvent(events, start, end, lit) {
  let closest = null;
  let outside = Infinity;
  for (const event of events) {
    if (event.lit !== lit) continue;
    const distance = Math.max(start - event.at, event.at - end, 0);
    if (distance >= outside || distance > 24 * hour) continue;
    closest = event.at;
    outside = distance;
  }
  return { closest, outside: closest === null ? null : outside };
}

const modelNames = ['terrain', 'flat', 'anyDisk', 'flatAnyDisk'];
const rules = [
  { name: 'primary', dark: 0.0005, bright: 0.002 },
  { name: 'conservative', dark: 0.00035, bright: 0.003 }
];
const counts = Object.fromEntries(rules.map(({ name }) => [name, Object.fromEntries(
  modelNames.map(model => [model, { lit: 0, dark: 0, trueLit: 0, trueDark: 0 }])
)]));
const rows = [];
const iso = t => t === null ? '' : new Date(t).toISOString();

for (const site of sites.values()) {
  const profile = terrain.profile(site.lat, site.lon);
  const sun = t => E.skyAt(new Date(t), site.lat, site.lon).sun;
  const upperEdge = s => s.el + E.angularRadiusDeg(s.distKm, E.SUN_RADIUS_KM);
  const models = {
    terrain: t => { const s = sun(t); return s.el > skylineAt(profile.values, s.az); },
    flat: t => sun(t).el > 0,
    anyDisk: t => {
      const s = sun(t);
      return upperEdge(s) > skylineAt(profile.values, s.az);
    },
    flatAnyDisk: t => upperEdge(sun(t)) > 0
  };
  for (const month of [...new Set(site.observations.map(o => o.frame.slice(11, 17)))]) {
    const observations = site.observations.filter(o => o.frame.slice(11, 17) === month)
      .sort((a, b) => a.start - b.start);
    if (!observations.length) continue;
    const start = Math.floor((observations[0].start - 24 * hour) / hour) * hour;
    const end = observations.at(-1).stop + 25 * hour;
    const predictions = Object.fromEntries(modelNames.map(name => [name, crossings(start, end, models[name])]));
    for (const rule of rules) {
      let previous = null;
      for (const obs of observations) {
        const lit = obs.p3 >= rule.bright ? true : obs.p7 <= rule.dark ? false : null;
        if (lit === null) continue;
        for (const name of modelNames) {
          const counter = counts[rule.name][name];
          const predicted = models[name]((obs.start + obs.stop) / 2);
          if (lit) { counter.lit++; counter.trueLit += predicted; }
          else { counter.dark++; counter.trueDark += !predicted; }
        }
        if (previous && previous.lit !== lit && obs.stop - previous.start <= 4 * hour) {
          const row = { rule: rule.name, site: `${site.row}:${site.col}`, lat: site.lat, lon: site.lon,
            resM: profile.resM ?? terrain.resAt(site.lat, site.lon),
            direction: lit ? 'sunrise' : 'sunset', before: previous.frame, after: obs.frame,
            bracketStart: iso(previous.start), bracketEnd: iso(obs.stop),
            widthMinutes: (obs.stop - previous.start) / minute };
          for (const name of modelNames) {
            const event = scoreEvent(predictions[name], previous.start, obs.stop, lit);
            row[name + 'UTC'] = iso(event.closest);
            row[name + 'MinutesOutside'] = event.outside === null ? '' : event.outside / minute;
          }
          rows.push(row);
        }
        previous = { ...obs, lit };
      }
    }
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
}

for (const { name } of rules) {
  const events = rows.filter(row => row.rule === name);
  console.error(name, 'events', events.length, 'at', new Set(events.map(row => row.site)).size,
    'sites; median bracket minutes', median(events.map(row => row.widthMinutes)));
  for (const model of modelNames) {
    const { lit, dark, trueLit, trueDark } = counts[name][model];
    const distances = events.map(row => row[model + 'MinutesOutside']).filter(Number.isFinite);
    console.error(model, { lit, dark, trueLit, trueDark, balancedAccuracy: (trueLit / lit + trueDark / dark) / 2,
      bracketHits: distances.filter(d => d === 0).length, matchedWithin24h: distances.length,
      withinTwoHoursOfBracket: distances.filter(d => d <= 120).length,
      conditionalMedianMinutesOutside: distances.length ? median(distances) : null });
  }
  for (const month of ['02', '08']) {
    const subset = events.filter(row => row.bracketStart.slice(5, 7) === month);
    console.error('month', month, 'brackets', subset.length, 'hits', Object.fromEntries(
      modelNames.map(model => [model, subset.filter(r => r[model + 'MinutesOutside'] === 0).length])));
  }
}

const columns = Object.keys(rows[0]);
console.log(columns.join(','));
for (const row of rows) console.log(columns.map(column => row[column]).join(','));
