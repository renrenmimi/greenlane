"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lang } from "@/lib/bulletin";

/* ═══════════════ 文案字典:以中文为基准,类型系统保证英文版不缺键 ═══════════════ */

const zh = {
  siteTitle: "GreenLane 排期站 · 绿卡排期,一眼看懂",
  nav: {
    badge: "排期站",
    data: "排期数据",
    trends: "历史趋势",
    news: "移民资讯",
    subscribe: "订阅提醒",
    subscribeShort: "订阅",
  },
  hero: {
    recorded: (usMonth: string, caDraw: number | null) =>
      `已收录:美国 ${usMonth}公告${caDraw != null ? ` · 加拿大第 ${caDraw} 轮抽签` : ""}`,
    h1a: "移民排期动态汇总",
    h1b: "官方数据,一目了然",
    sub: "美国绿卡排期、加拿大 Express Entry 抽签,数据每日自动核对更新;历史趋势、变化提醒、政策动态,全部免费。英国、澳大利亚即将接入。",
    ctaQuery: "查询我的排期",
    ctaSub: "订阅更新提醒",
    statBulletins: "期美国公告",
    statDraws: "轮加拿大抽签",
    statYears: "年历史数据",
    statYearsNum: "10+",
    statOfficial: "官方数据源",
  },
  regions: { us: "美国", ca: "加拿大", uk: "英国", au: "澳大利亚" },
  movement: {
    advance: (d: number) => `▲ 前进 ${d} 天`,
    retrogress: (d: number) => `▼ 倒退 ${d} 天`,
    same: "— 未前进",
    toC: "◆ 转为无需排队",
    toU: "◆ 转为暂停发放",
    fromC: "◆ 重新出现排期",
    fromU: "◆ 恢复发放",
    none: "—",
  },
  forecast: {
    showing: (m: string) => `当前展示:${m}排期`,
    checked: (d: string) => `数据每日核对 · 最近 ${d}`,
    eta: (nm: string, date: string, days: number) =>
      `下一期(${nm}排期)预计 ${date} 前后发布 · 约 ${days} 天后`,
    etaImminent: (nm: string) => `下一期(${nm}排期)预计就在这一两天发布,请留意`,
    etaOverdue: (nm: string) => `下一期(${nm}排期)已过常规发布窗口,随时可能发布`,
    note: "发布日预测基于历史规律(每月上中旬公布下月排期、仅工作日发布)估算,非官方时间。",
  },
  query: {
    title: "查询我的排期",
    desc: "选择您的移民类别与出生国家,输入优先日(Priority Date,即 I-140/I-130 或劳工证的递交日,可在 I-797 批准通知上查到),即可查看您当前的排队状态。",
    catLabel: "移民类别",
    countryLabel: "出生国家 / 地区",
    pdLabel: "您的优先日",
    employment: "职业移民",
    family: "亲属移民",
    popularGroup: "常见地区",
    otherGroup: "全部国家 / 地区",
    queueNote: (country: string, queue: string) =>
      `${country}出生的申请人属于「${queue}」队伍,以下按该队伍排期计算。`,
    chargeTip: "排期队伍按「出生地」而非国籍划分;若配偶出生于排期更快的地区,可借用配偶的出生地(cross-chargeability),详情请咨询律师。",
    currentATitle: "您的优先日已排到(表 A)",
    currentABody: (cat: string, queue: string) =>
      `${cat} · ${queue}队伍当前名额可用。若您已递交 I-485,可等待最终审批;若尚未递交,请尽快咨询律师推进。`,
    currentBTitle: "表 B 已排到,表 A 尚未排到",
    currentBBody: "若 USCIS 本月接受表 B 递件,您可递交 I-485 并申请工卡与回美证;最终获批仍需等待表 A 排到您的优先日。",
    pausedTitle: "该队伍本财年暂停发放 (U)",
    pausedBody: "本财年签证名额已用尽,通常于新财年开始(10 月)恢复发放,届时请回来查看最新排期。",
    waitingTitle: (gap: string | null, table: string) =>
      `${table} 尚未排到${gap ? `,距当前截止日还差 ${gap}` : ""}`,
    waitingEstimate: (speed: number, wait: string, table: string) =>
      `按 ${table} 近 12 个月平均前进 ${speed} 天/月估算,预计还需约 ${wait} 排到,仅供参考。`,
    waitingNoEstimate: "该队伍近期推进缓慢、倒退或数据不足,暂无法给出可靠的等待估算。",
    tableACard: "表 A 最终裁定日(当前)",
    tableBCard: "表 B 可递交日(当前)",
    tableAName: "表 A",
    tableBName: "表 B",
    basisHint: "点击下方卡片,切换以表 A(排到即可获批)还是表 B(排到即可递交 I-485)为基准计算:",
    basisSelected: "✓ 当前估算基准",
    basisSwitch: "点击以此表估算",
    yearsMonths: (y: number, m: number) =>
      y > 0 && m > 0 ? `${y} 年 ${m} 个月` : y > 0 ? `${y} 年` : `${Math.max(m, 1)} 个月`,
  },
  us: {
    tag: "Visa Bulletin",
    title: (month: string) => `美国绿卡排期 · ${month}`,
    official: "查看官方原文 ↗",
    checked: (date: string) => `数据核对于 ${date}`,
    tableA: "表 A 最终裁定",
    tableB: "表 B 可递交",
    selected: "✓ 已选中",
    viewTrend: "查看趋势 →",
    currentBadge: "(Current)",
    footnote:
      "表 A(Final Action Dates)= 排到即可获批;表 B(Dates for Filing)= 排到即可递交 I-485(是否可用以 USCIS 当月公告为准)。「无需排队 (C)」表示当前有名额、无积压;「暂停发放 (U)」表示本财年名额用尽。变化为与上月公告对比。",
    trendsTag: "Trends & Forecast",
    trendsTitle: (cat: string, queue: string) => `十年趋势:${cat} · ${queue}`,
    trendsDesc:
      "截止日期越高,队伍进展越靠后。线条中断处表示当月「无需排队 (C)」或「暂停发放 (U)」。点击上方任意类别卡片即可切换。",
    legendA: "表 A · 最终裁定日",
    legendB: "表 B · 可递交日",
    tipA: "表 A 最终裁定",
    tipB: "表 B 可递交",
    tipMonth: (y: number, m: number) => `${y} 年 ${m} 月公告`,
    dataTable: "查看近 12 个月数据表",
    thMonth: "公告月份",
    yourPd: "您的优先日",
    estTitle: "等待时间估算",
    estDesc: "输入您的优先日(I-140/I-130 递交日),按近 12 个月表 A 平均速度估算。",
    estCurrent: "您的优先日已排到(Current)。请对照表 A 确认,并尽快推进后续申请。",
    estResult: (y: number, m: number) => `约 ${y > 0 ? `${y} 年 ` : ""}${m} 个月`,
    estNote: (cat: string, queue: string, speed: number) =>
      `按 ${cat} · ${queue} 近 12 个月平均前进 ${speed} 天/月外推,仅供参考。`,
    estNone: "当前队伍暂停发放、整体倒退或数据不足,无法给出可靠估算。",
    speedTitle: "近 12 个月平均速度",
    speedUnit: "/月",
    speedDays: (d: number) => `${d} 天`,
    speedNone: "该队伍近一年多数月份为 C/U 状态,无推进速度可言。",
    speedFast: "推进快于日历时间,积压正在实质性消化。",
    speedSlow: "推进慢于日历时间,实际等待将比表面差距更久。",
    speedNeg: "近一年整体倒退,新申请人需谨慎评估。",
  },
  canada: {
    tag: "Express Entry",
    title: "加拿大 · Express Entry 抽签动态",
    official: "查看官方原始数据 ↗",
    checked: (date: string) => `数据核对于 ${date}`,
    latestDraw: "最新一轮抽签",
    drawNum: (n: number | null) => (n != null ? `第 ${n} 轮` : "—"),
    drawCat: "抽签类别",
    crsCutoff: "CRS 最低分数线",
    crsNote: "达到该分数即获邀请",
    invitations: "邀请人数",
    invitationsNote: "本轮共发出邀请",
    trendTitle: (group: string) => `CRS 分数线走势 · ${group}`,
    chartNote: (n: number) => `分数线越低,获邀门槛越低。共 ${n} 轮。`,
    deltaUp: (d: number) => `较上一轮同类别 上升 ${d} 分`,
    deltaDown: (d: number) => `较上一轮同类别 下降 ${d} 分`,
    deltaSame: "较上一轮同类别 持平",
    insufficient: "该类别抽签轮次不足,暂无法绘制趋势。",
    recentTitle: "近 12 轮抽签记录",
    scrollHint: "← 左右滑动查看完整表格",
    thDraw: "轮次",
    thDate: "日期",
    thCat: "类别",
    thCrs: "CRS 分数线",
    thInvited: "邀请人数",
    crsLabel: "CRS 分数线",
    invitedLabel: "人获邀",
    footnote:
      "CRS(Comprehensive Ranking System)为加拿大快速通道综合评分。数据取自加拿大移民、难民及公民部(IRCC)官方发布,每日自动核对更新。",
  },
  placeholder: {
    tag: "Coming Soon",
    badge: "数据接入中",
    overview: "移民制度概览",
    channels: "官方渠道",
    channelsDesc: "数据接入完成前,请以下列官方渠道为准:",
    note: "本站将陆续收录该国官方数据(邀请轮次、分数线、处理时限等),订阅后上线即通知。",
    uk: {
      name: "英国",
      system: "英国实行积分制签证体系(Points-Based System),不设排期队列。申请人满足签证类别的分数与条件要求即可递交,官方按标准处理时限审理。",
      points: [
        "技术工作签证(Skilled Worker):需雇主担保,常规处理约 3-8 周",
        "全球人才签证(Global Talent):面向科研、科技、艺术领域人才",
        "毕业生签证(Graduate Route):毕业后 2-3 年开放工作许可",
        "永居(ILR)通常需连续合法居住 5 年后申请",
      ],
      links: [
        { label: "英国政府签证与移民官网(GOV.UK)", url: "https://www.gov.uk/browse/visas-immigration" },
        { label: "官方处理时限查询", url: "https://www.gov.uk/visa-processing-times" },
      ],
    },
    au: {
      name: "澳大利亚",
      system: "澳大利亚技术移民通过 SkillSelect 系统进行:申请人先提交意向书(EOI),移民局定期按分数从高到低发出邀请,获邀后方可递交签证申请。",
      points: [
        "189 独立技术移民:纯打分邀请,无需州担保",
        "190 州担保技术移民:州政府提名,加 5 分",
        "491 偏远地区担保:加 15 分,先临居后转永居",
        "邀请轮次的分数线与名额由官方定期公布",
      ],
      links: [
        { label: "澳大利亚内政部 SkillSelect", url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect" },
        { label: "各签证类别处理时限查询", url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times" },
      ],
    },
  },
  news: {
    tag: "Immigration News",
    title: "移民资讯",
    updatedBadge: (date: string) => `每日自动更新 · 最近核对:${date}`,
    desc: "官方法规动态实时取自美国联邦公报(Federal Register);专题解读为中文整理,附官方来源。",
    liveBadge: "联邦公报 · 英文",
    curatedBadge: "专题解读",
    agencies: (list: string) => `发布机构:${list}`,
    viewOfficial: "查看官方原文 ↗",
    askBtn: "对我有影响吗?",
    typeLabels: {
      拟议规则: "拟议规则",
      最终规则: "最终规则",
      官方公告: "官方公告",
      总统令: "总统令",
    } as Record<string, string>,
    tags: {
      "H-1B": "H-1B",
      排期解读: "排期解读",
      "EB-5": "EB-5",
      事实核查: "事实核查",
    } as Record<string, string>,
    aiBadge: "即将上线",
    aiTitle: "AI 个性化影响分析",
    aiBody: "我们正在打造 AI 分析助手:届时您只需描述自己的具体情况(身份、优先日、家庭状况等),AI 将结合这条新闻与最新官方数据,为您生成专属的影响分析与应对建议。",
    aiCta: "订阅上线通知",
    aiDisclaimer: "上线后的 AI 分析亦不构成法律建议,重要决定请咨询持牌移民律师。",
  },
  subscribe: {
    title: "排期更新,第一时间通知您",
    desc: "官方公告发布后,将您关注队伍的前进、倒退与状态变化直接发送至您的邮箱。免费,可随时退订。",
    soonBadge: "即将开放",
    soonBody:
      "邮件提醒功能正在接入中。在此之前,本站排期数据每日自动核对更新,随时回访即可查看最新进度。",
    familyCat: "亲属移民",
    emailPlaceholder: "you@example.com",
    submit: "免费订阅",
    submitting: "订阅中…",
    error: "出了点问题,请稍后再试。",
    doneTitle: "订阅成功",
    doneBody: (cats: string, country: string) =>
      `已为您订阅 ${cats} · ${country} 的排期提醒。下次公告发布后,将第一时间通知您。`,
  },
  footer: {
    brand: "GreenLane 排期站",
    blurb: "汇总各国官方移民数据,帮助每一位申请人及时、准确地掌握排期变化。",
    sourcesTitle: "官方数据来源",
    srcBulletin: "美国国务院 Visa Bulletin",
    srcUscis: "USCIS 处理时间查询",
    srcIrcc: "加拿大 IRCC Express Entry 抽签记录",
    srcFedReg: "美国联邦公报 Federal Register",
    disclaimerTitle: "免责声明",
    disclaimer:
      "本站数据来自公开官方渠道,整理仅供参考,不构成法律建议。排期预测基于历史速度的简单外推,实际进度受配额、需求等多因素影响。重要决定请咨询持牌移民律师。",
    copyright: "© 2026 GreenLane 排期站 · 数据仅供参考,不构成法律建议",
  },
};

export type Dict = typeof zh;

const en: Dict = {
  siteTitle: "GreenLane · Green Card Backlogs at a Glance",
  nav: {
    badge: "Tracker",
    data: "Bulletin",
    trends: "Trends",
    news: "News",
    subscribe: "Get Alerts",
    subscribeShort: "Alerts",
  },
  hero: {
    recorded: (usMonth, caDraw) =>
      `Tracking: U.S. ${usMonth} bulletin${caDraw != null ? ` · Canada draw #${caDraw}` : ""}`,
    h1a: "Immigration Backlogs & Draws",
    h1b: "Official data, at a glance",
    sub: "U.S. green card queues and Canada Express Entry draws, verified against official sources daily. Historical trends, movement alerts and policy news — all free. UK and Australia coming soon.",
    ctaQuery: "Check my place in line",
    ctaSub: "Get monthly alerts",
    statBulletins: "U.S. bulletins",
    statDraws: "Canada draws",
    statYears: "years of history",
    statYearsNum: "10+",
    statOfficial: "official sources",
  },
  regions: { us: "United States", ca: "Canada", uk: "United Kingdom", au: "Australia" },
  movement: {
    advance: (d) => `▲ +${d} days`,
    retrogress: (d) => `▼ −${d} days`,
    same: "— No movement",
    toC: "◆ Now current",
    toU: "◆ Now unavailable",
    fromC: "◆ Backlog returned",
    fromU: "◆ Visas resumed",
    none: "—",
  },
  forecast: {
    showing: (m) => `Now showing: ${m} bulletin`,
    checked: (d) => `Verified daily · last ${d}`,
    eta: (nm, date, days) =>
      `Next bulletin (${nm}) expected around ${date} · in ~${days} days`,
    etaImminent: (nm) => `Next bulletin (${nm}) expected any day now — stay tuned`,
    etaOverdue: (nm) => `Next bulletin (${nm}) is past its usual window — could drop any moment`,
    note: "Release forecast is estimated from historical patterns (mid-month, business days only) — not an official date.",
  },
  query: {
    title: "Check My Place in Line",
    desc: "Pick your category and country of birth, then enter your priority date (the filing date of your I-140/I-130 or labor certification — found on your I-797 approval notice) to see where you stand today.",
    catLabel: "Immigration category",
    countryLabel: "Country of birth",
    pdLabel: "Your priority date",
    employment: "Employment-based",
    family: "Family-sponsored",
    popularGroup: "Common",
    otherGroup: "All countries / regions",
    queueNote: (country, queue) =>
      `Applicants born in ${country} use the “${queue}” queue. Results below are based on that queue.`,
    chargeTip: "Queues are assigned by country of birth, not citizenship. If your spouse was born in a faster queue, you may be able to use theirs (cross-chargeability) — ask a lawyer.",
    currentATitle: "Your priority date is current (Table A)",
    currentABody: (cat, queue) =>
      `A visa number is available now in the ${cat} · ${queue} queue. If your I-485 is pending, final approval can proceed; if you haven't filed, talk to your lawyer right away.`,
    currentBTitle: "Current under Table B, not yet under Table A",
    currentBBody: "If USCIS accepts Dates for Filing this month, you can file your I-485 and apply for a work permit and travel document. Final approval still requires Table A to reach your date.",
    pausedTitle: "This queue is unavailable this fiscal year (U)",
    pausedBody: "Visa numbers are exhausted for this fiscal year. They usually resume when the new fiscal year starts in October — check back then.",
    waitingTitle: (gap, table) =>
      `Not current yet under ${table}${gap ? ` — ${gap} behind the cutoff` : ""}`,
    waitingEstimate: (speed, wait, table) =>
      `At ${table}'s 12-month average pace of ${speed} days/month, roughly ${wait} to go. Estimate only.`,
    waitingNoEstimate: "This queue has recently stalled, retrogressed, or lacks data — no reliable estimate available.",
    tableACard: "Table A Final Action (current)",
    tableBCard: "Table B Dates for Filing (current)",
    tableAName: "Table A",
    tableBName: "Table B",
    basisHint: "Tap a card below to base the estimate on Table A (current = approvable) or Table B (current = can file I-485):",
    basisSelected: "✓ Estimate basis",
    basisSwitch: "Use this table",
    yearsMonths: (y, m) =>
      y > 0 && m > 0 ? `${y} yr ${m} mo` : y > 0 ? `${y} yr` : `${Math.max(m, 1)} mo`,
  },
  us: {
    tag: "Visa Bulletin",
    title: (month) => `U.S. Green Card Queues · ${month}`,
    official: "View official bulletin ↗",
    checked: (date) => `Verified ${date}`,
    tableA: "Table A · Final Action",
    tableB: "Table B · Filing",
    selected: "✓ Selected",
    viewTrend: "View trend →",
    currentBadge: "(Current)",
    footnote:
      "Table A (Final Action Dates) = approval possible once current; Table B (Dates for Filing) = I-485 filing possible once current (check USCIS monthly guidance). “Current (C)” means no backlog; “Unavailable (U)” means this year's numbers are exhausted. Movement is vs. last month's bulletin.",
    trendsTag: "Trends & Forecast",
    trendsTitle: (cat, queue) => `10-Year Trend: ${cat} · ${queue}`,
    trendsDesc:
      "Higher cutoff dates mean the queue has moved further. Gaps in a line mean the month was Current (C) or Unavailable (U). Click any category card above to switch.",
    legendA: "Table A · Final Action",
    legendB: "Table B · Filing",
    tipA: "Table A Final Action",
    tipB: "Table B Filing",
    tipMonth: (y, m) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]} ${y} bulletin`,
    dataTable: "View last 12 months as a table",
    thMonth: "Bulletin",
    yourPd: "Your priority date",
    estTitle: "Estimated Wait",
    estDesc: "Enter your priority date (I-140/I-130 filing date). Estimated from the 12-month average Table A pace.",
    estCurrent: "Your priority date is current. Confirm against Table A and move your case forward.",
    estResult: (y, m) => `~ ${y > 0 ? `${y} yr ` : ""}${m} mo`,
    estNote: (cat, queue, speed) =>
      `Extrapolated from ${cat} · ${queue} advancing ${speed} days/month on average over the last 12 months. Estimate only.`,
    estNone: "This queue is unavailable, retrogressing, or lacks data — no reliable estimate.",
    speedTitle: "12-Month Average Pace",
    speedUnit: "/mo",
    speedDays: (d) => `${d} days`,
    speedNone: "Mostly Current/Unavailable over the past year — no meaningful pace.",
    speedFast: "Advancing faster than calendar time — the backlog is genuinely clearing.",
    speedSlow: "Advancing slower than calendar time — the real wait will exceed the apparent gap.",
    speedNeg: "Net retrogression over the past year — new applicants should plan carefully.",
  },
  canada: {
    tag: "Express Entry",
    title: "Canada · Express Entry Draws",
    official: "View official data ↗",
    checked: (date) => `Verified ${date}`,
    latestDraw: "Latest draw",
    drawNum: (n) => (n != null ? `Draw #${n}` : "—"),
    drawCat: "Draw category",
    crsCutoff: "CRS cutoff",
    crsNote: "Scores at or above were invited",
    invitations: "Invitations",
    invitationsNote: "issued this round",
    trendTitle: (group) => `CRS Cutoff Trend · ${group}`,
    chartNote: (n) => `Lower cutoff = easier to get invited. ${n} draws shown.`,
    deltaUp: (d) => `Up ${d} pts vs. previous draw in category`,
    deltaDown: (d) => `Down ${d} pts vs. previous draw in category`,
    deltaSame: "Unchanged vs. previous draw in category",
    insufficient: "Not enough draws in this category to chart a trend yet.",
    recentTitle: "Last 12 Draws",
    scrollHint: "← Swipe to see the full table",
    thDraw: "Draw",
    thDate: "Date",
    thCat: "Category",
    thCrs: "CRS cutoff",
    thInvited: "Invited",
    crsLabel: "CRS cutoff",
    invitedLabel: "invited",
    footnote:
      "CRS (Comprehensive Ranking System) is Canada's Express Entry score. Data is taken from official IRCC publications and verified daily.",
  },
  placeholder: {
    tag: "Coming Soon",
    badge: "Data integration in progress",
    overview: "System Overview",
    channels: "Official Channels",
    channelsDesc: "Until our data feed is live, rely on these official sources:",
    note: "We'll be adding official data for this country (invitation rounds, cutoffs, processing times). Subscribe to get notified at launch.",
    uk: {
      name: "United Kingdom",
      system: "The UK runs a Points-Based System with no queue-style backlog. Meet the points and requirements for a visa route and you can apply; applications are processed within published service standards.",
      points: [
        "Skilled Worker visa: employer sponsorship required, ~3-8 weeks standard processing",
        "Global Talent visa: for leaders in research, tech and the arts",
        "Graduate Route: 2-3 years of open work rights after graduation",
        "Settlement (ILR) typically after 5 years of continuous lawful residence",
      ],
      links: [
        { label: "GOV.UK Visas & Immigration", url: "https://www.gov.uk/browse/visas-immigration" },
        { label: "Official processing times", url: "https://www.gov.uk/visa-processing-times" },
      ],
    },
    au: {
      name: "Australia",
      system: "Australia's skilled migration runs through SkillSelect: submit an Expression of Interest (EOI), and the government periodically invites the highest-scoring candidates to apply.",
      points: [
        "189 Skilled Independent: points-only, no state nomination needed",
        "190 State Nominated: state nomination adds 5 points",
        "491 Regional: adds 15 points, provisional then permanent",
        "Invitation cutoffs and quotas are published by the government",
      ],
      links: [
        { label: "Home Affairs SkillSelect", url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect" },
        { label: "Visa processing times", url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times" },
      ],
    },
  },
  news: {
    tag: "Immigration News",
    title: "Immigration News",
    updatedBadge: (date) => `Auto-updated daily · verified ${date}`,
    desc: "Regulatory updates are pulled live from the U.S. Federal Register; analysis pieces are editorial summaries with official sources attached.",
    liveBadge: "Federal Register",
    curatedBadge: "Analysis",
    agencies: (list) => `Agencies: ${list}`,
    viewOfficial: "Official source ↗",
    askBtn: "Does this affect me?",
    typeLabels: {
      拟议规则: "Proposed rule",
      最终规则: "Final rule",
      官方公告: "Notice",
      总统令: "Presidential doc",
    },
    tags: {
      "H-1B": "H-1B",
      排期解读: "Bulletin analysis",
      "EB-5": "EB-5",
      事实核查: "Fact check",
    },
    aiBadge: "Coming Soon",
    aiTitle: "AI-Powered Personal Impact Analysis",
    aiBody: "We're building an AI analysis assistant. You'll describe your exact situation (status, priority date, family), and the AI will combine it with this news item and the latest official data to generate a personalized impact assessment and action plan.",
    aiCta: "Get notified at launch",
    aiDisclaimer: "The AI analysis, once live, will not constitute legal advice. Consult a licensed immigration attorney for important decisions.",
  },
  subscribe: {
    title: "Be First to Know When the Line Moves",
    desc: "When each bulletin drops, we'll email you your queue's movement — advances, retrogressions and status changes. Free, unsubscribe anytime.",
    soonBadge: "Coming soon",
    soonBody:
      "Email alerts are being wired up. In the meantime, every queue on this site is checked and updated automatically each day — just check back anytime.",
    familyCat: "Family-based",
    emailPlaceholder: "you@example.com",
    submit: "Subscribe free",
    submitting: "Subscribing…",
    error: "Something went wrong — please try again.",
    doneTitle: "You're subscribed",
    doneBody: (cats, country) =>
      `We'll alert you about ${cats} · ${country} whenever a new bulletin is published.`,
  },
  footer: {
    brand: "GreenLane",
    blurb: "Official immigration data from multiple countries, so every applicant can track the line accurately and on time.",
    sourcesTitle: "Official Data Sources",
    srcBulletin: "U.S. Dept. of State Visa Bulletin",
    srcUscis: "USCIS Processing Times",
    srcIrcc: "IRCC Express Entry Rounds",
    srcFedReg: "U.S. Federal Register",
    disclaimerTitle: "Disclaimer",
    disclaimer:
      "Data is sourced from public official channels and provided for reference only — it is not legal advice. Projections are simple extrapolations of historical pace; actual progress depends on quotas, demand and more. Consult a licensed immigration attorney for important decisions.",
    copyright: "© 2026 GreenLane · Data for reference only, not legal advice",
  },
};

const DICTS: Record<Lang, Dict> = { zh, en };

/* ═══════════════ Provider ═══════════════ */

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const I18nContext = createContext<I18nValue>({ lang: "zh", setLang: () => {}, t: zh });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("gl-lang");
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = DICTS[lang].siteTitle;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("gl-lang", l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
