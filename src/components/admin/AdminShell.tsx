"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SessionAdmin } from "@/lib/auth";
import { toFa } from "@/lib/format";

const NAV = [
  { href: "/admin", label: "داشبورد", icon: "📊" },
  { href: "/admin/bookings", label: "رزروها", icon: "🧾", badgeKey: "bookings" as const },
  { href: "/admin/rooms", label: "اتاق‌ها", icon: "🛏️" },
  { href: "/admin/menu", label: "منوی کافه", icon: "🍽️" },
  { href: "/admin/offers", label: "پیشنهادها", icon: "🎁" },
  { href: "/admin/events", label: "رویدادها", icon: "🎶" },
  { href: "/admin/promos", label: "کدهای تخفیف", icon: "🏷️" },
  { href: "/admin/pool-slots", label: "سانس‌های استخر", icon: "🏊" },
  { href: "/admin/pricing", label: "تقویم قیمت‌ها", icon: "🗓️" },
  { href: "/admin/facilities", label: "امکانات", icon: "✨" },
  { href: "/admin/attractions", label: "جاذبه‌ها", icon: "🗺️" },
  { href: "/admin/gallery", label: "گالری", icon: "🖼️" },
  { href: "/admin/accounting", label: "حسابداری", icon: "📚" },
  { href: "/admin/reviews", label: "نظرات مهمانان", icon: "★", badgeKey: "reviews" as const },
  { href: "/admin/concierge", label: "کانسیرژ", icon: "🛎️", badgeKey: "concierge" as const },
  { href: "/admin/subscribers", label: "خبرنامه", icon: "📧" },
  { href: "/admin/messages", label: "پیام‌ها", icon: "✉️", badgeKey: "messages" as const },
  { href: "/admin/sms", label: "پیامک‌ها", icon: "📨" },
  { href: "/admin/settings", label: "تنظیمات هتل", icon: "⚙️" },
];

export default function AdminShell({
  admin,
  counts,
  hotelName,
  children,
}: {
  admin: SessionAdmin;
  counts: { bookings: number; messages: number; reviews: number; concierge: number };
  hotelName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f4ee]">
      {open ? (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-forest-950/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[17rem] max-w-[86vw] flex-col bg-forest-950 text-cream-200 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">🏨</span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-white">{hotelName}</p>
            <p className="text-[10px] text-gold-300">پنل مدیریت پذیرش</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-white/60 lg:hidden" aria-label="بستن">
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-cream-200/35">مدیریت</p>
          <ul className="menu menu-sm w-full gap-1 p-0">
            {NAV.map((item) => {
              const badge = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                      isActive(item.href)
                        ? "menu-active bg-gold-400 text-forest-950 shadow-soft hover:bg-gold-400"
                        : "text-cream-200/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 ? (
                      <span
                        className={`badge badge-sm border-0 text-[9px] font-black ${
                          isActive(item.href) ? "bg-forest-950 text-gold-300" : "bg-rose-500 text-white"
                        }`}
                      >
                        {toFa(badge)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="menu menu-sm mt-4 w-full gap-1 border-t border-white/10 p-0 pt-4">
            <li>
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-cream-200/70 transition hover:bg-white/10 hover:text-white"
              >
                <span className="text-base">🌐</span>
                مشاهده سایت هتل
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-200"
              >
                <span className="text-base">⎋</span>
                {loggingOut ? "در حال خروج…" : "خروج از حساب"}
              </button>
            </li>
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 text-xs font-black text-forest-950">
              {admin.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white">{admin.name}</p>
              <p dir="ltr" className="truncate text-[9px] text-cream-200/50">{admin.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pr-72">
        <header className="sticky top-0 z-30 border-b border-cream-200 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="باز کردن منو"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream-300 bg-white text-forest-900 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-forest-950">پنل مدیریت {hotelName}</p>
              <p className="hidden text-[10px] text-forest-800/50 sm:block">مدیریت رزروها، اتاق‌ها و محتوای سایت</p>
            </div>
            <Link href="/booking" className="hidden btn btn-ghost btn-sm sm:inline-flex">
              ثبت رزرو دستی
            </Link>
            <Link href="/" className="btn btn-primary btn-sm whitespace-nowrap">
              سایت هتل
            </Link>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
