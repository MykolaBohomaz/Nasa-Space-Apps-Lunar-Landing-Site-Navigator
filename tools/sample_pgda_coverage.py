"""Read NASA PGDA's 120 m solar and Earth coverage rasters at a fixed polar sample."""
import csv
import math
import struct
import sys
from pathlib import Path


def main():
    directory = Path(sys.argv[1])
    width = 7624
    centre = (width - 1) / 2
    products = ["AVGVISIB_75S_120M_201608.IMG", "AVGVISIB_75S_120M_201608_EARTH.IMG"]
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(("ring", "azimuth", "row", "col", "lat", "lon", "sun", "earth"))
    with (directory / products[0]).open("rb") as sun, (directory / products[1]).open("rb") as earth:
        for band in range(8):
            # Midpoints of eight equal-area annuli, with staggered headings.
            radius = 150000 * math.sqrt((band + 0.5) / 8)
            for spoke in range(12):
                azimuth = 30 * spoke + (7.5 if band % 2 == 0 else 22.5)
                a = math.radians(azimuth)
                col = round(centre + radius * math.sin(a) / 120)
                row = round(centre - radius * math.cos(a) / 120)
                x, y = (col - centre) * 120, (centre - row) * 120
                lat = -90 + math.degrees(2 * math.atan(math.hypot(x, y) / (2 * 1737400)))
                lon = math.degrees(math.atan2(x, y)) % 360
                fractions = []
                for image in (sun, earth):
                    image.seek(2 * (row * width + col))
                    fractions.append(struct.unpack("<h", image.read(2))[0] / 25000)
                writer.writerow((band + 1, azimuth, row, col, lat, lon, *fractions))


if __name__ == "__main__":
    main()
