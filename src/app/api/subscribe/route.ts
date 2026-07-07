import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// MVP: 订阅者落在本地 JSON;上线时替换为数据库 + 邮件服务(如 Resend)
const STORE = path.join(process.cwd(), "data", "subscribers.json");

interface Subscriber {
  email: string;
  categories: string[];
  country: string;
  subscribedAt: string;
}

export async function POST(request: Request) {
  let body: Partial<Subscriber>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }
  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    return Response.json({ error: "categories required" }, { status: 400 });
  }

  await mkdir(path.dirname(STORE), { recursive: true });
  let subscribers: Subscriber[] = [];
  try {
    subscribers = JSON.parse(await readFile(STORE, "utf-8"));
  } catch {
    // 文件不存在或损坏,从空列表开始
  }

  const entry: Subscriber = {
    email,
    categories: body.categories.map(String),
    country: typeof body.country === "string" ? body.country : "ALL",
    subscribedAt: new Date().toISOString(),
  };
  const idx = subscribers.findIndex((s) => s.email === email);
  if (idx >= 0) subscribers[idx] = entry;
  else subscribers.push(entry);

  await writeFile(STORE, JSON.stringify(subscribers, null, 2));
  return Response.json({ ok: true });
}
