"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bulletin,
  CountryCode,
  EMPLOYMENT_CATEGORIES,
  FAMILY_CATEGORIES,
  TrendKey,
  categoryDesc,
  categoryName,
  estimateWaitMonths,
  formatCutoff,
  getCutoff,
  isDate,
  movement,
  queueLabel,
  trendSeries,
} from "@/lib/bulletin";
import {
  OTHER_COUNTRIES,
  POPULAR_COUNTRIES,
  birthCountryName,
  findBirthCountry,
} from "@/lib/countries";
import { forecastNextBulletin, shortMonth } from "@/lib/schedule";
import { formatDate, monthLabel } from "@/lib/bulletin";
import { useI18n } from "@/lib/i18n";

const DAY = 86_400_000;

type Kind = "employment" | "family";

/* 变化标识:MyQuery 与美国面板共用 */
export function MovementBadge({ curr, prev }: { curr?: string; prev?: string }) {
  const { t } = useI18n();
  const m = movement(curr, prev);
  switch (m.kind) {
    case "advance":
      return (
        <span className="text-sm font-semibold text-good">{t.movement.advance(m.days)}</span>
      );
    case "retrogress":
      return (
        <span className="text-sm font-semibold text-bad">{t.movement.retrogress(m.days)}</span>
      );
    case "same":
      return <span className="text-sm text-ink-3">{t.movement.same}</span>;
    case "status":
      return (
        <span className="text-sm font-semibold text-warn">{t.movement[m.change]}</span>
      );
    default:
      return <span className="text-sm text-ink-3">{t.movement.none}</span>;
  }
}

