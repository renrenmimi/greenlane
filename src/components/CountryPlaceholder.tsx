"use client";

import { useI18n } from "@/lib/i18n";

export default function CountryPlaceholder({ country }: { country: "uk" | "au" }) {
  const { t } = useI18n();
  const c = t.placeholder[country];

  return (
    <section id="dashboard" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-series-b">
        {t.placeholder.tag}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">{c.name}</h2>
        <span className="rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
          {t.placeholder.badge}
        </span>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h3 className="font-bold">{t.placeholder.overview}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{c.system}</p>
          <ul className="mt-4 space-y-2.5">
            {c.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <span className="mt-0.5 text-series-b">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h3 className="font-bold">{t.placeholder.channels}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">{t.placeholder.channelsDesc}</p>
          <ul className="mt-4 space-y-3">
            {c.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-series-a transition-opacity hover:opacity-80"
                >
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-hairline pt-4 text-xs leading-relaxed text-ink-3">
            {t.placeholder.note}
          </p>
        </div>
      </div>
    </section>
  );
}
