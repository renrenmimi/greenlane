/**
 * 专题解读内容(预写)。
 * 官方法规动态由 scripts/fetch_news.py 实时抓取,见 live-news.json。
 */

export type IdentityKey =
  | "f1-student"
  | "h1b"
  | "i485-pending"
  | "not-started"
  | "green-card";

export const IDENTITIES: { key: IdentityKey; label: string }[] = [
  { key: "f1-student", label: "F-1 学生 / OPT" },
  { key: "h1b", label: "H-1B 在职" },
  { key: "i485-pending", label: "已递交 I-485 / 等待排期" },
  { key: "not-started", label: "尚未开始办理" },
  { key: "green-card", label: "已持有绿卡" },
];

export interface NewsItem {
  id: string;
  tag: string;
  date: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  /** 对应主题的官方来源页面 */
  url: string;
  /** 按身份预写的影响分析;AI 个性化分析上线前暂不在界面展示 */
  impacts: Record<IdentityKey, string>;
}

export const NEWS: NewsItem[] = [
  {
    id: "h1b-weighted-lottery",
    tag: "H-1B",
    date: "2026-06",
    title: "H-1B 抽签拟按工资分级加权:高薪岗位中签率将明显提升",
    titleEn: "H-1B Lottery to Be Wage-Weighted: Higher-Paid Roles Gain Better Odds",
    summary:
      "DHS 推进按工资等级加权抽签的规则:高工资等级可获得更多抽签机会,入门级岗位中签率将明显下降。",
    summaryEn:
      "DHS is advancing a wage-weighted selection rule: higher wage levels get more lottery entries, while entry-level roles will see sharply lower odds.",
    url: "https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations",
    impacts: {
      "f1-student":
        "影响较大。若您毕业后计划通过 H-1B 工作,入门级(Level 1)岗位的中签概率将显著下降。可行的应对方向:争取更高的工资定级、充分利用 OPT/STEM OPT 的三年抽签窗口,或评估 O-1、NIW 等替代路径。",
      h1b: "基本无影响。已持有 H-1B 者不参与新抽签;仅在极少数需重新注册抽签的情形下适用新规则。",
      "i485-pending":
        "无直接影响。您的绿卡申请已在排队,H-1B 抽签规则变化不影响 I-485 进程,维持现有身份合规即可。",
      "not-started":
        "值得关注。若计划先 H-1B 后办绿卡,工资定级的重要性将上升;也可评估跳过 H-1B、直接以 NIW/EB-1 递交移民申请的可行性。",
      "green-card": "无影响。绿卡持有者不受 H-1B 抽签规则变化影响。",
    },
  },
  {
    id: "h1b-fee",
    tag: "H-1B",
    date: "2026-05",
    title: "10 万美元 H-1B 新申请费:适用范围与豁免情形解读",
    titleEn: "The $100K H-1B Fee: Who Actually Pays, and Who Is Exempt",
    summary:
      "针对境外新申请 H-1B 的高额费用引发多起诉讼,规则仍可能变化。哪些人群实际受影响?境内转换身份是否豁免?",
    summaryEn:
      "The steep fee on new H-1B petitions filed from abroad faces multiple lawsuits and may still change. Who is actually affected — and are in-country status changes exempt?",
    url: "https://www.uscis.gov/newsroom",
    impacts: {
      "f1-student":
        "关键在于申请 H-1B 时您身处境内还是境外。境内 F-1 转 H-1B(change of status)一般不触发该费用;若中签后需回国激活签证,建议先向律师确认最新执行口径,诉讼结果可能随时改变规则。",
      h1b: "续签和延期一般不受影响;涉及出境后重新激活签证时,请关注最新政策口径。",
      "i485-pending": "无直接影响。您已进入绿卡流程,保持身份合规即可。",
      "not-started":
        "若您目前在海外、计划以 H-1B 赴美,该费用通常由雇主承担,将显著影响雇主的招聘意愿。求职时建议优先考虑有能力承担或存在豁免渠道的大型雇主。",
      "green-card": "无影响。",
    },
  },
  {
    id: "july-bulletin",
    tag: "排期解读",
    date: "2026-06",
    title: "7 月排期解读:就业类多数队伍缓慢前进,EB-2 印度继续暂停",
    titleEn: "July Bulletin Breakdown: Slow Advances Across EB, EB-2 India Still Unavailable",
    summary:
      "本月就业类表 A 温和推进;EB-5 乡村预留继续无排期,是中国大陆及印度出生申请人目前较快的通道之一。",
    summaryEn:
      "Employment-based Table A advanced modestly this month; EB-5 rural set-aside remains current — one of the fastest lanes for China- and India-born applicants.",
    url: "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/2026/visa-bulletin-for-july-2026.html",
    impacts: {
      "f1-student":
        "对您而言属于背景信息:排期速度决定了未来从递交到获批的总时长。若考虑 NIW(EB-2),中国大陆出生申请人目前的队伍长度约为四至五年,越早锁定优先日越有利。",
      h1b: "若雇主已为您启动 PERM/I-140,请重点关注所在类别与出生国的队伍:本月的推进速度直接影响能否在 H-1B 六年期限内排到。",
      "i485-pending":
        "与您直接相关。请对照表 A 确认您的优先日是否已排到:排到即进入最终审批。同时留意 USCIS 当月采用表 A 还是表 B 决定新递交资格。",
      "not-started":
        "当前的排期长度是规划路线的重要依据:同等条件下,EB-1 与 EB-5 乡村预留通道明显快于 EB-2/EB-3 常规队伍。",
      "green-card": "无影响。",
    },
  },
  {
    id: "eb5-rural",
    tag: "EB-5",
    date: "2026-04",
    title: "EB-5 乡村预留继续「无排期」:直接投资与区域中心如何选择",
    titleEn: "EB-5 Rural Set-Aside Stays Current: Direct Investment vs. Regional Center",
    summary:
      "预留类别(乡村 20% / 高失业率 10%)对中国大陆及印度出生申请人目前无需排队,「双递交」策略受到广泛关注。",
    summaryEn:
      "Set-aside categories (rural 20% / high-unemployment 10%) remain current for China- and India-born applicants, drawing wide interest in the concurrent-filing strategy.",
    url: "https://www.uscis.gov/working-in-the-united-states/permanent-workers/eb-5-immigrant-investor-program",
    impacts: {
      "f1-student":
        "若家庭具备约 80 万美元的合规投资资金,乡村预留 EB-5 支持境内双递交(I-526E 与 I-485 同时递交),等待期间即可获得工卡与回美证,不再依赖 F-1/H-1B 身份。投资存在风险,项目尽职调查至关重要。",
      h1b: "同上。双递交后可使用 EAD 工作,不再受 H-1B 约束。是否适合取决于资金状况与风险承受能力。",
      "i485-pending":
        "若您现有类别的排期遥遥无期(如 EB-2 印度),转入 EB-5 预留类别是常见的「换队」策略;优先日在类别间的保留规则请咨询律师。",
      "not-started": "资金充足的情况下,这是中国大陆及印度出生申请人目前较快的绿卡通道之一。",
      "green-card": "无影响。",
    },
  },
  {
    id: "consular-rumor",
    tag: "事实核查",
    date: "2026-03",
    title: "「绿卡面谈必须回出生国」的说法是否属实?领事处理规则梳理",
    titleEn: "Fact Check: Do You Really Have to Return to Your Birth Country for the Green Card Interview?",
    summary:
      "网络流传的说法混淆了「受理使领馆的确定规则」与「按出生国计算排期」两个独立概念,本文逐条对照官方规定说明。",
    summaryEn:
      "A viral claim conflates two separate concepts — which consulate handles your case vs. which country your queue is charged to. We check it against the official rules.",
    url: "https://travel.state.gov/content/travel/en/us-visas/immigrate/the-immigrant-visa-process.html",
    impacts: {
      "f1-student":
        "该传言对您无实际影响:在美国境内递交 I-485 调整身份不涉及领事处理流程,不存在「回国面谈」问题。仅选择境外领事处理(DS-260)的申请人涉及使领馆地点规则。",
      h1b: "同上。境内调整身份不受影响;若计划回国办理移民签证面谈,受理使领馆通常按居住地而非出生地确定,具体以官方指引和律师意见为准。",
      "i485-pending": "无影响。您已在境内调整身份流程中,不涉及领事面谈。",
      "not-started":
        "规划路线时了解即可:出生国决定排期归属(chargeability),但不决定面谈地点,两者是相互独立的概念,请以官方规定为准。",
      "green-card": "无影响。",
    },
  },
];
