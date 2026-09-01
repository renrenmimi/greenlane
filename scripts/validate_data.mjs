#!/usr/bin/env node
// 抓完之后、提交之前的一道闸。
//
// 抓取脚本失败的方式不止「报错退出」一种:源站改版会让解析器安静地返回空列表,
// 网络中断会让它只拿到前几页,日期字段错位会写进一个明年的排期。这些都不会让
// python 退出码变成非零 —— 它们会被原样提交,然后网站变成空白或者胡说八道。
//
// 所以这里检查四件事:结构对不对、日期讲不讲得通、有没有变空、
// 以及跟上一版比是不是掉了数据。任何一条不过就退出 1,workflow 就不提交。

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DATA = "src/data";
const problems = [];
const notes = [];

const fail = (msg) => problems.push(msg);
const note = (msg) => notes.push(msg);

/** 今天(UTC)。数据里的任何日期都不该超过它。 */
const TODAY = new Date().toISOString().slice(0, 10);

const isISODate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function readJSON(name) {
  try {
    return JSON.parse(readFileSync(`${DATA}/${name}`, "utf8"));
  } catch (e) {
    fail(`${name}: 读不出来或不是合法 JSON — ${e.message}`);
    return null;
  }
}

/** 上一版(git HEAD)的同一个文件,用来比条数。首次运行或文件是新的就返回 null。 */
function previous(name) {
  try {
    return JSON.parse(execSync(`git show HEAD:${DATA}/${name}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}

/** 三个文件共有的外壳。 */
function checkEnvelope(name, doc, listKey) {
  if (!doc) return null;
  if (!isISODate(doc.updatedAt)) fail(`${name}: updatedAt 不是 YYYY-MM-DD — ${JSON.stringify(doc.updatedAt)}`);
  else if (doc.updatedAt > TODAY) fail(`${name}: updatedAt 是未来日期 ${doc.updatedAt}(今天 ${TODAY})`);

  if (typeof doc.source !== "string" || !/^https?:\/\//.test(doc.source)) {
    fail(`${name}: source 不是一个 URL — ${JSON.stringify(doc.source)}`);
  }

  const list = doc[listKey];
  if (!Array.isArray(list)) {
    fail(`${name}: ${listKey} 不是数组`);
    return null;
  }
  if (list.length === 0) {
    fail(`${name}: ${listKey} 是空的 — 抓取多半没成功,不能拿它覆盖已有数据`);
    return null;
  }
  return list;
}

/** 历史数据只进不退:条数少于上一版,说明这次抓漏了。 */
function checkNoShrink(name, listKey, list) {
  const prev = previous(name);
  const before = prev?.[listKey]?.length;
  if (typeof before !== "number") {
    note(`${name}: 没有上一版可比(首次运行?),跳过条数比对`);
    return;
  }
  if (list.length < before) {
    fail(`${name}: ${listKey} 从 ${before} 条掉到 ${list.length} 条 — 历史数据不该变少`);
  } else {
    note(`${name}: ${listKey} ${before} → ${list.length} 条`);
  }
}

// ---------- 美国排期公告 ----------
{
  const doc = readJSON("bulletins.json");
  const list = checkEnvelope("bulletins.json", doc, "bulletins");
  if (list) {
    checkNoShrink("bulletins.json", "bulletins", list);
    const thisYear = Number(TODAY.slice(0, 4));
    list.forEach((b, i) => {
      const at = `bulletins[${i}]`;
      if (!Number.isInteger(b.year) || b.year < 2000 || b.year > thisYear + 1) fail(`${at}.year 不合理 — ${b.year}`);
      if (!Number.isInteger(b.month) || b.month < 1 || b.month > 12) fail(`${at}.month 不合理 — ${b.month}`);
      if (typeof b.url !== "string" || !/^https?:\/\//.test(b.url)) fail(`${at}.url 不是 URL`);
      // 排期表本身:至少要有职业移民的 finalAction,否则页面无从画起。
      const fa = b?.employment?.finalAction;
      if (!fa || typeof fa !== "object") fail(`${at}.employment.finalAction 缺失`);
      else if (!fa.EB1 || !fa.EB2 || !fa.EB3) fail(`${at}.employment.finalAction 少了 EB1/EB2/EB3`);
    });
    // 最新一期不该比 updatedAt 还新。
    const newest = list.reduce((a, b) => (b.year * 12 + b.month > a.year * 12 + a.month ? b : a));
    const newestKey = `${newest.year}-${String(newest.month).padStart(2, "0")}`;
    note(`bulletins.json: 最新一期 ${newestKey}`);
    if (newest.year > thisYear + 1) fail(`bulletins.json: 最新一期 ${newestKey} 在未来太远`);
  }
}

// ---------- 加拿大 EE 抽签 ----------
{
  const doc = readJSON("canada.json");
  const list = checkEnvelope("canada.json", doc, "rounds");
  if (list) {
    checkNoShrink("canada.json", "rounds", list);
    list.forEach((r, i) => {
      const at = `rounds[${i}]`;
      if (!isISODate(r.date)) fail(`${at}.date 不是 YYYY-MM-DD — ${JSON.stringify(r.date)}`);
      else if (r.date > TODAY) fail(`${at}.date 是未来日期 ${r.date}`);
      if (!Number.isInteger(r.crs) || r.crs < 0 || r.crs > 1200) fail(`${at}.crs 超出 0–1200 — ${r.crs}`);
      if (!Number.isInteger(r.invitations) || r.invitations < 0) fail(`${at}.invitations 不合理 — ${r.invitations}`);
    });
  }
}

// ---------- 联邦公报法规动态 ----------
{
  const doc = readJSON("live-news.json");
  const list = checkEnvelope("live-news.json", doc, "items");
  if (list) {
    // 这一份是滚动的最新若干条,不是历史累积,所以只看上下界。
    if (list.length > 100) fail(`live-news.json: items 有 ${list.length} 条,远超预期的滚动窗口`);
    const seen = new Set();
    list.forEach((n, i) => {
      const at = `items[${i}]`;
      if (!n.id) fail(`${at}.id 缺失`);
      else if (seen.has(n.id)) fail(`${at}.id 重复 — ${n.id}`);
      else seen.add(n.id);
      if (typeof n.title !== "string" || !n.title.trim()) fail(`${at}.title 是空的`);
      if (!isISODate(n.date)) fail(`${at}.date 不是 YYYY-MM-DD — ${JSON.stringify(n.date)}`);
      else if (n.date > TODAY) fail(`${at}.date 是未来日期 ${n.date}`);
      if (typeof n.url !== "string" || !/^https?:\/\//.test(n.url)) fail(`${at}.url 不是 URL`);
    });
    note(`live-news.json: ${list.length} 条`);
  }
}

// ---------- 结论 ----------
for (const n of notes) console.log(`  · ${n}`);
if (problems.length) {
  console.error(`\n✗ 数据校验没过(${problems.length} 项):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\n不提交。已有数据保持原样。");
  process.exit(1);
}
console.log("\n✓ 结构、日期、非空、条数四项都通过");
