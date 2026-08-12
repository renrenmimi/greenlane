"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bulletin,
  COUNTRIES,
  CountryCode,
  EMPLOYMENT_CATEGORIES,
  FAMILY_CATEGORIES,
  TableKey,
  avgAdvance,
  categoryDesc,
  categoryName,
  estimateWaitMonths,
  formatCutoff,
  formatDate,
  getCutoff,
  monthLabel,
  queueLabel,
  trendSeries,
} from "@/lib/bulletin";
import { CanadaData } from "@/lib/canada";
import { MIN_PRIORITY_DATE, toIsoDate } from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import CanadaPanel from "@/components/CanadaPanel";
import CountryPlaceholder from "@/components/CountryPlaceholder";
import { MovementBadge } from "@/components/MyQuery";

const SERIES_A = "#3987e5";
const SERIES_B = "#199e70";

type Kind = "employment" | "family";
type Region = "us" | "ca" | "uk" | "au";

const REGION_FLAGS: Record<Region, string> = {
  us: "🇺🇸",
  ca: "🇨🇦",
  uk: "🇬🇧",
  au: "🇦🇺",
};

/* ─────────────── 图表悬浮读数 ─────────────── */

interface TipPayload {
  payload?: { faRaw?: string; dfRaw?: string };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: number;
}) {
  const { lang, t } = useI18n();
  if (!active || !payload?.length || label == null) return null;
  const p = payload[0]?.payload;
  const d = new Date(label);
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 shadow-2xl">
      <p className="mb-2 text-xs text-ink-3">
        {t.us.tipMonth(d.getUTCFullYear(), d.getUTCMonth() + 1)}
      </p>
      <div className="space-y-1.5 text-sm">
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES_A }} />
          <strong className="text-ink-1">{formatCutoff(p?.faRaw, lang)}</strong>
          <span className="text-ink-3">{t.us.tipA}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES_B }} />
          <strong className="text-ink-1">{formatCutoff(p?.dfRaw, lang)}</strong>
          <span className="text-ink-3">{t.us.tipB}</span>
        </p>
      </div>
    </div>
  );
}

/* ─────────────── 美国排期面板 ─────────────── */

