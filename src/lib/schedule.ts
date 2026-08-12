import { Lang } from "@/lib/bulletin";

/**
 * 下一期 Visa Bulletin 发布日预测。
 *
 * 国务院惯例:每月上中旬(约 8-16 日)发布「下个月」的排期公告,且仅在工作日发布。
 * 例如 8 月排期通常于 7 月上中旬发布。
 * 下方基础权重为按历史发布规律构造的经验分布;落在周末的权重顺延至下一个工作日。
 * 预测仅供参考,非官方时间。
 */

const DAY = 86_400_000;

/** 日期(号) → 基础概率 */
const BASE_WEIGHTS: [number, number][] = [
  [8, 0.06],
  [9, 0.12],
  [10, 0.18],
  [11, 0.2],
  [12, 0.16],
  [13, 0.12],
  [14, 0.08],
  [15, 0.05],
  [16, 0.03],
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function shortMonth(month: number, lang: Lang): string {
  return lang === "zh" ? `${month} 月` : MONTHS_EN[month - 1];
}

function isWeekend(y: number, m: number, d: number): boolean {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export interface ForecastDay {
  /** 发布月内的几号 */
  day: number;
  /** ISO 日期 */
  iso: string;
  prob: number;
}

export interface Forecast {
  /** 下一期公告对应的排期月份(如 8 月排期) */
  nextBulletin: { year: number; month: number };
  /** 概率从高到低的候选发布日 */
  days: ForecastDay[];
  peak: ForecastDay;
  /** 距最可能发布日的天数(可为负) */
  daysToPeak: number;
  /** upcoming=窗口未到 window=已进入发布窗口 overdue=已过窗口 */
  status: "upcoming" | "window" | "overdue";
}

/** latest 为当前已收录的最新公告月份;now 为用户本地时间 */
export function forecastNextBulletin(
  latest: { year: number; month: number },
  now: Date
): Forecast {
  /* 8 月排期发布于 7 月:发布窗口 = 最新公告的同名月 */
  const release = { year: latest.year, month: latest.month };
  const nextBulletin =
    latest.month === 12
      ? { year: latest.year + 1, month: 1 }
      : { year: latest.year, month: latest.month + 1 };

  /* 周末权重对半分给前后最近的工作日(官方遇周末既可能提前也可能推迟) */
  const acc = new Map<number, number>();
  const add = (day: number, w: number) => acc.set(day, (acc.get(day) ?? 0) + w);
  for (const [d, w] of BASE_WEIGHTS) {
    if (!isWeekend(release.year, release.month, d)) {
      add(d, w);
      continue;
    }
    let before = d - 1;
    while (before >= 1 && isWeekend(release.year, release.month, before)) before--;
    let after = d + 1;
    while (isWeekend(release.year, release.month, after)) after++;
    if (before >= 1) {
      add(before, w / 2);
      add(after, w / 2);
    } else {
      add(after, w);
    }
  }

  const days: ForecastDay[] = [...acc.entries()]
    .map(([day, prob]) => ({
      day,
      prob,
      iso: `${release.year}-${String(release.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    }))
    .sort((a, b) => b.prob - a.prob);

  const peak = days[0];
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const peakUtc = Date.UTC(release.year, release.month - 1, peak.day);
  const daysToPeak = Math.round((peakUtc - todayUtc) / DAY);

  const allDays = days.map((d) => d.day);
  const firstUtc = Date.UTC(release.year, release.month - 1, Math.min(...allDays));
  const lastUtc = Date.UTC(release.year, release.month - 1, Math.max(...allDays));
  const status: Forecast["status"] =
    todayUtc < firstUtc ? "upcoming" : todayUtc <= lastUtc ? "window" : "overdue";

  return { nextBulletin, days, peak, daysToPeak, status };
}

/** 优先日可选下限:排期公告的最早截止日远晚于此,再往前没有实际意义 */
export const MIN_PRIORITY_DATE = "1990-01-01";

/** 本地时区的 YYYY-MM-DD。toISOString 按 UTC 输出,跨时区会差一天 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
