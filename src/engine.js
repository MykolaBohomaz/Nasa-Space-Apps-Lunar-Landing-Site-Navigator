// MoonWindow position engine.
// Computes where the Sun and Earth appear in the sky of a site on the Moon.
// Uses Astronomy Engine (MIT, by Don Cross) for the Sun/Moon/Earth positions and the
// IAU/WGCCRE 2009 Moon orientation model (mean Earth / polar axis frame, the same
// frame LRO/LOLA/LROC coordinates use).
// NOTE: This file was written with an AI assistant (Claude) from our team's requirements.
(function (root) {
  'use strict';
  const MOON_RADIUS_KM = 1737.4;
  const AU_KM = 149597870.7;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function engine(A) {
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = a => Math.hypot(a[0], a[1], a[2]);
    const v3 = v => [v.x, v.y, v.z];

    // Moon body-fixed axes (X toward 0°E on the equator, Z north pole) in J2000 equatorial (EQJ).
    function moonAxes(time) {
      const ax = A.RotationAxis(A.Body.Moon, time);
      const a0 = ax.ra * 15 * D2R, d0 = ax.dec * D2R, W = ax.spin * D2R;
      const pole = [Math.cos(d0) * Math.cos(a0), Math.cos(d0) * Math.sin(a0), Math.sin(d0)];
      const node = [-Math.sin(a0), Math.cos(a0), 0]; // ascending node of Moon equator on ICRF equator
      const node90 = cross(pole, node);
      const X = add(scale(node, Math.cos(W)), scale(node90, Math.sin(W)));
      const Y = cross(pole, X);
      return { X, Y, Z: pole };
    }

    function siteFrame(latDeg, lonDeg) {
      const lat = Math.max(-89.9999, Math.min(89.9999, latDeg)) * D2R;
      const lon = lonDeg * D2R;
      const up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
      const east = [-Math.sin(lon), Math.cos(lon), 0];
      const north = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];
      return { up, east, north, pos: scale(up, MOON_RADIUS_KM) };
    }

    // Returns {sun:{el,az,distKm}, earth:{el,az,distKm}} for a Date (UTC) at a site.
    function skyAt(date, latDeg, lonDeg, altKm) {
      const time = A.MakeTime(date);
      const moonGeo = scale(v3(A.GeoMoon(time)), AU_KM);              // Earth -> Moon
      const sunGeo = scale(v3(A.GeoVector(A.Body.Sun, time, true)), AU_KM); // Earth -> Sun
      const sunFromMoon = sub(sunGeo, moonGeo);
      const earthFromMoon = scale(moonGeo, -1);
      const ax = moonAxes(time);
      const toBF = v => [dot(v, ax.X), dot(v, ax.Y), dot(v, ax.Z)];
      const f = siteFrame(latDeg, lonDeg);
      const sitePos = scale(f.up, MOON_RADIUS_KM + (altKm || 0));
      const look = v => {
        const rel = sub(toBF(v), sitePos);
        const d = norm(rel);
        const el = Math.asin(dot(rel, f.up) / d) * R2D;
        let az = Math.atan2(dot(rel, f.east), dot(rel, f.north)) * R2D;
        if (az < 0) az += 360;
        return { el, az, distKm: d };
      };
      return { sun: look(sunFromMoon), earth: look(earthFromMoon) };
    }

    return { skyAt, MOON_RADIUS_KM };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else root.MoonEngine = engine;
})(this);
