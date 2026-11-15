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

    // Sun and Earth positions in lunar body-fixed coordinates, in kilometres.
    function moonSkyVectors(date) {
      const time = A.MakeTime(date);
      const moonGeo = scale(v3(A.GeoMoon(time)), AU_KM);              // Earth -> Moon
      const sunGeo = scale(v3(A.GeoVector(A.Body.Sun, time, true)), AU_KM); // Earth -> Sun
      const ax = moonAxes(time);
      const toBF = v => [dot(v, ax.X), dot(v, ax.Y), dot(v, ax.Z)];
      return { sun: toBF(sub(sunGeo, moonGeo)), earth: toBF(scale(moonGeo, -1)) };
    }

    // Returns {sun:{el,az,distKm}, earth:{el,az,distKm}} for a Date (UTC) at a site.
    function skyAt(date, latDeg, lonDeg, altKm) {
      const { sun, earth } = moonSkyVectors(date);
      const f = siteFrame(latDeg, lonDeg);
      const sitePos = scale(f.up, MOON_RADIUS_KM + (altKm || 0));
      const look = (v, kind) => {
        const rel = sub(v, sitePos);
        const d = norm(rel);
        const el = Math.asin(dot(rel, f.up) / d) * R2D;
        let az = Math.atan2(dot(rel, f.east), dot(rel, f.north)) * R2D;
        if (az < 0) az += 360;
        return { el, az, distKm: d, kind };
      };
      return { sun: look(sun, 'sun'), earth: look(earth, 'earth') };
    }

    // MK-3: how much of a body's disk is above the skyline (0..1).
    // elDeg = elevation of the disk's centre, horizonDeg = skyline height in that direction
    // (from api.horizonAt; 0 for flat ground), distKm and radiusKm give the disk's angular size.
    // Treats the skyline as straight across the disk (it is less than 2 deg wide).
    function visibleFraction(elDeg, horizonDeg, distKm, radiusKm) {
      const r = Math.asin(Math.min(1, radiusKm / distKm)) * R2D;   // angular radius, deg
      const d = elDeg - horizonDeg;                                 // centre above skyline, deg
      if (d >= r) return 1;
      if (d <= -r) return 0;
      const cap = c => r * r * Math.acos(c / r) - c * Math.sqrt(r * r - c * c); // area beyond chord at distance c
      const full = Math.PI * r * r;
      return d >= 0 ? (full - cap(d)) / full : cap(-d) / full;
    }
    const SUN_RADIUS_KM = 695700, EARTH_RADIUS_KM = 6371.0;
    // body = {el, az, distKm} from skyAt; horizonDeg from api.horizonAt(s, body.az)
    const sunVisible = (sun, horizonDeg) => visibleFraction(sun.el, horizonDeg || 0, sun.distKm, SUN_RADIUS_KM);
    const earthVisible = (earth, horizonDeg) => visibleFraction(earth.el, horizonDeg || 0, earth.distKm, EARTH_RADIUS_KM);
    const angularRadiusDeg = (distKm, radiusKm) => Math.asin(Math.min(1, radiusKm / distKm)) * R2D;

    return { skyAt, moonSkyVectors, visibleFraction, sunVisible, earthVisible, angularRadiusDeg, SUN_RADIUS_KM, EARTH_RADIUS_KM, MOON_RADIUS_KM };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else root.MoonEngine = engine;
})(this);
