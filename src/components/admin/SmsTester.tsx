"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SmsTester({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [receptor, setReceptor] = useState("");
  const [name, setName] = useState("مهمان آزمایشی");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
      <h2 className="text-xs font-extrabold text-forest-950">ارسال پیامک آزمایشی (پترن وضعیت)</h2>
      <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
        برای بررسی صحت کلید و شناسه پترن، یک پیام آزمایشی به شماره خود بفرستید.
      </p>
      <div className="mt-2 space-y-2">
        <input className="input h-9 py-1 text-xs" dir="ltr" placeholder="09xxxxxxxxx" value={receptor} onChange={(event) => setReceptor(event.target.value)} />
        <input className="input h-9 py-1 text-xs" placeholder="نام نمایشی در پیام" value={name} onChange={(event) => setName(event.target.value)} />
        <button
          type="button"
          disabled={loading || !configured}
          onClick={async () => {
            setLoading(true);
            setResult(null);
            const response = await fetch("/api/admin/sms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ receptor, name }),
            });
            const data = await response.json();
            setResult(response.ok ? `وضعیت: ${data.status}` : data.error ?? "ارسال انجام نشد.");
            setLoading(false);
            router.refresh();
          }}
          className="btn btn-primary btn-sm w-full"
        >
          {loading ? <span className="loading loading-spinner loading-xs" /> : null}
          ارسال آزمایشی
        </button>
        {!configured ? (
          <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
            ابتدا کلید API و شناسه پترن سرویس‌دهنده را در متغیرهای محیطی تنظیم کنید.
          </p>
        ) : null}
        {result ? <p className="rounded-lg bg-cream-100 px-2 py-1.5 text-[10px] text-forest-800/70">{result}</p> : null}
      </div>
    </section>
  );
}
