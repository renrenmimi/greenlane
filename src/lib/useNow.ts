"use client";

import { useEffect, useState } from "react";

/**
 * 挂载后才返回当前时间,服务端与首帧均为 null。
 *
 * 页面是静态预渲染的:构建期的 new Date() 会被冻结成陈旧日期,
 * 随 HTML 一起缓存数天。因此当前时间只能在客户端读取,
 * 代价是首帧拿不到值,调用方需按 null 处理。
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 客户端时钟无法在渲染期读取
  useEffect(() => setNow(new Date()), []);
  return now;
}
