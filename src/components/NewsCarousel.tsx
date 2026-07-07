"use client";

import { useEffect, useState } from "react";
import { NEWS, NewsItem } from "@/data/news";
import { formatDate } from "@/lib/bulletin";
import { useI18n } from "@/lib/i18n";

export interface LiveNewsItem {
  id: string;
  title: string;
  typeLabel: string;
  date: string;
  url: string;
  agencies: string[];
  summary: string;
}

const TAG_STYLES: Record<string, string> = {
  "H-1B": "bg-series-a/15 text-series-a",
  排期解读: "bg-series-b/15 text-series-b",
  "EB-5": "bg-[#9085e9]/15 text-[#9085e9]",
  事实核查: "bg-warn/15 text-warn",
  最终规则: "bg-bad/15 text-bad",
  拟议规则: "bg-warn/15 text-warn",
  官方公告: "bg-series-a/15 text-series-a",
  总统令: "bg-[#9085e9]/15 text-[#9085e9]",
};

function tagStyle(tag: string): string {
  return TAG_STYLES[tag] ?? "bg-surface-2 text-ink-2";
}

/* 卡片底部动作行:每条新闻都有「对我有影响吗?」+「查看官方原文」 */
function CardActions({ url, onAsk }: { url: string; onAsk: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={onAsk}
        className="rounded-full border border-series-a/50 px-4 py-1.5 text-sm font-semibold text-series-a transition-colors hover:bg-series-a hover:text-white"
      >
        {t.news.askBtn}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-hairline px-4 py-1.5 text-sm font-semibold text-ink-2 transition-colors hover:border-series-a/60 hover:text-series-a"
      >
        {t.news.viewOfficial}
      </a>
    </div>
  );
}

/* 实时抓取的官方法规卡片 */
function LiveCard({ item, onAsk }: { item: LiveNewsItem; onAsk: (title: string) => void }) {
  const { lang, t } = useI18n();
  return (
    <article className="flex w-[360px] shrink-0 flex-col rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:bg-surface-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tagStyle(item.typeLabel)}`}>
          {t.news.typeLabels[item.typeLabel] ?? item.typeLabel}
        </span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-3">
          {t.news.liveBadge}
        </span>
        <span className="text-xs text-ink-3">{item.date}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 font-bold leading-snug">{item.title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-3">
        {item.summary ||
          (item.agencies.length > 0 ? t.news.agencies(item.agencies.join(lang === "zh" ? "、" : ", ")) : "")}
      </p>
      <CardActions url={item.url} onAsk={() => onAsk(item.title)} />
    </article>
  );
}

/* 专题解读卡片 */
function CuratedCard({ item, onAsk }: { item: NewsItem; onAsk: (title: string) => void }) {
  const { lang, t } = useI18n();
  const title = lang === "zh" ? item.title : item.titleEn;
  return (
    <article className="flex w-[360px] shrink-0 flex-col rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:bg-surface-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tagStyle(item.tag)}`}>
          {t.news.tags[item.tag] ?? item.tag}
        </span>
        <span className="rounded-md bg-series-b/10 px-2 py-0.5 text-xs font-medium text-series-b">
          {t.news.curatedBadge}
        </span>
        <span className="text-xs text-ink-3">{item.date}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 font-bold leading-snug">{title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-3">
        {lang === "zh" ? item.summary : item.summaryEn}
      </p>
      <CardActions url={item.url} onAsk={() => onAsk(title)} />
    </article>
  );
}

/* AI 个性化分析 · 即将上线预告 */
function AiComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 渐变头部 */}
        <div className="relative bg-gradient-to-br from-series-b/20 via-surface to-series-a/20 px-6 pb-6 pt-7 text-center">
          <button
            onClick={onClose}
            aria-label="close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-hairline text-ink-3 transition-colors hover:text-ink-1"
          >
            ✕
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-series-b/40 bg-series-b/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-series-b">
            ✨ {t.news.aiBadge}
          </span>
          <h3 className="mt-4 text-2xl font-black tracking-tight">{t.news.aiTitle}</h3>
        </div>

        <div className="px-6 pb-6">
          <p className="rounded-xl bg-page px-4 py-3 text-sm font-medium leading-snug text-ink-2">
            「{title}」
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.news.aiBody}</p>

          <a
            href="#subscribe"
            onClick={onClose}
            className="mt-5 block rounded-full bg-gradient-to-r from-series-b to-series-a py-3 text-center font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            {t.news.aiCta}
          </a>

          <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.news.aiDisclaimer}</p>
        </div>
      </div>
    </div>
  );
}

export default function NewsCarousel({
  liveNews,
  updatedAt,
}: {
  liveNews: LiveNewsItem[];
  updatedAt: string;
}) {
  const { lang, t } = useI18n();
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  /* 官方法规与专题解读交替排列,再整体复制一份用于无缝轮转 */
  const merged: ({ kind: "live"; item: LiveNewsItem } | { kind: "curated"; item: NewsItem })[] = [];
  const maxLen = Math.max(liveNews.length, NEWS.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < liveNews.length) merged.push({ kind: "live", item: liveNews[i] });
    if (i < NEWS.length) merged.push({ kind: "curated", item: NEWS[i] });
  }
  const doubled = [...merged, ...merged];

  return (
    <section id="news" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-series-b">
          {t.news.tag}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">{t.news.title}</h2>
          <span className="mb-1.5 rounded-md border border-hairline px-2 py-0.5 text-xs text-ink-3">
            {t.news.updatedBadge(formatDate(updatedAt, lang))}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-ink-2">{t.news.desc}</p>
      </div>

      {/* 移动端/平板竖屏:横向滑动,触屏友好 */}
      <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:hidden">
        {merged.map((entry, i) =>
          entry.kind === "live" ? (
            <div key={`m-live-${entry.item.id}-${i}`} className="snap-start">
              <LiveCard item={entry.item} onAsk={setActiveTitle} />
            </div>
          ) : (
            <div key={`m-curated-${entry.item.id}-${i}`} className="snap-start">
              <CuratedCard item={entry.item} onAsk={setActiveTitle} />
            </div>
          )
        )}
      </div>

      {/* 桌面端:自动轮转,悬停暂停 */}
      <div className="relative mt-10 hidden overflow-hidden md:block">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-page to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-page to-transparent" />
        <div className="marquee-track flex gap-4 pr-4">
          {doubled.map((entry, i) =>
            entry.kind === "live" ? (
              <LiveCard key={`live-${entry.item.id}-${i}`} item={entry.item} onAsk={setActiveTitle} />
            ) : (
              <CuratedCard
                key={`curated-${entry.item.id}-${i}`}
                item={entry.item}
                onAsk={setActiveTitle}
              />
            )
          )}
        </div>
      </div>

      {activeTitle && (
        <AiComingSoonModal title={activeTitle} onClose={() => setActiveTitle(null)} />
      )}
    </section>
  );
}
