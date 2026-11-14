# MoonWindow sources and attribution

MoonWindow is an independent entry for the 2026 NASA Space Apps Challenge, [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).

## NASA data

| Source | How MoonWindow uses it |
| --- | --- |
| [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) and [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Reference Sun and Earth positions for the 64 validation comparisons and links for checking individual scenarios. The app calculates positions locally. See [validation results](validation.md). |
| [NASA Goddard PGDA, Barker et al., A New View of the Lunar South Pole from LOLA](https://doi.org/10.60903/gsfcpgda-lola-spole) | The 240 m LRO LOLA product `LDEM_60S_240MPP_ADJ.TIF` supplies local skylines for modeled sites. These skylines affect sunlight and Earth visibility, windows, and solar power estimates. The same product supplies the south-pole shaded relief. |
| [NASA Planetary Data System, LRO LOLA Gridded Data Records](https://doi.org/10.17189/1520642) | The global `LDEM_4` raster supplies the globe's elevation mesh. The renderer smooths polar samples and exaggerates relief 2.5×. [Product files and label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/). |
| [NASA Goddard Scientific Visualization Studio, CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) | The 4096 × 2048 LROC WAC mosaic `lroc_color_poles_4k.tif` was converted to JPEG for the globe. Credit NASA's Scientific Visualization Studio. |
| [NASA Goddard Scientific Visualization Studio, Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/) | The 4096 × 2048 `starmap_2020_4k.exr` was converted to JPEG for the orbiting backdrop. The project selects the backdrop orientation for display. Credit NASA/Goddard Space Flight Center Scientific Visualization Studio and ESA/Gaia/DPAC (Gaia DR2). |
| [NASA LROC](https://lroc.im-ldi.com/) and [NASA NSSDC lunar landing and impact catalog](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) | Reference locations for existing landers. See the [site-by-site source table](sites.md) for individual records and coordinate provenance. |
| [NASA Artemis III candidate region update, October 2024](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/) | Basis for the nine region names. The specific coordinates come from the published preprint listed below. |
| [NASA Goddard solar irradiance science](https://earth.gsfc.nasa.gov/climate/projects/solar-irradiance/science) | Reference for the fixed 1,361 W/m² irradiance used in the rough solar power estimate. |

NASA materials are credited under the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and [NASA science data license guidance](https://science.data.nasa.gov/about/license). MoonWindow uses its own project mark.

## Other data and scientific references

- The [site table](sites.md) gives a source for every built-in coordinate. It includes the USGS Gazetteer for Chandrayaan-3, the Moon Wiki reference point used for the team's LOLA ridge search, and Table 4 of the [Artemis candidate region preprint](https://www.preprints.org/manuscript/202511.1488) for the nine representative points. The preprint is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Direct QuickMap verification is pending. The [USGS release of QuickMap boundaries](https://doi.org/10.5066/P1MEQ6UK) is a reference for that check.
- [IAU Working Group on Cartographic Coordinates and Rotational Elements, 2009 report](https://doi.org/10.1007/s10569-010-9320-4) supplies the lunar orientation model.
- [Mazarico et al. (2011)](https://doi.org/10.1016/j.icarus.2010.10.030) is the reference for the terrain skyline method. [Gläser et al. (2014)](https://doi.org/10.1016/j.icarus.2014.08.013) provides a published ridge illumination comparison.
- Google Earth inspired the globe interaction. The app implements its own WebGL viewer and uses the data and imagery cited above.

## Software and licenses

| Software | Use and license |
| --- | --- |
| [Astronomy Engine 2.1.19 by Don Cross](https://github.com/cosinekitty/astronomy) | Bundled browser runtime, MIT. Its complete copyright and permission notice is retained in the generated HTML. |
| [NumPy](https://numpy.org/doc/stable/license.html), [tifffile](https://github.com/cgohlke/tifffile/blob/master/LICENSE), and [Pillow](https://github.com/python-pillow/Pillow/blob/main/LICENSE) | Used in the offline terrain-generation pipeline. NumPy and tifffile use BSD 3-Clause, and Pillow uses HPND. The browser build contains the generated assets. |
| [FFmpeg](https://ffmpeg.org/legal.html) | Local conversion of the SVS star map from EXR to JPEG. The app distributes the resulting image. |

## Use of AI

The team used Anthropic Claude and OpenAI Codex to assist with implementation and documentation. Claude assisted with the initial app and science pipeline. Codex assisted with the WebGL globe, camera and polar rendering, solar power and Learn plugins, sourcing, and testing. The team provided requirements and directed revisions. The lunar and sky imagery comes from the cited datasets. The browser uses deterministic astronomy, terrain, and rendering code.

## Space Apps submission

Use the references above in the project's **NASA Data** and **Space Agency Partner & Other Data** fields and include the AI disclosure in **Use of AI**. Explain how the LOLA skylines change visibility results and how JPL Horizons was used for validation. Link this document alongside the project materials for the complete source inventory. [2026 Participant Terms](https://www.spaceappschallenge.org/legal/) · [2026 Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)

The official [challenge Resources tab](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources) explicitly lists NASA JPL's Horizons System under **NASA Data & Resources**. Identify it in the submission as the source of the 64 reference comparisons for the Sun and Earth's apparent elevation and azimuth. The challenge also discusses LOLA in its implementation guidance. Cite the exact LOLA products above as additional NASA data. QuickMap and Moon Trek are listed resources. Moon Trek is not a project data source, and the direct Artemis QuickMap checks are pending.

Check the final demo, project links, and event-specific requirements against the submission guide before submitting. The published guidance calls for a demo of at most 30 seconds or seven slides. [Official Space Apps guidance](https://github.com/nasa/spaceapps/discussions/1947)
