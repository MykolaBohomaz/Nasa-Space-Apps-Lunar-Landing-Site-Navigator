# Code generated with an AI assistant (Claude) from our team's requirements.
# Finds, inside each NASA Artemis III candidate region, the landing spot that best meets
# NASA's published landing rules, using NASA LOLA terrain:
#   - slope under 10 deg across the 100 m-radius landing site (Artemis HLS requirement; we search under 9 deg)
#   - Earth above the local skyline at least 25% of the time (direct-to-Earth radio)
#   - then: the most sunlight over a year (2027), ties broken by Sun and Earth together
# Source of the rules: NASA, "Artemis Human Landing System Overview", Space Apps Challenge 2025
# (ntrs.nasa.gov/citations/20250009323) and Artemis HLS Update 2024 (ntrs.nasa.gov/citations/20240009596).
#
# Stage 1 screens every point on a 100 m grid within SEARCH_KM of the published region center with a
# fast, coarse skyline. Stage 2 recomputes the best TOP_N with the full skyline used by the app.
# Run after `node tools/artemis_series.js` (Sun/Earth positions), from the repo root:
#   node tools/artemis_series.js && python3 tools/find_artemis_spots.py
import json, math, sys, time, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import make_horizons as M

ROOT = M.ROOT
SEARCH_KM, GRID_M = 5.0, 100.0
MAX_SLOPE, MIN_EARTH, TOP_N, MIN_SEP_M = 9.0, 0.25, 25, 300.0  # 9 deg: margin under NASA's 10 deg, as an 80 m map smooths small bumps

slope_deg = M.slope_deg

def coarse_profiles(dem, fine, lats, lons):
    """Skyline every 5 deg from 80 m steps to 6 km, then geometric steps to 150 km."""
    az = np.radians(np.arange(0, 360, 5.0))
    d = np.concatenate([np.arange(80.0, 6000.0, 80.0), np.geomspace(6000.0, 150000.0, 40)])
    th = d / M.R
    out = np.empty((len(lats), len(az)))
    for i, (la, lo) in enumerate(zip(lats, lons)):
        up, east, north = M.site_frame(la, lo)
        dirs = np.cos(az)[:, None] * north + np.sin(az)[:, None] * east
        P = np.cos(th)[None, :, None] * up + np.sin(th)[None, :, None] * dirs[:, None, :]
        plat = np.degrees(np.arcsin(np.clip(P[..., 2], -1, 1))); plon = np.degrees(np.arctan2(P[..., 1], P[..., 0]))
        h = fine.sample(*fine.xy(plat, plon)); hc = dem.sample(*dem.xy(plat, plon)); h = np.where(np.isfinite(h), h, hc)
        r0 = M.R + fine.height(la, lo) + M.MAST_M
        el = np.degrees(np.arctan2((M.R + h) * np.cos(th) - r0, (M.R + h) * np.sin(th)))
        out[i] = np.nanmax(np.where(np.isfinite(el), el, -90), 1)
    return out

def fractions(prof, step, series):
    """Share of samples with Sun up, Earth up, both, for skylines prof (N, n_az) and series (T, 4)."""
    n = prof.shape[1]
    def above(az, el):
        f = (az % 360) / step; i = np.floor(f).astype(int) % n; j = (i + 1) % n; t = f - np.floor(f)
        sky = prof[:, i] * (1 - t) + prof[:, j] * t
        return el[None, :] > sky
    su, ea = above(series[:, 0], series[:, 1]), above(series[:, 2], series[:, 3])
    return su.mean(1), ea.mean(1), (su & ea).mean(1)

def latlon(dem, x, y):
    sxs, sys_ = dem.convention
    X, Y = x * sxs, y * sys_
    rho = np.hypot(X, Y)
    lat = np.degrees(2 * np.arctan(rho / (2 * M.R)) - np.pi / 2)
    lon = np.degrees(np.arctan2(X, Y)) % 360
    return lat, lon

def main():
    dem = M.Dem(M.DEM_PATH); dem.check_projection()
    fine = M.Dem(M.FINE_PATH); fine.check_projection()
    regions = json.loads((ROOT / "tools" / "artemis_series.json").read_text())
    results = {}
    for rid, reg in regions.items():
        t0 = time.time()
        series = np.array(reg["series"])
        cx, cy = fine.xy(np.array([reg["lat"]]), np.array([reg["lon"]]))
        g = np.arange(-SEARCH_KM * 1000, SEARCH_KM * 1000 + 1, GRID_M)
        gx, gy = np.meshgrid(g, g); m = gx ** 2 + gy ** 2 <= (SEARCH_KM * 1000) ** 2
        x, y = cx[0] + gx[m], cy[0] + gy[m]
        sl = slope_deg(fine, x, y)
        ok = sl < MAX_SLOPE
        x, y, sl = x[ok], y[ok], sl[ok]
        lat, lon = latlon(fine, x, y)
        cp = coarse_profiles(dem, fine, lat, lon)
        su, ea, bo = fractions(cp, 5.0, series)
        good = ea >= MIN_EARTH
        order = np.lexsort((-bo, -su))                          # most sun first, then most "both"
        order = [k for k in order if good[k]]
        picks = []
        for k in order:                                         # keep candidates at least MIN_SEP_M apart
            if all(math.hypot(x[k] - x[p], y[k] - y[p]) >= MIN_SEP_M for p in picks):
                picks.append(k)
            if len(picks) >= TOP_N: break
        full = []
        for k in picks:
            prof, h0, _, _, res = M.horizon_profile(dem, float(lat[k]), float(lon[k]), fine)
            full.append((k, prof, h0))
        fp = np.array([f[1] for f in full])
        fsu, fea, fbo = fractions(fp, M.AZ_STEP, series)
        best = max(range(len(full)), key=lambda i: (fea[i] >= MIN_EARTH, round(fsu[i], 3), fbo[i]))
        k = full[best][0]
        dist = math.hypot(x[k] - cx[0], y[k] - cy[0])
        center = M.horizon_profile(dem, reg["lat"], reg["lon"], fine)[0]
        csu, cea, cbo = fractions(center[None], M.AZ_STEP, series)
        results[rid] = {"name": reg["name"], "centerLat": reg["lat"], "centerLon": reg["lon"],
                        "centerSlopeDeg": round(float(slope_deg(fine, cx, cy)[0]), 1),
                        "center": [round(float(v) * 100, 1) for v in (csu[0], cea[0], cbo[0])],
                        "lat": round(float(lat[k]), 4), "lon": round(float(lon[k]), 4), "distanceKm": round(dist / 1000, 2),
                        "slopeDeg": round(float(sl[k]), 1), "groundM": round(float(full[best][2])),
                        "best": [round(float(v) * 100, 1) for v in (fsu[best], fea[best], fbo[best])],
                        "screened": int(m.sum()), "slopeOk": int(ok.sum()), "earthOk": int(good.sum())}
        r = results[rid]
        print(f"{rid:28} center: slope {r['centerSlopeDeg']:4.1f}°, sun/earth/both {r['center']} -> "
              f"best {r['lat']}, {r['lon']} ({r['distanceKm']} km away): slope {r['slopeDeg']}°, {r['best']} "
              f"[{r['screened']} points, {r['slopeOk']} under 10°, {r['earthOk']} with Earth >= 25%] {time.time() - t0:.0f} s", flush=True)
    (ROOT / "tools" / "artemis_spots.json").write_text(json.dumps(results, indent=1))

if __name__ == "__main__":
    main()
