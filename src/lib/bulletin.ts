/** 排期值: ISO 日期 | "C"(无需排队) | "U"(暂停发放) */
export type CutoffValue = string;

export type CountryCode = "ALL" | "CN" | "IN" | "MX" | "PH";
export type TableKey = "finalAction" | "datesForFiling";

export interface CategoryTable {
  [category: string]: Partial<Record<CountryCode, CutoffValue>>;
}

export interface Bulletin {
  year: number;
  month: number;
  url: string;
  employment: { finalAction: CategoryTable; datesForFiling: CategoryTable | null };
  family?: { finalAction: CategoryTable; datesForFiling: CategoryTable | null };
}

export interface BulletinData {
  updatedAt: string;
  source: string;
  bulletins: Bulletin[];
}

export type Lang = "zh" | "en";

export const COUNTRIES: { code: CountryCode; label: string; labelEn: string }[] = [
  { code: "CN", label: "中国大陆", labelEn: "Mainland China" },
  { code: "IN", label: "印度", labelEn: "India" },
  { code: "ALL", label: "全球", labelEn: "Worldwide" },
  { code: "MX", label: "墨西哥", labelEn: "Mexico" },
  { code: "PH", label: "菲律宾", labelEn: "Philippines" },
];

export function queueLabel(code: CountryCode, lang: Lang): string {
  const c = COUNTRIES.find((x) => x.code === code);
  return (lang === "zh" ? c?.label : c?.labelEn) ?? code;
}

export interface CategoryInfo {
  code: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
}

export const EMPLOYMENT_CATEGORIES: CategoryInfo[] = [
  { code: "EB1", name: "EB-1", nameEn: "EB-1", desc: "杰出人才 / 教授 / 高管", descEn: "Extraordinary ability / professors / executives" },
  { code: "EB2", name: "EB-2", nameEn: "EB-2", desc: "高等学位 · 含 NIW", descEn: "Advanced degree · incl. NIW" },
  { code: "EB3", name: "EB-3", nameEn: "EB-3", desc: "技术劳工 / 专业人员", descEn: "Skilled workers / professionals" },
  { code: "EB3-OW", name: "EB-3 其他", nameEn: "EB-3 Other", desc: "非技术劳工", descEn: "Other (unskilled) workers" },
  { code: "EB4", name: "EB-4", nameEn: "EB-4", desc: "特殊移民", descEn: "Special immigrants" },
  { code: "EB5", name: "EB-5", nameEn: "EB-5", desc: "投资移民 · 未预留", descEn: "Investor · unreserved" },
  { code: "EB5-RUR", name: "EB-5 乡村", nameEn: "EB-5 Rural", desc: "乡村预留 20%", descEn: "Rural set-aside 20%" },
  { code: "EB5-HU", name: "EB-5 高失业", nameEn: "EB-5 High-Unemp.", desc: "高失业率预留 10%", descEn: "High-unemployment set-aside 10%" },
];

export const FAMILY_CATEGORIES: CategoryInfo[] = [
  { code: "F1", name: "F1", nameEn: "F1", desc: "公民的成年未婚子女", descEn: "Unmarried adult children of citizens" },
  { code: "F2A", name: "F2A", nameEn: "F2A", desc: "绿卡持有者的配偶与未成年子女", descEn: "Spouses & minor children of green card holders" },
  { code: "F2B", name: "F2B", nameEn: "F2B", desc: "绿卡持有者的成年未婚子女", descEn: "Unmarried adult children of green card holders" },
  { code: "F3", name: "F3", nameEn: "F3", desc: "公民的已婚子女", descEn: "Married children of citizens" },
  { code: "F4", name: "F4", nameEn: "F4", desc: "公民的兄弟姐妹", descEn: "Siblings of citizens" },
];

export function categoryName(c: CategoryInfo, lang: Lang): string {
  return lang === "zh" ? c.name : c.nameEn;
}

