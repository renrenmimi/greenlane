import { Lang, formatDate } from "@/lib/bulletin";

export interface CaRound {
  num: number | null;
  date: string;
  name: string;
  group: string;
  crs: number;
  invitations: number | null;
}

export interface CanadaData {
  updatedAt: string;
  source: string;
  rounds: CaRound[];
}

export const CA_GROUPS: { code: string; label: string; labelEn: string }[] = [
  { code: "CEC", label: "加拿大经验类", labelEn: "Canadian Experience Class" },
  { code: "GENERAL", label: "通用类", labelEn: "General" },
  { code: "PNP", label: "省提名", labelEn: "Provincial Nominee" },
  { code: "FRENCH", label: "法语人才", labelEn: "French proficiency" },
  { code: "CATEGORY", label: "定向职业类", labelEn: "Category-based" },
  { code: "TRADE", label: "技工类", labelEn: "Trades" },
];

export function groupLabel(code: string, lang: Lang = "zh"): string {
  const g = CA_GROUPS.find((g) => g.code === code);
  if (!g) return lang === "zh" ? "其他" : "Other";
  return lang === "zh" ? g.label : g.labelEn;
}

export function latestByGroup(rounds: CaRound[], group: string): CaRound[] {
  return rounds.filter((r) => r.group === group);
}

export function formatCaDate(iso: string, lang: Lang = "zh"): string {
  return formatDate(iso, lang);
}
