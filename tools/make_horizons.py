#!/usr/bin/env python3
"""Real terrain horizons for MoonWindow from NASA LOLA topography.

Input : data/LDEM_60S_240MPP_ADJ.TIF  (LOLA south polar DEM, 60°S to the pole, 240 m/pixel,
        Barker et al. 2023, NASA GSFC Planetary Geodesy Data Archive, doi:10.60903/gsfcpgda-lola-spole)
Output: src/horizon-data.js  window.MW_HORIZONS  - skyline elevation (deg) every 0.5° of azimuth per site
        src/map-data.js      window.MW_POLAR_MAP - shaded-relief image of 75°S-90°S + projection helper

Method (same idea as Mazarico et al. 2011, Icarus 211, which used 240 m/px LOLA maps for polar illumination):
for each site and each azimuth, march outward over the curved Moon (sphere R = 1737.4 km) up to 400 km,
read terrain height from the DEM (bilinear), and keep the highest elevation angle seen from an observer
standing MAST_M metres above the ground at the site.

Usage:  pip install numpy tifffile imagecodecs pillow
        python3 tools/make_horizons.py
Code generated with an AI assistant (Claude) from our team's requirements.
"""
import base64, io, json, math, pathlib, re, sys, time
import numpy as np
import tifffile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEM_PATH = ROOT / "data" / "LDEM_60S_240MPP_ADJ.TIF"
R = 1737400.0          # LOLA reference sphere radius, m
MAST_M = 2.0           # observer height above ground (lander deck / antenna), m
AZ_STEP = 0.5          # degrees
MAP_LAT = -75.0        # map image covers this latitude to the pole
MAP_PX = 900
# Known check point: IM-1 Odysseus landed at 80.13°S 1.44°E, 2579 m elevation (LROC).
CHECK = (-80.13, 1.44, 2579.0)


def load_sites():
    text = (ROOT / "src" / "sites.js").read_text()
    out = []
    for m in re.finditer(r"\{\s*id:\s*'([^']+)'.*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)", text):
        out.append({"id": m.group(1), "lat": float(m.group(2)), "lon": float(m.group(3))})
    return out


