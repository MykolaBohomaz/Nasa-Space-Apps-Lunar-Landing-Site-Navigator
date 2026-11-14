#!/usr/bin/env python3
"""Download reference Sun and Earth positions from NASA JPL Horizons for every site in src/sites.js.

Run on a computer with internet (standard Python 3, no extra packages):
    python3 tools/fetch_horizons.py
Writes tools/horizons_raw.json. Then run `node tools/compare_horizons.js` to compare with the app.

Code generated with an AI assistant (Claude) from our team's requirements.
"""
import json, re, time, urllib.parse, urllib.request, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://ssd.jpl.nasa.gov/api/horizons.api"
# Test moments (UTC): spread over a year so libration and seasons vary.
TIMES = ["2026-11-15T00:00:00Z", "2027-02-01T06:00:00Z", "2027-06-01T12:00:00Z", "2027-09-15T18:00:00Z"]
BODIES = {"sun": "10", "earth": "399"}


def load_sites():
    text = (ROOT / "src" / "sites.js").read_text()
    sites = []
    for m in re.finditer(r"\{\s*id:\s*'([^']+)'.*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)", text):
        sites.append({"id": m.group(1), "lat": float(m.group(2)), "lon": float(m.group(3))})
    return sites


def jd(iso):
    t = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()
    return t / 86400.0 + 2440587.5


def query(site, body):
    lon_e = site["lon"] % 360.0
    params = {
        "format": "json", "COMMAND": f"'{body}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'", "CENTER": "'coord@301'", "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon_e:.6f},{site['lat']:.6f},0'", "TIME_TYPE": "'UT'",
        "TLIST": "'" + " ".join(f"{jd(t):.6f}" for t in TIMES) + "'", "TLIST_TYPE": "'JD'",
        "QUANTITIES": "'4'", "CSV_FORMAT": "'YES'", "EXTRA_PREC": "'YES'", "ANG_FORMAT": "'DEG'",
    }
    url = API + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    with urllib.request.urlopen(url, timeout=60) as r:
        result = json.load(r)["result"]
    block = result.split("$$SOE")[1].split("$$EOE")[0]
    rows = []
    for line in block.strip().splitlines():
        cells = [c.strip() for c in line.split(",")]
        nums = [c for c in cells[1:] if re.fullmatch(r"-?\d+(\.\d+)?", c)]
        rows.append({"horizons_time": cells[0], "az": float(nums[0]), "el": float(nums[1])})
    if len(rows) != len(TIMES):
        raise RuntimeError(f"Expected {len(TIMES)} rows for {site['id']}/{body}, got {len(rows)}:\n{result[-1500:]}")
    return rows, url


def main():
    sites = load_sites()
    out = {"source": "NASA JPL Horizons API (ssd.jpl.nasa.gov), observer on the Moon (coord@301), quantity 4 (airless apparent az/el)",
           "fetched_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "times": TIMES, "results": []}
    for s in sites:
        for name, code in BODIES.items():
            print(f"Horizons: {s['id']:>6} {name:<5} ...", end=" ", flush=True)
            rows, url = query(s, code)
            for t, r in zip(TIMES, rows):
                out["results"].append({"site": s["id"], "lat": s["lat"], "lon": s["lon"], "body": name, "time": t, **r})
            print("ok")
            time.sleep(1)
    path = ROOT / "tools" / "horizons_raw.json"
    path.write_text(json.dumps(out, indent=1))
    print(f"Saved {len(out['results'])} reference points to {path}")


if __name__ == "__main__":
    main()
