"use client";

import { Bulletin, monthLabel } from "@/lib/bulletin";
import { useI18n } from "@/lib/i18n";

interface Props {
  latest: Pick<Bulletin, "year" | "month">;
  totalBulletins: number;
  caDrawNum: number | null;
  caRoundCount: number;
}

export default function Hero({
  latest,
  totalBulletins,
  caDrawNum,
  caRoundCount,
}: Props) {
  const { lang, t } = useI18n();

  return (
    <section className="relative overflow-hidden pb-16 pt-20">
      {/* 极光背景 */}
      <div
        className="aurora left-[8%] top-[-10%] h-[420px] w-[420px]"
        style={{ background: "var(--series-b)" }}
      />
      <div
        className="aurora right-[5%] top-[10%] h-[380px] w-[460px]"
        style={{ background: "var(--series-a)", animationDelay: "-6s" }}
      />
      <div
        className="aurora bottom-[-30%] left-[35%] h-[360px] w-[520px]"
        style={{ background: "#9085e9", animationDelay: "-12s", opacity: 0.1 }}
      />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        {/* 窄屏文案会换行,胶囊形改为圆角矩形,避免两行文字撑成怪异胶囊 */}
        <div className="fade-up mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-2xl border border-hairline bg-surface px-4 py-2 text-left text-xs text-ink-2 sm:rounded-full sm:py-1.5 sm:text-sm">
          <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-good" />
          <span>{t.hero.recorded(monthLabel(latest, lang), caDrawNum)}</span>
        </div>

        <h1
          className="fade-up mx-auto max-w-4xl text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl md:text-7xl"
          style={{ animationDelay: "0.08s" }}
        >
          {t.hero.h1a}
          <br />
          <span className="bg-gradient-to-r from-series-b via-[#2db3a0] to-series-a bg-clip-text text-transparent">
            {t.hero.h1b}
          </span>
        </h1>

        <p
          className="fade-up mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-2"
          style={{ animationDelay: "0.16s" }}
        >
          {t.hero.sub}
        </p>

        {/* 英文文案较长,窄屏并排会溢出视口,改为等宽堆叠 */}
        <div
          className="fade-up mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
          style={{ animationDelay: "0.24s" }}
        >
          <a
            href="#my-query"
            className="w-full max-w-[280px] rounded-full bg-gradient-to-r from-series-b to-series-a px-7 py-3.5 text-center font-semibold text-white shadow-lg shadow-series-a/20 transition-transform hover:scale-105 sm:w-auto sm:max-w-none"
          >
            {t.hero.ctaQuery}
          </a>
          <a
            href="#subscribe"
            className="w-full max-w-[280px] rounded-full border border-hairline bg-surface px-7 py-3.5 text-center font-semibold text-ink-2 transition-colors hover:border-white/25 hover:text-ink-1 sm:w-auto sm:max-w-none"
          >
            {t.hero.ctaSub}
          </a>
        </div>

        {/* 窄屏用 2×2 栅格,四项严格对齐;sm 以上恢复单行 + 分隔线 */}
        <div
          className="fade-up mx-auto mt-16 grid max-w-sm grid-cols-2 items-center gap-x-6 gap-y-7 text-sm text-ink-3 sm:flex sm:max-w-3xl sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3"
          style={{ animationDelay: "0.32s" }}
        >
          <span className="flex flex-col items-center gap-1 sm:block">
            <strong className="text-xl font-bold text-ink-1 sm:mr-1.5">
              {totalBulletins}
            </strong>
            {t.hero.statBulletins}
          </span>
          <span className="hidden h-4 w-px bg-hairline sm:block" />
          <span className="flex flex-col items-center gap-1 sm:block">
            <strong className="text-xl font-bold text-ink-1 sm:mr-1.5">
              {caRoundCount}
            </strong>
            {t.hero.statDraws}
          </span>
          <span className="hidden h-4 w-px bg-hairline sm:block" />
          <span className="flex flex-col items-center gap-1 sm:block">
            <strong className="text-xl font-bold text-ink-1 sm:mr-1.5">
              {t.hero.statYearsNum}
            </strong>
            {t.hero.statYears}
          </span>
          <span className="hidden h-4 w-px bg-hairline sm:block" />
          <span className="flex flex-col items-center gap-1 sm:block">
            <strong className="text-xl font-bold text-ink-1 sm:mr-1.5">100%</strong>
            {t.hero.statOfficial}
          </span>
        </div>
      </div>
    </section>
  );
}
