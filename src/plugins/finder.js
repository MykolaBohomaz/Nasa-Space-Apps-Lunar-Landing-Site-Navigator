// Shortlist Artemis region points from MoonWindow's offline NASA LOLA screening data.
(() => {
  'use strict';
  const MAX_PICKS = 3;
  const MAX_RESULTS = 8;
  const ARTEMIS_SPACING_KM = 2;
  const POLAR_SPACING_KM = 12;
  const radians = Math.PI / 180;
  const regions = window.MW_SITE_CANDIDATES || [];
  const polar = regions.find(region => region.id === 'south-pole');
  const artemis = regions.filter(region => region !== polar);
  const nextFrame = () => new Promise(resolve => setTimeout(resolve, 0));

  function surfaceDistanceKm(a, b, radiusKm) {
    const latA = a.lat * radians, latB = b.lat * radians;
    const h = Math.sin((latB - latA) / 2) ** 2 +
      Math.cos(latA) * Math.cos(latB) * Math.sin((b.lon - a.lon) * radians / 2) ** 2;
    return 2 * radiusKm * Math.asin(Math.sqrt(Math.min(1, h)));
  }

  function mount(slot, api) {
    slot.innerHTML = `
      <section class="mw-finder" aria-labelledby="mw-finder-heading">
        <h2 id="mw-finder-heading">Find landing sites</h2>
        <p class="mw-finder-scope muted"></p>
        <form class="mw-finder-fields">
          <label class="field"><span>Search area</span><select name="region"></select></label>
          <label class="field"><span>Rank by</span><select name="rank">
            <option value="both">Most Sun and Earth together</option>
            <option value="sun">Most sunlight</option>
            <option value="earth">Most Earth visibility</option>
            <option value="slope">Lowest slope</option>
          </select></label>
          <label class="field"><span>Max slope (°)</span><input name="slope" type="number" min="0" max="90" step="0.1" value="9" required></label>
          <label class="field"><span>Min sunlight (%)</span><input name="sun" type="number" min="0" max="100" value="35" required></label>
          <label class="field"><span>Min Earth view (%)</span><input name="earth" type="number" min="0" max="100" value="25" required></label>
          <button class="btn small" type="submit">Filter sites</button>
        </form>
        <p class="mw-finder-count" role="status"></p>
        <div class="mw-finder-window">
          <label class="field"><span>Required continuous days with Sun and Earth</span><input class="mw-finder-days" type="number" min="1" max="30" value="7" required></label>
          <p class="mw-finder-start muted"></p>
          <div class="actions">
            <button class="btn small" type="button" data-check>Check landing windows</button>
            <button class="btn small" type="button" data-compare title="Replace the mission scenarios with these picks">Compare at selected time</button>
            <button class="btn small" type="button" data-compare-earliest hidden title="Replace the mission scenarios with these picks">Compare earliest starts</button>
          </div>
          <div class="mw-finder-report" aria-live="polite"></div>
        </div>
        <fieldset class="mw-finder-picks"><legend>Pin up to three sites on the globe or in the list</legend><ol></ol></fieldset>
        <p class="muted">Grid-based slope and visibility estimates. Local rocks and small terrain features can matter, especially near ridges.</p>
      </section>`;

    const form = slot.querySelector('form');
    const regionSelect = form.elements.namedItem('region');
    if (polar) regionSelect.add(new Option(`South pole · ${polar.radiusKm} km radius`, polar.id));
    regionSelect.add(new Option('All nine Artemis regions', ''));
    for (const region of artemis) regionSelect.add(new Option(region.name, region.id));
    const value = name => form.elements.namedItem(name).value;
    const number = name => form.elements.namedItem(name).valueAsNumber;
    const count = slot.querySelector('.mw-finder-count');
    const scope = slot.querySelector('.mw-finder-scope');
    const choices = slot.querySelector('.mw-finder-picks');
    const list = choices.querySelector('ol');
    const daysInput = slot.querySelector('.mw-finder-days');
    const check = slot.querySelector('[data-check]');
    const compare = slot.querySelector('[data-compare]');
    const compareEarliest = slot.querySelector('[data-compare-earliest]');
    const report = slot.querySelector('.mw-finder-report');
    const startLabel = slot.querySelector('.mw-finder-start');
    const f = api.fmt;
    let results = [];
    let layer;
    let picked = new Set();
    let request = 0;
    let checking = false;
    let selectedTime;
    let selectedSunRule;
    let checkedStarts = null;

    function syncButtons() {
      check.disabled = picked.size === 0 || checking;
      compare.disabled = picked.size < 2 || checking;
      compareEarliest.hidden = !checkedStarts || picked.size < 2;
      compareEarliest.disabled = checking || checkedStarts?.length !== picked.size;
      for (const input of list.querySelectorAll('input')) {
        input.disabled = !input.checked && picked.size >= MAX_PICKS;
      }
      api.finderLayer = { ...layer, pins: results.map((site, i) => ({
        lat: site.lat, lon: site.lon, name: site.region, number: i + 1, picked: picked.has(site),
        disabled: !picked.has(site) && picked.size >= MAX_PICKS,
        toggle() { list.querySelector(`[data-rank="${i}"]`)?.click(); }
      })) };
      api.refreshGlobe();
    }

    function clearReport() {
      request++;
      checking = false;
      checkedStarts = null;
      report.replaceChildren();
      syncButtons();
    }

    const coordinates = s => `${Math.abs(s.lat).toFixed(4)}°S, ${s.lon.toFixed(4)}°E`;
    function filter() {
      const regionId = value('region');
      const rank = value('rank');
      const wide = polar && regionId === polar.id;
      const spacing = wide ? POLAR_SPACING_KM : ARTEMIS_SPACING_KM;
      scope.textContent = (wide
        ? `Search points on a ${polar.stepKm} km grid within ${polar.radiusKm} km of the south pole.`
        : 'Search points within 5 km of the selected Artemis region reference points.') +
        ' Brighter cells rank higher. Coverage filters use modeled 2027 Sun-centre and Earth-centre visibility.';
      const searchRegions = wide ? [polar] : artemis.filter(r => !regionId || r.id === regionId);
      const matches = searchRegions
        .flatMap(r => r.sites.map(s => ({ ...s, region: r.name })))
        .filter(s => s.slope <= number('slope') && s.sun * 100 >= number('sun') && s.earth * 100 >= number('earth'))
        .sort((a, b) => (rank === 'slope' ? a.slope - b.slope : b[rank] - a[rank]) || b.both - a.both || a.slope - b.slope);
      const metric = s => rank === 'slope' ? -s.slope : s[rank];
      const min = matches.length ? metric(matches.at(-1)) : 0;
      const max = matches.length ? metric(matches[0]) : 0;
      layer = {
        cells: matches.map(s => ({ lat: s.lat, lon: s.lon, strength: max > min ? (metric(s) - min) / (max - min) : 1 })),
        cellKm: wide ? polar.stepKm : 1,
        focus: regionId && !wide && matches.length ? { lat: matches[0].lat, lon: matches[0].lon, distance: 1.115 }
          : { lat: -90, lon: 0, distance: 1.27 }
      };
      results = [];
      for (const site of matches) {
        if (results.some(other => surfaceDistanceKm(site, other, api.engine.MOON_RADIUS_KM) < spacing)) continue;
        results.push(site);
        if (results.length === MAX_RESULTS) break;
      }
      picked = new Set(results.slice(0, MAX_PICKS));
      count.textContent = matches.length
        ? `${matches.length} matching cells on the globe · ${results.length} numbered candidates · ${spacing} km spacing`
        : 'No points match. Try a different region or relax a filter.';
      choices.hidden = !results.length;
      slot.querySelector('.mw-finder-window').hidden = !results.length;
      list.innerHTML = results.map((s, i) => `<li><label>
        <input type="checkbox" data-rank="${i}" ${picked.has(s) ? 'checked' : ''}>
        <span><strong>${i + 1}. ${f.esc(s.region)}</strong> · ${coordinates(s)}
          <small>${s.slope.toFixed(1)}° slope · ${s.resM} m LOLA · ${s.original ? 'original candidate' : s.distanceKm.toFixed(1) + (wide ? ' km from pole' : ' km from reference point')}</small>
          <small>Sun ${f.pct(s.sun)} · Earth ${f.pct(s.earth)} · Both ${f.pct(s.both)}</small>
        </span>
      </label></li>`).join('');
      clearReport();
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      filter();
    });
    list.addEventListener('change', event => {
      const input = event.target;
      const site = results[Number(input.dataset.rank)];
      if (input.checked) picked.add(site);
      else picked.delete(site);
      clearReport();
    });
    daysInput.addEventListener('input', clearReport);

    function updateSearchStart() {
      const time = api.activeScenario().t;
      if (time === selectedTime && api.sunRule() === selectedSunRule) return;
      selectedTime = time;
      selectedSunRule = api.sunRule();
      startLabel.textContent = `Search from ${f.full(time)}`;
      clearReport();
    }

    check.addEventListener('click', async () => {
      if (!daysInput.reportValidity()) return;
      const token = ++request;
      const start = api.activeScenario().t;
      const required = daysInput.valueAsNumber * api.DAY;
      const sites = results.filter(s => picked.has(s));
      const slip = start + 7 * api.DAY;
      const planner = window.MW_PLANNER;
      const horizonApi = {
        ...api,
        isUp: (s, body) => api.clearsSkyline(body, api.skylineAt(s.prof, body.az))
      };
      checking = true;
      syncButtons();
      report.textContent = 'Checking lunar visibility…';
      const rows = [];
      const starts = [];
      for (const site of sites) {
        await nextFrame();
        if (token !== request) return;
        const profile = api.siteProfile(site.lat, site.lon);
        if (!profile) {
          rows.push(`<li>${f.esc(site.region)} · ${coordinates(site)}: local terrain unavailable.</li>`);
          continue;
        }
        const { windows } = planner.findWindows(horizonApi, { ...site, t: start, prof: profile.values }, 0, 365);
        const remaining = time => {
          const window = windows.find(w => w.start <= time && time < w.end);
          return window ? window.end - time : 0;
        };
        const next = windows.find(w => w.end - w.start >= required);
        if (next) starts.push({ lat: site.lat, lon: site.lon, t: next.start });
        const nextText = next ? f.full(next.start) : 'No qualifying window in the next year';
        const duration = time => {
          const span = remaining(time);
          return `${span ? f.dur(span) : 'No shared visibility'} · ${span >= required ? 'Meets target' : 'Below target'}`;
        };
        rows.push(`<li><strong>${f.esc(site.region)} · ${coordinates(site)}</strong>
          <small>Selected time: ${f.esc(duration(start))}</small>
          <small>One week later: ${f.esc(duration(slip))}</small>
          <small>Earliest qualifying start: ${f.esc(nextText)}</small></li>`);
      }
      checking = false;
      checkedStarts = starts;
      const unavailable = sites.length > 1 && starts.length !== sites.length
        ? '<p>Compare earliest starts becomes available when every pick has a qualifying window.</p>' : '';
      report.innerHTML = `<p>Searched from <strong>${f.esc(f.full(start))}</strong> for one year. The first qualifying window can start later.</p><ol>${rows.join('')}</ol>` + unavailable;
      syncButtons();
    });
    compare.addEventListener('click', () => {
      const sites = results.filter(s => picked.has(s));
      if (sites.some(s => !api.siteProfile(s.lat, s.lon))) {
        report.textContent = 'Local terrain is unavailable for one or more picks. Wait for it to load or choose different points.';
        return;
      }
      const t = api.activeScenario().t;
      if (!daysInput.reportValidity()) return;
      api.loadSiteComparison(sites.map(({ lat, lon }) => ({ lat, lon, t })), { shared: true, days: daysInput.valueAsNumber });
    });
    compareEarliest.addEventListener('click', () => {
      if (checkedStarts?.length === picked.size && daysInput.reportValidity()) {
        api.loadSiteComparison(checkedStarts, { days: daysInput.valueAsNumber });
      }
    });
    filter();
    return updateSearchStart;
  }

  const views = new WeakMap();
  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'finder',
    renderTop(slot, api) {
      if (!views.has(slot)) views.set(slot, mount(slot, api));
      views.get(slot)();
    }
  });
})();
