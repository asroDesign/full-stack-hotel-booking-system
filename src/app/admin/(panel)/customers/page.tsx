import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Users, Crown, Cake, Download } from "lucide-react";
import { db } from "@/db";
import { customerGroups, customers } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { TIERS, groupMemberIds, tierBadge, tierLabel } from "@/lib/crm";
import { cn, faNum, formatJalali, formatPrice, isoToJalali, todayISO } from "@/lib/utils";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tier?: string; group?: string }> }) {
  const sp = await searchParams;
  const [all, groups] = await Promise.all([db.select().from(customers).orderBy(desc(customers.totalSpent), desc(customers.id)), db.select().from(customerGroups)]);
  const ids = sp.group ? new Set(await groupMemberIds(Number(sp.group))) : null;
  const q = (sp.q ?? "").trim();
  const list = all.filter((c) => (!q || c.name.includes(q) || c.phone.includes(q) || c.email.includes(q)) && (!sp.tier || c.tier === sp.tier) && (!ids || ids.has(c.id)));
  const tm = isoToJalali(todayISO()).jm;
  const bdays = all.filter((c) => c.birthDate && isoToJalali(c.birthDate).jm === tm).length;
  return (
    <div className="space-y-5">
      <PageHeader title="مشتریان (باشگاه مشتریان)" desc={`${faNum(all.length)} مشتری · ${faNum(all.filter((c) => c.smsOptIn).length)} عضو خبرنامه پیامکی`} action={<div className="flex gap-2"><a href="/api/admin/customers-export" className="btn btn-sm"><Download className="h-4 w-4" /> خروجی Excel</a><Link href="/admin/customers/groups" className="btn btn-sm"><Users className="h-4 w-4" /> گروه‌بندی</Link><Link href="/admin/customers/new" className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> مشتری جدید</Link></div>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {TIERS.map((t) => (
          <Link key={t.key} href={`/admin/customers?tier=${t.key}`} className={cn("card card-border bg-base-100 shadow-sm transition hover:shadow-md", sp.tier === t.key && "ring-2 ring-primary")}>
            <div className="card-body p-4"><span className={cn("badge badge-sm w-fit", t.badge)}><Crown className="ml-1 h-3 w-3" />{t.label}</span><div className="text-2xl font-black">{faNum(all.filter((c) => c.tier === t.key).length)}</div></div>
          </Link>
        ))}
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><span className="badge badge-secondary badge-sm w-fit"><Cake className="ml-1 h-3 w-3" />تولد این ماه</span><div className="text-2xl font-black">{faNum(bdays)}</div></div></div>
      </div>
      <form className="card card-border flex-row flex-wrap gap-2 bg-base-100 p-3 shadow-sm">
        <input name="q" defaultValue={sp.q} placeholder="جستجو: نام، موبایل، ایمیل" className="input input-sm min-w-0 flex-1" />
        <select name="tier" defaultValue={sp.tier ?? ""} className="select select-sm"><option value="">همه سطوح</option>{TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
        <select name="group" defaultValue={sp.group ?? ""} className="select select-sm"><option value="">همه گروه‌ها</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <button className="btn btn-primary btn-sm">فیلتر</button>
      </form>
      {list.length === 0 ? (
        <EmptyBox title="مشتری‌ای یافت نشد" desc="مشتریان با هر رزرو (سایت، حضوری، آژانس) خودکار به باشگاه اضافه می‌شوند." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {list.slice(0, 300).map((c) => (
              <li key={c.id}><Link href={`/admin/customers/${c.id}`} className="card card-border bg-base-100 p-3 shadow-sm"><div className="flex items-center justify-between"><b>{c.name || "بدون نام"}</b><span className={cn("badge badge-sm", tierBadge(c.tier))}>{tierLabel(c.tier)}</span></div><div className="mt-1 flex justify-between text-xs text-base-content/60"><span dir="ltr">{faNum(c.phone)}</span><span>{faNum(c.staysCount)} اقامت · {formatPrice(c.totalSpent)}</span></div></Link></li>
            ))}
          </ul>
          <div className="card card-border hidden overflow-x-auto bg-base-100 shadow-sm md:block">
            <table className="table table-sm">
              <thead className="bg-base-200"><tr><th>مشتری</th><th>موبایل</th><th>سطح</th><th>اقامت</th><th>مجموع خرید</th><th>امتیاز</th><th>آخرین اقامت</th><th>تولد</th><th>پیامک</th></tr></thead>
              <tbody>
                {list.slice(0, 500).map((c) => (
                  <tr key={c.id} className="hover:bg-base-200/50">
                    <td><Link href={`/admin/customers/${c.id}`} className="font-bold hover:underline">{c.name || "بدون نام"}</Link>{c.tags.length > 0 && <div className="mt-0.5 flex gap-1">{c.tags.slice(0, 3).map((t) => <span key={t} className="badge badge-ghost badge-xs">{t}</span>)}</div>}</td>
                    <td dir="ltr" className="text-right">{faNum(c.phone)}</td>
                    <td><span className={cn("badge badge-sm", tierBadge(c.tier))}>{tierLabel(c.tier)}</span></td>
                    <td>{faNum(c.staysCount)}</td>
                    <td>{formatPrice(c.totalSpent)}</td>
                    <td>{faNum(c.points)}</td>
                    <td>{c.lastStayAt ? formatJalali(c.lastStayAt) : "—"}</td>
                    <td>{c.birthDate ? formatJalali(c.birthDate).split(" ").slice(0, 2).join(" ") : "—"}</td>
                    <td>{c.smsOptIn ? <span className="badge badge-success badge-xs">بله</span> : <span className="badge badge-ghost badge-xs">خیر</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
