import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HomeClient from "@/components/HomeClient";
import MyQuery from "@/components/MyQuery";
import Nav from "@/components/Nav";
import NewsCarousel, { LiveNewsItem } from "@/components/NewsCarousel";
import Subscribe from "@/components/Subscribe";
import bulletinData from "@/data/bulletins.json";
import canadaData from "@/data/canada.json";
import liveNewsData from "@/data/live-news.json";
import { Bulletin } from "@/lib/bulletin";
import { CanadaData } from "@/lib/canada";
import { LanguageProvider } from "@/lib/i18n";

export default function Home() {
  const bulletins = bulletinData.bulletins as unknown as Bulletin[];
  const canada = canadaData as unknown as CanadaData;
  const liveNews = liveNewsData.items as LiveNewsItem[];

  const latest = bulletins[bulletins.length - 1];
  const latestDraw = canada.rounds[canada.rounds.length - 1];

  return (
    <LanguageProvider>
      <div id="top" className="flex-1">
        <Nav />
        <main>
          {/* 进站即查:查询工具置顶首屏 */}
          <MyQuery bulletins={bulletins} updatedAt={bulletinData.updatedAt} />
          <Hero
            latest={{ year: latest.year, month: latest.month }}
            totalBulletins={bulletins.length}
            caDrawNum={latestDraw?.num ?? null}
            caRoundCount={canada.rounds.length}
          />
          <HomeClient
            bulletins={bulletins}
            canada={canada}
            usUpdatedAt={bulletinData.updatedAt}
          />
          <NewsCarousel liveNews={liveNews} updatedAt={liveNewsData.updatedAt} />
          <Subscribe />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
