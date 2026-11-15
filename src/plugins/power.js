// OpenAI Codex assisted with the solar power estimates implementation from team requirements.
(() => {
  const radians = Math.PI / 180;
  const format = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
  const values = new WeakMap();

  function watts(scenario, sun, api, peakWatts, azimuth) {
    if (!api.isUp(scenario, sun)) return 0;
    const facing = azimuth === null ? 1 : Math.cos((sun.az - azimuth) * radians);
    return peakWatts * Math.max(0, Math.cos(sun.el * radians) * facing);
  }

  function mount(slot, api) {
    slot.innerHTML = `
      <section class="mw-power" aria-label="Solar power estimate">
        <h3>Solar power estimate</h3>
        <div class="mw-plugin-fields">
          <label>Panel area (m²) <input name="area" type="number" min="0" step="any" value="1" required></label>
          <label>Efficiency (%) <input name="efficiency" type="number" min="0" max="100" step="any" value="30" required></label>
          <label>Mounting <select name="mounting">
            <option value="tracking">Vertical, Sun-tracking</option>
            <option value="fixed">Vertical, fixed</option>
          </select></label>
          <label hidden>Panel azimuth (°) <input name="azimuth" type="number" min="0" max="360" step="any" value="0" required></label>
        </div>
        <dl class="mw-power-results">
          <div><dt>Power now</dt><dd></dd></div>
          <div><dt>30-day average</dt><dd></dd></div>
          <div><dt>30-day energy</dt><dd></dd></div>
        </dl>
        <p class="muted">Rough estimate, no dust, temperature or shadow losses.</p>
        <p class="mw-plugin-error" role="status" hidden>Enter a valid area, efficiency, and panel azimuth.</p>
      </section>`;
    const area = slot.querySelector('[name="area"]');
    const efficiency = slot.querySelector('[name="efficiency"]');
    const mounting = slot.querySelector('[name="mounting"]');
    const azimuth = slot.querySelector('[name="azimuth"]');
    const results = slot.querySelectorAll('dd');
    const error = slot.querySelector('[role="status"]');
    let scenario;

    function update() {
      const fixed = mounting.value === 'fixed';
      azimuth.parentElement.hidden = !fixed;
      const inputs = fixed ? [area, efficiency, azimuth] : [area, efficiency];
      const valid = inputs.every(input => input.validity.valid && Number.isFinite(input.valueAsNumber));
      error.hidden = valid;
      if (!valid) {
        results.forEach(result => { result.textContent = '—'; });
        return;
      }
      const peakWatts = 1361 * area.valueAsNumber * (efficiency.valueAsNumber / 100);
      const facing = fixed ? azimuth.valueAsNumber : null;
      const power = sun => watts(scenario, sun, api, peakWatts, facing);
      const now = power(scenario.cur.sun);
      const start = (scenario.t - scenario.anchor) / api.HOUR;
      const end = start + api.WINDOW_H;
      let wattHours = 0;
      for (let hour = Math.floor(start); hour < end; hour++) {
        const duration = Math.min(hour + 1, end) - Math.max(hour, start);
        const sampleWatts = hour < start ? now : power(scenario.samples[hour].sun);
        wattHours += sampleWatts * duration;
      }
      const readings = [now, wattHours / api.WINDOW_H, wattHours / 1000];
      readings.forEach((value, index) => {
        results[index].textContent = format.format(value) + (index === 2 ? ' kWh' : ' W');
      });
    }

    slot.addEventListener('input', update);
    slot.addEventListener('change', update);
    return next => {
      scenario = next;
      update();
    };
  }

  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'power',
    renderTime(s, slot, api) {
      if (!values.has(slot)) values.set(slot, mount(slot, api));
      values.get(slot)(s);
    }
  });
})();
