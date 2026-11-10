import { desc } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { tierLabel } from "@/lib/crm";
import { isoToJalali } from "@/lib/utils";

export const dynamic = "force-dynamic";
const jd = (iso: string | null) => {
  if (!iso) return "";
  const { jy, jm, jd } = isoToJalali(iso);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await getCurrentAdmin())) return new Response("Unauthorized", { status: 401 });
  const list = await db.select().from(customers).orderBy(desc(customers.totalSpent));
  const rows: unknown[][] = [["نام", "موبایل", "ایمیل", "کد ملی", "تاریخ تولد", "شهر", "سطح", "تعداد اقامت", "مجموع خرید", "امتیاز", "آخرین اقامت", "برچسب‌ها", "دریافت پیامک"]];
  for (const c of list) rows.push([c.name, c.phone, c.email, c.nationalId, jd(c.birthDate), c.city, tierLabel(c.tier), c.staysCount, c.totalSpent, c.points, jd(c.lastStayAt), c.tags.join("، "), c.smsOptIn ? "بله" : "خیر"]);
  return new Response("\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="customers.csv"', "Cache-Control": "no-store" },
  });
}
