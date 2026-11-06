#!/usr/bin/env python3
"""抓取并解析美国国务院 Visa Bulletin 历史数据。

从 2015 年 10 月（表 B / Dates for Filing 首次出现）回填至今，
输出 src/data/bulletins.json 供前端使用。

2026 年 11 月起，国务院的两个官方入口都对脚本访问一律返回 403（Cloudflare 封禁），
联网抓取已无法使用，自动流程也不再调用它。新一期改为手动导入：在浏览器里正常打开
官网那一期，另存为网页，再用 --import 导入。校验标准与联网抓取完全相同。

用法:
    python3 scripts/scrape_bulletins.py --import ~/Downloads/visa-bulletin-for-december-2026.html
    python3 scripts/scrape_bulletins.py            # 联网补缺并核对本月/最新一期（目前被 403）
    python3 scripts/scrape_bulletins.py --full     # 联网全量重抓（目前被 403）
"""

import argparse
import html
import json
import plistlib
import re
import subprocess
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

BASE = "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin"
# Both public State Department hosts serve the same bulletin content tree.
# The alternate host is also indexed publicly (including its bulletin PDFs).
OFFICIAL_HOSTS = ("travel.state.gov", "adoption.state.gov")
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


class FetchError(RuntimeError):
    pass


class Fetcher:
    """只读国务院公开 HTTPS 入口；主站不可用时使用官方备用站点。"""

    def __init__(self):
        self.preferred_host = OFFICIAL_HOSTS[0]

    def __call__(self, url):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc not in OFFICIAL_HOSTS:
            raise FetchError(f"不是允许的国务院 HTTPS 来源: {url}")
        hosts = [self.preferred_host] + [h for h in OFFICIAL_HOSTS if h != self.preferred_host]
        failures = []
        for host in hosts:
            source_url = parsed._replace(netloc=host).geturl()
            try:
                r = subprocess.run(
                    ["curl", "-sS", "-L", "--fail-with-body", "--retry", "2",
                     "--proto", "=https", "--proto-redir", "=https",
                     "--connect-timeout", "10", "--max-time", "30", "-A", UA,
                     "--write-out", "\n%{url_effective}", source_url],
                    capture_output=True, text=True, timeout=100,
                )
                body, _, effective_url = r.stdout.rpartition("\n")
                effective = urlparse(effective_url)
                if (r.returncode == 0 and effective.scheme == "https"
                        and effective.netloc in OFFICIAL_HOSTS and self.has_content(body, url)):
                    self.preferred_host = host
                    print(f"  官方来源: {effective_url}")
                    return body
                detail = r.stderr.strip() or "响应不是有效的官方公告内容"
            except (OSError, subprocess.TimeoutExpired) as e:
                detail = str(e)
            failures.append(f"{source_url}: {detail}")
            print(f"HTTP 抓取未成功: {failures[-1]}", file=sys.stderr)
        raise FetchError("全部官方入口均抓取失败: " + "; ".join(failures))

    @staticmethod
    def has_content(src, url):
        if re.search(r"Attention Required!|Just a moment\.\.\.|Sorry, you have been blocked", src, re.I):
            return False
        return (bool(discover_bulletins(src)) if urlparse(url).path == urlparse(BASE + ".html").path
                else bool(parse_bulletin(src)))


def discover_bulletins(src):
    """以官方目录为准，避免把未发布的下月公告和抓取失败混为一谈。"""
    found = {}
    for href in re.findall(r'href=[\"\x27]([^\"\x27]+)', src, re.I):
        url = urljoin(BASE + ".html", html.unescape(href))
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc not in OFFICIAL_HOSTS:
            continue
        # Keep user-facing source links on the canonical main site.
        url = parsed._replace(netloc=OFFICIAL_HOSTS[0]).geturl()
        match = re.search(r"/visa-bulletin-for-([a-z]+)-(\d{4})\.html$", url, re.I)
        if match and match[1].lower() in MONTH_NAMES:
            key = (int(match[2]), MONTH_NAMES.index(match[1].lower()) + 1)
            if key >= (2015, 10):
                found[key] = url
    return found


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
    try:
        return date(year, mon, day).isoformat()
    except ValueError:
        return None


