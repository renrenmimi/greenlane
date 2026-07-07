"use client";

import { useState } from "react";
import { COUNTRIES, queueLabel } from "@/lib/bulletin";
import { useI18n } from "@/lib/i18n";

export default function Subscribe() {
  const { lang, t } = useI18n();
  const [email, setEmail] = useState("");
  const [cats, setCats] = useState<string[]>(["EB-2 / NIW"]);
  const [country, setCountry] = useState("CN");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  /* 类别代码存英文,展示时"亲属移民"按语言渲染 */
  const subCategories = ["EB-1", "EB-2 / NIW", "EB-3", "EB-4", "EB-5", t.subscribe.familyCat];

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || cats.length === 0) return;
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, categories: cats, country }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <section id="subscribe" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24">
      <div className="rounded-3xl bg-gradient-to-r from-series-b to-series-a p-[1.5px]">
        <div className="rounded-3xl bg-[#141413] px-6 py-12 text-center md:px-16">
          {state === "done" ? (
            <div className="fade-up">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-good/15 text-2xl text-good">
                ✓
              </div>
              <h2 className="mt-5 text-2xl font-black md:text-3xl">{t.subscribe.doneTitle}</h2>
              <p className="mx-auto mt-3 max-w-md text-ink-2">
                {t.subscribe.doneBody(
                  cats.join(lang === "zh" ? "、" : ", "),
                  queueLabel(country as (typeof COUNTRIES)[number]["code"], lang)
                )}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">
                {t.subscribe.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-2">{t.subscribe.desc}</p>

              <form onSubmit={submit} className="mx-auto mt-8 max-w-xl">
                <div className="flex flex-wrap justify-center gap-2">
                  {subCategories.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleCat(c)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        cats.includes(c)
                          ? "border-series-b/60 bg-series-b/15 text-ink-1"
                          : "border-hairline text-ink-3 hover:text-ink-2"
                      }`}
                    >
                      {cats.includes(c) ? "✓ " : ""}
                      {c}
                    </button>
                  ))}
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="rounded-full border border-hairline bg-transparent px-4 py-1.5 text-sm font-medium text-ink-2 outline-none [color-scheme:dark]"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {lang === "zh" ? c.label : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    placeholder={t.subscribe.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded-full border border-hairline bg-page px-5 py-3 text-ink-1 outline-none placeholder:text-ink-3 focus:border-series-a/60"
                  />
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="rounded-full bg-gradient-to-r from-series-b to-series-a px-8 py-3 font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
                  >
                    {state === "loading" ? t.subscribe.submitting : t.subscribe.submit}
                  </button>
                </div>
                {state === "error" && (
                  <p className="mt-3 text-sm text-bad">{t.subscribe.error}</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
