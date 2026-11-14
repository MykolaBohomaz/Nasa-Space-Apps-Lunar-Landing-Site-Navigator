# MoonWindow

**Pick a landing site on the Moon and a date. See where the Sun and Earth are in its sky, whether a lander there gets solar power and direct radio contact with Earth, and for how long.**

NASA Space Apps Challenge 2026 project for the lunar landing site challenge (Sun and Earth visibility at the Moon's south pole).

## What it does

- **Landing sites:** 8 real landing sites (IM-2 Athena, IM-1 Odysseus, the Shackleton connecting ridge, Chandrayaan-3, Chang'e 6, SLIM, Blue Ghost 1, Apollo 11) or any custom latitude/longitude.
- **Real terrain from NASA LOLA:** at south polar sites, the skyline (mountains and crater rims) decides when the Sun and Earth are visible. A button compares with flat ground.
- **Any date and time (UTC):** buttons for ±1 hour, ±1 day, "Now" and "Slip 1 week".
- **Sky view:** a 360° picture of the sky from the site with the horizon, the Sun and Earth, and their tracks over the next 30 days.
- **Sunlight and Earth cards:** elevation and direction, and a countdown to sunset/sunrise and Earthset/Earthrise (to the minute).
- **30-day timeline:** sunlight, Earth in view, and both together. Click to jump to a time.
- **Next-30-days numbers:** % sunlight, % Earth in view, % both, longest night, longest time without Earth, and how long Sun and Earth stay up together from the chosen moment.
- **Compare up to 3 scenarios** side by side, for example the same site after a one-week launch slip.
- **Play time** animation, **shareable links** (the URL stores the scenarios), and an **About** panel with explanations for non-experts.
- **Check in NASA JPL Horizons:** every scenario links to the same query in JPL Horizons so anyone can verify the numbers.

## How to run it

Open `index.html` in any modern browser. That's it: there's no server, nothing to install, and it works offline.

To publish it on GitHub Pages: repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. After a minute the site is live at `https://<user>.github.io/<repo>/`.

## How it works

For each moment, the app:

1. Gets the positions of the Sun, Earth and Moon from [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT License).
2. Turns the Moon to its orientation from the IAU/WGCCRE 2009 rotation model. That's the mean Earth/polar axis frame used by LRO, LOLA and LROC coordinates.
3. Works out the direction from the landing site to the Sun and to Earth as **elevation** (degrees above the ideal flat horizon) and **azimuth** (degrees from north toward east).
4. Compares the elevation with the skyline in that direction: real LOLA terrain at the south polar sites, flat ground elsewhere.

Timelines use one-hour steps, and countdowns are refined to one minute by bisection.

Sanity checks we ran:

| Case | Expected | MoonWindow |
| --- | --- | --- |
| Apollo 11 landing, 1969-07-20 20:17 UTC | Sun low in the east (~11°) | Sun 10.7° at az 89° |
| Chandrayaan-3 landing, 2023-08-23 12:33 UTC | Sun low after sunrise | Sun 8.6° |
| Chang'e 6 (far side) | Earth never visible | Earth −42.7° |
| Apollo 11, 2020–2039 | Earth always high, swinging with libration | Earth 57.7° to 74.5° |

### Validation against NASA JPL Horizons

Across 72 comparisons (9 sites × 4 dates × Sun and Earth), the app matches NASA JPL Horizons within **0.003° in elevation** and 0.005° in azimuth, with identical up/down status in all 72 cases. Full table: [docs/validation.md](docs/validation.md). Re-run with `python3 tools/fetch_horizons.py` (needs internet) and then `node tools/compare_horizons.js`.

## Real terrain from NASA LOLA

`tools/make_horizons.py` reads two LOLA south polar elevation models from the NASA GSFC Planetary Geodesy Data Archive (Barker et al. 2023, *Planetary Science Journal* 4:183, doi:10.60903/gsfcpgda-lola-spole):
- **LDEM_80S_80MPP_ADJ**: 80 m grid, 80°S to the pole, used wherever it covers the ground.
- **LDEM_60S_240MPP_ADJ**: 240 m grid, 60°S to the pole, used beyond that.

For each south polar site and every 0.5° of azimuth, the tool traces 400 km outward over the curved Moon (radius 1737.4 km). It records the highest terrain angle seen from 2 m above the ground, the approach of NASA's LOLA polar illumination maps (Mazarico et al. 2011, *Icarus* 211). The result is `src/horizon-data.js`. The same run makes `src/map-data.js`, a shaded-relief map of 75°S to the pole.

Checks:
- **Map reading:** both maps give 2,592 m at IM-1 Odysseus's landing point; LROC reports 2,579 m.
- **Published research:** the best-lit point on the Shackleton–de Gerlache connecting ridge gets **88.3%** sunlight over one year in our model, against 52% on flat ground. Gläser et al. (2014, *Icarus* 243) found up to 92.3% on this ridge with a finer 20 m LOLA model.

**Why location matters:** we found the ridge's best-lit point by testing the 40 highest 80 m pixels within 1.5 km. Their yearly sunlight ranges from **57.5% to 88.3%**. The app includes a second ridge site only 200 m from the best one, which gets 77.5%.

Yearly results (`node tools/terrain_report.js`, also in [docs/terrain-report.md](docs/terrain-report.md)):

| Site (1 year from Nov 2026) | Map at site | Sunlight, real terrain | Sunlight, flat ground | Earth in view | Both | Longest night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Connecting ridge, best-lit point | 80 m | 88.3% | 52.0% | 52.6% | 49.7% | 10.7 d |
| Connecting ridge, 200 m away | 80 m | 77.5% | 52.0% | 52.4% | 40.4% | 10.5 d |
| IM-2 Athena, Mons Mouton | 80 m | 46.3% | 51.6% | 81.3% | 38.4% | 19.1 d |
| IM-1 Odysseus | 80 m | 39.7% | 51.0% | 100% | 39.7% | 19.0 d |
| Chandrayaan-3 | 240 m | 49.4% | 51.5% | 100% | 49.4% | 16.0 d |

Our longest ridge night (10.7 days, in the southern winter) is longer than the 3–5 days Gläser et al. report at their best points. The likely reasons are their finer 20 m grid and exact point choice; we note it rather than tune it away.

To regenerate, download the maps (not stored in git) and run the tools:

```
mkdir -p data
curl -L -o data/LDEM_60S_240MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF
curl -L -o data/LDEM_80S_80MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
pip install numpy tifffile imagecodecs pillow
python3 tools/make_horizons.py && node tools/terrain_report.js && python3 build.py
```

## Limitations

- **Terrain detail.** The 80 m and 240 m grids capture mountains, ridges and crater rims, not boulders or small craters next to the lander. Sites north of 60°S, and custom coordinates, use flat ground.
- **Centre of the disk.** "Up" means the centre of the Sun or Earth is above the horizon.
- **Hourly sampling** for the 30-day statistics.

## Landing site sources

| Site | Lat | E-lon | Source |
| --- | --- | --- | --- |
| IM-2 Athena, Mons Mouton | −84.79 | 29.20 | IM-2 records based on LROC ([LROC landing region](https://www.lroc.asu.edu/images/1401)) |
| IM-1 Odysseus | −80.13 | 1.44 | [LROC](https://www.lroc.asu.edu/images/1360) |
| Connecting ridge near Shackleton, best-lit point | −89.4393 | 222.733 | Best-lit of the 40 highest LOLA 80 m points within 1.5 km of the ridge crest. The crest was first located from the high-illumination point at 89.45°S 229.69°E given by [the-moon.us](https://the-moon.us/wiki/South_Pole), which sat about 500 m below it. |
| Connecting ridge, 200 m from the best-lit point | −89.4458 | 222.706 | Highest point on the 240 m map, kept to show how much 200 m matters. |
| Chandrayaan-3, Statio Shiv Shakti | −69.373 | 32.319 | [USGS Gazetteer](https://planetarynames.wr.usgs.gov/Feature/16272) |
| Chang'e 6 | −41.6385 | 206.0148 | [LROC](https://lroc.im-ldi.com/images/1374) |
| SLIM | −13.316 | 25.251 | [NASA NSSDC](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) |
| Blue Ghost 1 | 18.56 | 61.81 | [LROC](https://www.lroc.im-ldi.com/images/1400) |
| Apollo 11 | 0.674 | 23.473 | NASA NSSDC |

## NASA data and resources

- **LRO LOLA topography** (NASA GSFC PGDA): real skylines for the south polar sites, which change sunrise, sunset, Earthrise, Earthset and all statistics, plus the polar map.
- **JPL Horizons:** reference positions; the app matches them within 0.003°. Each scenario also links to the same Horizons query.
- **LROC (Lunar Reconnaissance Orbiter Camera) and QuickMap:** landing site coordinates.
- **NASA NSSDC:** Apollo 11 and SLIM coordinates.

## Files

- `index.html` is the complete app in one file, generated by `build.py`. Don't edit it by hand. GitHub Pages serves this file.
- `src/index.html` holds the layout and CSS, plus one `<script src>` line per file.
- `src/app.js` is the core UI. `src/engine.js` computes Sun and Earth positions. `src/sites.js` is the landing site list.
- `src/plugins/` holds the extra features, one file each; `_template.js` shows the plugin API.
- `src/horizon-data.js`, `src/map-data.js` and `src/validation-data.js` are generated NASA data. Don't edit them by hand; see the `tools/` scripts.
- `tools/` holds `fetch_horizons.py` and `compare_horizons.js` (JPL Horizons validation) and `make_horizons.py` (LOLA terrain). `docs/validation.md` is the validation table.
- `data/` is the local LOLA elevation model download; it's not in git.
- `build.py` inlines every `<script src>` into `index.html`. Run `npm install` once, then `python3 build.py`.

## AI use

The code in this repository (HTML, CSS, JavaScript and the build script) was generated with an AI assistant (Claude, by Anthropic) from requirements written by our team. The team chose the problem framing, landing sites and features, reviewed and tested the results, and validated them against NASA JPL Horizons. No AI-generated images, video or audio are used.

## Credits and licenses

- Astronomy Engine © 2019–2023 Don Cross, MIT License (notice kept inside `index.html`).
- Not an official NASA product. No NASA logos or insignia are used.
