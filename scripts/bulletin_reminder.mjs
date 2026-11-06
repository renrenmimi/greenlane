#!/usr/bin/env node
// 美国排期改为手动导入之后的到期提醒。每天跑一次,只在状态变化时动作:
//
// - 新一期该出来了(发布月 10 号起,对应网站上的发布日预测),数据里还没有
//   → 开一个提醒 Issue 并 @ 仓库主人。GitHub 只在这时发一封邮件,不会每天一封。
// - 拖到下个月还没导入(网站上已经不是当月排期了)→ 在同一个 Issue 里追加一次逾期提醒。
// - 已经导入 → 关闭 Issue。
//
// 本地演练(只打印,不动 GitHub):
//   REMINDER_TODAY=2026-11-12 node scripts/bulletin_reminder.mjs --dry-run

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LABEL = "bulletin-reminder";
/** 发布月从几号开始提醒。官方通常在每月 8–16 日的工作日发布下个月的排期,10 号前后最集中 */
const DUE_DAY = 10;
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const dryRun = process.argv.includes("--dry-run");
const today = process.env.REMINDER_TODAY ? new Date(`${process.env.REMINDER_TODAY}T12:00:00Z`) : new Date();

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });
const act = (desc, ...args) => (dryRun ? console.log(`  [演练] ${desc}`) : gh(...args));

const { bulletins } = JSON.parse(readFileSync("src/data/bulletins.json", "utf8"));
const latest = bulletins.reduce((a, b) => (b.year * 12 + b.month > a.year * 12 + a.month ? b : a));
// 某月的排期在前一个月发布:最新一期是 11 月,下一期就是 11 月里发布的 12 月排期
const next = latest.month === 12 ? { year: latest.year + 1, month: 1 } : { year: latest.year, month: latest.month + 1 };

const nowKey = today.getUTCFullYear() * 12 + today.getUTCMonth() + 1;
const latestKey = latest.year * 12 + latest.month;
const overdue = nowKey > latestKey;
const due = overdue || (nowKey === latestKey && today.getUTCDate() >= DUE_DAY);

const fiscalYear = next.month >= 10 ? next.year + 1 : next.year;
const url =
  "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/" +
  `${fiscalYear}/visa-bulletin-for-${MONTHS[next.month - 1]}-${next.year}.html`;
const title = `该导入 ${next.year} 年 ${next.month} 月美国排期了`;
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? JSON.parse(gh("repo", "view", "--json", "owner")).owner.login;

const open = JSON.parse(gh("issue", "list", "--label", LABEL, "--state", "open", "--json", "number,title"));
const current = open.find((i) => i.title.startsWith(title));

console.log(`最新已收录 ${latest.year}-${latest.month},下一期 ${next.year}-${next.month};` +
  (overdue ? "已逾期" : due ? "已到提醒时间" : "还没到提醒时间"));

// 不属于「当前待导入这一期」的提醒都已过时:要么已经导入,要么被下一期取代
for (const issue of open.filter((i) => i !== current)) {
  act(`关闭 #${issue.number}「${issue.title}」`, "issue", "close", String(issue.number), "--comment", "已导入,自动关闭。");
}

if (due && !current) {
  const body = [
    `@${owner} 按往常规律,**${next.year} 年 ${next.month} 月**的美国排期公告这几天会在官网发布`,
    "(通常在每月 8–16 日的工作日)。",
    "",
    "官网这一期的地址:",
    url,
    "",
    "导入步骤:",
    "1. 用浏览器正常打开上面的地址。如果打不开或还是旧的一期,说明还没发布,过一两天再看",
    "2. 另存为网页:Chrome 选「网页,仅 HTML」;Safari 用默认的「网页归档」即可",
    "3. 把存下来的文件交给 Claude 导入;或者在项目目录运行",
    "   `python3 scripts/scrape_bulletins.py --import <存下来的文件>`,再提交并推送",
    "",
    "导入之后,这个提醒会自动关闭。",
  ].join("\n");
  act("创建标签", "label", "create", LABEL, "--color", "FBCA04", "--description", "美国排期待导入提醒", "--force");
  act(`开提醒「${title}」`, "issue", "create", "--title", title, "--label", LABEL, "--body", body);
} else if (overdue && current && !current.title.includes("已逾期")) {
  const month = today.getUTCMonth() + 1;
  act(`追加逾期提醒到 #${current.number}`, "issue", "comment", String(current.number), "--body",
    `@${owner} 已经到 ${month} 月了,${next.month} 月排期还没导入,网站上显示的已经不是当月排期。请尽快按上面的步骤导入。`);
  act(`标题加上「已逾期」`, "issue", "edit", String(current.number), "--title", `${title}(已逾期)`);
}
