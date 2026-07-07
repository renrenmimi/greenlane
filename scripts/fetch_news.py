#!/usr/bin/env python3
"""抓取 Federal Register(美国联邦公报)移民相关法规动态。

联邦公报是所有移民新规的法定发布渠道,API 官方免费、内容公有领域。
输出 src/data/live-news.json。

用法: python3 scripts/fetch_news.py
"""

import json
import subprocess
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlencode

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "live-news.json"

# 覆盖主要移民话题的检索词
QUERIES = ["H-1B", "visa bulletin", "EB-5 immigrant investor", "employment-based immigrant visa"]

TYPE_LABELS = {
    "Rule": "最终规则",
    "Proposed Rule": "拟议规则",
    "Notice": "官方公告",
    "Presidential Document": "总统令",
}


def fetch(query: str) -> list[dict]:
    params = urlencode({
        "conditions[term]": query,
        "per_page": 8,
        "order": "newest",
        "fields[]": ["title", "type", "abstract", "publication_date", "html_url",
                     "document_number", "agency_names"],
    }, doseq=True)
    url = f"https://www.federalregister.gov/api/v1/documents.json?{params}"
    try:
        r = subprocess.run(
            ["curl", "-sL", "--fail", "--max-time", "30", url],
            capture_output=True, text=True, timeout=40,
        )
        if r.returncode != 0:
            return []
        return json.loads(r.stdout).get("results", [])
    except Exception as e:
        print(f"  查询失败 [{query}]: {e}", file=sys.stderr)
        return []


def main():
    seen: dict[str, dict] = {}
    for q in QUERIES:
        for doc in fetch(q):
            num = doc.get("document_number")
            if not num or num in seen:
                continue
            abstract = (doc.get("abstract") or "").strip()
            seen[num] = {
                "id": num,
                "title": (doc.get("title") or "").strip(),
                "typeLabel": TYPE_LABELS.get(doc.get("type", ""), "官方文件"),
                "date": doc.get("publication_date", ""),
                "url": doc.get("html_url", ""),
                "agencies": doc.get("agency_names") or [],
                "summary": abstract[:280] + ("…" if len(abstract) > 280 else ""),
            }
        print(f"  ✓ {q}: 累计 {len(seen)} 条")

    items = sorted(seen.values(), key=lambda x: x["date"], reverse=True)[:10]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {"updatedAt": date.today().isoformat(),
         "source": "https://www.federalregister.gov", "items": items},
        ensure_ascii=False,
    ))
    print(f"完成: {len(items)} 条官方法规动态 → {OUT}")
    if items:
        print(f"最新: [{items[0]['date']}] {items[0]['title'][:80]}")


if __name__ == "__main__":
    main()
