// Code generated with an AI assistant (Claude) from our team's requirements.
(() => {
  const radians = Math.PI / 180;
  const radius = 1737400;
  const reliefScale = 2.5;
  const floatsPerVertex = 9;
  const focalLength = 2.6;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  function direction(lat, lon) {
    const phi = lat * radians;
    const lambda = lon * radians;
    return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
  }

  function cameraAt(lat, lon) {
    return [direction(0, lon + 90), direction(lat + 90, lon), direction(lat, lon)];
  }

  function orbitCamera([right, up, forward], horizontal, vertical) {
    const angle = Math.hypot(horizontal, vertical);
    if (!angle) return [right, up, forward];
    const x = horizontal / angle;
    const y = vertical / angle;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const tangent = right.map((value, i) => x * value + y * up[i]);
    // Rotate in the plane formed by the camera direction and the screen-space drag.
    const shift = tangent.map((value, i) => (cosine - 1) * value - sine * forward[i]);
    return [
      right.map((value, i) => value + x * shift[i]),
      up.map((value, i) => value + y * shift[i]),
      forward.map((value, i) => cosine * value + sine * tangent[i])
    ];
  }

  function makeSurface(gl, grid) {
    const { width, height, elevations } = grid;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 ||
        !(elevations instanceof Float32Array) || elevations.length !== width * height) {
      throw new Error('Invalid terrain grid.');
    }
    const columns = Math.min(width, 1440);
    const rows = Math.min(height, 720);
    const stride = columns + 1;

    function sample(lat, lon) {
      const x = ((lon % 360 + 360) % 360) * width / 360 - 0.5;
      const y = clamp((90 - lat) * height / 180 - 0.5, 0, height - 1);
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const left = (x0 + width) % width;
      const right = (left + 1) % width;
      const top = y0 * width;
      const bottom = Math.min(y0 + 1, height - 1) * width;
      const a = elevations[top + left] + (elevations[top + right] - elevations[top + left]) * (x - x0);
      const b = elevations[bottom + left] + (elevations[bottom + right] - elevations[bottom + left]) * (x - x0);
      return a + (b - a) * (y - y0);
    }

    function elevation(lat, lon) {
      const dLat = 180 / rows;
      const dLon = 360 / columns;
      return (16 * sample(lat, lon) + sample(lat - dLat, lon) + sample(lat + dLat, lon) +
        sample(lat, lon - dLon) + sample(lat, lon + dLon)) / 20;
    }

    function point(lat, lon) {
      const scale = 1 + elevation(lat, lon) * reliefScale / radius;
      return direction(lat, lon).map(value => value * scale);
    }

    const vertices = new Float32Array(stride * (rows + 1) * floatsPerVertex);
    const indices = new Uint32Array(columns * rows * 6);
    for (let row = 0; row <= rows; row++) {
      const lat = 90 - row * 180 / rows;
      // Collapse each pole to a single radius to avoid a gap in the triangles.
      const pole = row === 0 || row === rows;
      const polarScale = pole ? 1 + elevation(lat, 0) * reliefScale / radius : 0;
      for (let col = 0; col <= columns; col++) {
        const lon = col * 360 / columns;
        const position = pole ? [0, Math.sign(lat) * polarScale, 0] : point(lat, lon);
        const index = row * stride + col;
        const offset = index * floatsPerVertex;
        vertices.set(position, offset);
        vertices[offset + 3] = (Math.hypot(...position) - 1) * radius / reliefScale;
        vertices[offset + 7] = col / columns + 0.5;
        vertices[offset + 8] = row / rows;
        if (row === rows || col === columns) continue;
        indices.set([index, index + 1, index + stride, index + 1, index + stride + 1, index + stride],
          (row * columns + col) * 6);
      }
    }

    // Shared vertex normals smooth the facets while keeping the terrain silhouette.
    for (let row = 0; row <= rows; row++) {
      const polarWeight = clamp(Math.sin(row * Math.PI / rows) * 8, 0, 1);
      for (let col = 0; col <= columns; col++) {
        const offset = (row * stride + col) * floatsPerVertex;
        const length = Math.hypot(vertices[offset], vertices[offset + 1], vertices[offset + 2]);
        const x = vertices[offset] / length;
        const y = vertices[offset + 1] / length;
        const z = vertices[offset + 2] / length;
        if (row === 0 || row === rows) {
          vertices.set([x, y, z], offset + 4);
          continue;
        }
        const west = (row * stride + (col + columns - 1) % columns) * floatsPerVertex;
        const east = (row * stride + (col + 1) % columns) * floatsPerVertex;
        const north = offset - stride * floatsPerVertex;
        const south = offset + stride * floatsPerVertex;
        const ex = vertices[east] - vertices[west];
        const ey = vertices[east + 1] - vertices[west + 1];
        const ez = vertices[east + 2] - vertices[west + 2];
        const nx = vertices[north] - vertices[south];
        const ny = vertices[north + 1] - vertices[south + 1];
        const nz = vertices[north + 2] - vertices[south + 2];
        const cx = ey * nz - ez * ny;
        const cy = ez * nx - ex * nz;
        const cz = ex * ny - ey * nx;
        // Cylindrical samples bunch up at the poles. Fade their slope shading there.
        const slope = 0.65 * polarWeight / (Math.hypot(cx, cy, cz) || 1);
        const radial = 1 - 0.65 * polarWeight;
        vertices[offset + 4] = x * radial + cx * slope;
        vertices[offset + 5] = y * radial + cy * slope;
        vertices[offset + 6] = z * radial + cz * slope;
      }
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    return {
      point, vertexBuffer, indexBuffer, count: indices.length,
      dispose() {
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
      }
    };
  }

  function makeRenderer(gl, redraw) {
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, `#version 300 es
      layout(location = 0) in vec4 vertex;
      layout(location = 1) in vec3 normal;
      layout(location = 2) in vec2 uv;
      uniform mat3 camera;
      uniform vec3 view;
      out vec3 surfaceNormal;
      out float elevation;
      out vec2 texCoord;
      void main() {
        vec3 position = camera * vertex.xyz;
        surfaceNormal = camera * normal;
        elevation = vertex.w;
        texCoord = uv;
        float depth = view.x - position.z;
        gl_Position = vec4(position.x * view.y, position.y * view.z, 1.001 * depth - 0.04, depth);
      }`);
    const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float;
      in vec3 surfaceNormal;
      in float elevation;
      in vec2 texCoord;
      uniform sampler2D mosaic;
      uniform bool hasMosaic;
      out vec4 color;
      void main() {
        vec3 normal = normalize(surfaceNormal);
        vec3 light = normalize(vec3(-0.55, 0.72, 0.55));
        float shade = 0.34 + 0.66 * max(dot(normal, light), 0.0);
        float highland = clamp((elevation + 5500.0) / 10000.0, 0.0, 1.0);
        vec3 surface = mix(vec3(0.49, 0.48, 0.46), vec3(0.77, 0.76, 0.72), highland);
        if (hasMosaic) surface = texture(mosaic, texCoord).rgb;
        color = vec4(surface * shade, 1.0);
      }`);
    function link(vertexShader, fragmentShader) {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      return program;
    }

    const program = link(vertex, fragment);
    const camera = gl.getUniformLocation(program, 'camera');
    const view = gl.getUniformLocation(program, 'view');
    const hasMosaic = gl.getUniformLocation(program, 'hasMosaic');
    function loadTexture(id) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      const asset = { texture, ready: false };
      const encoded = document.getElementById(id)?.textContent.trim();
      if (!encoded) return asset;

      const image = new Image();
      image.onload = () => {
        if (gl.isContextLost() || !gl.isTexture(texture)) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        asset.ready = true;
        redraw();
      };
      image.src = 'data:image/jpeg;base64,' + encoded;
      return asset;
    }

    const mosaic = loadTexture('moonwindow-albedo');
    const stars = loadTexture('moonwindow-stars');
    const skyProgram = link(
      compile(gl.VERTEX_SHADER, `#version 300 es
        out vec2 screen;
        void main() {
          screen = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
          gl_Position = vec4(screen, 0.0, 1.0);
        }`),
      compile(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;
        in vec2 screen;
        uniform mat3 axes;
        uniform vec2 projection;
        uniform sampler2D sky;
        out vec4 color;

        vec2 panorama(vec3 ray) {
          return vec2(atan(ray.x, ray.z) / 6.2831853 + 0.5,
            0.5 - asin(clamp(ray.y, -1.0, 1.0)) / 3.14159265);
        }

        void main() {
          // Use direction only: the sky has no distance or zoom parallax.
          vec3 ray = normalize(axes * vec3(screen / projection, -1.0));
          // Frame the Milky Way near the initial orbit as a visual backdrop.
          ray = vec3(ray.y, -ray.x, ray.z);
          vec2 uv = panorama(ray);
          vec2 dx = dFdx(uv);
          vec2 dy = dFdy(uv);
          dx.x -= round(dx.x);
          dy.x -= round(dy.x);
          vec3 rgb = textureGrad(sky, uv, dx, dy).rgb;
          color = vec4(vec3(0.012, 0.017, 0.026) + 0.72 * rgb, 1.0);
        }`)
    );
    const skyAxes = gl.getUniformLocation(skyProgram, 'axes');
    const skyProjection = gl.getUniformLocation(skyProgram, 'projection');
    const skyVao = gl.createVertexArray();

    return (surface, axes, distance, xScale, yScale) => {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (stars.ready) {
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(skyProgram);
        gl.uniformMatrix3fv(skyAxes, false, axes.flat());
        gl.uniform2f(skyProjection, xScale, yScale);
        gl.bindTexture(gl.TEXTURE_2D, stars.texture);
        gl.bindVertexArray(skyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }
      if (!surface) return;
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(program);
      gl.bindTexture(gl.TEXTURE_2D, mosaic.texture);
      gl.uniform1i(hasMosaic, mosaic.ready ? 1 : 0);
      const [right, up, forward] = axes;
      gl.uniformMatrix3fv(camera, false, [
        right[0], up[0], forward[0], right[1], up[1], forward[1], right[2], up[2], forward[2]
      ]);
      gl.uniform3f(view, distance, xScale, yScale);
      gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertexBuffer);
      gl.enableVertexAttribArray(0);
      const stride = floatsPerVertex * Float32Array.BYTES_PER_ELEMENT;
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.indexBuffer);
      gl.drawElements(gl.TRIANGLES, surface.count, gl.UNSIGNED_INT, 0);
    };
  }

  function mount(slot, api) {
    slot.innerHTML = `
      <section class="mw-globe" aria-label="Lunar globe">
        <div class="mw-globe-header">
          <div><h2>Lunar globe</h2><p id="mw-globe-help">Drag to orbit · Scroll or pinch to zoom</p></div>
          <div class="mw-globe-controls">
            <button type="button" data-action="pole">South pole</button>
            <button type="button" data-action="reset">Reset view</button>
            <button type="button" data-action="in" aria-label="Zoom in">+</button>
            <button type="button" data-action="out" aria-label="Zoom out">−</button>
          </div>
        </div>
        <div class="mw-globe-viewport">
          <canvas tabindex="0" aria-label="Moon terrain. Use arrow keys to orbit and plus or minus to zoom."
            aria-describedby="mw-globe-help"></canvas>
          <div class="mw-globe-pins"></div>
        </div>
        <div class="mw-globe-footer">
          <label>Set scenario A site <select aria-label="Set scenario A site"></select></label>
          <span class="mw-globe-credit"><a target="_blank" rel="noopener"></a><span></span> · <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener">NASA SVS / LROC imagery</a> · <a href="https://svs.gsfc.nasa.gov/4851/" target="_blank" rel="noopener">NASA SVS star map</a></span>
        </div>
        <div role="status" class="mw-globe-status"></div>
      </section>`;
    const canvas = slot.querySelector('canvas');
    const viewport = canvas.parentElement;
    const pins = slot.querySelector('.mw-globe-pins');
    const select = slot.querySelector('select');
    const status = slot.querySelector('[role="status"]');
    const credit = slot.querySelector('.mw-globe-credit a');
    const detail = credit.nextElementSibling;
    select.add(new Option('Custom coordinates', ''));
    for (const site of api.SITES) select.add(new Option(site.name, site.id));
    select.addEventListener('change', () => {
      const site = api.SITES.find(item => item.id === select.value);
      if (site) selectSite(site);
    });

    let camera = cameraAt(-62, 20);
    let distance = 3.35;
    let frame = null;
    let surface = null;
    let scenarioPins = [];
    let gl;
    let render;
    let sourceRequest = 0;

    function selectSite(site) {
      api.setSite(0, site.lat, site.lon);
      camera = cameraAt(site.lat, site.lon);
      schedule();
    }

    const sitePins = api.SITES.map(site => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mw-globe-pin';
      button.title = site.name;
      button.setAttribute('aria-label', 'Select ' + site.name + ' for scenario A');
      button.addEventListener('click', () => selectSite(site));
      pins.append(button);
      return { ...site, element: button };
    });
    const markers = ['A', 'B', 'C'].map(letter => {
      const element = document.createElement('span');
      element.textContent = letter;
      element.className = 'mw-globe-scenario';
      pins.append(element);
      return element;
    });

    function draw() {
      frame = null;
      if (!gl || gl.isContextLost()) return;
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      const [right, up, forward] = camera;
      const xScale = focalLength * Math.min(1, height / width);
      const yScale = focalLength * Math.min(1, width / height);
      render(surface, camera, distance, xScale, yScale);

      for (const pin of [...sitePins, ...scenarioPins]) {
        const normal = direction(pin.lat, pin.lon);
        const point = surface ? surface.point(pin.lat, pin.lon) : normal;
        const depth = distance - dot(point, forward);
        const x = dot(point, right) * xScale / depth;
        const y = dot(point, up) * yScale / depth;
        pin.element.hidden = !surface || dot(normal, forward) <= Math.hypot(...point) / distance ||
          Math.abs(x) >= 0.98 || Math.abs(y) >= 0.98;
        if (pin.element.hidden) continue;
        pin.element.style.left = (x + 1) * width / 2 + 'px';
        pin.element.style.top = (1 - y) * height / 2 + 'px';
      }
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(draw);
    }

    function zoom(scale) {
      distance = clamp(1 + (distance - 1) * scale, 1.11, 8);
      schedule();
    }

    function orbit(dx, dy) {
      const shortSide = Math.max(1, Math.min(viewport.clientWidth, viewport.clientHeight));
      const radiansPerPixel = 2 * (distance - 1) / (focalLength * shortSide);
      camera = orbitCamera(camera, -dx * radiansPerPixel, dy * radiansPerPixel);
      schedule();
    }

    const pointers = new Map();
    const separation = () => {
      const [a, b] = pointers.values();
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointers.size === 2) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    canvas.addEventListener('pointermove', event => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = pointers.size === 2 ? separation() : 0;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (before) zoom(before / Math.max(1, separation()));
      else orbit(event.clientX - previous.x, event.clientY - previous.y);
    });
    for (const type of ['lostpointercapture', 'pointerup', 'pointercancel']) {
      canvas.addEventListener(type, event => pointers.delete(event.pointerId));
    }
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const units = [1, 16, viewport.clientHeight][event.deltaMode] || 1;
      zoom(Math.exp(clamp(event.deltaY * units, -250, 250) * 0.002));
    }, { passive: false });
    const controls = {
      pole() { camera = cameraAt(-90, 0); distance = 1.45; schedule(); },
      reset() { camera = cameraAt(-62, 20); distance = 3.35; schedule(); },
      in() { zoom(0.7); },
      out() { zoom(1 / 0.7); }
    };
    slot.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', controls[button.dataset.action]);
    });
    canvas.addEventListener('keydown', event => {
      const actions = {
        ArrowLeft: () => orbit(-40, 0), ArrowRight: () => orbit(40, 0),
        ArrowUp: () => orbit(0, -40), ArrowDown: () => orbit(0, 40),
        '+': controls.in, '=': controls.in, '-': controls.out, Home: controls.reset
      };
      if (!Object.hasOwn(actions, event.key)) return;
      event.preventDefault();
      actions[event.key]();
    });
    new ResizeObserver(schedule).observe(viewport);

    const terrain = window.MoonWindowTerrain;
    async function load(provider) {
      if (!gl || gl.isContextLost()) throw new Error('WebGL 2 is unavailable.');
      const request = ++sourceRequest;
      status.textContent = 'Loading lunar elevation data…';
      try {
        const grid = await provider.load();
        if (request !== sourceRequest) return;
        const replacement = makeSurface(gl, grid);
        surface?.dispose();
        surface = replacement;
        credit.textContent = grid.credit || 'Elevation data';
        credit.removeAttribute('href');
        if (grid.url && /^https?:\/\//i.test(grid.url)) credit.href = grid.url;
        detail.textContent = ' · Relief ×' + reliefScale;
        status.textContent = '';
        schedule();
      } catch (error) {
        if (request !== sourceRequest) return;
        status.textContent = 'Could not load lunar terrain. ' + error.message;
        throw error;
      }
    }

    let provider = terrain.embedded();
    function startRenderer() {
      try {
        gl = canvas.getContext('webgl2', { antialias: true });
        if (!gl) throw new Error('WebGL 2 is unavailable.');
        render = makeRenderer(gl, schedule);
        load(provider).catch(() => {});
      } catch (error) {
        status.textContent = error.message + ' Site selection is available below.';
      }
    }
    terrain.setProvider = async next => {
      if (typeof next?.load !== 'function') throw new TypeError('Terrain provider must implement load().');
      provider = next;
      return load(next);
    };
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      sourceRequest++;
      surface = null;
      status.textContent = 'The globe paused while the graphics context recovers.';
      sitePins.forEach(pin => { pin.element.hidden = true; });
      markers.forEach(marker => { marker.hidden = true; });
    });
    canvas.addEventListener('webglcontextrestored', startRenderer);
    startRenderer();

    return () => {
      const scenarios = api.scenarios();
      select.value = scenarios[0]?.siteId || '';
      scenarioPins = scenarios.map((scenario, index) => ({ ...scenario, element: markers[index] }));
      markers.slice(scenarios.length).forEach(marker => { marker.hidden = true; });
      schedule();
    };
  }

  const views = new WeakMap();
  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'map',
    renderTop(slot, api) {
      if (!views.has(slot)) views.set(slot, mount(slot, api));
      views.get(slot)();
    }
  });
})();
