# Polar coverage and terrain resolution

We compared MoonWindow against NASA Goddard’s published south-polar solar and Earth visibility maps on 96 locations. The terrain model had RMS errors of **2.79 percentage points for sunlight** and **1.95 for Earth visibility**. The same ephemeris with a flat horizon had errors of **32.86** and **32.27** points. [NASA polar illumination and Earth-visibility data](https://pgda.gsfc.nasa.gov/products/69) · [Mazarico et al. (2011)](https://doi.org/10.1016/j.icarus.2010.10.030)

| Quantity and model | Mean bias | Mean absolute error | RMS error |
| --- | ---: | ---: | ---: |
| Sun, LOLA terrain | +0.78 pp | 0.86 pp | 2.79 pp |
| Sun, flat horizon | +29.17 pp | 29.18 pp | 32.86 pp |
| Earth, LOLA terrain | +0.63 pp | 0.65 pp | 1.95 pp |
| Earth, flat horizon | +24.54 pp | 25.42 pp | 32.27 pp |

The sample uses eight equal-area rings over a 150 km polar disk with twelve staggered azimuths per ring. Each point is snapped to a pixel centre of the original 120 m NASA raster. All MoonWindow profiles use its bundled 240 m / 960 m custom-site grids, a 2 m observer, and 163,048 hourly samples starting January 1, 2024 UTC. The comparison counts either body as visible when any part of its disk clears the horizon to match the reference’s definition. Mission normally uses the Earth’s centre for geometric line of sight. The products are long-term model averages. This comparison measures agreement with NASA’s modeled coverage. The [LRO camera study](lroc-transition-validation.md) tests observed sunlight timing.

Individual locations can differ substantially. At 85.21294°S, 142.51944°E, MoonWindow estimates 25.05% sunlight and the reference pixel gives 0.26%. At 87.85801°S, 322.50562°E, MoonWindow estimates 13.57% Earth visibility and the reference gives 0.31%. Both are included in the table.

## Two ridge pins, two choices

At MoonWindow’s two Shackleton connecting-ridge bookmarks, we held the coordinates, date range, 2 m observer and Sun-centre rule fixed. We changed the skyline data from the precomputed 80 m profile to the browser’s 240 m grid. The period is calendar year 2027 UTC, sampled hourly.

| Bookmark | 80 m sunlight | 240 m sunlight | Longest darkness, 80 m | Longest darkness, 240 m |
| --- | ---: | ---: | ---: | ---: |
| 89.4393°S, 222.733°E | 88.33% | 77.51% | 10 d 16 h | 18 d 14 h |
| 89.4458°S, 222.706°E | 77.51% | 87.77% | 10 d 11 h | 7 d 17 h |

At the first pin, modeled longest darkness increases by **7 days 22 hours**. The rankings by total sunlight also reverse. This is a sensitivity check on two existing app locations. For a power-limited mission on a narrow ridge, coarse coverage figures can change the recommendation.

## Reproduce

```sh
npm ci
node tools/check_pgda_coverage.js > pgda-coverage-results.csv
```

The tool reads the cached [NASA pixel values](../tools/pgda-coverage-sample.csv) and prints aggregate coverage errors and ridge results to stderr. The [recorded output](pgda-coverage-results.csv) includes both NASA and MoonWindow values at each location. To extract the reference values from the original data again, download the 120 m south-polar solar and Earth IMG products from NASA’s product page and run `python3 tools/sample_pgda_coverage.py /path/to/rasters > tools/pgda-coverage-sample.csv`.