class Dem:
    def __init__(self, path):
        t0 = time.time()
        with tifffile.TiffFile(path) as tif:
            page = tif.pages[0]
            tags = page.tags
            self.z = page.asarray().astype(np.float32)
            sx, sy, _ = tags["ModelPixelScaleTag"].value
            tp = tags["ModelTiepointTag"].value
            geokeys = tags["GeoKeyDirectoryTag"].value if "GeoKeyDirectoryTag" in tags else ()
            nodata = tags[42113].value if 42113 in tags else None
        # GTRasterTypeGeoKey (1025): 1 = PixelIsArea (tiepoint at pixel corner), 2 = PixelIsPoint
        raster_type = 1
        for k in range(4, len(geokeys), 4):
            if geokeys[k] == 1025:
                raster_type = geokeys[k + 3]
        self.sx, self.sy = float(sx), float(sy)
        self.i0, self.j0, self.x0, self.y0 = tp[0], tp[1], tp[3], tp[4]
        self.half = 0.5 if raster_type == 1 else 0.0
        if nodata not in (None, ""):
            self.z[self.z == float(str(nodata).strip("\x00"))] = np.nan
        self.z[~np.isfinite(self.z)] = np.nan
        self.z[np.abs(self.z) > 20000] = np.nan
        self.convention = (1, 1)  # (sign of x, sign of y) applied to rho*sin(lon), rho*cos(lon)
        h, w = self.z.shape
        print(f"DEM {path.name}: {w} x {h} px, {self.sx:.1f} m/px, "
              f"heights {np.nanmin(self.z):.0f} to {np.nanmax(self.z):.0f} m, loaded in {time.time() - t0:.1f} s")

    def xy(self, lat, lon, conv=None):
        sxs, sys_ = conv or self.convention
        lat_r, lon_r = np.radians(lat), np.radians(lon)
        rho = 2 * R * np.tan(np.pi / 4 + lat_r / 2)    # south polar stereographic, true scale at the pole
        return sxs * rho * np.sin(lon_r), sys_ * rho * np.cos(lon_r)

    def sample(self, x, y):
        col = self.i0 + (x - self.x0) / self.sx - self.half
        row = self.j0 + (self.y0 - y) / self.sy - self.half
        h, w = self.z.shape
        c0 = np.floor(col).astype(np.int64); r0 = np.floor(row).astype(np.int64)
        ok = (c0 >= 0) & (r0 >= 0) & (c0 < w - 1) & (r0 < h - 1)
        out = np.full(np.shape(x), np.nan, dtype=np.float64)
        c0o, r0o = c0[ok], r0[ok]
        fc, fr = col[ok] - c0o, row[ok] - r0o
        z = self.z
        out[ok] = (z[r0o, c0o] * (1 - fc) * (1 - fr) + z[r0o, c0o + 1] * fc * (1 - fr)
                   + z[r0o + 1, c0o] * (1 - fc) * fr + z[r0o + 1, c0o + 1] * fc * fr)
        return out

    def height(self, lat, lon, conv=None):
        x, y = self.xy(np.array([lat]), np.array([lon]), conv)
        return float(self.sample(x, y)[0])

    def check_projection(self):
        lat, lon, expected = CHECK
        best = None
        for conv in [(1, 1), (1, -1), (-1, 1), (-1, -1)]:
            h = self.height(lat, lon, conv)
            print(f"  projection check, convention {conv}: IM-1 height {h:.0f} m (LROC: {expected:.0f} m)")
            if np.isfinite(h) and (best is None or abs(h - expected) < abs(best[1] - expected)):
                best = (conv, h)
        if best is None or abs(best[1] - expected) > 250:
            sys.exit("Projection check failed: no convention gives IM-1's known height. Stop and investigate.")
        self.convention = best[0]
        print(f"  using convention {best[0]} (IM-1 within {abs(best[1] - expected):.0f} m of LROC's value)")


def site_frame(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    up = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
    east = np.array([-math.sin(lo), math.cos(lo), 0.0])
    north = np.array([-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la)])
    return up, east, north


def horizon_profile(dem, lat, lon):
    up, east, north = site_frame(lat, lon)
    az = np.radians(np.arange(0, 360, AZ_STEP))
    d = np.concatenate([np.arange(120.0, 20000.0, 120.0), np.geomspace(20000.0, 400000.0, 500)])
    theta = d / R
    dirs = np.cos(az)[:, None] * north + np.sin(az)[:, None] * east               # (A, 3)
    P = (np.cos(theta)[None, :, None] * up[None, None, :]
         + np.sin(theta)[None, :, None] * dirs[:, None, :])                         # (A, D, 3)
    plat = np.degrees(np.arcsin(np.clip(P[..., 2], -1, 1)))
    plon = np.degrees(np.arctan2(P[..., 1], P[..., 0]))
    x, y = dem.xy(plat, plon)
    h = dem.sample(x, y)
    h0 = dem.height(lat, lon)
    r0 = R + h0 + MAST_M
    r = R + h
    elev = np.degrees(np.arctan2(r * np.cos(theta)[None, :] - r0, r * np.sin(theta)[None, :]))
    covered = np.isfinite(elev).mean()
    prof = np.nanmax(np.where(np.isfinite(elev), elev, -90.0), axis=1)
    far_idx = np.nanargmax(np.where(np.isfinite(elev), elev, -90.0), axis=1)
    return prof, h0, covered, d[far_idx]


