# GreenLane 排期站

移民排期动态汇总网站:美国绿卡排期(EB-1 至 EB-5、NIW、亲属移民)+ 加拿大 Express Entry 抽签,十年历史趋势、等待时间估算、官方法规动态、邮件订阅提醒。英国、澳大利亚、新西兰面板已就位,数据接入中。

全部数据取自官方渠道,不构成法律建议。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

## 数据管道(三条,全部免费)

```bash
python3 scripts/scrape_bulletins.py   # 美国排期公告(增量;--full 全量重抓 2015-10 至今)
python3 scripts/fetch_canada.py       # 加拿大 EE 抽签(经无头 Chrome 绕过 Akamai 防护)
python3 scripts/fetch_news.py         # 美国联邦公报移民法规动态(官方免费 API)
```

数据落在 `src/data/`:`bulletins.json`(130 期美国公告)、`canada.json`(424 轮抽签)、`live-news.json`(10 条法规动态)。

**自动更新**:`.github/workflows/update-data.yml` 每日 10:00 UTC(美东夏令时 6:00)自动抓取并提交变更。推送到 GitHub 公开仓库即生效,免费。注意:IRCC 源的 Akamai 防护可能拦截数据中心 IP,加拿大数据若在 Actions 上失败,可本地手动跑。

## 项目结构

- `scripts/` — 三条数据抓取管道(见上)
- `src/lib/bulletin.ts` — 美国排期计算:前进/倒退、趋势序列、平均速度、等待估算
- `src/lib/canada.ts` — 加拿大抽签类别分组与工具
- `src/components/HomeClient.tsx` — 国家切换容器 + 美国排期面板(卡片 + 趋势图)
- `src/components/CanadaPanel.tsx` — 加拿大面板(最新抽签 + CRS 走势 + 抽签记录表)
- `src/components/CountryPlaceholder.tsx` — 英/澳/新面板(制度概览 + 官方渠道,数据接入中)
- `src/components/NewsCarousel.tsx` — 资讯轮播:官方法规(实时)+ 专题解读(按身份看影响)
- `src/app/api/subscribe/route.ts` — 订阅接口(MVP 落盘 `data/subscribers.json`)

图表配色经色觉障碍(CVD)与对比度校验;文案使用正式书面语。

## 待办路线图

- [ ] 邮件推送:公告发布后向订阅者发送变化摘要(Resend 免费额度)
- [ ] 专题解读接入 Claude API,对官方法规自动生成中文摘要与个性化影响分析
- [ ] 英国 / 澳大利亚 / 新西兰数据接入(处理时限、EOI 邀请轮次)
- [ ] 部署 Vercel + 域名
- [ ] 商业化:订阅规模化后接入移民律所广告
