import type { ReactNode } from "react";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { giftCards, guestRequests, messages, reservations, tableBookings, testimonials } from "@/db/schema";
import { todayISO } from "@/lib/utils";
import { and, gte, ne } from "drizzle-orm";
import { ensureCustomersBackfill } from "@/lib/crm";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { AdminShell } from "@/components/admin/ui";
import { adminUsesDefaultPassword, getDemoState } from "@/lib/demo";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const admin = await requireAdmin();
  const [usesDefault, demo] = await Promise.all([adminUsesDefaultPassword(admin.id), getDemoState()]);
  const warning = usesDefault
    ? "شما با رمز عمومی نسخه نمایشی وارد شده‌اید. برای امنیت سایت، ایمیل و رمز عبور را تغییر دهید."
    : demo.enabled
      ? "سایت هنوز در حالت نمایشی است. برای استفاده واقعی، از حالت نمایشی خارج شوید."
      : null;
  await ensureCustomersBackfill().catch(() => null);
  const [[p], [m], [rv], [gr], [tb], [gc]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(reservations).where(inArray(reservations.status, ["paid"])),
    db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.isRead, false)),
    db.select({ c: sql<number>`count(*)::int` }).from(testimonials).where(eq(testimonials.isApproved, false)),
    db.select({ c: sql<number>`count(*)::int` }).from(guestRequests).where(and(eq(guestRequests.unreadStaff, true), ne(guestRequests.status, "done"))),
    db.select({ c: sql<number>`count(*)::int` }).from(tableBookings).where(and(eq(tableBookings.status, "new"), gte(tableBookings.date, todayISO()))),
    db.select({ c: sql<number>`count(*)::int` }).from(giftCards).where(and(eq(giftCards.status, "pending_payment"), ne(giftCards.paymentRef, ""))),
  ]);
  return (
    <AdminShell admin={admin} counts={{ pending: p.c, messages: m.c, reviews: rv.c, requests: gr.c, tables: tb.c, gifts: gc.c }} warning={warning} hotelName={(await getSettings()).hotelName}>
      {children}
    </AdminShell>
  );
}
