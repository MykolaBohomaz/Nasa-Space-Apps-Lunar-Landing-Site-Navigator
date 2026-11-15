"""Plot one sunrise from the cached camera measurements and predictions."""
import csv
import gzip
import sys
from datetime import datetime, timedelta

import matplotlib.dates as mdates
import matplotlib.pyplot as plt


def main():
    observations_path, events_path, output = sys.argv[1:]
    with open(events_path) as handle:
        case = next(row for row in csv.DictReader(handle) if row["rule"] == "primary"
                    and row["site"] == "3039:2823" and row["before"] == "WAC_MOVIE_S20100818T0953")
    start, end, limb, centre = (datetime.fromisoformat(case[key])
                               for key in ("bracketStart", "bracketEnd", "anyDiskUTC", "terrainUTC"))
    with gzip.open(observations_path, "rt") as handle:
        observations = [row for row in csv.DictReader(handle) if row["row"] == "3039" and row["col"] == "2823"
                        and row["frame"].startswith("WAC_MOVIE_S20100818")]

    fig, (signal, time) = plt.subplots(2, 1, figsize=(9, 5.1), sharex=True,
                                      gridspec_kw={"height_ratios": [4, 1]}, layout="constrained")
    fig.suptitle("A lunar sunrise caught between two LRO camera frames", fontsize=17, weight="bold")
    for row in observations:
        t0 = datetime.fromisoformat(row["startUTC"] + "Z")
        t1 = datetime.fromisoformat(row["stopUTC"] + "Z")
        p3, p7 = float(row["p3"]), float(row["p7"])
        signal.vlines(t0 + (t1 - t0) / 2, p3, p7, color="#476472", linewidth=2)
        signal.plot(t0 + (t1 - t0) / 2, float(row["median"]), "o", color="#162f3c", markersize=5)
    signal.set_ylabel("LROC image value")
    signal.set_title("Dots show the median of each 3 × 3 pixel patch; bars show the third and seventh pixels",
                     loc="left", fontsize=10)
    signal.grid(axis="y", color="#e0e7eb")
    for ax in (signal, time):
        ax.axvspan(start, end, color="#c6e9ec", zorder=0)
    time.axvline(limb, color="#026c73", linewidth=2)
    time.axvline(centre, color="#9c471c", linewidth=2)
    for t, label, color in ((limb, "10:46  First edge", "#026c73"), (centre, "13:08  Sun centre", "#9c471c")):
        time.annotate(label, (t, 0.5), xytext=(5, 0), textcoords="offset points", va="center", color=color)
    time.set_yticks([])
    time.set_xlim(start - timedelta(hours=4), centre + timedelta(hours=4))
    time.xaxis.set_major_locator(mdates.HourLocator(interval=2))
    time.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    time.set_xlabel("18 August 2010 UTC · Shaded interval is the observed bracket (09:53–11:53 UTC)")
    fig.text(0.5, -0.023, "89.28604°S, 270.13232°E   |   Lunar Reconnaissance Orbiter Camera · NASA/GSFC/Arizona State University",
             ha="center", fontsize=9)
    fig.savefig(output, dpi=160, bbox_inches="tight", pad_inches=0.25)


if __name__ == "__main__":
    main()
