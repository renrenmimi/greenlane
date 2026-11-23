#!/usr/bin/env python3
"""抓取 Federal Register(美国联邦公报)移民相关法规动态。

联邦公报是所有移民新规的法定发布渠道,API 官方免费、内容公有领域。
输出 src/data/live-news.json。

用法: python3 scripts/fetch_news.py
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "live-news.json"

# 覆盖主要移民话题的检索词组,合成一次查询:每个词组加引号按整体匹配,之间用 | 表示「或」。
# 不加引号时 visa bulletin 会拆成两个词,全文任意位置各出现一次就算命中:美联储稳定币
# 规则的脚注里有信用卡组织 Visa、又引用了一份 OCC Bulletin,结果被当成了移民新闻。
PHRASES = ["H-1B", "visa bulletin", "EB-5", "employment-based immigrant visa"]

# 只在主管移民事务的机构里检索,其他部门顺带提到签证的文件(医保、银行监管等)一律不要。
AGENCIES = [
    "homeland-security-department",             # 国土安全部,含 USCIS、ICE、CBP
    "state-department",                         # 国务院:签证
    "executive-office-for-immigration-review",  # 司法部移民法庭
    "labor-department",                         # 劳工部:PERM 劳工证、现行工资认定、H-1B 的 LCA
    "executive-office-of-the-president",        # 总统公告和行政令
]

# 取最新的这么多条,筛掉跟移民无关的之后取前 10 条。
PER_PAGE = 50

# 标题、摘要或发文机构里出现这些词才算移民文件;正文里顺带提一句 H-1B 的不算。
# 例如劳工部的 WIOA 绩效报表提到「H-1B Skills Training Grants」(用 H-1B 申请费办的
# 职业培训拨款),总统的劳动节公告也提到 H-1B,但都跟移民无关。
# USCIS、ICE、移民法庭的机构全名里都有 Immigration,它们发的文件都算。
IMMIGRATION_WORDS = re.compile(
    r"immigra|\baliens?\b|noncitizen|naturaliz|\basylum\b|\brefugees?\b"  # 移民、外国人(新旧两种法律用语)、入籍、庇护、难民
    r"|\bvisas?\b|\bH-[12][AB]|\bEB-[1-5]\b|permanent resid|\bUSCIS\b"    # 签证类别、绿卡
    r"|\bPERM\b|(?:labor|employment) certification|prevailing wage"      # 劳工证、现行工资
    r"|employment authorization|optional practical training",            # 工卡 EAD、OPT
    re.IGNORECASE,
)

TYPE_LABELS = {
    "Rule": "最终规则",
    "Proposed Rule": "拟议规则",
    "Notice": "官方公告",
    "Presidential Document": "总统令",
}


def is_immigration(doc: dict) -> bool:
    """标题、摘要或发文机构提到移民,或者修改的是 8 CFR(联邦法规第 8 编「外国人与国籍」)。"""
    parts = [doc.get("title"), doc.get("abstract"), *(doc.get("agency_names") or [])]
    if IMMIGRATION_WORDS.search(" ".join(p for p in parts if p)):
        return True
    # 个别移民规则的摘要里一个关键词都没有(如 2026-01 放宽 R-1 宗教工作者再入境的规则),
    # 但它们改的一定是 8 CFR
    return any(str(ref.get("title")) == "8" for ref in doc.get("cfr_references") or [])


def is_correction(doc: dict) -> bool:
    """更正(C1-…)或重印(R1-…)。2010 年以前的这类文件接口里没有 correction_of,只能看编号。"""
    return bool(doc.get("correction_of")) or bool(re.match(r"[CR]\d+-", doc.get("document_number") or ""))


def fetch():
    """返回检索结果列表;重试后仍失败返回 None(与「确实没有结果」的空列表区分开)。"""
    params = urlencode({
        "conditions[term]": " | ".join(f'"{p}"' for p in PHRASES),
        "conditions[agencies][]": AGENCIES,
        "per_page": PER_PAGE,
        "order": "newest",
        "fields[]": ["title", "type", "abstract", "publication_date", "html_url",
                     "document_number", "agency_names", "cfr_references", "correction_of"],
    }, doseq=True)
    url = f"https://www.federalregister.gov/api/v1/documents.json?{params}"
    try:
        # 接口偶尔会临时出错(11/16 四个查询同时失败过),重试 3 次扛过短暂抖动
        r = subprocess.run(
            ["curl", "-sL", "--fail", "--retry", "3", "--retry-delay", "10", "--retry-connrefused",
             "--max-time", "30", url],
            capture_output=True, text=True, timeout=200,
        )
        if r.returncode != 0:
            print(f"  查询失败: curl 退出码 {r.returncode}", file=sys.stderr)
            return None
        return json.loads(r.stdout).get("results", [])
    except Exception as e:
        print(f"  查询失败: {e}", file=sys.stderr)
        return None


def main():
    docs = fetch()
    if docs is None:
        # 不写文件、保留上一版
        print("法规动态抓取失败,保留现有数据", file=sys.stderr)
        sys.exit(1)

    seen: dict[str, dict] = {}
    for doc in docs:
        num = doc.get("document_number")
        if not num or num in seen:
            continue
        # 更正通常只有一页、改原文件里的个别错误,标题却跟原文件一模一样、日期是新的,
        # 放进来像是又出了一份新规定
        if is_correction(doc):
            print(f"  · 跳过更正: {num} {(doc.get('title') or '')[:80]}")
            continue
        if not is_immigration(doc):
            print(f"  · 跳过,与移民无关: {(doc.get('title') or '')[:90]}")
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
    print(f"  ✓ 检索到 {len(docs)} 条,其中 {len(seen)} 条与移民相关")

    # 同一天的文件再按编号排,接口返回的先后顺序变了也不会让文件内容来回变
    items = sorted(seen.values(), key=lambda x: (x["date"], x["id"]), reverse=True)[:10]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 核对时刻精确到秒、统一记 UTC;网页再按访客所在时区显示。
    checked_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    OUT.write_text(json.dumps(
        {"updatedAt": checked_at,
         "source": "https://www.federalregister.gov", "items": items},
        ensure_ascii=False,
    ))
    print(f"完成: {len(items)} 条官方法规动态 → {OUT}")
    if items:
        print(f"最新: [{items[0]['date']}] {items[0]['title'][:80]}")


if __name__ == "__main__":
    main()
