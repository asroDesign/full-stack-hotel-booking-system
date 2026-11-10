import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getCurrentAdmin } from "@/lib/auth";
import {
  countAwaitingBookings,
  countNewConcierge,
  countPendingReviews,
  countUnreadMessages,
  getSettings,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [bookings, messages, reviews, concierge, settings] = await Promise.all([
    countAwaitingBookings(),
    countUnreadMessages(),
    countPendingReviews(),
    countNewConcierge(),
    getSettings(),
  ]);

  return (
    <AdminShell admin={admin} counts={{ bookings, messages, reviews, concierge }} hotelName={settings.hotelName}>
      {children}
    </AdminShell>
  );
}
