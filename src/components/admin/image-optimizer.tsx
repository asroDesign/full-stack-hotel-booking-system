"use client";

import { useState } from "react";
import { ImageDown, Zap } from "lucide-react";
import { optimizeImagesBatch } from "@/app/actions/images";
import { faNum } from "@/lib/utils";

export function ImageOptimizer({ total, pending }: { total: number; pending: number }) {
  const [left, setLeft] = useState(pending);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ done: 0, failed: 0 });
  const start = async () => {
    setRunning(true);
    let remaining = left;
    let done = 0;
    let failed = 0;
    while (remaining > 0) {
      const r = await optimizeImagesBatch().catch(() => ({ done: 0, failed: 1, remaining: 0 }));
      done += r.done;
      failed += r.failed;
      remaining = r.remaining;
      setLeft(remaining);
      setStats({ done, failed });
      if (r.done === 0) break;
    }
    setRunning(false);
  };
  const pct = total ? Math.round(((total - left) / total) * 100) : 100;
  return (
    <section className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><ImageDown className="h-5 w-5 text-primary" /> موتور بهینه‌سازی تصاویر</h3>
        <p className="text-sm leading-7 text-base-content/65">
          همه تصاویر جدید هنگام بارگذاری خودکار به WebP تبدیل می‌شوند و یک نسخه کم‌حجم برای نمایش سریع اولیه از آن‌ها ساخته می‌شود (پشتیبانی از HEIC آیفون).
          تصاویری که پیش از این نسخه بارگذاری شده‌اند را با دکمه زیر بهینه کنید.
        </p>
        <div>
          <div className="flex justify-between text-xs text-base-content/60"><span>{faNum(total - left)} از {faNum(total)} تصویر بهینه است</span><span>{faNum(pct)}٪</span></div>
          <progress className="progress progress-primary mt-1 w-full" value={pct} max={100} />
        </div>
        {(stats.done > 0 || stats.failed > 0) && (
          <p className="text-xs text-base-content/60">{faNum(stats.done)} تصویر بهینه شد{stats.failed ? ` · ${faNum(stats.failed)} مورد ناموفق` : ""}.</p>
        )}
        <button type="button" disabled={running || left === 0} onClick={start} className="btn btn-primary w-fit">
          {running ? <span className="loading loading-spinner loading-sm" /> : <Zap className="h-4 w-4" />}
          {left === 0 ? "همه تصاویر بهینه هستند" : running ? `در حال بهینه‌سازی… (${faNum(left)} باقی‌مانده)` : `بهینه‌سازی ${faNum(left)} تصویر`}
        </button>
      </div>
    </section>
  );
}
