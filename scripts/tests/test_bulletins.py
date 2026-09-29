import contextlib
import io
import json
from datetime import date
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import scrape_bulletins as scraper

FIXTURES = Path(__file__).parent / "fixtures"
TODAY = date(2026, 9, 29)


class BulletinTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name) / "bulletins.json"
        history = json.loads(scraper.OUT.read_text())["bulletins"]
        self.original = json.dumps({
            "updatedAt": "2026-07-01", "source": scraper.BASE,
            "bulletins": [b for b in history if (b["year"], b["month"]) <= (2026, 7)],
        })
        self.out.write_text(self.original)
        self.pages = {scraper.bulletin_url(2026, m):
                      (FIXTURES / f"2026-{m:02d}.html").read_text()
                      for m in (8, 9, 10)}
        self.pages[scraper.BASE + ".html"] = "".join(
            f'<a href="{url}">Bulletin</a>' for url in self.pages)
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        self.stack.enter_context(patch.object(scraper.time, "sleep"))

    def update(self):
        scraper.update(self.pages.__getitem__, self.out, today=TODAY)

    def assert_preserved(self):
        self.assertEqual(self.out.read_text(), self.original)

    def test_backfills_all_missing_months_and_october_tables(self):
        self.update()
        doc = json.loads(self.out.read_text())
        self.assertEqual(len(doc["bulletins"]), 133)
        self.assertEqual(doc["updatedAt"], "2026-09-29")
        latest = doc["bulletins"][-1]
        self.assertEqual(latest["month"], 10)
        self.assertEqual(latest["employment"]["finalAction"]["EB2"]["CN"], "2021-10-01")
        self.assertEqual(latest["employment"]["datesForFiling"]["EB2"]["CN"], "2023-01-01")
        self.assertEqual(latest["family"]["finalAction"]["F4"]["PH"], "2008-05-15")
        self.assertEqual(doc["bulletins"][-3]["employment"]["finalAction"]["EB2"]["IN"], "U")

    def test_network_failure_preserves_entire_file(self):
        with self.assertRaises(scraper.FetchError):
            scraper.update(lambda _: (_ for _ in ()).throw(scraper.FetchError("HTTP 403")),
                           self.out, today=TODAY)
        self.assert_preserved()

    def test_failure_after_one_success_does_not_publish_partial_update(self):
        self.pages[scraper.bulletin_url(2026, 9)] = "<h1>Access denied</h1>"
        with self.assertRaises(scraper.FetchError):
            self.update()
        self.assert_preserved()

    def test_missing_country_cell_rejects_whole_bulletin(self):
        url = scraper.bulletin_url(2026, 10)
        self.pages[url] = self.pages[url].replace("<td>01OCT21</td>", "<td></td>")
        with self.assertRaisesRegex(ValueError, "EB2.CN"):
            self.update()
        self.assert_preserved()

    def test_missing_filing_table_rejects_whole_bulletin(self):
        url = scraper.bulletin_url(2026, 10)
        self.pages[url] = self.pages[url].rsplit("<table>", 1)[0]
        with self.assertRaises(ValueError):
            self.update()
        self.assert_preserved()

    def test_unpublished_next_month_is_not_requested(self):
        self.pages[scraper.BASE + ".html"] = self.pages[scraper.BASE + ".html"].replace(
            f'<a href="{scraper.bulletin_url(2026, 10)}">Bulletin</a>', "")
        del self.pages[scraper.bulletin_url(2026, 10)]
        self.update()
        self.assertEqual(json.loads(self.out.read_text())["bulletins"][-1]["month"], 9)

    def test_rechecks_already_recorded_latest_for_corrections(self):
        self.update()
        url = scraper.bulletin_url(2026, 10)
        self.pages[url] = self.pages[url].replace("01OCT21", "02OCT21")
        self.update()
        latest = json.loads(self.out.read_text())["bulletins"][-1]
        self.assertEqual(latest["employment"]["finalAction"]["EB2"]["CN"], "2021-10-02")

    def test_stale_index_cannot_advance_checked_date(self):
        self.pages[scraper.BASE + ".html"] = f'<a href="{scraper.bulletin_url(2026, 8)}">August</a>'
        with self.assertRaises(scraper.FetchError):
            self.update()
        self.assert_preserved()

    def test_block_page_with_http_200_is_not_valid_content(self):
        self.assertFalse(scraper.Fetcher.has_content(
            "<title>Just a moment...</title><table></table>", scraper.bulletin_url(2026, 10)))

    def test_invalid_calendar_dates_are_rejected(self):
        self.assertIsNone(scraper.parse_value("31FEB26"))
        self.assertEqual(scraper.parse_value("29FEB24"), "2024-02-29")

    def test_empty_directory_does_not_advance_checked_date(self):
        self.pages[scraper.BASE + ".html"] = "<html>New layout</html>"
        with self.assertRaises(scraper.FetchError):
            self.update()
        self.assert_preserved()

    def test_directory_only_accepts_official_links_and_fiscal_year(self):
        good = scraper.bulletin_url(2026, 10)
        self.assertIn("/2027/", good)
        index = f'<a href="{good}">October</a><a href="https://example.com/visa-bulletin-for-november-2026.html">Other</a>'
        self.assertEqual(scraper.discover_bulletins(index), {(2026, 10): good})

    def test_alternate_official_directory_links_are_canonicalized(self):
        canonical = scraper.bulletin_url(2026, 10)
        alternate = canonical.replace("travel.state.gov", "adoption.state.gov")
        self.assertEqual(scraper.discover_bulletins(f'<a href="{alternate}">October</a>'),
                         {(2026, 10): canonical})

    def test_403_falls_back_to_official_host_and_reuses_it(self):
        url = scraper.bulletin_url(2026, 10)
        alternate = url.replace("travel.state.gov", "adoption.state.gov")
        failed = SimpleNamespace(returncode=22, stdout="blocked\n" + url, stderr="HTTP 403")
        good = SimpleNamespace(returncode=0, stdout=self.pages[url] + "\n" + alternate, stderr="")
        with patch.object(scraper.subprocess, "run", side_effect=[failed, good, good]) as run, \
             contextlib.redirect_stderr(io.StringIO()):
            fetcher = scraper.Fetcher()
            self.assertEqual(fetcher(url), self.pages[url])
            self.assertEqual(fetcher(url), self.pages[url])
        self.assertEqual([call.args[0][-1] for call in run.call_args_list], [url, alternate, alternate])

    def test_both_hosts_blocked_raises_instead_of_returning_cached_data(self):
        url = scraper.bulletin_url(2026, 10)
        failed = SimpleNamespace(returncode=22, stdout="blocked\n" + url, stderr="HTTP 403")
        with patch.object(scraper.subprocess, "run", return_value=failed) as run, \
             contextlib.redirect_stderr(io.StringIO()), \
             self.assertRaises(scraper.FetchError):
            scraper.Fetcher()(url)
        self.assertEqual(run.call_count, 2)

    def test_redirect_to_nonofficial_host_is_rejected(self):
        url = scraper.bulletin_url(2026, 10)
        response = SimpleNamespace(returncode=0, stdout=self.pages[url] + "\nhttps://example.com", stderr="")
        with patch.object(scraper.subprocess, "run", return_value=response), \
             contextlib.redirect_stderr(io.StringIO()), \
             self.assertRaises(scraper.FetchError):
            scraper.Fetcher()(url)

    def test_http_200_challenge_falls_back(self):
        url = scraper.bulletin_url(2026, 10)
        challenge = SimpleNamespace(returncode=0, stdout="<title>Just a moment...</title>\n" + url, stderr="")
        good = SimpleNamespace(returncode=0, stdout=self.pages[url] + "\n" + url, stderr="")
        with patch.object(scraper.subprocess, "run", side_effect=[challenge, good]), \
             contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(scraper.Fetcher()(url), self.pages[url])

    def test_cli_reports_failure_with_nonzero_exit(self):
        with patch.object(sys, "argv", ["scrape_bulletins.py"]), \
             patch.object(scraper, "update", side_effect=scraper.FetchError("HTTP 403")), \
             contextlib.redirect_stderr(io.StringIO()) as errors:
            self.assertEqual(scraper.main(), 1)
            self.assertIn("HTTP 403", errors.getvalue())
        self.assert_preserved()


if __name__ == "__main__":
    unittest.main()
