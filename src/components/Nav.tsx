"use client";

import { useI18n } from "@/lib/i18n";

export default function Nav() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-page/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-series-b to-series-a text-sm font-black text-white">
            G
          </span>
          <span className="whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
            GreenLane
            <span className="ml-2 hidden rounded-md border border-hairline px-1.5 py-0.5 text-xs font-medium text-ink-2 sm:inline">
              {t.nav.badge}
            </span>
          </span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
          <a href="#dashboard" className="transition-colors hover:text-ink-1">
            {t.nav.data}
          </a>
          <a href="#trends" className="transition-colors hover:text-ink-1">
            {t.nav.trends}
          </a>
          <a href="#news" className="transition-colors hover:text-ink-1">
            {t.nav.news}
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {/* 语言切换:显示目标语言,点击即切 */}
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            aria-label={lang === "zh" ? "Switch to English" : "切换为中文"}
            className="shrink-0 whitespace-nowrap rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:text-ink-1"
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
          <a
            href="#subscribe"
            className="whitespace-nowrap rounded-full bg-gradient-to-r from-series-b to-series-a px-3 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 sm:px-4"
          >
            <span className="sm:hidden">{t.nav.subscribeShort}</span>
            <span className="hidden sm:inline">{t.nav.subscribe}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
