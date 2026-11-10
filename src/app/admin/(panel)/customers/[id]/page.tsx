import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Crown, BedDouble, Wallet, Star, Cake } from "lucide-react";
import { db } from "@/db";
import { customerGroupMembers, customerGroups, customers, reservations, testimonials } from "@/db/schema";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { CustomerForm, DeleteCustomerButton } from "@/components/admin/club";
import { SourceBadge } from "@/components/admin/frontdesk";
import { groupCounts, matchesRules, tierBadge, tierLabel } from "@/lib/crm";
import { cn, faNum, formatJalali, formatPrice } from "@/lib/utils";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select().from(customers).where(eq(customers.id, Number(id)));
  if (!c) notFound();
  const [res, groups, members, reviews] = await Promise.all([
    db.select().from(reservations).where(eq(reservations.customerId, c.id)).orderBy(desc(reservations.checkIn)),
    db.select().from(customerGroups),
    db.select().from(customerGroupMembers).where(eq(customerGroupMembers.customerId, c.id)),
    db.select().from(testimonials).where(eq(testimonials.reservationId, 0)),
  ]);
  void reviews;
  void groupCounts;
  const inGroups = groups.filter((g) => (g.kind === "static" ? members.some((m) => m.groupId === g.id) : matchesRules(c, g.rules)));
  return (
    <div className="space-y-6">
      <PageHeader title={c.name || "مشتری"} desc={<span dir="ltr">{faNum(c.phone)}</span> as unknown as string} action={<DeleteCustomerButton id={c.id} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><Crown className="h-5 w-5 text-warning" /><span className={cn("badge w-fit", tierBadge(c.tier))}>{tierLabel(c.tier)}</span></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><BedDouble className="h-5 w-5 text-primary" /><b className="text-xl">{faNum(c.staysCount)}</b><span className="text-xs text-base-content/55">اقامت قطعی</span></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><Wallet className="h-5 w-5 text-success" /><b className="text-xl">{formatPrice(c.totalSpent)}</b><span className="text-xs text-base-content/55">مجموع خرید (تومان)</span></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><Star className="h-5 w-5 text-secondary" /><b className="text-xl">{faNum(c.points)}</b><span className="text-xs text-base-content/55">امتیاز باشگاه</span></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><Cake className="h-5 w-5 text-error" /><b className="text-sm">{c.birthDate ? formatJalali(c.birthDate) : "ثبت نشده"}</b><span className="text-xs text-base-content/55">تولد</span></div></div>
      </div>
      {inGroups.length > 0 && <div className="flex flex-wrap gap-2">{inGroups.map((g) => <span key={g.id} className="badge badge-outline">{g.name}</span>)}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <CustomerForm
          groups={groups.filter((g) => g.kind === "static").map((g) => ({ id: g.id, name: g.name }))}
          c={{ id: c.id, name: c.name, phone: c.phone, email: c.email, nationalId: c.nationalId, birthDate: c.birthDate, gender: c.gender, city: c.city, tags: c.tags, notes: c.notes, smsOptIn: c.smsOptIn, groupIds: members.map((m) => m.groupId) }}
        />
        <section className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-2 p-5">
            <h3 className="font-extrabold">سوابق رزرو ({faNum(res.length)})</h3>
            {res.length === 0 ? <p className="py-6 text-center text-sm text-base-content/50">رزروی ثبت نشده است.</p> : (
              <ul className="divide-y divide-base-200">
                {res.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <Link href={`/admin/reservations/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 hover:opacity-80">
                      <span className="text-sm font-bold">{r.itemName}</span>
                      <StatusBadge status={r.status} />
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60"><span>{formatJalali(r.checkIn)}{r.checkOut ? ` ← ${formatJalali(r.checkOut)}` : ""}</span><span>{formatPrice(r.totalPrice)} تومان</span><SourceBadge source={r.source} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
