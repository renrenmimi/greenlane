import { CountryCode, Lang } from "@/lib/bulletin";

/**
 * 出生国家/地区 → Visa Bulletin 队伍映射。
 *
 * 关键规则(官方 chargeability):
 * - 排期按「出生地」而非国籍或护照划分队伍
 * - 仅中国大陆、印度、墨西哥、菲律宾有独立队伍,其余全部走「全球」队伍
 * - 中国香港、澳门、台湾出生均按官方规则走「全球」队伍,不与中国大陆同队
 */
export interface BirthCountry {
  code: string;
  zh: string;
  en: string;
  queue: CountryCode;
}

export const POPULAR_COUNTRIES: BirthCountry[] = [
  { code: "CN", zh: "中国大陆", en: "Mainland China", queue: "CN" },
  { code: "IN", zh: "印度", en: "India", queue: "IN" },
  { code: "HK", zh: "中国香港", en: "Hong Kong", queue: "ALL" },
  { code: "TW", zh: "中国台湾", en: "Taiwan", queue: "ALL" },
  { code: "MO", zh: "中国澳门", en: "Macau", queue: "ALL" },
  { code: "MX", zh: "墨西哥", en: "Mexico", queue: "MX" },
  { code: "PH", zh: "菲律宾", en: "Philippines", queue: "PH" },
  { code: "KR", zh: "韩国", en: "South Korea", queue: "ALL" },
  { code: "VN", zh: "越南", en: "Vietnam", queue: "ALL" },
  { code: "PK", zh: "巴基斯坦", en: "Pakistan", queue: "ALL" },
];