/* 查询我的排期:置顶首屏,进站即查 */
export default function MyQuery({
  bulletins,
  updatedAt,
}: {
  bulletins: Bulletin[];
  updatedAt: string;
}) {
  const { lang, t } = useI18n();
  const [category, setCategory] = useState("EB2");
  const [birthCode, setBirthCode] = useState("CN");
  const [pd, setPd] = useState("");
  /* 估算基准:表A(排到即可获批) / 表B(排到即可递交 I-485) */
  const [basis, setBasis] = useState<TrendKey>("fa");
  /* 挂载后再取本地时间,避免 SSR 水合不一致 */
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const birth = findBirthCountry(birthCode);
  const country: CountryCode = birth?.queue ?? "ALL";

  const latest = bulletins[bulletins.length - 1];
  const prev = bulletins[bulletins.length - 2];
  const kind: Kind = category.startsWith("F") ? "family" : "employment";

  const cutA = getCutoff(latest, kind, "finalAction", category, country);
  const cutB = getCutoff(latest, kind, "datesForFiling", category, country);
  const prevA = getCutoff(prev, kind, "finalAction", category, country);
  const prevB = getCutoff(prev, kind, "datesForFiling", category, country);

  const pdMs = pd ? Date.parse(pd) : NaN;
  const hasPd = !Number.isNaN(pdMs);

  const points = useMemo(
    () => trendSeries(bulletins, kind, category, country),
    [bulletins, kind, category, country]
  );

  /* 按所选基准表判定状态 */
  const cut = basis === "fa" ? cutA : cutB;
  let status: "currentA" | "currentB" | "paused" | "waiting" | null = null;
  if (hasPd) {
    const current = cut === "C" || (isDate(cut) && pdMs < Date.parse(cut));
    if (current) {
      /* 选表B但表A也已排到时,给出更强的「表A已排到」结论 */
      const alsoA = cutA === "C" || (isDate(cutA) && pdMs < Date.parse(cutA));
      status = basis === "fa" || alsoA ? "currentA" : "currentB";
    } else if (cut === "U") status = "paused";
    else status = "waiting";
  }

  const gapDays =
    status === "waiting" && isDate(cut) ? (pdMs - Date.parse(cut)) / DAY : null;
  const estimate = hasPd ? estimateWaitMonths(points, pdMs, basis) : null;
  const basisName = basis === "fa" ? t.query.tableAName : t.query.tableBName;

  const gapText =
    gapDays != null
      ? t.query.yearsMonths(
          Math.floor(Math.round(gapDays / 30.44) / 12),
          Math.round(gapDays / 30.44) % 12
        )
      : null;

  const catList = [...EMPLOYMENT_CATEGORIES, ...FAMILY_CATEGORIES];
  const catInfo = catList.find((c) => c.code === category);
  const queueName = queueLabel(country, lang);

  /* 出生地与队伍不同名时,提示自动映射结果(如巴基斯坦/香港/台湾→全球) */
  const showQueueNote = birth && birth.code !== "OTHER" && birth.queue === "ALL";

  /* 下一期公告发布预测 */
  const forecast = now ? forecastNextBulletin(latest, now) : null;
  const nextMonthName = forecast ? shortMonth(forecast.nextBulletin.month, lang) : "";

  return (
    <div id="my-query" className="relative scroll-mt-20 overflow-hidden">
      {/* 首屏极光点缀:外层 overflow-hidden 裁剪,避免撑宽移动端视口 */}
      <div
        className="aurora left-[-5%] top-[10%] h-[300px] w-[340px]"
        style={{ background: "var(--series-b)" }}
      />
      <div
        className="aurora right-[-5%] top-[30%] h-[280px] w-[340px]"
        style={{ background: "var(--series-a)", animationDelay: "-8s" }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-4 pt-24 md:pt-28">
      <div className="rounded-3xl bg-gradient-to-r from-series-b to-series-a p-[1.5px]">
        <div className="rounded-3xl bg-[#141413] p-6 md:p-10">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            🇺🇸 {t.query.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.query.desc}</p>

          {/* 公告状态条:当前展示月份 + 下一期发布预测 */}
          <div className="mt-4 rounded-xl border border-hairline bg-page/60 px-4 py-3 text-xs leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5 font-semibold text-ink-1">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-good" />
                {t.forecast.showing(monthLabel(latest, lang))}
              </span>
              <span className="text-ink-3">{t.forecast.checked(formatDate(updatedAt, lang))}</span>
            </div>
            {forecast && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline pt-2">
                <span className="font-semibold text-series-b">
                  {forecast.status === "overdue"
                    ? t.forecast.etaOverdue(nextMonthName)
                    : forecast.daysToPeak <= 1
                      ? t.forecast.etaImminent(nextMonthName)
                      : t.forecast.eta(
                          nextMonthName,
                          formatDate(forecast.peak.iso, lang),
                          forecast.daysToPeak
                        )}
                </span>
                {forecast.status !== "overdue" && (
                  <span className="flex flex-wrap gap-1.5">
                    {forecast.days.slice(0, 3).map((d) => (
                      <span
                        key={d.iso}
                        className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2 [font-variant-numeric:tabular-nums]"
                      >
                        {formatDate(d.iso, lang)} {Math.round(d.prob * 100)}%
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}
            {forecast && <p className="mt-1.5 text-ink-3">{t.forecast.note}</p>}
          </div>

          {/* 输入行 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                {t.query.catLabel}
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-page px-4 py-3 text-ink-1 outline-none [color-scheme:dark] focus:border-series-a/60"
              >
                <optgroup label={t.query.employment}>
                  {EMPLOYMENT_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} · {categoryDesc(c, lang)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t.query.family}>
                  {FAMILY_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} · {categoryDesc(c, lang)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                {t.query.countryLabel}
              </span>
              <select
                value={birthCode}
                onChange={(e) => setBirthCode(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-page px-4 py-3 text-ink-1 outline-none [color-scheme:dark] focus:border-series-a/60"
              >
                <optgroup label={t.query.popularGroup}>
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {birthCountryName(c, lang)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t.query.otherGroup}>
                  {OTHER_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {birthCountryName(c, lang)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                {t.query.pdLabel}
              </span>
              <input
                type="date"
                value={pd}
                onChange={(e) => setPd(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-page px-4 py-[11px] text-ink-1 outline-none [color-scheme:dark] focus:border-series-a/60"
              />
            </label>
          </div>

          {/* 队伍映射说明:港澳台/其他国家出生自动归入正确队伍 */}
          {showQueueNote && (
            <p className="mt-3 rounded-xl bg-series-a/10 px-4 py-2.5 text-sm text-ink-2">
              {t.query.queueNote(birthCountryName(birth, lang), queueName)}
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-ink-3">{t.query.chargeTip}</p>

          {/* 查询结果 */}
          {hasPd && status && (
            <div className="fade-up mt-6">
              {status === "currentA" && (
                <div className="rounded-2xl bg-good/10 px-5 py-4">
                  <p className="text-lg font-bold text-good">{t.query.currentATitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {t.query.currentABody(
                      catInfo ? categoryName(catInfo, lang) : category,
                      queueName
                    )}
                  </p>
                </div>
              )}
              {status === "currentB" && (
                <div className="rounded-2xl bg-series-a/10 px-5 py-4">
                  <p className="text-lg font-bold text-series-a">{t.query.currentBTitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {t.query.currentBBody}
                  </p>
                </div>
              )}
              {status === "paused" && (
                <div className="rounded-2xl bg-warn/10 px-5 py-4">
                  <p className="text-lg font-bold text-warn">{t.query.pausedTitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t.query.pausedBody}</p>
                </div>
              )}
              {status === "waiting" && (
                <div className="rounded-2xl bg-surface px-5 py-4">
                  <p className="text-lg font-bold text-ink-1">
                    {t.query.waitingTitle(gapText, basisName)}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {estimate && "months" in estimate
                      ? t.query.waitingEstimate(
                          Math.round(estimate.speed),
                          t.query.yearsMonths(
                            Math.floor(estimate.months / 12),
                            estimate.months % 12
                          ),
                          basisName
                        )
                      : t.query.waitingNoEstimate}
                  </p>
                </div>
              )}

              {/* 估算基准切换:点选表A或表B卡片 */}
              <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.query.basisHint}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["fa", t.query.tableACard, cutA, prevA],
                    ["df", t.query.tableBCard, cutB, prevB],
                  ] as [TrendKey, string, string | undefined, string | undefined][]
                ).map(([key, label, curr, prev2]) => {
                  const selected = basis === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setBasis(key)}
                      aria-pressed={selected}
                      className={`group rounded-2xl border bg-surface px-5 py-4 text-left transition-all ${
                        selected
                          ? "border-series-a/70 shadow-lg shadow-series-a/10"
                          : "border-hairline hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs text-ink-3">{label}</p>
                        <span
                          className={`whitespace-nowrap text-xs font-semibold ${
                            selected
                              ? "text-series-a"
                              : "text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
                          }`}
                        >
                          {selected ? t.query.basisSelected : t.query.basisSwitch}
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-bold">{formatCutoff(curr, lang)}</p>
                      <div className="mt-1">
                        <MovementBadge curr={curr} prev={prev2} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