function USPanel({ bulletins, updatedAt }: { bulletins: Bulletin[]; updatedAt: string }) {
  const { lang, t } = useI18n();
  const [kind, setKind] = useState<Kind>("employment");
  const [country, setCountry] = useState<CountryCode>("CN");
  const [table, setTable] = useState<TableKey>("finalAction");
  const [category, setCategory] = useState("EB2");
  const [pdInput, setPdInput] = useState("");
  const now = useNow();
  const today = now ? toIsoDate(now) : undefined;

  const latest = bulletins[bulletins.length - 1];
  const prev = bulletins[bulletins.length - 2];
  const categories = kind === "employment" ? EMPLOYMENT_CATEGORIES : FAMILY_CATEGORIES;

  const switchKind = (k: Kind) => {
    setKind(k);
    setCategory(k === "employment" ? "EB2" : "F2A");
  };

  const points = useMemo(
    () => trendSeries(bulletins, kind, category, country),
    [bulletins, kind, category, country]
  );

  const yearTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = latest.year - 10; y <= latest.year; y += 2) {
      ticks.push(Date.UTC(y, 0, 1));
    }
    return ticks;
  }, [latest.year]);

  const speed = avgAdvance(points);
  const pdMs = pdInput ? Date.parse(pdInput) : null;
  const estimate = pdMs != null && !Number.isNaN(pdMs) ? estimateWaitMonths(points, pdMs) : null;

  const activeCat = categories.find((c) => c.code === category);
  const countryLabel = queueLabel(country, lang);

  return (
    <>
      {/* ══════════ 本月排期一览 ══════════ */}
      <section id="dashboard" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
        <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-series-b">
          {t.us.tag}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            {t.us.title(monthLabel(latest, lang))}
          </h2>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <a
              href={latest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-3 transition-colors hover:text-ink-1"
            >
              {t.us.official}
            </a>
            <span className="text-xs text-ink-3">{t.us.checked(formatDate(updatedAt, lang))}</span>
          </div>
        </div>

        {/* 筛选行:作用于下方所有内容。
            窄屏三组各占一行,避免跨组换行形成错落的阶梯;
            英文标签较长,分段控件在组内可横向滚动而不撑破视口 */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="scroll-row lg:shrink-0">
            <div className="flex w-max rounded-full border border-hairline bg-surface p-1 text-sm">
              {(
                [
                  ["employment", t.query.employment],
                  ["family", t.query.family],
                ] as [Kind, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => switchKind(k)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 font-medium transition-colors sm:px-4 sm:py-1.5 ${
                    kind === k ? "bg-surface-2 text-ink-1" : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCountry(c.code)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 sm:py-1.5 ${
                  country === c.code
                    ? "border-series-a/60 bg-series-a/15 text-ink-1"
                    : "border-hairline bg-surface text-ink-3 hover:text-ink-2"
                }`}
              >
                {lang === "zh" ? c.label : c.labelEn}
              </button>
            ))}
          </div>

          <div className="scroll-row lg:shrink-0">
            <div className="flex w-max rounded-full border border-hairline bg-surface p-1 text-sm">
              {(
                [
                  ["finalAction", t.us.tableA],
                  ["datesForFiling", t.us.tableB],
                ] as [TableKey, string][]
              ).map(([tb, label]) => (
                <button
                  key={tb}
                  onClick={() => setTable(tb)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 font-medium transition-colors sm:px-4 sm:py-1.5 ${
                    table === tb ? "bg-surface-2 text-ink-1" : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 类别卡片 */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const curr = getCutoff(latest, kind, table, cat.code, country);
            const before = getCutoff(prev, kind, table, cat.code, country);
            const selected = category === cat.code;
            return (
              <button
                key={cat.code}
                onClick={() => setCategory(cat.code)}
                className={`group rounded-2xl border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-surface-2 ${
                  selected
                    ? "border-series-a/70 shadow-lg shadow-series-a/10"
                    : "border-hairline"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold">{categoryName(cat, lang)}</span>
                  <span
                    className={`text-xs transition-opacity ${
                      selected
                        ? "text-series-a opacity-100"
                        : "text-ink-3 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {selected ? t.us.selected : t.us.viewTrend}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">
                  {categoryDesc(cat, lang)}
                </p>
                <p
                  className={`mt-4 text-xl font-bold tracking-tight ${
                    curr === "C" ? "text-good" : curr === "U" ? "text-warn" : "text-ink-1"
                  }`}
                >
                  {formatCutoff(curr, lang)}
                  {curr === "C" && lang === "zh" && (
                    <span className="ml-1.5 text-xs font-medium">{t.us.currentBadge}</span>
                  )}
                </p>
                <div className="mt-2">
                  <MovementBadge curr={curr} prev={before} />
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.us.footnote}</p>
      </section>

      {/* ══════════ 十年趋势 ══════════ */}
      <section id="trends" className="border-y border-hairline bg-surface/40">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-series-b">
            {t.us.trendsTag}
          </div>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            {t.us.trendsTitle(
              activeCat ? categoryName(activeCat, lang) : category,
              countryLabel
            )}
          </h2>
          <p className="mt-3 max-w-2xl text-ink-2">{t.us.trendsDesc}</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* 图表卡 */}
            <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
              {/* 图例 */}
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-5 rounded" style={{ background: SERIES_A }} />
                  {t.us.legendA}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-5 rounded" style={{ background: SERIES_B }} />
                  {t.us.legendB}
                </span>
              </div>

              <div className="h-[300px] sm:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="var(--grid)" strokeWidth={1} vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      ticks={yearTicks}
                      tickFormatter={(v: number) => `${new Date(v).getUTCFullYear()}`}
                      tick={{ fill: "var(--ink-3)", fontSize: 12 }}
                      axisLine={{ stroke: "var(--baseline)" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `${new Date(v).getUTCFullYear()}`}
                      tick={{ fill: "var(--ink-3)", fontSize: 12, fontVariantNumeric: "tabular-nums" } as never}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
                    />
                    {pdMs != null && !Number.isNaN(pdMs) && (
                      <ReferenceLine
                        y={pdMs}
                        stroke="var(--ink-3)"
                        strokeWidth={1}
                        label={{
                          value: t.us.yourPd,
                          position: "insideTopRight",
                          fill: "var(--ink-2)",
                          fontSize: 12,
                        }}
                      />
                    )}
                    <Line
                      type="stepAfter"
                      dataKey="fa"
                      stroke={SERIES_A}
                      strokeWidth={2}
                      strokeLinecap="round"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="df"
                      stroke={SERIES_B}
                      strokeWidth={2}
                      strokeLinecap="round"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 数据表(无障碍/打印通道) */}
              <details className="mt-3 border-t border-hairline pt-3 text-sm">
                <summary className="cursor-pointer text-ink-3 transition-colors hover:text-ink-2">
                  {t.us.dataTable}
                </summary>
                <table className="mt-3 w-full text-left [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="text-xs text-ink-3">
                      <th className="py-1.5 font-medium">{t.us.thMonth}</th>
                      <th className="py-1.5 font-medium">{t.us.tipA}</th>
                      <th className="py-1.5 font-medium">{t.us.tipB}</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-2">
                    {points.slice(-12).map((p) => {
                      const d = new Date(p.t);
                      return (
                        <tr key={p.t} className="border-t border-hairline">
                          <td className="py-1.5">
                            {d.getUTCFullYear()}-{String(d.getUTCMonth() + 1).padStart(2, "0")}
                          </td>
                          <td className="py-1.5">{formatCutoff(p.faRaw, lang)}</td>
                          <td className="py-1.5">{formatCutoff(p.dfRaw, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            </div>

            {/* 等待估算 */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-hairline bg-surface p-6">
                <h3 className="font-bold">{t.us.estTitle}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{t.us.estDesc}</p>
                <input
                  type="date"
                  value={pdInput}
                  min={MIN_PRIORITY_DATE}
                  max={today}
                  onChange={(e) => setPdInput(e.target.value)}
                  className="gl-field mt-4"
                />
                {estimate && "current" in estimate && (
                  <p className="mt-4 rounded-xl bg-good/10 px-4 py-3 text-sm font-semibold text-good">
                    {t.us.estCurrent}
                  </p>
                )}
                {estimate && "months" in estimate && (
                  <div className="mt-4 rounded-xl bg-series-a/10 px-4 py-3">
                    <p className="text-2xl font-black text-ink-1">
                      {t.us.estResult(Math.floor(estimate.months / 12), estimate.months % 12)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">
                      {t.us.estNote(
                        activeCat ? categoryName(activeCat, lang) : category,
                        countryLabel,
                        Math.round(estimate.speed)
                      )}
                    </p>
                  </div>
                )}
                {pdInput && estimate === null && (
                  <p className="mt-4 rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">
                    {t.us.estNone}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-hairline bg-surface p-6">
                <h3 className="font-bold">{t.us.speedTitle}</h3>
                <p className="mt-3 text-3xl font-black text-ink-1">
                  {speed == null ? "—" : t.us.speedDays(Math.round(speed))}
                  <span className="ml-1 text-sm font-medium text-ink-3">{t.us.speedUnit}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">
                  {speed == null
                    ? t.us.speedNone
                    : speed >= 30
                      ? t.us.speedFast
                      : speed > 0
                        ? t.us.speedSlow
                        : t.us.speedNeg}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────── 国家切换容器 ─────────────── */

export default function HomeClient({
  bulletins,
  canada,
  usUpdatedAt,
}: {
  bulletins: Bulletin[];
  canada: CanadaData;
  usUpdatedAt: string;
}) {
  const { t } = useI18n();
  const [region, setRegion] = useState<Region>("us");

  return (
    <>
      {/* 国家切换:桌面端居中,窄屏保持可横向滚动 */}
      <div className="sticky top-16 z-40 border-y border-hairline bg-page/80 backdrop-blur-xl">
        <div className="scroll-row mx-auto flex max-w-6xl gap-2 px-5 py-3 md:justify-center">
          {(Object.keys(REGION_FLAGS) as Region[]).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
                region === r
                  ? "border-transparent bg-gradient-to-r from-series-b to-series-a text-white"
                  : "border-hairline bg-surface text-ink-2 hover:text-ink-1"
              }`}
            >
              <span className="text-base">{REGION_FLAGS[r]}</span>
              {t.regions[r]}
            </button>
          ))}
        </div>
      </div>

      {region === "us" && <USPanel bulletins={bulletins} updatedAt={usUpdatedAt} />}
      {region === "ca" && <CanadaPanel data={canada} />}
      {region === "uk" && <CountryPlaceholder country="uk" />}
      {region === "au" && <CountryPlaceholder country="au" />}
    </>
  );
}
