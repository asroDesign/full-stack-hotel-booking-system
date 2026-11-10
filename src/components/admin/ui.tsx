"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Waves,
  Sparkles,
  MapPinned,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Star,
  Upload,
  Trash2,
  Plus,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Home,
  FileText,
  CalendarDays,
  Calculator,
  MessageSquareText,
  Rocket,
  AlertTriangle,
  Paintbrush,
  UtensilsCrossed,
  TicketPercent,
  HelpCircle,
  Images,
  ConciergeBell,
  CalendarRange,
  MessagesSquare,
  Users,
  Megaphone,
  Gift,
  Crown,
  Handshake,
} from "lucide-react";
import { logout } from "@/app/actions/admin";
import { IMAGE_ACCEPT, isImageFile, uploadFile } from "./media-inputs";
import { cn, faNum, statusMeta } from "@/lib/utils";

type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard; badge?: BadgeKey; exact?: boolean };
type BadgeKey = "pending" | "messages" | "reviews" | "requests" | "tables" | "gifts";
const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "عملیات هتل",
    items: [
      { href: "/admin", label: "داشبورد", Icon: LayoutDashboard, exact: true },
      { href: "/admin/front-desk", label: "میز پذیرش", Icon: ConciergeBell },
      { href: "/admin/calendar", label: "تقویم رزروها", Icon: CalendarRange },
      { href: "/admin/reservations", label: "رزروها", Icon: CalendarCheck, badge: "pending" },
      { href: "/admin/guest-requests", label: "درخواست مهمانان ساکن", Icon: MessagesSquare, badge: "requests" },
      { href: "/admin/table-bookings", label: "رزرو میز رستوران", Icon: UtensilsCrossed, badge: "tables" },
      { href: "/admin/rooms", label: "اتاق‌ها", Icon: BedDouble },
      { href: "/admin/pricing", label: "قیمت‌گذاری و تقویم قیمت", Icon: CalendarDays },
    ],
  },
  {
    title: "باشگاه مشتریان و بازاریابی",
    items: [
      { href: "/admin/customers", label: "مشتریان و گروه‌ها", Icon: Users },
      { href: "/admin/campaigns", label: "کمپین‌ها", Icon: Megaphone },
      { href: "/admin/gift-cards", label: "کارت‌های هدیه", Icon: Gift, badge: "gifts" },
      { href: "/admin/promotions", label: "پیشنهادها و کد تخفیف", Icon: TicketPercent },
      { href: "/admin/testimonials", label: "نظرات مهمانان", Icon: Star, badge: "reviews" },
      { href: "/admin/club", label: "تنظیمات باشگاه", Icon: Crown },
    ],
  },
  {
    title: "ارتباطات",
    items: [
      { href: "/admin/sms", label: "مرکز پیامک", Icon: MessageSquareText },
      { href: "/admin/messages", label: "پیام‌های تماس", Icon: MessageSquare, badge: "messages" },
    ],
  },
  {
    title: "همکاران و مالی",
    items: [
      { href: "/admin/partners", label: "آژانس‌ها و وب‌سرویس", Icon: Handshake },
      { href: "/admin/accounting", label: "حسابداری", Icon: Calculator },
    ],
  },
  {
    title: "محتوای سایت",
    items: [
      { href: "/admin/appearance", label: "هویت و ظاهر سایت", Icon: Paintbrush },
      { href: "/admin/home", label: "صفحه اصلی", Icon: Home },
      { href: "/admin/booking-page", label: "صفحه رزرو و قوانین", Icon: FileText },
      { href: "/admin/dining", label: "رستوران و کافه", Icon: UtensilsCrossed },
      { href: "/admin/services", label: "خدمات و سانس‌ها", Icon: Waves },
      { href: "/admin/gallery", label: "گالری تصاویر", Icon: Images },
      { href: "/admin/faqs", label: "سوالات متداول", Icon: HelpCircle },
      { href: "/admin/amenities", label: "امکانات", Icon: Sparkles },
      { href: "/admin/attractions", label: "جاذبه‌های گردشگری", Icon: MapPinned },
    ],
  },
  {
    title: "سیستم",
    items: [
      { href: "/admin/settings", label: "تنظیمات", Icon: Settings },
      { href: "/admin/go-live", label: "راه‌اندازی نهایی", Icon: Rocket },
    ],
  },
];


