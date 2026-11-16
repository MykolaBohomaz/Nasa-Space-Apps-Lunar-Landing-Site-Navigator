// Compare NASA PGDA solar and Earth coverage with the shipped terrain and a flat baseline.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const T = require('../src/terrain');
const E = require('../src/engine')(require('astronomy-engine'));

global.window = {};
require('../src/terrain-grid');
require('../src/horizon-data');
require('../src/sites');
const grid = T.loadNode(window.MW_TERRAIN_GRID, require('node:zlib').inflateSync);
const input = fs.readFileSync(path.join(__dirname, 'pgda-coverage-sample.csv'), 'utf8');
const hours = Math.round(18.6 * 365.25 * 24), hour = 3600000;
const start = Date.UTC(2024, 0, 1);
const sky = Array.from({ length: hours }, (_, i) => E.moonSkyVectors(new Date(start + i * hour)));

function skyline(values, az) {
  const x = az / 360 * values.length;
  const i = Math.floor(x), f = x - i;
  return values[i] * (1 - f) + values[(i + 1) % values.length] * f;
}

const samples = input.trimEnd().split('\n').slice(1).map(row => row.split(',').map(Number));
const records = samples.map(sample => {
  const [, , , , lat, lon] = sample;
  const { values } = grid.profile(lat, lon);
  let sunTerrain = 0, earthTerrain = 0, sunFlat = 0, earthFlat = 0;
  for (const vectors of sky) {
    const { sun, earth } = E.skyAtFromVectors(vectors, lat, lon);
    const upperSun = sun.el + E.angularRadiusDeg(sun.distKm, E.SUN_RADIUS_KM);
    const upperEarth = earth.el + E.angularRadiusDeg(earth.distKm, E.EARTH_RADIUS_KM);
    sunTerrain += upperSun > skyline(values, sun.az);
    earthTerrain += upperEarth > skyline(values, earth.az);
    sunFlat += upperSun > 0;
    earthFlat += upperEarth > 0;
  }
  return [...sample, ...[sunTerrain, earthTerrain, sunFlat, earthFlat].map(count => count / hours)];
});

for (const [name, column] of [['Sun', 6], ['Earth', 7]]) {
  for (const [model, offset] of [['Terrain', 2], ['Flat', 4]]) {
    const error = records.map(row => (row[column + offset] - row[column]) * 100);
    const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
    console.error(name, model, { meanBiasPP: mean(error), meanAbsolutePP: mean(error.map(Math.abs)),
      rmsPP: Math.sqrt(mean(error.map(x => x * x))), worstPP: Math.max(...error.map(Math.abs)) });
  }
}

console.log('ring,azimuth,row,col,lat,lon,nasaSun,nasaEarth,terrainSun,terrainEarth,flatSun,flatEarth');
for (const row of records) console.log(row.join(','));

// Isolate resolution at MoonWindow's own two ridge bookmarks over the calendar year 2027.
const ridgeSites = window.MW_SITES.filter(site => site.id === 'shk' || site.id === 'shk2');
const ridgeStart = Date.UTC(2027, 0, 1);
for (const site of ridgeSites) {
  const models = [
    [80, window.MW_HORIZONS.sites[site.id].values],
    [240, grid.profile(site.lat, site.lon).values]
  ];
  for (const [cell, values] of models) {
    let consecutive = 0, longest = 0, lit = 0;
    for (let i = 0; i < 365 * 24; i++) {
      const { sun } = E.skyAt(new Date(ridgeStart + i * hour), site.lat, site.lon);
      if (sun.el > skyline(values, sun.az)) {
        lit++;
        consecutive = 0;
      } else {
        consecutive++;
        longest = Math.max(longest, consecutive);
      }
    }
    console.error('Ridge', site.id, { cell, lightPercent: lit / (365 * 24) * 100, longestDarkHours: longest });
  }
}