export const OTHER_COUNTRIES: BirthCountry[] = [
  { code: "AF", zh: "阿富汗", en: "Afghanistan", queue: "ALL" },
  { code: "AR", zh: "阿根廷", en: "Argentina", queue: "ALL" },
  { code: "AU", zh: "澳大利亚", en: "Australia", queue: "ALL" },
  { code: "AT", zh: "奥地利", en: "Austria", queue: "ALL" },
  { code: "BD", zh: "孟加拉国", en: "Bangladesh", queue: "ALL" },
  { code: "BE", zh: "比利时", en: "Belgium", queue: "ALL" },
  { code: "BR", zh: "巴西", en: "Brazil", queue: "ALL" },
  { code: "CA", zh: "加拿大", en: "Canada", queue: "ALL" },
  { code: "CL", zh: "智利", en: "Chile", queue: "ALL" },
  { code: "CO", zh: "哥伦比亚", en: "Colombia", queue: "ALL" },
  { code: "CU", zh: "古巴", en: "Cuba", queue: "ALL" },
  { code: "CZ", zh: "捷克", en: "Czechia", queue: "ALL" },
  { code: "DK", zh: "丹麦", en: "Denmark", queue: "ALL" },
  { code: "DO", zh: "多米尼加", en: "Dominican Republic", queue: "ALL" },
  { code: "EC", zh: "厄瓜多尔", en: "Ecuador", queue: "ALL" },
  { code: "EG", zh: "埃及", en: "Egypt", queue: "ALL" },
  { code: "SV", zh: "萨尔瓦多", en: "El Salvador", queue: "ALL" },
  { code: "ET", zh: "埃塞俄比亚", en: "Ethiopia", queue: "ALL" },
  { code: "FI", zh: "芬兰", en: "Finland", queue: "ALL" },
  { code: "FR", zh: "法国", en: "France", queue: "ALL" },
  { code: "DE", zh: "德国", en: "Germany", queue: "ALL" },
  { code: "GH", zh: "加纳", en: "Ghana", queue: "ALL" },
  { code: "GR", zh: "希腊", en: "Greece", queue: "ALL" },
  { code: "GT", zh: "危地马拉", en: "Guatemala", queue: "ALL" },
  { code: "HT", zh: "海地", en: "Haiti", queue: "ALL" },
  { code: "HN", zh: "洪都拉斯", en: "Honduras", queue: "ALL" },
  { code: "HU", zh: "匈牙利", en: "Hungary", queue: "ALL" },
  { code: "ID", zh: "印度尼西亚", en: "Indonesia", queue: "ALL" },
  { code: "IR", zh: "伊朗", en: "Iran", queue: "ALL" },
  { code: "IQ", zh: "伊拉克", en: "Iraq", queue: "ALL" },
  { code: "IE", zh: "爱尔兰", en: "Ireland", queue: "ALL" },
  { code: "IL", zh: "以色列", en: "Israel", queue: "ALL" },
  { code: "IT", zh: "意大利", en: "Italy", queue: "ALL" },
  { code: "JM", zh: "牙买加", en: "Jamaica", queue: "ALL" },
  { code: "JP", zh: "日本", en: "Japan", queue: "ALL" },
  { code: "JO", zh: "约旦", en: "Jordan", queue: "ALL" },
  { code: "KZ", zh: "哈萨克斯坦", en: "Kazakhstan", queue: "ALL" },
  { code: "KE", zh: "肯尼亚", en: "Kenya", queue: "ALL" },
  { code: "LB", zh: "黎巴嫩", en: "Lebanon", queue: "ALL" },
  { code: "MY", zh: "马来西亚", en: "Malaysia", queue: "ALL" },
  { code: "MA", zh: "摩洛哥", en: "Morocco", queue: "ALL" },
  { code: "MM", zh: "缅甸", en: "Myanmar", queue: "ALL" },
  { code: "NP", zh: "尼泊尔", en: "Nepal", queue: "ALL" },
  { code: "NL", zh: "荷兰", en: "Netherlands", queue: "ALL" },
  { code: "NZ", zh: "新西兰", en: "New Zealand", queue: "ALL" },
  { code: "NG", zh: "尼日利亚", en: "Nigeria", queue: "ALL" },
  { code: "NO", zh: "挪威", en: "Norway", queue: "ALL" },
  { code: "PE", zh: "秘鲁", en: "Peru", queue: "ALL" },
  { code: "PL", zh: "波兰", en: "Poland", queue: "ALL" },
  { code: "PT", zh: "葡萄牙", en: "Portugal", queue: "ALL" },
  { code: "RO", zh: "罗马尼亚", en: "Romania", queue: "ALL" },
  { code: "RU", zh: "俄罗斯", en: "Russia", queue: "ALL" },
  { code: "SA", zh: "沙特阿拉伯", en: "Saudi Arabia", queue: "ALL" },
  { code: "SG", zh: "新加坡", en: "Singapore", queue: "ALL" },
  { code: "ZA", zh: "南非", en: "South Africa", queue: "ALL" },
  { code: "ES", zh: "西班牙", en: "Spain", queue: "ALL" },
  { code: "LK", zh: "斯里兰卡", en: "Sri Lanka", queue: "ALL" },
  { code: "SE", zh: "瑞典", en: "Sweden", queue: "ALL" },
  { code: "CH", zh: "瑞士", en: "Switzerland", queue: "ALL" },
  { code: "SY", zh: "叙利亚", en: "Syria", queue: "ALL" },
  { code: "TH", zh: "泰国", en: "Thailand", queue: "ALL" },
  { code: "TR", zh: "土耳其", en: "Türkiye", queue: "ALL" },
  { code: "UA", zh: "乌克兰", en: "Ukraine", queue: "ALL" },
  { code: "AE", zh: "阿联酋", en: "United Arab Emirates", queue: "ALL" },
  { code: "GB", zh: "英国", en: "United Kingdom", queue: "ALL" },
  { code: "UZ", zh: "乌兹别克斯坦", en: "Uzbekistan", queue: "ALL" },
  { code: "VE", zh: "委内瑞拉", en: "Venezuela", queue: "ALL" },
  { code: "OTHER", zh: "其他国家 / 地区", en: "Other country / region", queue: "ALL" },
];

export const ALL_BIRTH_COUNTRIES = [...POPULAR_COUNTRIES, ...OTHER_COUNTRIES];

export function findBirthCountry(code: string): BirthCountry | undefined {
  return ALL_BIRTH_COUNTRIES.find((c) => c.code === code);
}

export function birthCountryName(c: BirthCountry, lang: Lang): string {
  return lang === "zh" ? c.zh : c.en;
}
