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
          <label class="field"><span>Maximum slope (°)</span><input name="slope" type="number" min="0" max="90" step="0.1" value="9" required></label>
          <label class="field"><span>Minimum sunlight (%)</span><input name="sun" type="number" min="0" max="100" value="35" required></label>
          <label class="field"><span>Minimum Earth view (%)</span><input name="earth" type="number" min="0" max="100" value="25" required></label>
          <button class="btn small" type="submit">Filter sites</button>
        </form>
        <p class="mw-finder-count" role="status"></p>
        <fieldset class="mw-finder-picks"><legend>Pick up to three sites</legend><ol></ol></fieldset>
        <div class="mw-finder-window">
          <label class="field"><span>Required continuous days with Sun and Earth</span><input class="mw-finder-days" type="number" min="1" max="30" value="7" required></label>
          <p class="mw-finder-start muted"></p>
          <div class="actions">
            <button class="btn small" type="button" data-check>Check landing windows</button>
            <button class="btn small" type="button" data-compare>Replace comparison with picks</button>
          </div>
          <div class="mw-finder-report" aria-live="polite"></div>
        </div>
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
    const report = slot.querySelector('.mw-finder-report');
    const startLabel = slot.querySelector('.mw-finder-start');
    const f = api.fmt;
    let results = [];
    let picked = new Set();
    let request = 0;
    let checking = false;
    let selectedTime;

    function syncButtons() {
      check.disabled = picked.size === 0 || checking;
      compare.disabled = picked.size < 2 || checking;
      for (const input of list.querySelectorAll('input')) {
        input.disabled = !input.checked && picked.size >= MAX_PICKS;
      }
    }

    function clearReport() {
      request++;
      checking = false;
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
        ' Coverage filters use modeled 2027 visibility.';
      const searchRegions = wide ? [polar] : artemis.filter(r => !regionId || r.id === regionId);
      const matches = searchRegions
        .flatMap(r => r.sites.map(s => ({ ...s, region: r.name })))
        .filter(s => s.slope <= number('slope') && s.sun * 100 >= number('sun') && s.earth * 100 >= number('earth'))
        .sort((a, b) => (rank === 'slope' ? a.slope - b.slope : b[rank] - a[rank]) || b.both - a.both || a.slope - b.slope);
      results = [];
      for (const site of matches) {
        if (results.some(other => surfaceDistanceKm(site, other, api.engine.MOON_RADIUS_KM) < spacing)) continue;
        results.push(site);
        if (results.length === MAX_RESULTS) break;
      }
      picked = new Set(results.slice(0, MAX_PICKS));
      count.textContent = matches.length
        ? `${matches.length} matching points · ${results.length} shortlisted · minimum ${spacing} km spacing`
        : 'No points match. Try a different region or relax a filter.';
      choices.hidden = !results.length;
      slot.querySelector('.mw-finder-window').hidden = !results.length;
      list.innerHTML = results.map((s, i) => `<li><label>
        <input type="checkbox" data-rank="${i}" ${picked.has(s) ? 'checked' : ''}>
        <span><strong>${f.esc(s.region)}</strong> · ${coordinates(s)}
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
      if (time === selectedTime) return;
      selectedTime = time;
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
        isUp: (s, body) => body.el > api.skylineAt(s.prof, body.az)
      };
      checking = true;
      syncButtons();
      report.textContent = 'Checking lunar visibility…';
      const rows = [];
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
      report.innerHTML = `<p>Searched from <strong>${f.esc(f.full(start))}</strong> for one year. The first qualifying window can start later.</p><ol>${rows.join('')}</ol>`;
      syncButtons();
    });
    compare.addEventListener('click', () => {
      const sites = results.filter(s => picked.has(s));
      if (sites.some(s => !api.siteProfile(s.lat, s.lon))) {
        report.textContent = 'Local terrain is unavailable for one or more picks. Wait for it to load or choose different points.';
        return;
      }
      api.loadSiteComparison(sites, api.activeScenario().t);
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
