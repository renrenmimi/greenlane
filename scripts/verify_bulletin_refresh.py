#!/usr/bin/env python3
"""Live smoke test: remove the newest bulletin in a temporary copy and fetch it again.

Run after scrape_bulletins.py so the comparison is against freshly verified data.
The production data file is never modified by this check.
"""

import json
from pathlib import Path
import tempfile

from scrape_bulletins import Fetcher, OUT, update


def main():
    expected = json.loads(OUT.read_text())
    latest = expected["bulletins"][-1]
    with tempfile.TemporaryDirectory(prefix="greenlane-backfill-") as folder:
        test_file = Path(folder) / "bulletins.json"
        test_file.write_text(json.dumps({
            **expected, "bulletins": expected["bulletins"][:-1],
        }))
        update(Fetcher(), out=test_file)
        recovered = json.loads(test_file.read_text())
        if recovered["bulletins"] != expected["bulletins"]:
            raise RuntimeError("Live backfill differs from the freshly verified data")
    print(f"✓ Live recovery verified: {latest['year']}-{latest['month']:02d}, all four tables match")


if __name__ == "__main__":
    main()
