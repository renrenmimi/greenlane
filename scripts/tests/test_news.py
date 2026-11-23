"""fetch_news.py:官方法规动态只收录跟移民相关的联邦公报文件。

样例是联邦公报上的真实文件,标题照抄,摘要为节选。
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import fetch_news as news


def doc(num, date, title, agencies, abstract="", cfr=(), type_="Notice"):
    return {
        "document_number": num, "publication_date": date, "type": type_,
        "title": title, "abstract": abstract, "agency_names": list(agencies),
        "html_url": f"https://www.federalregister.gov/d/{num}",
        "cfr_references": [{"title": t, "part": part} for t, part in cfr],
    }


DHS = ["Homeland Security Department"]
DOL_ETA = ["Labor Department", "Employment and Training Administration"]
EOP = ["Executive Office of the President"]
ETA_ICR = ("The Department of Labor's (DOL) Employment and Training Administration (ETA) is soliciting "
           "comments concerning a proposed revision for the authority to conduct the information "
           "collection request (ICR) titled, ")

# 2026-11 网站上被误收过的文件:全文某处出现了检索词,文件本身跟移民无关
UNRELATED = [
    doc("2026-23777", "2026-11-23",
        "Employee or Independent Contractor Status Under the Fair Labor Standards Act, Family and "
        "Medical Leave Act, and Migrant and Seasonal Agricultural Worker Protection Act",
        ["Labor Department", "Wage and Hour Division"],
        "This final rule rescinds the analysis for determining employee or independent contractor "
        "status under the Fair Labor Standards Act (FLSA or Act)",
        cfr=[(29, "500"), (29, "795"), (29, "825")], type_="Rule"),
    doc("2026-23292", "2026-11-16",
        "Agency Information Collection Activities; Comment Request; Workforce Innovation and "
        "Opportunity Act Joint Quarterly Narrative Report", DOL_ETA,
        ETA_ICR + '"Workforce Innovation and Opportunity Act Joint Quarterly Narrative Report."'),
    doc("2026-19836", "2026-09-29",
        "Agency Information Collection Activities; Comment Request; DOL-Only Performance "
        "Accountability, Information, and Reporting", DOL_ETA,
        ETA_ICR + '"DOL-only Performance Accountability, Information, and Reporting."'),
    doc("2026-19860", "2026-09-29",
        "Implementing the Federal Reserve Board's Responsibilities Under the GENIUS Act",
        ["Federal Reserve System"],
        "The Board of Governors of the Federal Reserve System (Board) proposes to issue regulations "
        "to implement the Guiding and Establishing National Innovation for U.S. Stablecoins Act",
        cfr=[(12, "208")], type_="Proposed Rule"),
    # 正文提到「对 H-1B 申请加收新费用」,公告本身是节日公告
    doc("2026-18573", "2026-09-10", "Labor Day, 2026", EOP, type_="Presidential Document"),
]

RELATED = [
    doc("2026-23370", "2026-11-17",
        "Modernizing the Labor Market Test and Improving Protections for U.S. Workers in the PERM "
        "Immigrant Visa Program", DOL_ETA,
        "The Department of Labor (Department or DOL) proposes to amend its regulations regarding the "
        "certification of job opportunities offered by employers seeking to employ aliens on a "
        "permanent basis in the United States.",
        cfr=[(20, "656")], type_="Proposed Rule"),
    doc("2026-21698", "2026-10-23",
        "Agency Information Collection Activities; Extension, Without Change, of a Currently Approved "
        "Collection: Application To Register Permanent Residence or Adjust Status",
        DHS + ["U.S. Citizenship and Immigration Services"],
        "The Department of Homeland Security (DHS), U.S. Citizenship and Immigration Services (USCIS) "
        "invites the general public and other Federal agencies to comment"),
    doc("2026-20955", "2026-10-14",
        "Removal of Automatic Extensions for Certain Employment Authorization Documents", DHS,
        type_="Rule"),
    doc("2026-20660", "2026-10-08", "Optional Practical Training Fees", DHS,
        "This rule proposes new fees for Optional Practical Training (OPT)", type_="Proposed Rule"),
    doc("2026-20016", "2026-09-30",
        "U.S. Citizenship and Immigration Services Employment-Based Immigrant Visa, Fifth Preference "
        "(EB-5) Fee Rule", DHS, type_="Rule"),
    # 总统文件没有摘要,只看标题
    doc("2026-19555", "2026-09-23",
        "Enhancing Program Integrity and Interagency Coordination in the Administration of the H-1B "
        "Nonimmigrant Visa Program", EOP, type_="Presidential Document"),
    # 劳工部本部提交的现行工资认定表格,机构里没有 ETA
    doc("2026-14827", "2026-07-23",
        "Agency Information Collection Activities; Submission for OMB Review; Comment Request; "
        "Application for Prevailing Wage Determination", ["Labor Department"],
        "The Department of Labor (DOL) is submitting this Employment and Training Administration "
        "(ETA)-sponsored information collection request (ICR)"),
    # 摘要里一个关键词都没有,靠修改的是 8 CFR 认出来
    doc("2026-00830", "2026-01-16",
        "Improving Continuity for Religious Organizations and Their Employees", DHS,
        "This interim final rule (IFR) amends U.S. Department of Homeland Security (DHS) regulations "
        "to remove the requirement that R-1 religious workers who have reached the maximum period of "
        "stay must reside abroad", cfr=[(8, "214")], type_="Rule"),
]


class RelevanceTests(unittest.TestCase):
    def test_documents_mentioning_terms_only_in_passing_are_skipped(self):
        for d in UNRELATED:
            with self.subTest(d["title"][:60]):
                self.assertFalse(news.is_immigration(d))

    def test_immigration_documents_are_kept(self):
        for d in RELATED:
            with self.subTest(d["title"][:60]):
                self.assertTrue(news.is_immigration(d))

    def test_keywords_hidden_inside_other_words_do_not_count(self):
        d = doc("x", "2026-11-01", "Policy Statement", ["Labor Department"],
                "Retaining the test is advisable; the salient factors remain.")
        self.assertFalse(news.is_immigration(d))


class QueryTests(unittest.TestCase):
    def run_fetch(self, returncode=0, stdout='{"results": []}'):
        reply = SimpleNamespace(returncode=returncode, stdout=stdout)
        with patch.object(news.subprocess, "run", return_value=reply) as run, \
                contextlib.redirect_stderr(io.StringIO()):
            result = news.fetch()
        return result, run.call_args.args[0]

    def test_phrases_are_quoted_and_search_is_limited_to_immigration_agencies(self):
        _, cmd = self.run_fetch()
        self.assertIn("--retry", cmd)
        query = parse_qs(urlparse(cmd[-1]).query)
        self.assertEqual(query["conditions[term]"],
                         ['"H-1B" | "visa bulletin" | "EB-5" | "employment-based immigrant visa"'])
        for slug in ("homeland-security-department", "state-department", "labor-department"):
            self.assertIn(slug, query["conditions[agencies][]"])
        for field in ("cfr_references", "correction_of"):
            self.assertIn(field, query["fields[]"])

    def test_curl_failure_returns_none(self):
        result, _ = self.run_fetch(returncode=22, stdout="")
        self.assertIsNone(result)


class MainTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.out = Path(temp.name) / "live-news.json"
        self.out.write_text("上一版")
        stack = contextlib.ExitStack()
        self.addCleanup(stack.close)
        stack.enter_context(patch.object(news, "OUT", self.out))
        stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        stack.enter_context(contextlib.redirect_stderr(io.StringIO()))

    def run_main(self, docs):
        with patch.object(news, "fetch", return_value=docs):
            news.main()
        return json.loads(self.out.read_text())

    def test_writes_newest_ten_immigration_documents_in_unchanged_format(self):
        extra = [doc(f"2026-1{i}000", f"2026-06-1{i}", f"Fee for Certain H-1B Petitions {i}", DHS)
                 for i in range(5)]
        data = self.run_main(UNRELATED + RELATED + extra)
        self.assertEqual(set(data), {"updatedAt", "source", "items"})
        items = data["items"]
        self.assertEqual(len(items), 10)
        self.assertEqual(set(items[0]), {"id", "title", "typeLabel", "date", "url", "agencies", "summary"})
        self.assertFalse({d["document_number"] for d in UNRELATED} & {i["id"] for i in items})
        self.assertEqual(items[0]["id"], "2026-23370")
        dates = [i["date"] for i in items]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_corrections_and_republications_are_skipped(self):
        original = doc("2026-17324", "2026-08-25", "Fee for Certain H-1B Petitions", DHS,
                       type_="Proposed Rule")
        correction = dict(doc("C1-2026-17324", "2026-09-10", "Fee for Certain H-1B Petitions", DHS,
                              type_="Proposed Rule"),
                          correction_of="https://www.federalregister.gov/api/v1/documents/2026-17324")
        # 2010 年以前的更正、重印接口里没有 correction_of,只能看编号
        old_correction = doc("C0-32088", "2001-01-08",
                             "Labor Condition Applications and Requirements for Employers Using "
                             "Nonimmigrants on H-1B Visas in Specialty Occupations", DOL_ETA)
        old_republication = doc("R9-9475", "2009-04-30", "H-1B Visa Notice; Republication", DHS)
        items = self.run_main([correction, original, old_correction, old_republication])["items"]
        self.assertEqual([i["id"] for i in items], ["2026-17324"])

    def test_same_day_order_does_not_depend_on_api_order(self):
        a, b = RELATED[2], doc("2026-20941", "2026-10-14",
                               "Removing Deference to Prior USCIS Determinations of Eligibility", DHS)
        first = [i["id"] for i in self.run_main([a, b])["items"]]
        second = [i["id"] for i in self.run_main([b, a])["items"]]
        self.assertEqual(first, second)

    def test_fetch_failure_exits_without_touching_existing_file(self):
        with patch.object(news, "fetch", return_value=None), self.assertRaises(SystemExit) as cm:
            news.main()
        self.assertEqual(cm.exception.code, 1)
        self.assertEqual(self.out.read_text(), "上一版")


if __name__ == "__main__":
    unittest.main()
