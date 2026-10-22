"use client";

import { useId } from "react";
import { Lang, formatDate } from "@/lib/bulletin";
import { useI18n } from "@/lib/i18n";

/*
 * 把 UTC 时间戳(如数据更新时刻)按访客所在时区显示,精确到秒。
 *
 * 页面在构建期静态生成,服务端不知道访客在哪个时区。照 Next 文档
 * preventing-flash-before-hydration 的做法:服务端先输出标注「UTC」的时间,
 * 紧跟的内联脚本在首次绘制前改写成本地时间,suppressHydrationWarning 让 React
 * 保留改写后的 DOM;切换语言等客户端重渲染时,直接在浏览器里按本地时区格式化。
 */

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const FORMATS: Record<Lang, [string, Intl.DateTimeFormatOptions]> = {
  zh: [
    "zh-CN",
    { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" },
  ],
  en: [
    "en-US",
    { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" },
  ],
};

/* 与 formatDate 的「2026 年 10 月 22 日」一致:数字与年月日之间留空格 */
const ZH_SPACING = /\s*([年月日])\s*/g;

function format(iso: string, lang: Lang, timeZone?: string): string {
  const [locale, options] = FORMATS[lang];
  const s = new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(new Date(iso));
  return lang === "zh" ? s.replace(ZH_SPACING, " $1 ").trim() : s;
}

/* 内联脚本与 format() 共用同一套 locale、选项和排版规则 */
function localizeScript(id: string, iso: string, lang: Lang): string {
  const [locale, options] = FORMATS[lang];
  const spacing = lang === "zh" ? `.replace(${ZH_SPACING}," $1 ").trim()` : "";
  return (
    `{var n=document.getElementById(${JSON.stringify(id)});` +
    `if(n)n.textContent=new Intl.DateTimeFormat(${JSON.stringify(locale)},${JSON.stringify(options)})` +
    `.format(new Date(${JSON.stringify(iso)}))${spacing}}`
  );
}

export default function LocalTime({ iso }: { iso: string }) {
  const { lang } = useI18n();
  const id = useId();

  /* 旧数据只记了日期,不涉及时区,原样显示 */
  if (!TIMESTAMP.test(iso)) return <>{formatDate(iso, lang)}</>;

  const onServer = typeof window === "undefined";
  return (
    <>
      <time id={id} dateTime={iso} suppressHydrationWarning>
        {onServer ? `${format(iso, lang, "UTC")} UTC` : format(iso, lang)}
      </time>
      {/* 服务端输出可执行脚本;客户端渲染时标成 text/plain,浏览器不会重复执行 */}
      <script
        type={onServer ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: localizeScript(id, iso, lang) }}
      />
    </>
  );
}
