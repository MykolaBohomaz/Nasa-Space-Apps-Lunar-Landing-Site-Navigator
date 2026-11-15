// NASA Artemis III landing rules check for each scenario.
// Code generated with an AI assistant (Claude) from our team's requirements.
//
// Rules from NASA's "Artemis Human Landing System Overview" for the Space Apps Challenge
// (ntrs.nasa.gov/citations/20250009323) and the Artemis HLS update (ntrs.nasa.gov/citations/20240009596):
// land near the pole (NASA's 2022 rule said within 6 deg; its 2024 regions reach 6.4 deg, Peak near Cabeus B,
// per LROC's Artemis III site mosaics, data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_CABEUSPKLO2), ground slope under 10 deg across the 100 m landing site, Earth in view
// for direct radio (areas with Earth visible under 25% of the time are ruled out), and sunlight for the
// whole planned 6.5-day surface stay (NASA, Aug 2022 region announcement).
(() => {
  const STEP_H = 2, DAYS = 365, SITE_R_M = 100;
  const SOURCE = 'https://ntrs.nasa.gov/citations/20250009323';
  const cache = new Map();

  function style() {
    if (document.getElementById('mw-rules-style')) return;
    const st = document.createElement('style');
    st.id = 'mw-rules-style';
    st.textContent = `
      .mw-rules{background:var(--panel2);border:1px solid var(--line);border-top:4px solid var(--earth);border-radius:10px;padding:14px 16px}
      .mw-rules h3{margin:0 0 4px}
      .mw-rules p{margin:4px 0;color:var(--muted)}
      .mw-rules ul{margin:10px 0 6px;padding:0;list-style:none;display:grid;gap:6px}
      .mw-rules li{display:grid;grid-template-columns:7.5em 1fr;gap:4px 12px;align-items:baseline;padding:8px 10px;background:var(--bg);border-radius:8px}
      .mw-rules li .chip{justify-self:start;white-space:nowrap}
      .mw-rules .chip.na{background:rgba(163,169,174,.16);color:var(--muted)}
      .mw-rules li span.v{grid-column:2;color:var(--muted);font-size:.9rem;font-variant-numeric:tabular-nums}
      .mw-rules .sum{color:var(--text);font-weight:600}
      .mw-rules a{color:var(--earth)}`;
    document.head.appendChild(st);
  }

  // Ground slope across the 100 m site: listed sites carry it from the 80 m LOLA map (tools/make_horizons.py);
  // other polar points use the 240 m in-browser grid, which smooths small bumps.
  function slopeOf(s, api) {
    const site = s.siteId !== 'custom' && api.horizons && api.horizons.sites && api.horizons.sites[s.siteId];
    if (site && Number.isFinite(site.slopeDeg)) return { deg: site.slopeDeg, resM: site.resM };
    const G = api.terrainGrid;
    if (!G || !G.covers(s.lat)) return null;
    // Heights 100 m north, south, east and west of the point (great-circle steps, so this also works at the pole).
    const k = 180 / Math.PI, d = SITE_R_M / 1737400, la = s.lat / k, lo = s.lon / k;
    const h = az => {
      const a = az / k, la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(a));
      const lo2 = lo + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
      return G.heightAt(la2 * k, lo2 * k);
    };
    const gx = (h(90) - h(270)) / (2 * SITE_R_M), gy = (h(0) - h(180)) / (2 * SITE_R_M);
    if (![gx, gy].every(Number.isFinite)) return null;
    return { deg: Math.atan(Math.hypot(gx, gy)) * k, resM: G.resAt(s.lat, s.lon) };
  }

  // One year from the start of the scenario's day, every 2 hours, with this scenario's horizon.
  function year(s, api) {
    const day0 = Math.floor(s.t / api.DAY) * api.DAY;
    const info = api.terrainInfo(s);
    const key = [s.lat, s.lon, day0, info ? info.source + info.resM : 'flat', api.sunRule()].join();
    if (cache.has(key)) return cache.get(key);
    let earth = 0, run = 0, best = 0;
    const n = DAYS * 24 / STEP_H;
    for (let i = 0; i < n; i++) {
      const k = api.engine.skyAt(new Date(day0 + i * STEP_H * api.HOUR), s.lat, s.lon);
      if (api.isUp(s, k.earth)) earth++;
      run = api.isUp(s, k.sun) ? run + 1 : 0;
      if (run > best) best = run;
    }
    const out = { earth: earth / n, longestSunH: best * STEP_H, day0 };
    if (cache.size > 200) cache.clear();
    cache.set(key, out);
    return out;
  }

  const chip = ok => ok === null ? '<span class="chip na">Not checked</span>'
    : ok ? '<span class="chip ok">Pass</span>' : '<span class="chip no">Fail</span>';

  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'rules',
    renderScenario(s, slot, api) {
      style();
      const f = api.fmt, y = year(s, api), sl = slopeOf(s, api);
      const polar = s.lat <= -83.5;
      const slopeOk = sl ? sl.deg < 10 : null, earthOk = y.earth >= 0.25, sunOk = y.longestSunH >= 6.5 * 24;
      const rows = [
        [polar, 'Near the south pole, like NASA\'s candidate regions', `${Math.abs(s.lat).toFixed(2)}°${s.lat < 0 ? 'S' : 'N'}, ${(90 + s.lat).toFixed(2)}° from the pole (NASA\'s regions reach 6.4°)`],
        [slopeOk, 'Ground slope under 10° across the 100 m landing site',
          sl ? `${sl.deg.toFixed(1)}° from the ${sl.resM} m NASA LOLA map${sl.resM > 100 ? ' (it smooths small bumps, so the real slope may be steeper)' : ''}`
            : 'No polar terrain data here (LOLA maps cover 77°S to the pole)'],
        [earthOk, 'Earth in view at least 25% of the year, for direct radio', `Earth up ${f.pct(y.earth)} of the time`],
        [sunOk, 'Sunlight without a break for the 6.5-day surface stay', `Longest unbroken sunlight in the year: ${f.hours(y.longestSunH)}`]
      ];
      const checked = rows.filter(r => r[0] !== null), passed = checked.filter(r => r[0]).length;
      const n = api.scenarios().indexOf(s);
      slot.innerHTML = `<section class="mw-rules" aria-label="NASA landing rules, scenario ${'ABCDEFGH'.charAt(Math.max(0, n))}">
        <h3>NASA Artemis III landing rules</h3>
        <p>The rules NASA set for the crewed Artemis III lander, checked with this scenario's horizon over the year from ${new Date(y.day0).toUTCString().slice(5, 16)}. <a href="${SOURCE}" target="_blank" rel="noopener">NASA source</a></p>
        <ul>${rows.map(([ok, rule, val]) => `<li>${chip(ok)}<span>${rule}</span><span class="v">${val}</span></li>`).join('')}</ul>
        <p class="sum">Meets ${passed} of ${checked.length} rules${checked.length < rows.length ? ` (${rows.length - checked.length} not checked)` : ''}.</p>
      </section>`;
    }
  });
  window.MW_RULES = { year, slopeOf };
})();