def parse_table(table_html: str, row_map) -> dict | None:
    rows = re.findall(r"<tr\b.*?</tr>", table_html, re.S | re.I)
    if len(rows) < 2:
        return None
    header = [strip_tags(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", rows[0], re.S | re.I)]
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
        cells = [strip_tags(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", r, re.S | re.I)]
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
    tables = re.findall(r"<table\b.*?</table>", src, re.S | re.I)
    fam, emp = [], []
    for t in tables:
        rows = re.findall(r"<tr\b.*?</tr>", t, re.S | re.I)
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


def validate_bulletin(parsed):
    required = {
        "employment": ["EB1", "EB2", "EB3", "EB3-OW", "EB4", "EB5"],
        "family": ["F1", "F2A", "F2B", "F3", "F4"],
    }
    for kind, categories in required.items():
        for table in ("finalAction", "datesForFiling"):
            rows = (parsed or {}).get(kind, {}).get(table) or {}
            for category in categories:
                for country in ("ALL", "CN", "IN", "MX", "PH"):
                    value = rows.get(category, {}).get(country)
                    if value not in ("C", "U"):
                        try:
                            date.fromisoformat(value)
                        except (TypeError, ValueError):
                            raise ValueError(f"{kind}.{table}.{category}.{country} 缺失或日期无效")


def parse_month(src, y, m, where):
    """确认页面就是 y 年 m 月那一期，解析并检查表格完整；不合格就抛异常，一个字都不写。"""
    title = f"Visa Bulletin For {MONTH_NAMES[m - 1]} {y}"
    if title.lower() not in strip_tags(src).lower():
        raise FetchError(f"{where}: 公告标题与目标月份不符")
    parsed = parse_bulletin(src)
    validate_bulletin(parsed)
    if (y, m) >= (2022, 5):
        for table in ("finalAction", "datesForFiling"):
            for category in ("EB5-RUR", "EB5-HU", "EB5-INF"):
                if set(parsed["employment"][table].get(category, {})) != {"ALL", "CN", "IN", "MX", "PH"}:
                    raise ValueError(f"{y}-{m:02d}: {table}.{category} 预留类别不完整")
    return parsed


def save(out, bulletins, now):
    items = [bulletins[key] for key in sorted(bulletins)]
    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_suffix(".json.tmp")
    temp.write_text(json.dumps(
        {"updatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "source": BASE, "bulletins": items},
        ensure_ascii=False,
    ))
    temp.replace(out)
    return items


TITLE_RE = re.compile(r"Visa Bulletin For (" + "|".join(MONTH_NAMES) + r") (\d{4})", re.I)


def read_saved_page(path):
    """读浏览器另存的网页。Safari 默认存成 .webarchive（二进制 plist），其余按 HTML 读。"""
    raw = Path(path).expanduser().read_bytes()
    if not raw.startswith(b"bplist00"):
        return raw.decode("utf-8", errors="replace")
    try:
        resource = plistlib.loads(raw)["WebMainResource"]
        encoding = resource.get("WebResourceTextEncodingName") or "utf-8"
        return resource["WebResourceData"].decode(encoding, errors="replace")
    except (KeyError, LookupError) as e:
        raise ValueError(f"{Path(path).name} 不是有效的网页存档") from e


def bulletin_month(src):
    """认出页面是哪一期：优先看 <title>，否则取正文里唯一出现的那个月份。"""
    title = re.search(r"<title\b[^>]*>(.*?)</title>", src, re.S | re.I)
    found = TITLE_RE.findall(strip_tags(title.group(1))) if title else []
    if not found:
        found = TITLE_RE.findall(strip_tags(src))
    months = {(int(y), MONTH_NAMES.index(name.lower()) + 1) for name, y in found}
    if len(months) != 1:
        raise ValueError("认不出这是哪一期排期公告，请确认存的是官网某一期 Visa Bulletin 的页面")
    return months.pop()


def import_saved(path, out=OUT, now=None):
    """导入浏览器里另存的一期公告。只接受修订已收录的月份，或紧接着的下一期。"""
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    src = read_saved_page(path)
    y, m = bulletin_month(src)
    parsed = parse_month(src, y, m, Path(path).name)
    existing = {(b["year"], b["month"]): b for b in json.loads(out.read_text())["bulletins"]}
    latest = max(existing)
    following = (latest[0] + 1, 1) if latest[1] == 12 else (latest[0], latest[1] + 1)
    if (y, m) not in existing and (y, m) != following:
        raise ValueError(f"这是 {y}-{m:02d} 的公告，但目前只收录到 {latest[0]}-{latest[1]:02d}，"
                         f"请先导入 {following[0]}-{following[1]:02d}")
    entry = {"year": y, "month": m, "url": bulletin_url(y, m), **parsed}
    if existing.get((y, m)) == entry:
        print(f"{y}-{m:02d} 与已收录的内容完全一致，无需改动")
        return False
    existing[y, m] = entry
    save(out, existing, now)
    print(f"✓ 已导入 {y} 年 {m} 月排期（共 {len(existing)} 期）→ {out}")
    return True


def update(fetch, out=OUT, full=False, today=None, now=None):
    # 核对时刻精确到秒、统一记 UTC;网页再按访客所在时区显示。
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    today = today or now.date()
    existing = {}
    if out.exists():
        existing = {(b["year"], b["month"]): b
                    for b in json.loads(out.read_text())["bulletins"]}
    published = discover_bulletins(fetch(BASE + ".html"))
    if not published:
        raise FetchError("官方目录中没有可识别的排期公告")
    latest = max(published)
    if latest < (today.year, today.month):
        raise FetchError(f"官方目录最新月份 {latest} 早于本月，可能返回了旧页面")
    if existing and latest < max(existing):
        raise FetchError("官方目录最新月份落后于已收录数据，拒绝更新核对日期")
    y, m = 2015, 10
    while (y, m) <= latest:
        if (y, m) not in existing and (y, m) not in published:
            raise FetchError(f"官方目录缺少待补月份 {y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    # 缺失月份必须全部补齐；本月及最新一期重新核对，捕获发布后的修订。
    todo = [key for key in sorted(published)
            if full or key not in existing or key == latest or key == (today.year, today.month)]
    bulletins = dict(existing)
    print(f"官方最新 {latest[0]}-{latest[1]:02d}，待核对 {len(todo)} 个月份")
    for y, m in todo:
        url = published[y, m]
        bulletins[y, m] = {"year": y, "month": m, "url": url, **parse_month(fetch(url), y, m, url)}
        print(f"  ✓ {y}-{m:02d}")
        time.sleep(0.4)
    # 任意一次抓取/解析失败都到不了这里，连 updatedAt 也保持不变。
    items = save(out, bulletins, now)
    print(f"完成: 核对 {len(todo)}，总计 {len(items)} 个月 → {out}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--import", dest="saved", metavar="FILE",
                        help="导入浏览器另存的某一期公告页面（.html，或 Safari 的 .webarchive）")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()
    try:
        if args.saved:
            import_saved(args.saved)
        else:
            update(Fetcher(), full=args.full)
    except (FetchError, ValueError, OSError) as e:
        print(f"::error::美国排期更新失败，保留原数据: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
