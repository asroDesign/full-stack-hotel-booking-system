"use client";

import { useState } from "react";

export default function NewsletterForm({ source = "website" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return <p className="glass-pill !py-2 text-[10px]">✓ عضویت شما ثبت شد؛ پیشنهادهای ویژه را برایتان می‌فرستیم.</p>;
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setState("loading");
        try {
          const response = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, source }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "ثبت عضویت انجام نشد.");
            setState("idle");
            return;
          }
          setState("sent");
        } catch {
          setError("خطای شبکه.");
          setState("idle");
        }
      }}
      className="w-full"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input text-xs"
          dir="ltr"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
          required
        />
        <button type="submit" disabled={state === "loading"} className="btn btn-gold btn-sm shrink-0">
          {state === "loading" ? <span className="loading loading-spinner loading-xs" /> : null}
          عضویت در خبرنامه
        </button>
      </div>
      {error ? <p className="mt-1 text-[9px] font-semibold text-rose-600">{error}</p> : null}
    </form>
  );
}
