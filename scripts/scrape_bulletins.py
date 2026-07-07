#!/usr/bin/env python3
"""抓取并解析美国国务院 Visa Bulletin 历史数据。

从 2015 年 10 月（表 B / Dates for Filing 首次出现）回填至今，
输出 src/data/bulletins.json 供前端使用。

用法:
    python3 scripts/scrape_bulletins.py            # 增量: 只抓缺失月份
    python3 scripts/scrape_bulletins.py --full     # 全量重抓
"""

import html
import json
import re
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

BASE = "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "bulletins.json"

MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

MONTH_ABBR = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

# 就业类行名 → 标准类别代码。逐年措辞会变，按前缀/关键词匹配。
EMPLOYMENT_ROWS = [
    (re.compile(r"^1st"), "EB1"),
    (re.compile(r"^2nd"), "EB2"),
    (re.compile(r"^3rd"), "EB3"),
    (re.compile(r"^other\s*workers?", re.I), "EB3-OW"),
    (re.compile(r"^4th"), "EB4"),
    (re.compile(r"^certain religious", re.I), "EB4-RW"),
    (re.compile(r"^5th.*unreserved", re.I), "EB5"),
    (re.compile(r"^5th.*non-?regional", re.I), "EB5"),
    (re.compile(r"^5th.*rural", re.I), "EB5-RUR"),
    (re.compile(r"^5th.*high\s*unemployment", re.I), "EB5-HU"),
    (re.compile(r"^5th.*infrastructure", re.I), "EB5-INF"),
    (re.compile(r"^5th.*regional", re.I), "EB5-RC"),
    (re.compile(r"^5th"), "EB5"),
]

FAMILY_ROWS = [
    (re.compile(r"^f1", re.I), "F1"),
    (re.compile(r"^f2a", re.I), "F2A"),
    (re.compile(r"^f2b", re.I), "F2B"),
    (re.compile(r"^f3", re.I), "F3"),
    (re.compile(r"^f4", re.I), "F4"),
]

# 国家列表头关键词 → 代码
COUNTRY_COLS = [
    ("CHINA", "CN"),
    ("INDIA", "IN"),
    ("MEXICO", "MX"),
    ("PHILIPPINES", "PH"),
    ("ALL CHARGEABILITY", "ALL"),
]


def fiscal_year(y: int, m: int) -> int:
    return y + 1 if m >= 10 else y


def bulletin_url(y: int, m: int) -> str:
    return f"{BASE}/{fiscal_year(y, m)}/visa-bulletin-for-{MONTH_NAMES[m - 1]}-{y}.html"


def fetch(url: str) -> str | None:
    # 本机 Python 缺 CA 证书，用 curl 抓取
    try:
        r = subprocess.run(
            ["curl", "-sL", "--fail", "--max-time", "30", "-A", UA, url],
            capture_output=True, text=True, timeout=40,
        )
        return r.stdout if r.returncode == 0 and r.stdout else None
    except Exception:
        return None


def strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse_value(raw: str) -> str | None:
    """'01JUN23' → '2023-06-01'；C→'C'；U→'U'；无法识别→None。"""
    v = raw.strip().upper().rstrip(".*")
    if v in ("C", "CURRENT"):
        return "C"
    if v in ("U", "UNAVAILABLE", "UNAUTHORIZED"):
        return "U"
    m = re.match(r"^(\d{2})([A-Z]{3})(\d{2})$", v)
    if not m:
        return None
    day, mon, yy = int(m.group(1)), MONTH_ABBR.get(m.group(2)), int(m.group(3))
    if not mon:
        return None
    year = 2000 + yy if yy < 80 else 1900 + yy
    return f"{year:04d}-{mon:02d}-{day:02d}"


def parse_table(table_html: str, row_map) -> dict | None:
    rows = re.findall(r"<tr.*?</tr>", table_html, re.S)
    if len(rows) < 2:
        return None
    header = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[0], re.S)]
    col_idx: dict[str, int] = {}
    for i, h in enumerate(header):
        for kw, code in COUNTRY_COLS:
            if kw in h.upper() and code not in col_idx:
                col_idx[code] = i
                break
    if "ALL" not in col_idx:
        return None
    out: dict[str, dict[str, str]] = {}
    for r in rows[1:]:
        cells = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)]
        if not cells:
            continue
        label = cells[0]
        code = None
        for pat, c in row_map:
            if pat.search(label):
                code = c
                break
        if not code or code in out:
            continue
        entry = {}
        for country, idx in col_idx.items():
            if idx < len(cells):
                val = parse_value(cells[idx])
                if val:
                    entry[country] = val
        if entry:
            out[code] = entry
    return out or None


def parse_bulletin(src: str) -> dict | None:
    tables = re.findall(r"<table.*?</table>", src, re.S)
    fam, emp = [], []
    for t in tables:
        rows = re.findall(r"<tr.*?</tr>", t, re.S)
        if not rows:
            continue
        first = strip_tags(rows[0]).upper()
        if len(rows) >= 5 and "FAMILY" in first:
            fam.append(t)
        elif len(rows) >= 5 and "EMPLOYMENT" in first:
            emp.append(t)
    result: dict = {}
    if emp:
        fa = parse_table(emp[0], EMPLOYMENT_ROWS)
        df = parse_table(emp[1], EMPLOYMENT_ROWS) if len(emp) > 1 else None
        result["employment"] = {"finalAction": fa, "datesForFiling": df}
    if fam:
        fa = parse_table(fam[0], FAMILY_ROWS)
        df = parse_table(fam[1], FAMILY_ROWS) if len(fam) > 1 else None
        result["family"] = {"finalAction": fa, "datesForFiling": df}
    return result if result.get("employment", {}).get("finalAction") else None


def month_range(start=(2015, 10)):
    today = date.today()
    y, m = start
    # 下月公告通常提前 2-4 周发布，多探一个月
    end_y, end_m = (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)
    while (y, m) <= (end_y, end_m):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def main():
    full = "--full" in sys.argv
    existing: dict[str, dict] = {}
    if OUT.exists() and not full:
        for b in json.loads(OUT.read_text())["bulletins"]:
            existing[f"{b['year']}-{b['month']:02d}"] = b

    bulletins = dict(existing)
    todo = [(y, m) for y, m in month_range() if f"{y}-{m:02d}" not in existing]
    print(f"待抓取 {len(todo)} 个月份")
    ok = fail = 0
    for y, m in todo:
        url = bulletin_url(y, m)
        src = fetch(url)
        parsed = parse_bulletin(src) if src else None
        if parsed:
            bulletins[f"{y}-{m:02d}"] = {"year": y, "month": m, "url": url, **parsed}
            ok += 1
            print(f"  ✓ {y}-{m:02d}")
        else:
            fail += 1
            print(f"  ✗ {y}-{m:02d}  ({url})")
        time.sleep(0.4)

    items = sorted(bulletins.values(), key=lambda b: (b["year"], b["month"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {"updatedAt": date.today().isoformat(), "source": BASE, "bulletins": items},
        ensure_ascii=False,
    ))
    print(f"\n完成: 新增 {ok}，失败 {fail}，总计 {len(items)} 个月 → {OUT}")


if __name__ == "__main__":
    main()