export function AdminShell({
  children,
  admin,
  counts,
  warning,
  hotelName = "",
}: {
  children: ReactNode;
  admin: { name: string; email: string };
  counts: Partial<Record<BadgeKey, number>>;
  warning?: string | null;
  hotelName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-lg font-black text-brand-950">{(hotelName.replace(/^هتل\s*/, "") || "H").charAt(0)}</span>
        <div>
          <div className="font-extrabold text-white">پنل مدیریت</div>
          <div className="max-w-40 truncate text-xs text-white/50">{hotelName}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="menu w-full gap-1 text-white/75">
          {navSections.map((sec) => (
            <li key={sec.title} className="mt-2 first:mt-0">
              <h2 className="menu-title px-3 pb-1 pt-2 text-[11px] font-bold text-white/40">{sec.title}</h2>
              <ul className="gap-1">
                {sec.items.map(({ href, label, Icon, badge, exact }) => {
                  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                  const n = badge ? counts[badge] ?? 0 : 0;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "rounded-field py-2 font-medium",
                          active ? "menu-active !bg-base-100 !text-primary shadow-lg" : "hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span className="flex-1">{label}</span>
                        {n > 0 && <span className="badge badge-secondary badge-sm font-bold">{faNum(n)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <div className="m-3 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="avatar avatar-placeholder"><div className="w-9 rounded-full bg-accent text-accent-content"><span className="font-bold">{admin.name[0]}</span></div></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{admin.name}</div>
            <div className="truncate text-xs text-white/50">{admin.email}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/" target="_blank" className="btn btn-sm border-0 bg-white/10 text-xs text-white hover:bg-white/20">
            <ExternalLink className="h-3.5 w-3.5" /> مشاهده سایت
          </Link>
          <form action={logout}>
            <button className="btn btn-sm btn-block border-0 bg-error/20 text-xs text-rose-200 hover:bg-error/30">
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base-200">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 print:!hidden bg-gradient-to-b from-brand-900 to-brand-950 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 animate-fade-up bg-gradient-to-b from-brand-900 to-brand-950">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pr-72 print:!pr-0">
        <header className="navbar sticky top-0 z-30 print:hidden gap-3 border-b border-base-300 bg-base-100/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="btn btn-square btn-ghost">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-extrabold text-slate-800">پنل مدیریت {hotelName}</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">
          {warning && pathname !== "/admin/go-live" && (
            <div role="alert" className="alert alert-warning mb-6 print:hidden">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">{warning}</span>
              <Link href="/admin/go-live" className="btn btn-sm">راه‌اندازی نهایی</Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const m = statusMeta[status] ?? statusMeta.cancelled;
  return (
    <span className={cn("badge badge-soft badge-sm h-auto gap-1.5 whitespace-nowrap py-1 font-semibold", m.badge)}>
      <span className={cn("status status-xs", m.dot)} />
      {m.label}
    </span>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <span className="loading loading-spinner loading-sm" />}
      {children}
    </button>
  );
}

export function FormAlert({ state }: { state: { ok?: boolean; error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <div role="alert" className="alert alert-error alert-soft text-sm">
        <AlertCircle className="h-4 w-4" /> <span>{state.error}</span>
      </div>
    );
  if (state.ok)
    return (
      <div role="alert" className="alert alert-success alert-soft text-sm">
        <CheckCircle2 className="h-4 w-4" /> <span>{state.message}</span>
      </div>
    );
  return null;
}

export function Toast({ message, onDone, tone = "success" }: { message: string | null; onDone: () => void; tone?: "success" | "error" }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="toast toast-end toast-bottom z-[90]">
      <div role="alert" className={cn("alert animate-fade-up shadow-2xl", tone === "success" ? "alert-success" : "alert-error")}>
        {tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <span>{message}</span>
      </div>
    </div>
  );
}

export function EmptyBox({ title, desc, action, icon }: { title: string; desc?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card card-dash border-base-300 bg-base-100">
      <div className="card-body items-center py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-box bg-base-200 text-base-content/40">{icon ?? <ImageIcon className="h-6 w-6" />}</div>
        <h3 className="card-title mt-2 text-base">{title}</h3>
        {desc && <p className="text-sm text-base-content/60">{desc}</p>}
        {action && <div className="card-actions mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function ImageListInput({ name, initial, single = false }: { name: string; initial: string[]; single?: boolean }) {
  const [list, setList] = useState<string[]>(initial.filter(Boolean));
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (u: string) => setList((l) => (single ? [u] : [...l, u]));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setErr("");
    try {
      for (const f of Array.from(files)) {
        if (!isImageFile(f)) throw new Error("فقط فایل تصویری مجاز است (JPG، PNG، WEBP، GIF، HEIC)");
        const data = await uploadFile(f);
        add(data.url);
        if (single) break;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={list.join("\n")} />
      {list.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((src, i) => (
            <div key={src + i} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && !single && <span className="absolute right-1 top-1 rounded-md bg-gold-400 px-1.5 py-0.5 text-[10px] font-bold text-brand-950">کاور</span>}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                {i > 0 && (
                  <button type="button" onClick={() => setList((l) => [l[i], ...l.filter((_, j) => j !== i)])} className="rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700">
                    کاور
                  </button>
                )}
                <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500 text-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="آدرس تصویر (https://...)" dir="ltr" className="input w-full flex-1 text-left" />
        <button
          type="button"
          onClick={() => {
            if (url.trim()) {
              add(url.trim());
              setUrl("");
            }
          }}
          className="btn"
        >
          <Plus className="h-4 w-4" /> افزودن لینک
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn">
          {uploading ? <span className="loading loading-spinner loading-sm" /> : <Upload className="h-4 w-4" />} آپلود
        </button>
        <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple={!single} hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal modal-open modal-bottom z-[80] sm:modal-middle" role="dialog">
      <div className="modal-box max-h-[92vh] max-w-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button type="button" onClick={onClose} className="btn btn-circle btn-ghost btn-sm"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
      <button type="button" className="modal-backdrop bg-neutral/50 backdrop-blur-sm" onClick={onClose} aria-label="بستن" />
    </div>
  );
}
