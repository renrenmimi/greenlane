"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CA_GROUPS, CanadaData, formatCaDate, groupLabel, latestByGroup } from "@/lib/canada";
import { useI18n } from "@/lib/i18n";

const SERIES = "#3987e5";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { date?: string; name?: string; crs?: number; invitations?: number | null } }[];
}) {
  const { lang, t } = useI18n();
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 shadow-2xl">
      <p className="text-xs text-ink-3">{p.date && formatCaDate(p.date, lang)}</p>
      <p className="mt-1 max-w-[260px] text-xs text-ink-2">{p.name}</p>
      <p className="mt-2 text-sm">
        <strong className="text-lg text-ink-1">{p.crs}</strong>
        <span className="ml-1.5 text-ink-3">{t.canada.crsLabel}</span>
      </p>
      {p.invitations != null && (
        <p className="text-sm text-ink-2">
          {p.invitations.toLocaleString()} <span className="text-ink-3">{t.canada.invitedLabel}</span>
        </p>
      )}
    </div>
  );
}

export default function CanadaPanel({ data }: { data: CanadaData }) {
  const { lang, t } = useI18n();
  const [group, setGroup] = useState("CEC");

  const latest = data.rounds[data.rounds.length - 1];
  const groupRounds = useMemo(() => latestByGroup(data.rounds, group), [data.rounds, group]);
  const latestInGroup = groupRounds[groupRounds.length - 1];
  const prevInGroup = groupRounds[groupRounds.length - 2];
  const crsDelta =
    latestInGroup && prevInGroup ? latestInGroup.crs - prevInGroup.crs : null;

  const chartData = useMemo(
    () =>
      groupRounds.map((r) => ({
        t: Date.parse(r.date),
        crs: r.crs,
        date: r.date,
        name: r.name,
        invitations: r.invitations,
      })),
    [groupRounds]
  );

  const recentRounds = [...data.rounds].slice(-12).reverse();

  return (
    <section id="dashboard" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-series-b">
        {t.canada.tag}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">{t.canada.title}</h2>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <a
            href="https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-3 transition-colors hover:text-ink-1"
          >
            {t.canada.official}
          </a>
          <span className="text-xs text-ink-3">
            {t.canada.checked(formatCaDate(data.updatedAt, lang))}
          </span>
        </div>
      </div>

      {/* 最新一轮抽签概览 */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="text-xs text-ink-3">{t.canada.latestDraw}</p>
          <p className="mt-2 text-xl font-bold">{t.canada.drawNum(latest.num)}</p>
          <p className="mt-1 text-sm text-ink-2">{formatCaDate(latest.date, lang)}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="text-xs text-ink-3">{t.canada.drawCat}</p>
          <p className="mt-2 text-xl font-bold">{groupLabel(latest.group, lang)}</p>
          <p className="mt-1 line-clamp-1 text-sm text-ink-2">{latest.name}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="text-xs text-ink-3">{t.canada.crsCutoff}</p>
          <p className="mt-2 text-xl font-bold">{latest.crs}</p>
          <p className="mt-1 text-sm text-ink-2">{t.canada.crsNote}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="text-xs text-ink-3">{t.canada.invitations}</p>
          <p className="mt-2 text-xl font-bold">
            {latest.invitations?.toLocaleString() ?? "—"}
          </p>
          <p className="mt-1 text-sm text-ink-2">{t.canada.invitationsNote}</p>
        </div>
      </div>

      {/* 分数线趋势 */}
      <div className="mt-10">
        <h3 className="text-xl font-bold">{t.canada.trendTitle(groupLabel(group, lang))}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {CA_GROUPS.map((g) => (
            <button
              key={g.code}
              onClick={() => setGroup(g.code)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                group === g.code
                  ? "border-series-a/60 bg-series-a/15 text-ink-1"
                  : "border-hairline bg-surface text-ink-3 hover:text-ink-2"
              }`}
            >
              {lang === "zh" ? g.label : g.labelEn}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-hairline bg-surface p-5">
          {chartData.length >= 2 ? (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-2">{t.canada.chartNote(chartData.length)}</span>
                {crsDelta != null && (
                  <span
                    className={`font-semibold ${
                      crsDelta < 0 ? "text-good" : crsDelta > 0 ? "text-bad" : "text-ink-3"
                    }`}
                  >
                    {crsDelta === 0
                      ? t.canada.deltaSame
                      : crsDelta > 0
                        ? t.canada.deltaUp(crsDelta)
                        : t.canada.deltaDown(-crsDelta)}
                  </span>
                )}
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid stroke="var(--grid)" strokeWidth={1} vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(v: number) => `${new Date(v).getUTCFullYear()}`}
                      tick={{ fill: "var(--ink-3)", fontSize: 12 }}
                      axisLine={{ stroke: "var(--baseline)" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      domain={["auto", "auto"]}
                      tick={{ fill: "var(--ink-3)", fontSize: 12, fontVariantNumeric: "tabular-nums" } as never}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
                    />
                    <Line
                      type="linear"
                      dataKey="crs"
                      stroke={SERIES}
                      strokeWidth={2}
                      strokeLinecap="round"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-ink-3">{t.canada.insufficient}</p>
          )}
        </div>
      </div>

      {/* 近期抽签记录 */}
      <div className="mt-10 rounded-2xl border border-hairline bg-surface p-5">
        <h3 className="text-xl font-bold">{t.canada.recentTitle}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="text-xs text-ink-3">
                <th className="py-2 font-medium">{t.canada.thDraw}</th>
                <th className="py-2 font-medium">{t.canada.thDate}</th>
                <th className="py-2 font-medium">{t.canada.thCat}</th>
                <th className="py-2 text-right font-medium">{t.canada.thCrs}</th>
                <th className="py-2 text-right font-medium">{t.canada.thInvited}</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {recentRounds.map((r) => (
                <tr key={`${r.num}-${r.date}`} className="border-t border-hairline">
                  <td className="py-2.5">{r.num}</td>
                  <td className="py-2.5">{formatCaDate(r.date, lang)}</td>
                  <td className="py-2.5">
                    <span className="rounded-md bg-series-a/10 px-2 py-0.5 text-xs font-medium text-series-a">
                      {groupLabel(r.group, lang)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-ink-1">{r.crs}</td>
                  <td className="py-2.5 text-right">{r.invitations?.toLocaleString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.canada.footnote}</p>
      </div>
    </section>
  );
}
