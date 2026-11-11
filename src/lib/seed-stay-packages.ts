import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, stayPackages } from "@/db/schema";

const EXAMPLES = [
  {
    slug: "birthday",
    title: "پکیج ویژه تولد",
    description: "برای ثبت یک خاطرهٔ شیرین در روز تولدتان.",
    features: ["دیزاین ساده اتاق", "کیک تولد", "تخلیه اتاق تا ساعت ۱۳ بدون هزینهٔ نیم‌شارژ"],
    sortOrder: 1,
  },
  {
    slug: "anniversary",
    title: "پکیج سالگرد ازدواج",
    description: "اقامتی دونفره برای جشن سالگرد زندگی مشترک.",
    features: ["دیزاین ساده اتاق", "اعتبار ۵۰۰ هزار تومانی شام", "تخلیه اتاق تا ساعت ۱۳ بدون هزینهٔ نیم‌شارژ"],
    sortOrder: 2,
  },
  {
    slug: "wedding",
    title: "پکیج ویژه ازدواج",
    description: "جزئیاتی ویژه برای آغاز یک خاطرهٔ مشترک.",
    features: ["دیزاین رایگان اتاق", "تخلیه اتاق تا ساعت ۱۳ بدون هزینه"],
    sortOrder: 3,
  },
];

export async function ensureStayPackageExamples() {
  const [marker] = await db.select().from(settings).where(eq(settings.key, "stay_packages_examples_seeded"));
  if (marker) return;
  const [count] = await db.select({ id: stayPackages.id }).from(stayPackages).limit(1);
  if (!count) {
    await db.insert(stayPackages).values(EXAMPLES.map((item) => ({ ...item, pricingMode: "contact" as const, price: 0, isActive: true })));
  }
  await db.insert(settings).values({ key: "stay_packages_examples_seeded", value: "1" }).onConflictDoNothing();
}
