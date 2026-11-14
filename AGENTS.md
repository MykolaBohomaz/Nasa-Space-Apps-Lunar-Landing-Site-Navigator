# Workspace instructions

- Never use Unity batchmode to verify whether a Unity project compiles.
- Never stage, push, pull, or stash in Git without explicit permission.

## Lunar globe data

- The elevation source is NASA LRO LOLA's [LDEM_4 IMG and PDS label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/), cached as `src/terrain/ldem_4.img` and `src/terrain/ldem_4.lbl`. The global grid is 1440 × 720, with pixel centers ordered north to south and 0–360° east. Each signed little-endian 16-bit sample represents 0.5 m of elevation relative to a 1,737,400 m sphere.
- The surface image is the 4096 × 2048 pole-filled LROC WAC mosaic from [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), converted from `lroc_color_poles_4k.tif` to `src/terrain/lroc-4k.jpg`. Its midpoint is 0° longitude.
- Run `python3 build.py` to embed both assets in the offline `index.html`. The terrain adapter in `src/plugins/terrain-source.js` supports embedded data, a local file, or a fetchable URL. The globe's mesh and imagery are for display. Sun and Earth visibility use the science engine's horizon data.