export function categoryDesc(c: CategoryInfo, lang: Lang): string {
  return lang === "zh" ? c.desc : c.descEn;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_EN_SHORT = MONTHS_EN.map((m) => m.slice(0, 3));

export function monthLabel(b: Pick<Bulletin, "year" | "month">, lang: Lang = "zh"): string {
  return lang === "zh"
    ? `${b.year} 年 ${b.month} 月`
    : `${MONTHS_EN[b.month - 1]} ${b.year}`;
}

export function isDate(v: CutoffValue | undefined): v is string {
  return !!v && v !== "C" && v !== "U";
}

/** ISO 日期 → "2026 年 7 月 6 日" / "Jul 6, 2026" */
export function formatDate(iso: string, lang: Lang = "zh"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return lang === "zh" ? `${y} 年 ${m} 月 ${d} 日` : `${MONTHS_EN_SHORT[m - 1]} ${d}, ${y}`;
}

export function formatCutoff(v: CutoffValue | undefined, lang: Lang = "zh"): string {
  if (!v) return "—";
  if (v === "C") return lang === "zh" ? "无需排队" : "Current";
  if (v === "U") return lang === "zh" ? "暂停发放" : "Unavailable";
  return formatDate(v, lang);
}

export function getCutoff(
  b: Bulletin | undefined,
  kind: "employment" | "family",
  table: TableKey,
  category: string,
  country: CountryCode
): CutoffValue | undefined {
  const t = kind === "employment" ? b?.employment?.[table] : b?.family?.[table];
  return t?.[category]?.[country] ?? t?.[category]?.ALL;
}

export type StatusChange = "toC" | "toU" | "fromC" | "fromU";

export type Movement =
  | { kind: "advance"; days: number }
  | { kind: "retrogress"; days: number }
  | { kind: "same" }
  | { kind: "status"; change: StatusChange }
  | { kind: "none" };

const DAY = 86_400_000;

/** 比较本月与上月的截止日,得出前进/倒退/状态变化(文案由 UI 层按语言渲染) */
export function movement(
  curr: CutoffValue | undefined,
  prev: CutoffValue | undefined
): Movement {
  if (!curr || !prev) return { kind: "none" };
  if (curr === prev) return { kind: "same" };
  if (isDate(curr) && isDate(prev)) {
    const days = Math.round((Date.parse(curr) - Date.parse(prev)) / DAY);
    if (days === 0) return { kind: "same" };
    return days > 0
      ? { kind: "advance", days }
      : { kind: "retrogress", days: -days };
  }
  if (curr === "C") return { kind: "status", change: "toC" };
  if (curr === "U") return { kind: "status", change: "toU" };
  if (prev === "C") return { kind: "status", change: "fromC" };
  if (prev === "U") return { kind: "status", change: "fromU" };
  return { kind: "none" };
}

export interface TrendPoint {
  /** 公告月份 (epoch ms) */
  t: number;
  /** 表A 截止日 (epoch ms, C/U 为 null) */
  fa: number | null;
  /** 表B 截止日 */
  df: number | null;
  faRaw?: CutoffValue;
  dfRaw?: CutoffValue;
}

export function trendSeries(
  bulletins: Bulletin[],
  kind: "employment" | "family",
  category: string,
  country: CountryCode
): TrendPoint[] {
  return bulletins.map((b) => {
    const fa = getCutoff(b, kind, "finalAction", category, country);
    const df = getCutoff(b, kind, "datesForFiling", category, country);
    return {
      t: Date.UTC(b.year, b.month - 1, 1),
      fa: isDate(fa) ? Date.parse(fa) : null,
      df: isDate(df) ? Date.parse(df) : null,
      faRaw: fa,
      dfRaw: df,
    };
  });
}

export type TrendKey = "fa" | "df";

/** 近 N 个月指定表(A/B)平均推进速度(天/月),只统计两端都是具体日期的区间 */
export function avgAdvance(
  points: TrendPoint[],
  months = 12,
  key: TrendKey = "fa"
): number | null {
  const recent = points.slice(-months - 1);
  let total = 0;
  let spans = 0;
  for (let i = 1; i < recent.length; i++) {
    const a = recent[i - 1][key];
    const b = recent[i][key];
    if (a != null && b != null) {
      total += (b - a) / DAY;
      spans++;
    }
  }
  return spans >= 3 ? total / spans : null;
}

/** 按近一年速度估算:优先日为 pd 的人还要等多久(月);key 选择以表A或表B为基准 */
export function estimateWaitMonths(
  points: TrendPoint[],
  pd: number,
  key: TrendKey = "fa"
): { months: number; speed: number } | { current: true } | null {
  const rawKey = key === "fa" ? "faRaw" : "dfRaw";
  const last = [...points].reverse().find((p) => p[rawKey] !== undefined);
  if (!last) return null;
  if (last[rawKey] === "C") return { current: true };
  if (last[key] != null && pd <= (last[key] as number)) return { current: true };
  const speed = avgAdvance(points, 12, key);
  if (speed == null || speed <= 0 || last[key] == null) return null;
  const gapDays = (pd - (last[key] as number)) / DAY;
  return { months: Math.ceil(gapDays / speed), speed };
}
