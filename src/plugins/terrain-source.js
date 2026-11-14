// Code generated with an AI assistant (Claude) from our team's requirements.
(() => {
  const credit = 'NASA LRO LOLA · Planetary Data System';
  const archive = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/';

  // The renderer accepts load() -> { width, height, elevations, credit, url }.
  // Elevations are Float32Array meters relative to a 1,737,400 m sphere.
  // Rows run north to south and columns run 0–360° east, both pixel-centered.
  function lola(read) {
    return {
      async load() {
        const bytes = await read();
        const width = { 2073600: 1440, 33177600: 5760 }[bytes.byteLength];
        if (!width) throw new Error('Expected a global LOLA LDEM_4 or LDEM_16 IMG file.');
        const height = width / 2;
        const samples = new DataView(bytes);
        const elevations = new Float32Array(width * height);
        for (let i = 0; i < elevations.length; i++) {
          elevations[i] = samples.getInt16(2 * i, true) * 0.5;
        }
        return { width, height, elevations, credit, url: archive + (width === 1440 ? 'ldem_4.lbl' : 'ldem_16.lbl') };
      }
    };
  }

  window.MoonWindowTerrain = {
    embedded: () => lola(() => {
      const data = document.getElementById('moonwindow-dem').textContent.trim();
      return Uint8Array.from(atob(data), character => character.charCodeAt(0)).buffer;
    }),
    file: file => lola(() => file.arrayBuffer()),
    url: url => lola(async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Terrain download failed (' + response.status + ').');
      return response.arrayBuffer();
    })
  };
})();
