// Landing sites shown in the site picker. Latitude in degrees (south negative), longitude in degrees EAST.
// Add a site: copy a line, give it a unique id, fill in name/lat/lon, and add the source in docs/sites.md.
// Code generated with an AI assistant (Claude) from our team's requirements.
const ARTEMIS_GROUP = 'Artemis III candidate regions';
const ARTEMIS_SOURCE = 'https://www.preprints.org/manuscript/202511.1488';
// Artemis III entries: inside each NASA candidate region (15 x 15 km), the spot within 5 km of the published
// region coordinate that best meets NASA's landing rules on LOLA terrain (slope under 10 deg, Earth in view
// at least 25% of the time, most sunlight). Found by tools/find_artemis_spots.py; region coordinates in docs/sites.md.
window.MW_SITES = [
  { id: 'im2', group: 'South pole region', name: 'IM-2 Athena, Mons Mouton (NASA CLPS, 2025)', lat: -84.79, lon: 29.20, sourceUrl: 'https://www.lroc.asu.edu/images/1401' },
  { id: 'im1', group: 'South pole region', name: 'IM-1 Odysseus, near Malapert A (NASA CLPS, 2024)', lat: -80.13, lon: 1.44, sourceUrl: 'https://www.lroc.asu.edu/images/1360' },
  { id: 'shk', group: 'South pole region', name: 'Connecting ridge near Shackleton, best-lit point (LOLA)', lat: -89.4393, lon: 222.733, sourceUrl: 'https://doi.org/10.60903/gsfcpgda-lola-spole' },
  { id: 'shk2', group: 'South pole region', name: 'Connecting ridge, 200 m from the best-lit point', lat: -89.4458, lon: 222.706, sourceUrl: 'https://doi.org/10.60903/gsfcpgda-lola-spole' },
  { id: 'ch3', group: 'South pole region', name: 'Chandrayaan-3, Statio Shiv Shakti (ISRO, 2023)', lat: -69.373, lon: 32.319, sourceUrl: 'https://planetarynames.wr.usgs.gov/Feature/16272' },
  { id: 'ce6', group: 'Other landings', name: "Chang'e 6, Apollo basin, far side (CNSA, 2024)", lat: -41.6385, lon: 206.0148, sourceUrl: 'https://lroc.im-ldi.com/images/1374' },
  { id: 'slim', group: 'Other landings', name: 'SLIM (JAXA, 2024)', lat: -13.316, lon: 25.251, sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html' },
  { id: 'bg1', group: 'Other landings', name: 'Blue Ghost 1, Mare Crisium (NASA CLPS, 2025)', lat: 18.56, lon: 61.81, sourceUrl: 'https://www.lroc.im-ldi.com/images/1400' },
  { id: 'a11', group: 'Other landings', name: 'Apollo 11, Tranquility Base (NASA, 1969)', lat: 0.674, lon: 23.473, sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html' },
  { id: 'artemis-peak-cabeus-b', group: ARTEMIS_GROUP, name: 'Peak near Cabeus B (best landing spot)', lat: -83.6181, lon: 291.4089, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-haworth', group: ARTEMIS_GROUP, name: 'Haworth (best landing spot)', lat: -86.9157, lon: 337.0866, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-malapert-massif', group: ARTEMIS_GROUP, name: 'Malapert Massif (best landing spot)', lat: -86.0006, lon: 2.0475, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-mons-mouton-plateau', group: ARTEMIS_GROUP, name: 'Mons Mouton Plateau (best landing spot)', lat: -84.2419, lon: 29.1536, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-mons-mouton', group: ARTEMIS_GROUP, name: 'Mons Mouton (best landing spot)', lat: -85.4116, lon: 31.7397, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-nobile-rim-1', group: ARTEMIS_GROUP, name: 'Nobile Rim 1 (best landing spot)', lat: -85.3066, lon: 37.0461, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-nobile-rim-2', group: ARTEMIS_GROUP, name: 'Nobile Rim 2 (best landing spot)', lat: -84.0652, lon: 59.2420, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-de-gerlache-rim-2', group: ARTEMIS_GROUP, name: 'de Gerlache Rim 2 (best landing spot)', lat: -88.2870, lon: 289.5575, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-slater-plain', group: ARTEMIS_GROUP, name: 'Slater Plain (best landing spot)', lat: -87.2813, lon: 127.9327, sourceUrl: ARTEMIS_SOURCE },
];
