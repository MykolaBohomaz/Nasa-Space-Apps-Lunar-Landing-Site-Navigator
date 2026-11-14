// Template for a MoonWindow plugin. Copy to src/plugins/<name>.js, then add
// <script src="plugins/<name>.js"></script> to src/index.html (above app.js) and run build.py.
// Code generated with an AI assistant (Claude) from our team's requirements.
(window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
  name: 'template',

  // Called once at start-up. api = window.MoonWindow
  init(api) {},

  // Called every time a scenario is redrawn. `slot` is this plugin's own <div> inside the scenario panel.
  // s.cur = {sun:{el,az}, earth:{el,az}} now; s.samples[i] = same, hourly from s.anchor (i = 0..api.SAMPLE_H);
  // s.stats = 30-day numbers; s.nextSun / s.nextEarth = {at: ms or null}.
  renderScenario(s, slot, api) {
    // slot.innerHTML = `<p>Sun is ${api.fmt.deg(s.cur.sun.el)} high</p>`;
  },

  // Called on every redraw with this plugin's own <div> at the top of the page (above all scenarios).
  renderTop(slot, api) {}
});
