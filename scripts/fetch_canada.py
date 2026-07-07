#!/usr/bin/env python3
"""抓取加拿大 IRCC Express Entry 抽签轮次官方数据。

官网由 Akamai 防护,普通 HTTP 客户端被拦,故用无头 Chrome 抓取。
输出 src/data/canada.json。

用法: python3 scripts/fetch_canada.py
"""

import html
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

URL = "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "canada.json"

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",  # macOS
    "google-chrome",  # Linux (GitHub Actions 自带)
    "chromium-browser",
    "chromium",
]


def find_chrome() -> str | None:
    for c in CHROME_CANDIDATES:
        if c.startswith("/"):
            if Path(c).exists():
                return c
        elif shutil.which(c):
            return c
    return None


def fetch_via_chrome(url: str) -> str | None:
    chrome = find_chrome()
    if not chrome:
        print("未找到 Chrome/Chromium,无法绕过 Akamai 防护", file=sys.stderr)
        return None
    try:
        r = subprocess.run(
            [chrome, "--headless", "--disable-gpu", "--no-sandbox",
             "--dump-dom", "--virtual-time-budget=10000", url],
            capture_output=True, text=True, timeout=90,
        )
        return r.stdout if r.returncode == 0 and r.stdout else None
    except Exception as e:
        print(f"Chrome 抓取失败: {e}", file=sys.stderr)
        return None


def extract_json(dom: str) -> dict | None:
    """Chrome dump-dom 会把 JSON 包在 <pre> 里并转义 HTML 实体。"""
    m = re.search(r"<pre[^>]*>(.*)</pre>", dom, re.S)
    if not m:
        return None
    try:
        return json.loads(html.unescape(m.group(1)))
    except json.JSONDecodeError:
        return None


def classify(name: str) -> str:
    """抽签类别 → 分组代码,便于前端筛选。"""
    n = name.lower()
    if "provincial" in n or "pnp" in n:
        return "PNP"
    if "canadian experience" in n or "cec" in n:
        return "CEC"
    if "french" in n:
        return "FRENCH"
    if "general" in n or "no program specified" in n:
        return "GENERAL"
    if "trade" in n:
        return "TRADE"
    if "health" in n or "stem" in n or "education" in n or "agricult" in n or "transport" in n:
        return "CATEGORY"
    return "OTHER"


def to_int(s: str) -> int | None:
    try:
        return int(str(s).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def main():
    dom = fetch_via_chrome(URL)
    data = extract_json(dom) if dom else None
    if not data or "rounds" not in data:
        print("抓取或解析失败", file=sys.stderr)
        sys.exit(1)

    rounds = []
    for r in data["rounds"]:
        crs = to_int(r.get("drawCRS"))
        size = to_int(r.get("drawSize"))
        d = (r.get("drawDate") or "").strip()
        if not d or crs is None:
            continue
        name = re.sub(r"\s+", " ", (r.get("drawName") or "").strip())
        rounds.append({
            "num": to_int(r.get("drawNumber")),
            "date": d,
            "name": name,
            "group": classify(name),
            "crs": crs,
            "invitations": size,
        })

    rounds.sort(key=lambda x: (x["date"], x["num"] or 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {"updatedAt": date.today().isoformat(), "source": URL, "rounds": rounds},
        ensure_ascii=False,
    ))
    latest = rounds[-1]
    print(f"完成: {len(rounds)} 轮抽签 → {OUT}")
    print(f"最新: 第 {latest['num']} 轮 {latest['date']} | {latest['name']} | CRS {latest['crs']} | 邀请 {latest['invitations']}")


if __name__ == "__main__":
    main()
