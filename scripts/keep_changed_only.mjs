#!/usr/bin/env node
// 只留下内容真的变了的数据文件。
//
// 抓取脚本每次成功都会把 updatedAt 刷成当前时刻。如果除此之外什么都没变,
// 就把文件还原成上一版:不提交,也就不会触发 Vercel 部署;
// 页面上的「数据更新于」也就始终是最近一次真正抓到新数据的时间。

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DATA = "src/data";
const FILES = ["bulletins.json", "canada.json", "live-news.json"];

/** 去掉 updatedAt 之后的内容,用来判断数据本身有没有变 */
const content = (doc) => JSON.stringify({ ...doc, updatedAt: undefined });

for (const name of FILES) {
  const path = `${DATA}/${name}`;
  let before;
  try {
    before = JSON.parse(execSync(`git show HEAD:${path}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    console.log(`  · ${name}: 上一版没有这个文件,照常提交`);
    continue;
  }
  const after = JSON.parse(readFileSync(path, "utf8"));
  if (content(before) === content(after)) {
    execSync(`git checkout HEAD -- ${path}`);
    console.log(`  · ${name}: 数据没变,只刷新了核对时刻 → 还原,不提交`);
  } else {
    console.log(`  · ${name}: 有新数据 → 提交`);
  }
}
