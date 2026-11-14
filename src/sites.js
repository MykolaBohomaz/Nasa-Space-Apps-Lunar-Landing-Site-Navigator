// Landing sites shown in the site picker. Latitude in degrees (south negative), longitude in degrees EAST.
// Add a site: copy a line, give it a unique id, fill in name/lat/lon, and add the source in docs/sites.md.
// Code generated with an AI assistant (Claude) from our team's requirements.
const ARTEMIS_GROUP = 'Artemis III candidate regions';
const ARTEMIS_SOURCE = 'https://www.preprints.org/manuscript/202511.1488';
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
  { id: 'artemis-peak-cabeus-b', group: ARTEMIS_GROUP, name: 'Peak near Cabeus B', lat: -83.661, lon: 290.986, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-haworth', group: ARTEMIS_GROUP, name: 'Haworth', lat: -86.753, lon: 337.164, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-malapert-massif', group: ARTEMIS_GROUP, name: 'Malapert Massif', lat: -85.990, lon: 359.875, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-mons-mouton-plateau', group: ARTEMIS_GROUP, name: 'Mons Mouton Plateau', lat: -84.232, lon: 29.926, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-mons-mouton', group: ARTEMIS_GROUP, name: 'Mons Mouton', lat: -85.423, lon: 31.586, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-nobile-rim-1', group: ARTEMIS_GROUP, name: 'Nobile Rim 1', lat: -85.431, lon: 37.241, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-nobile-rim-2', group: ARTEMIS_GROUP, name: 'Nobile Rim 2', lat: -83.963, lon: 58.654, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-de-gerlache-rim-2', group: ARTEMIS_GROUP, name: 'de Gerlache Rim 2', lat: -88.225, lon: 294.579, sourceUrl: ARTEMIS_SOURCE },
  { id: 'artemis-slater-plain', group: ARTEMIS_GROUP, name: 'Slater Plain', lat: -87.149, lon: 126.134, sourceUrl: ARTEMIS_SOURCE },
];
