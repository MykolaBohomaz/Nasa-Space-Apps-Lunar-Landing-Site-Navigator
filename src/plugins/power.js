// OpenAI Codex assisted with the solar power estimates implementation from team requirements.
(() => {
  const radians = Math.PI / 180;
  const format = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
  const defaults = { area: 1, efficiency: 30, azimuth: null, days: 30 };
  let settings = { ...defaults };
  let days = defaults.days;
  let missionDays = defaults.days;

  function watts(scenario, sun, api, peakWatts, azimuth) {
    const visible = api.engine.sunVisible(sun, api.horizonAt(scenario, sun.az));
    const facing = azimuth === null ? 1 : Math.cos((sun.az - azimuth) * radians);
    return peakWatts * visible * Math.max(0, Math.cos(sun.el * radians) * facing);
  }

  function mount(slot, api) {
    slot.innerHTML = `
      <details class="mw-power">
        <summary>Shared solar settings <span class="mw-power-summary muted"></span></summary>
        <div class="mw-plugin-fields">
          <label>Panel area (m²) <input name="area" type="number" min="0" step="any" value="1" required></label>
          <label>Efficiency (%) <input name="efficiency" type="number" min="0" max="100" step="any" value="30" required></label>
          <label>Mounting <select name="mounting">
            <option value="tracking">Vertical, Sun-tracking</option>
            <option value="fixed">Vertical, fixed</option>
          </select></label>
          <label hidden>Panel azimuth (°) <input name="azimuth" type="number" min="0" max="360" step="any" value="0" required></label>
        </div>
        <p class="muted">Power uses the visible fraction of the Sun’s disk. The estimate omits dust, temperature, and equipment shadow losses.</p>
        <p class="mw-plugin-error" role="status" hidden>Enter valid solar settings to compare power.</p>
      </details>`;
    const area = slot.querySelector('[name="area"]');
    const efficiency = slot.querySelector('[name="efficiency"]');
    const mounting = slot.querySelector('[name="mounting"]');
    const azimuth = slot.querySelector('[name="azimuth"]');
    const duration = document.getElementById('missionDays');
    const summary = slot.querySelector('.mw-power-summary');
    const error = slot.querySelector('[role="status"]');
    function update() {
      const fixed = mounting.value === 'fixed';
      azimuth.parentElement.hidden = !fixed;
      const inputs = fixed ? [area, efficiency, azimuth, duration] : [area, efficiency, duration];
      const valid = inputs.every(input => input.validity.valid && Number.isFinite(input.valueAsNumber));
      missionDays = duration.validity.valid ? duration.valueAsNumber : null;
      error.hidden = valid;
      settings = valid ? { area: area.valueAsNumber, efficiency: efficiency.valueAsNumber,
        azimuth: fixed ? azimuth.valueAsNumber : null, days: duration.valueAsNumber } : null;
      if (missionDays !== null) days = missionDays;
      summary.textContent = settings
        ? `${format.format(settings.area)} m² · ${format.format(settings.efficiency)}% · ${fixed ? 'Fixed ' + settings.azimuth + '°' : 'Sun-tracking'} · ${days} days`
        : 'Settings incomplete';
      api.renderMissionSummary();
    }

    slot.addEventListener('input', update);
    slot.addEventListener('change', update);
    duration.addEventListener('input', update);
    duration.addEventListener('change', update);
    update();
  }

  function estimate(scenario, api) {
    if (!settings) return { now: '—', average: '—', energy: '—' };
    const peakWatts = 1361 * settings.area * (settings.efficiency / 100);
    const power = sun => watts(scenario, sun, api, peakWatts, settings.azimuth);
    const now = power(scenario.cur.sun);
    const hours = settings.days * 24;
    const start = (scenario.t - scenario.anchor) / api.HOUR;
    const end = start + hours;
    let wattHours = 0;
    for (let hour = Math.floor(start); hour < end; hour++) {
      const duration = Math.min(hour + 1, end) - Math.max(hour, start);
      const sampleWatts = hour < start ? now : power(scenario.samples[hour].sun);
      wattHours += sampleWatts * duration;
    }
    return {
      now: format.format(now) + ' W',
      average: format.format(wattHours / hours) + ' W',
      energy: format.format(wattHours / 1000) + ' kWh',
      nowW: now,
      averageW: wattHours / hours,
      energyKWh: wattHours / 1000
    };
  }

  window.MW_POWER = { estimate, get days() { return days; }, get missionDays() { return missionDays; },
    get settings() { return settings; } };
  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'power',
    renderTop(slot, api) {
      if (!slot.firstElementChild) mount(slot, api);
    }
  });
})();
