"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();

  const sources = [
    {
      label: t.footer.srcBulletin,
      url: "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html",
    },
    { label: t.footer.srcUscis, url: "https://egov.uscis.gov/processing-times/" },
    {
      label: t.footer.srcIrcc,
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html",
    },
    { label: t.footer.srcFedReg, url: "https://www.federalregister.gov" },
  ];

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-series-b to-series-a text-xs font-black text-white">
              G
            </span>
            <span className="font-bold">{t.footer.brand}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">{t.footer.blurb}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-2">{t.footer.sourcesTitle}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-3">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-ink-1"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-2">{t.footer.disclaimerTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">{t.footer.disclaimer}</p>
        </div>
      </div>
      <div className="border-t border-hairline py-5 text-center text-xs text-ink-3">
        {t.footer.copyright}
      </div>
    </footer>
  );
}
