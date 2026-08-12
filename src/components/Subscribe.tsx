"use client";

import { useI18n } from "@/lib/i18n";

/**
 * 邮件提醒占位区。
 * 表单在接入邮件服务(如 Resend)+ 隐私政策前不收集邮箱,
 * 历史实现见 git 记录:src/components/Subscribe.tsx @ 41334c9。
 */
export default function Subscribe() {
  const { t } = useI18n();

  return (
    <section id="subscribe" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24">
      <div className="rounded-3xl bg-gradient-to-r from-series-b to-series-a p-[1.5px]">
        <div className="rounded-3xl bg-[#141413] px-6 py-12 text-center md:px-16">
          <span className="inline-block rounded-full border border-series-a/40 bg-series-a/10 px-3.5 py-1 text-xs font-semibold text-ink-2">
            {t.subscribe.soonBadge}
          </span>
          <h2 className="mt-5 text-2xl font-black tracking-tight md:text-4xl">
            {t.subscribe.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-2">
            {t.subscribe.soonBody}
          </p>
        </div>
      </div>
    </section>
  );
}