def hillshade_map(dem):
    rho_max = 2 * R * math.tan(math.pi / 4 + math.radians(MAP_LAT) / 2)
    xs = np.linspace(-rho_max, rho_max, MAP_PX)
    X, Y = np.meshgrid(xs, -xs)                       # image row 0 = top = +y
    Z = dem.sample(X.ravel(), Y.ravel()).reshape(X.shape)
    px = (2 * rho_max) / (MAP_PX - 1)
    gy, gx = np.gradient(np.nan_to_num(Z, nan=np.nanmean(Z)), px)
    gy = -gy                                          # rows go down, y goes up
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    sun_az, sun_alt = np.radians(315), np.radians(35)
    shade = np.sin(sun_alt) * np.cos(slope) + np.cos(sun_alt) * np.sin(slope) * np.cos(sun_az - aspect)
    shade = np.clip(shade, 0, 1)
    img = (40 + 190 * shade).astype(np.uint8)
    img[~np.isfinite(Z)] = 0
    from PIL import Image
    buf = io.BytesIO()
    Image.fromarray(img, "L").save(buf, "PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode(), rho_max


def main():
    if not DEM_PATH.exists():
        sys.exit(f"Missing {DEM_PATH}. Download it first (see README).")
    dem = Dem(DEM_PATH)
    dem.check_projection()
    out = {"meta": {
        "source": "NASA LRO LOLA south polar DEM LDEM_60S_240MPP_ADJ (Barker et al. 2023, PSJ 4:183; NASA GSFC PGDA, doi:10.60903/gsfcpgda-lola-spole)",
        "resolutionM": round(dem.sx), "azStepDeg": AZ_STEP, "mastM": MAST_M, "maxDistanceKm": 400,
        "method": "Highest terrain elevation angle along each azimuth over a 1737.4 km sphere, observer 2 m above ground."},
        "sites": {}}
    for s in load_sites():
        if s["lat"] > -60.5:
            continue
        t0 = time.time()
        prof, h0, covered, far = horizon_profile(dem, s["lat"], s["lon"])
        if not np.isfinite(h0):
            print(f"  {s['id']}: no DEM height at site, skipped"); continue
        out["sites"][s["id"]] = {"lat": s["lat"], "lon": s["lon"], "groundM": round(h0, 1),
                                 "values": [round(float(v), 2) for v in prof]}
        i = int(np.argmax(prof))
        print(f"  {s['id']:>6}: ground {h0:7.0f} m | skyline {prof.min():6.2f}° to {prof.max():5.2f}° "
              f"(highest at az {i * AZ_STEP:5.1f}°, {far[i] / 1000:5.1f} km away) | coverage {covered:.0%} | {time.time() - t0:.1f} s")
    (ROOT / "src" / "horizon-data.js").write_text(
        "// Generated by tools/make_horizons.py from NASA LOLA topography. Do not edit by hand.\n"
        "window.MW_HORIZONS = " + json.dumps(out, separators=(",", ":")) + ";\n")
    b64, rho_max = hillshade_map(dem)
    sxs, sys_ = dem.convention
    (ROOT / "src" / "map-data.js").write_text(
        "// Generated by tools/make_horizons.py: shaded relief of the lunar south pole (75°S to the pole)\n"
        "// from NASA LOLA LDEM_60S_240MPP_ADJ. Do not edit by hand.\n"
        "window.MW_POLAR_MAP = {\n"
        f"  latLimit: {MAP_LAT}, sizePx: {MAP_PX}, radiusKm: {rho_max / 1000:.3f},\n"
        "  credit: 'Shaded relief from NASA LRO LOLA topography (Barker et al. 2023, NASA GSFC PGDA)',\n"
        "  // Image pixel (x, y) of a point, 0..sizePx, origin top-left. Same projection as the DEM.\n"
        "  project(lat, lon) {\n"
        "    const R = 1737400, r = Math.PI / 180, rho = 2 * R * Math.tan(Math.PI / 4 + lat * r / 2);\n"
        f"    const X = {sxs} * rho * Math.sin(lon * r), Y = {sys_} * rho * Math.cos(lon * r), half = this.radiusKm * 1000;\n"
        "    return { x: (X + half) / (2 * half) * this.sizePx, y: (half - Y) / (2 * half) * this.sizePx };\n"
        "  },\n"
        f"  image: 'data:image/png;base64,{b64}'\n"
        "};\n")
    print(f"Wrote src/horizon-data.js ({len(out['sites'])} sites) and src/map-data.js ({len(b64) // 1024} KB image)")


if __name__ == "__main__":
    main()
