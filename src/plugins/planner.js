// MK-4: landing date finder.
// For each scenario, finds the next dates when a lander at that site would have sunlight AND
// direct radio to Earth together for at least N days, using the same visibility rule as the
// rest of the app (api.isUp: real NASA LOLA terrain at polar sites, flat ground elsewhere).
// Code generated with an AI assistant (Claude) from our team's requirements.
(function () {
  'use strict';
  const SEARCH_DAYS = 365;
  const SHOW = 5;
  const state = new WeakMap(); // scenario -> {minDays, key, result}

  // Pure search, also exposed as window.MW_PLANNER.findWindows for tests.
  // Returns {windows: [{start, end, hours}], longest, anyEarth, anySun, hoursSearched}
  function findWindows(api, s, minDays, days) {
    const H = api.HOUR, t0 = Math.floor(s.t / H) * H, n = days * 24;
    const windows = [];
    let longest = null, anyEarth = false, anySun = false, runStart = null;
    const close = (end) => {
      const w = { start: runStart, end, hours: Math.round((end - runStart) / H) };
      if (!longest || w.hours > longest.hours) longest = w;
      if (w.hours >= minDays * 24) windows.push(w);
      runStart = null;
    };
    for (let i = 0; i <= n; i++) {
      const t = t0 + i * H;
      const k = api.engine.skyAt(new Date(t), s.lat, s.lon);
      const su = api.isUp(s, k.sun), eu = api.isUp(s, k.earth);
      anySun = anySun || su; anyEarth = anyEarth || eu;
      if (su && eu) { if (runStart === null) runStart = t; }
      else if (runStart !== null) close(t);
    }
    if (runStart !== null) close(t0 + n * H); // still open at the end of the search
    return { windows, longest, anyEarth, anySun, hoursSearched: n };
  }

  function css() {
    const st = document.createElement('style');
    st.textContent = `
      .mw-plan{background:var(--panel2);border:1px solid var(--line);border-top:4px solid var(--both);border-radius:10px;padding:14px 16px}
      .mw-plan h3{margin:0 0 4px;font-size:1rem;font-weight:600}
      .mw-plan p{margin:4px 0;color:var(--muted);font-size:.9rem;max-width:80ch}
      .mw-plan form{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:8px 0}
      .mw-plan input{width:5.5em;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px;color:var(--text)}
      .mw-plan ol{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px}
      .mw-plan li{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:8px 10px;background:var(--bg);border-radius:8px;font-variant-numeric:tabular-nums}
      .mw-plan li b{min-width:19ch}
      .mw-plan .len{color:var(--both);font-weight:600}
      .mw-plan .note{color:var(--text)}`;
    document.head.appendChild(st);
  }

  function build(slot) {
    slot.innerHTML = `<section class="mw-plan" aria-label="Landing date finder">
      <h3>Find landing dates</h3>
      <p>Dates in the next year when a lander here keeps sunlight and direct radio to Earth together for long enough. It uses the same horizon as the rest of this scenario.</p>
      <form>
        <label>Need Sun and Earth together for at least <input type="number" min="1" max="20" step="1" value="7" inputmode="numeric"> days</label>
        <button class="btn small" type="submit">Find dates</button>
      </form>
      <div class="out" aria-live="polite"></div>
    </section>`;
  }

  function show(slot, s, api, res, minDays) {
    const out = slot.querySelector('.out'), f = api.fmt;
    const idx = () => api.scenarios().indexOf(s);
    const hasTerrain = api.terrainInfo ? !!api.terrainInfo(s) : false;
    const terrainNote = hasTerrain ? 'Uses real NASA LOLA terrain.' : 'Uses flat ground.';
    if (!res.anyEarth) { out.innerHTML = `<p class="note"><b>No window:</b> Earth never rises here in the next year, so direct radio is impossible. A mission here needs a relay satellite.</p>`; return; }
    if (!res.anySun) { out.innerHTML = `<p class="note"><b>No window:</b> the Sun never clears the horizon here in the next year.</p>`; return; }
    const row = w => `<li><b>${f.esc(f.full(w.start))}</b><span class="len">${w.end === null ? '' : f.dur(w.end - w.start)}</span><span>until ${f.esc(f.utc(w.end))}</span><button type="button" class="btn small" data-t="${w.start}">Use this date</button></li>`;
    let html;
    if (res.windows.length) {
      html = `<p>${res.windows.length === 1 ? '1 window' : res.windows.length + ' windows'} of at least ${minDays} days in the next year. ${terrainNote} Showing the first ${Math.min(SHOW, res.windows.length)}.</p><ol>${res.windows.slice(0, SHOW).map(row).join('')}</ol>`;
    } else {
      html = `<p class="note"><b>No window of ${minDays} days</b> in the next year. ${terrainNote} The longest time with both Sun and Earth is ${f.dur(res.longest.end - res.longest.start)}:</p><ol>${row(res.longest)}</ol>`;
    }
    out.innerHTML = html;
    out.querySelectorAll('button[data-t]').forEach(b => b.addEventListener('click', () => api.setTime(idx(), Number(b.dataset.t))));
  }

  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'planner',
    init() { css(); },
    renderScenario(s, slot, api) {
      let st = state.get(s);
      if (!st) { st = { minDays: 7, key: '', result: null }; state.set(s, st); }
      if (!slot.querySelector('.mw-plan')) {
        build(slot);
        const form = slot.querySelector('form'), input = slot.querySelector('input');
        input.value = st.minDays;
        form.addEventListener('submit', e => {
          e.preventDefault();
          st.minDays = Math.max(1, Math.min(20, Math.round(Number(input.value) || 7)));
          input.value = st.minDays;
          const out = slot.querySelector('.out');
          out.innerHTML = '<p>Searching the next 365 days…</p>';
          setTimeout(() => {
            st.result = findWindows(api, s, st.minDays, SEARCH_DAYS);
            st.key = `${s.lat},${s.lon},${api.terrain()},${api.terrainInfo && api.terrainInfo(s) ? api.terrainInfo(s).resM : 0}`;
            show(slot, s, api, st.result, st.minDays);
          }, 20);
        });
      }
      // Results go stale when the site or the terrain setting changes (not when time moves).
      const key = `${s.lat},${s.lon},${api.terrain()},${api.terrainInfo && api.terrainInfo(s) ? api.terrainInfo(s).resM : 0}`;
      if (st.result && st.key !== key) {
        st.result = null;
        slot.querySelector('.out').innerHTML = '<p>Site or terrain changed. Press "Find dates" again.</p>';
      }
    }
  });
  window.MW_PLANNER = { findWindows };
})();
