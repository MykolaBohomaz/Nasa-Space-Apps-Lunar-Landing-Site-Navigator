"""Extract fixed 3×3 image patches from the LROC South Pole Movie PDS archive."""
import csv
import math
import re
import struct
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
from urllib.request import Request, urlopen


CATALOG = "https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_POLE_MOVIE_SOUTH"
IMAGES = ("https://pds.mcp.nasa.gov/data/store/img/lunar_reconnaissance_orbiter/pds4/lroc/"
          "lro-l-lroc-5-rdr/LROLRC_2001/DATA/BDR/WAC_POLE/WAC_POLE_MOVIE_SOUTH")
PERIODS = [("20100215", "20100301"), ("20100815", "20100829")]
ROWS = [2689, 2889, 3039, 3189]
COLS = range(2751, 3328, 24)


def fetch(url, start=None, end=None):
    headers = {} if start is None else {"Range": f"bytes={start}-{end}"}
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=headers), timeout=20) as response:
                if start is None:
                    return response.read()
                if response.status != 206 or not response.headers["Content-Range"].startswith(f"bytes {start}-{end}/"):
                    raise ValueError(f"Unexpected range response for {url}")
                data = response.read()
                if len(data) != end - start + 1:
                    raise ValueError(f"Truncated range for {url}")
                return data
        except OSError as error:
            if isinstance(error, HTTPError) and error.code == 429:
                raise RuntimeError(f"LROC archive rate limit, Retry-After: {error.headers.get('Retry-After')}") from error
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def coordinates(row, col):
    x, y = (col - 3039.5) * 100, (3039.5 - row) * 100
    lat = -90 + math.degrees(2 * math.atan(math.hypot(x, y) / (2 * 1737400)))
    return lat, math.degrees(math.atan2(x, y)) % 360


def sample(frame):
    url = f"{IMAGES}/{frame}.IMG"
    label = fetch(url, 0, 8191).decode("ascii", errors="replace")

    def value(key):
        return re.search(rf"^\s*{key}\s*=\s*(\S+)", label, re.MULTILINE)[1]

    expected = {"PRODUCT_ID": frame, "RECORD_BYTES": "24320", r"\^IMAGE": "2",
                "LINE_PROJECTION_OFFSET": "3039.5", "SAMPLE_PROJECTION_OFFSET": "3039.5",
                "MAP_SCALE": "100.0", "SAMPLE_TYPE": "PC_REAL"}
    for key, target in expected.items():
        if value(key) != target:
            raise ValueError(f"{frame}: unexpected {key}")
    start, stop = value("START_TIME"), value("STOP_TIME")
    width = 6080
    results = []
    for row in ROWS:
        offset = row * width * 4  # row above the centre, including the preceding label record
        data = fetch(url, offset, offset + 3 * width * 4 - 1)
        for col in COLS:
            pixels = sorted(pixel for r in range(3)
                            for pixel in struct.unpack_from("<3f", data, (r * width + col - 1) * 4))
            if not all(math.isfinite(p) and p > -1 for p in pixels):
                continue
            lat, lon = coordinates(row, col)
            results.append((frame, start, stop, row, col, lat, lon, pixels[2], pixels[4], pixels[6]))
    return results


def main():
    page = fetch(CATALOG).decode()
    all_frames = sorted(set(re.findall(r"WAC_MOVIE_S(\d{8}T\d{4})", page)))
    frames = ["WAC_MOVIE_S" + frame for frame in all_frames
              if any(a <= frame[:8] < b for a, b in PERIODS)]
    if len(frames) != 309:
        raise ValueError("Incomplete LROC catalog")
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(("frame", "startUTC", "stopUTC", "row", "col", "lat", "lon", "p3", "median", "p7"))
    with ThreadPoolExecutor(max_workers=6) as pool:
        for results in pool.map(sample, frames):
            writer.writerows(results)


if __name__ == "__main__":
    main()
