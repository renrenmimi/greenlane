import type { Lang } from "@/lib/bulletin";

// 浏览器标签页上的网站标题。页面初次加载时的 <title>(layout.tsx 的 metadata)
// 和切换语言时设置的 document.title(i18n.tsx)都从这里取,改一处两边一起变。
export const SITE_TITLE: Record<Lang, string> = {
  zh: "GreenLane 排期站 · 移民排期动态汇总,一目了然",
  en: "GreenLane · Immigration Backlogs & Draws at a Glance",
};
