import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { services } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { ServicesList } from "@/components/admin/services-admin";

export default async function AdminServices({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const list = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
  return (
    <div>
      <PageHeader title="خدمات و سانس‌ها" desc="معرفی خدمات هتل (استخر، اسپا، سالن جلسات، ترانسفر و …) و تعریف سانس‌های قابل رزرو" action={<Link href="/admin/services/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن خدمت</Link>} />
      {sp.saved && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">خدمت با موفقیت ذخیره شد.</div>}
      <ServicesList key={list.map((s) => s.id).join()} initial={list} />
    </div>
  );
}
