import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
// 字体随项目自托管:构建时不再从 Google Fonts 下载上百个中文字体分片
// (下载偶尔失败会让整次构建失败)。与原先 Google 提供的是同一款可变字体,
// 同样按 unicode-range 分片、按需加载。
import "@fontsource-variable/noto-sans-sc";
import { SITE_TITLE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TITLE.zh,
  description:
    "美国绿卡排期(EB-1 至 EB-5、NIW、亲属移民)与加拿大 Express Entry 抽签动态汇总:十年历史趋势、等待时间估算、官方法规动态,及时更新,全部免费。数据取自各国政府官方发布。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
