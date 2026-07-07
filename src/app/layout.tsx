import type { Metadata } from "next";
import { Geist, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenLane 排期站 · 移民排期动态汇总,一目了然",
  description:
    "美国绿卡排期(EB-1 至 EB-5、NIW、亲属移民)与加拿大 Express Entry 抽签动态汇总:十年历史趋势、等待时间估算、官方法规动态,每日自动更新,全部免费。数据取自各国政府官方发布。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
