import Link from "next/link";
import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import RoomCard from "@/components/site/RoomCard";
import { getRooms } from "@/lib/data";
import { ROOM_CATEGORIES } from "@/lib/constants";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "name", label: "نام اتاق *", type: "text", span: 2, placeholder: "اتاق ۱۰۱ — دو نفره دلوکس" },
  { name: "roomNumber", label: "شماره اتاق *", type: "text", placeholder: "101" },
  { name: "roomType", label: "نوع اتاق", type: "select", options: [...ROOM_CATEGORIES, "سوئیت رویال"] },
  { name: "floor", label: "طبقه", type: "number" },
  { name: "capacity", label: "ظرفیت استاندارد (نفر)", type: "number", hint: "پایه اتاق بدون هزینه اضافه" },
  { name: "maxCapacity", label: "حداکثر ظرفیت (نفر)", type: "number", hint: "سقف پذیرش با هزینه نفر اضافه" },
  { name: "extraGuestFee", label: "هزینه هر نفر اضافه (تومان)", type: "number" },
  { name: "size", label: "متراژ (مترمربع)", type: "number" },
  { name: "bedType", label: "نوع تخت", type: "text", placeholder: "تخت کینگ دو نفره" },
  { name: "view", label: "چشم‌انداز", type: "text", placeholder: "منظره جنگل" },
  { name: "pricePerNight", label: "قیمت هر شب (تومان) *", type: "number" },
  { name: "prepaymentPercent", label: "درصد پیش‌پرداخت", type: "number", hint: "مقدار پیش‌فرض ۳۰٪" },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  {
    name: "coverImage",
    label: "آدرس تصویر اصلی *",
    type: "text",
    span: 2,
    placeholder: "https://…",
    hint: "آدرس تصویر با https وارد شود.",
  },
  {
    name: "gallery",
    label: "تصاویر گالری (هر خط یک آدرس)",
    type: "lines",
    span: 2,
    placeholder: "https://…\nhttps://…",
  },
  {
    name: "amenities",
    label: "امکانات اتاق (هر مورد را جداگانه اضافه کنید)",
    type: "lines",
    span: 2,
    placeholder: "وای‌فای پرسرعت",
  },
  {
    name: "addons",
    label: "گزینه‌های اضافه با مبلغ (صبحانه، ناهار، شام…)",
    type: "pairs",
    span: 2,
    hint: "مهمان می‌تواند این گزینه‌ها را در فرم رزرو انتخاب کند.",
  },
  {
    name: "videoUrl",
    label: "ویدیو اتاق (mp4 یا embed)",
    type: "text",
    span: 2,
    placeholder: "https://….mp4",
    hint: "فایل mp4 یا لینک ویدیو قابل پخش مرورگر",
  },
  { name: "description", label: "توضیح کوتاه", type: "textarea", span: 2 },
  { name: "longDescription", label: "توضیح کامل", type: "textarea", span: 2, rows: 4 },
  { name: "featured", label: "پیشنهاد ویژه", type: "boolean" },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  name: "",
  roomNumber: "",
  roomType: "دو نفره دلوکس",
  floor: 1,
  capacity: 2,
  maxCapacity: 4,
  extraGuestFee: 350000,
  addons: [{ name: "صبحانه بوفه محلی", price: 250000 }],
  size: 28,
  bedType: "تخت کینگ دو نفره",
  view: "منظره جنگل",
  pricePerNight: 2850000,
  prepaymentPercent: 30,
  sortOrder: 20,
  coverImage: "https://images.pexels.com/photos/2736384/pexels-photo-2736384.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  gallery: [],
  amenities: ["وای‌فای پرسرعت", "تهویه مطبوع", "تلویزیون هوشمند"],
  videoUrl: "",
  description: "",
  longDescription: "",
  featured: false,
  active: true,
};

export default async function AdminRoomsPage() {
  const rooms = await getRooms({ onlyActive: false });
  const active = rooms.filter((room) => room.active).length;
  const featured = rooms.filter((room) => room.featured).length;
  const withVideo = rooms.filter((room) => room.videoUrl).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="مدیریت محتوا"
        title="اتاق‌ها و سوئیت‌ها"
        description="مشخصات کامل هر اتاق، امکانات، تصاویر و ویدیو را مدیریت کنید. تغییرات بلافاصله در سایت اعمال می‌شود."
        action={
          <Link href="/rooms" className="btn btn-ghost btn-sm">
            مشاهده در سایت
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="کل اتاق‌ها" value={toFa(rooms.length)} icon="🛏️" hint="هدف: ۱۶ اتاق" />
        <StatCard label="اتاق‌های فعال" value={toFa(active)} icon="✅" tone="success" hint={`${toFa(rooms.length - active)} غیرفعال`} />
        <StatCard label="پیشنهاد ویژه" value={toFa(featured)} icon="⭐" tone="gold" hint="نمایش در صفحه اصلی" />
        <StatCard label="دارای ویدیو" value={toFa(withVideo)} icon="🎥" hint="تور ویدیویی اتاق" />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="rooms"
          title={`لیست اتاق‌ها (${toFa(rooms.length)})`}
          description="برای ویرایش مشخصات، تصاویر و ویدیو روی دکمه ویرایش بزنید."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(rooms)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="coverImage"
          titleField="name"
          subtitleField="roomType"
          priceField="pricePerNight"
          addLabel="اتاق جدید"
          emptyHint="اولین اتاق هتل را اضافه کنید."
        />
      </div>

      {rooms.length > 0 ? (
        <details className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <summary className="cursor-pointer text-xs font-extrabold text-forest-950">
            پیش‌نمایش کارت اتاق‌ها در سایت ({toFa(rooms.length)})
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rooms.slice(0, 4).map((room) => (
              <RoomCard key={room.id} room={room} compact />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
