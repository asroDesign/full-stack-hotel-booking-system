"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Settings } from "@/db/schema";

type FieldType = "text" | "password" | "textarea" | "number" | "select" | "lines" | "media";

type SettingField = {
  key: keyof Settings & string;
  label: string;
  type?: FieldType;
  full?: boolean;
  hint?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  placeholder?: string;
};

const MODULE_OPTIONS = ["true", "false"];
const MODULE_LABELS = { true: "فعال", false: "غیرفعال" };

const GROUPS: { title: string; description: string; fields: SettingField[] }[] = [
  {
    title: "هویت هتل، ستاره‌ها و ماژول‌ها",
    description: "همین اسکریپت برای هتل ۳، ۴ یا ۵ ستاره و با امکانات متفاوت (مثلاً بدون استخر، با کافه و رستوران) قابل استفاده است.",
    fields: [
      { key: "hotelName", label: "نام هتل" },
      { key: "city", label: "شهر" },
      {
        key: "starRating",
        label: "درجه هتل (تعداد ستاره)",
        type: "select",
        options: ["3", "4", "5"],
        optionLabels: { "3": "۳ ستاره", "4": "۴ ستاره", "5": "۵ ستاره" },
        hint: "در هدر، صفحه اصلی و درباره ما نمایش داده می‌شود.",
      },
      { key: "tagline", label: "شعار کوتاه", full: true },
      {
        key: "modulePool",
        label: "ماژول استخر",
        type: "select",
        options: MODULE_OPTIONS,
        optionLabels: MODULE_LABELS,
        hint: "اگر هتل استخر ندارد، غیرفعال کنید تا منو، صفحه و گزینه رزرو استخر مخفی شود.",
      },
      { key: "moduleRestaurant", label: "ماژول رستوران", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "moduleCafe", label: "ماژول کافه", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "moduleSpa", label: "ماژول اسپا", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
    ],
  },
  {
    title: "کافه و رستوران",
    description: "معرفی کامل کافه/رستوران + منو (منو در بخش «منوی کافه» مدیریت می‌شود)",
    fields: [
      { key: "diningTitle", label: "نام کافه/رستوران" },
      { key: "diningHours", label: "ساعت سرو" },
      { key: "diningPhone", label: "تلفن رزرو میز" },
      { key: "diningSubtitle", label: "زیرعنوان" },
      { key: "diningDescription", label: "معرفی کامل", type: "textarea", full: true },
      { key: "diningNote", label: "یادداشت سرآشپز / نکته ویژه", type: "textarea", full: true },
      { key: "diningImage", label: "تصویر اصلی (URL)", type: "media" },
      { key: "diningImage2", label: "تصویر دوم (URL)" },
      { key: "diningVideoUrl", label: "ویدیو کافه/رستوران", type: "media", full: true },
    ],
  },
  {
    title: "هیرو و رسانه صفحه اصلی",
    description: "تصویر، ویدیو یا گیف پس‌زمینه سکشن اول و متن‌های آن",
    fields: [
      {
        key: "heroMediaType",
        label: "نوع رسانه پس‌زمینه",
        type: "select",
        options: ["image", "video", "gif"],
        hint: "video یا gif به صورت پشت سر هم و خودکار پخش می‌شود.",
      },
      { key: "heroImage", label: "تصویر پس‌زمینه (URL)" },
      { key: "heroVideoUrl", label: "ویدیو یا گیف پس‌زمینه", type: "media", full: true },
      { key: "heroTitle", label: "تیتر اصلی سکشن اول", full: true },
      { key: "heroSubtitle", label: "توضیح سکشن اول", type: "textarea", full: true },
    ],
  },
  {
    title: "درباره ما و آمار صفحه اصلی",
    description: "متن معرفی، داستان هتل و اعداد نمایش داده‌شده در صفحه نخست",
    fields: [
      { key: "aboutTitle", label: "عنوان درباره ما" },
      { key: "aboutImage", label: "تصویر درباره ما (URL)" },
      { key: "aboutText", label: "متن درباره ما", type: "textarea", full: true },
      { key: "storyText", label: "داستان هتل", type: "textarea", full: true },
      { key: "statYears", label: "برچسب سال شروع" },
      { key: "statYearsLabel", label: "متن کنار سال شروع" },
      { key: "statGuests", label: "عدد مهمانان" },
      { key: "statGuestsLabel", label: "برچسب مهمانان" },
      { key: "statRating", label: "امتیاز نمایشی" },
      { key: "statRatingCount", label: "تعداد نظرات" },
    ],
  },
  {
    title: "استخر خانوادگی",
    description: "رسانه، توضیحات و قیمت‌گذاری سانس استخر",
    fields: [
      { key: "poolTitle", label: "عنوان استخر" },
      { key: "poolPrice", label: "قیمت پایه هر سانس (تومان)", type: "number", hint: "در صورت نبود سانس، این مبلغ اعمال می‌شود." },
      { key: "extraGuestFee", label: "هزینه هر نفر اضافه (تومان)", type: "number" },
      { key: "poolBaseCapacity", label: "ظرفیت پایه هر سانس", type: "number" },
      { key: "poolMaxCapacity", label: "حداکثر ظرفیت هر سانس", type: "number" },
      {
        key: "poolMediaType",
        label: "نوع رسانه استخر",
        type: "select",
        options: ["video", "gif", "image"],
      },
      { key: "poolImage", label: "تصویر استخر (URL)" },
      { key: "poolVideoUrl", label: "ویدیو یا گیف استخر", type: "media", full: true },
      { key: "poolVideoPoster", label: "تصویر کاور ویدیو (URL)", full: true },
      { key: "poolDescription", label: "توضیحات استخر", type: "textarea", full: true },
      {
        key: "poolRules",
        label: "قوانین استخر (هر خط یک قانون)",
        type: "lines",
        full: true,
        hint: "این قوانین در صفحه استخر و فرم رزرو استخر نمایش داده می‌شود.",
      },
    ],
  },
  {
    title: "قوانین اقامت در اتاق",
    description: "قوانینی که در فرم رزرو اتاق نمایش داده می‌شود",
    fields: [
      {
        key: "roomRules",
        label: "قوانین اقامت (هر خط یک قانون)",
        type: "lines",
        full: true,
        hint: "این متن‌ها در صفحه رزرو و فرم رزرو اتاق قابل مشاهده است.",
      },
    ],
  },
  {
    title: "متن‌های سکشن‌های صفحه اصلی",
    description: "عنوان و توضیح بخش اتاق‌ها، امکانات، جاذبه‌ها، گالری، نظرات، نقشه و دعوت پایانی",
    fields: [
      { key: "roomsKicker", label: "اتاق‌ها — برچسب" },
      { key: "roomsTitle", label: "اتاق‌ها — عنوان" },
      { key: "roomsDescription", label: "اتاق‌ها — توضیح", type: "textarea", full: true },
      { key: "facilitiesKicker", label: "امکانات — برچسب" },
      { key: "facilitiesTitle", label: "امکانات — عنوان" },
      { key: "facilitiesDescription", label: "امکانات — توضیح", type: "textarea", full: true },
      { key: "attractionsKicker", label: "جاذبه‌ها — برچسب" },
      { key: "attractionsTitle", label: "جاذبه‌ها — عنوان" },
      { key: "attractionsDescription", label: "جاذبه‌ها — توضیح", type: "textarea", full: true },
      { key: "galleryKicker", label: "گالری — برچسب" },
      { key: "galleryTitle", label: "گالری — عنوان" },
      { key: "galleryDescription", label: "گالری — توضیح", type: "textarea", full: true },
      { key: "testimonialsTitle", label: "نظرات مهمانان — عنوان" },
      { key: "mapTitle", label: "نقشه — عنوان" },
      { key: "mapDescription", label: "نقشه — توضیح", type: "textarea", full: true },
      { key: "ctaTitle", label: "دعوت پایانی — عنوان" },
      { key: "ctaDescription", label: "دعوت پایانی — توضیح", type: "textarea", full: true },
    ],
  },
  {
    title: "تماس و موقعیت",
    description: "اطلاعات تماس، آدرس و مختصات نقشه",
    fields: [
      { key: "phone", label: "تلفن پذیرش" },
      { key: "mobile", label: "موبایل" },
      { key: "email", label: "ایمیل" },
      { key: "totalRooms", label: "تعداد اتاق هتل", type: "number" },
      { key: "address", label: "آدرس کامل", type: "textarea", full: true },
      { key: "mapAddress", label: "نشانی کوتاه روی نقشه", full: true },
      { key: "mapLat", label: "عرض جغرافیایی (Latitude)" },
      { key: "mapLng", label: "طول جغرافیایی (Longitude)" },
      { key: "checkInTime", label: "ساعت ورود" },
      { key: "checkOutTime", label: "ساعت خروج" },
    ],
  },
  {
    title: "شبکه‌های اجتماعی و پرداخت",
    description: "لینک‌ها و اطلاعات کارت برای پیش‌پرداخت",
    fields: [
      { key: "instagram", label: "اینستاگرام" },
      { key: "telegram", label: "تلگرام" },
      { key: "whatsappLink", label: "لینک واتس‌اپ" },
      { key: "whatsapp", label: "شماره واتس‌اپ" },
      { key: "cardNumber", label: "شماره کارت پیش‌پرداخت" },
      { key: "cardHolder", label: "صاحب کارت" },
    ],
  },
  {
    title: "درگاه‌های پرداخت اینترنتی",
    description: "پیش از ذخیره شناسه‌ها و رمز پذیرنده، PAYMENT_CREDENTIALS_KEY را در سرور تنظیم کنید. درگاه فعال در صفحه پیگیری رزرو نمایش داده می‌شود؛ APP_URL باید HTTPS باشد.",
    fields: [
      { key: "paymentZarinpalEnabled", label: "فعال‌سازی زرین‌پال", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "zarinpalMerchantId", label: "شناسه پذیرنده زرین‌پال", type: "password", hint: "برای تغییر وارد کنید؛ مقدار خالی، مقدار ذخیره‌شده را حفظ می‌کند. در sandbox نیز شناسه پذیرنده لازم است." },
      { key: "zarinpalSandbox", label: "محیط آزمایشی زرین‌پال", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "paymentZibalEnabled", label: "فعال‌سازی زیبال", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "zibalMerchant", label: "شناسه مرچنت زیبال", type: "password", hint: "برای تغییر وارد کنید؛ مقدار خالی، مقدار ذخیره‌شده را حفظ می‌کند." },
      { key: "paymentSamanEnabled", label: "فعال‌سازی سامان", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "samanTerminalId", label: "شناسه پایانه سامان" },
      { key: "paymentMellatEnabled", label: "فعال‌سازی به‌پرداخت ملت", type: "select", options: MODULE_OPTIONS, optionLabels: MODULE_LABELS },
      { key: "mellatTerminalId", label: "شناسه پایانه ملت" },
      { key: "mellatUsername", label: "نام کاربری پذیرنده ملت", type: "password", hint: "برای تغییر وارد کنید؛ مقدار خالی، مقدار ذخیره‌شده را حفظ می‌کند." },
      { key: "mellatPassword", label: "رمز عبور پذیرنده ملت", type: "password", hint: "برای تغییر وارد کنید؛ مقدار خالی، مقدار ذخیره‌شده را حفظ می‌کند." },
    ],
  },
];

type FormValue = string | number;

export default function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, FormValue>>(() => {
    const initial: Record<string, FormValue> = {};
    Object.entries(initialSettings).forEach(([key, value]) => {
      if (key === "id" || key === "updatedAt") return;
      if (Array.isArray(value)) {
        initial[key] = value.join("\n");
      } else {
        initial[key] = typeof value === "number" ? value : String(value ?? "");
      }
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function setValue(key: string, value: FormValue) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function uploadFile(key: string, file: File) {
    setUploadingKey(key);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "آپلود فایل انجام نشد.");
        return;
      }
      setValue(key, data.url as string);
      setToast("فایل آپلود شد؛ برای اعمال نهایی، تنظیمات را ذخیره کنید.");
      window.setTimeout(() => setToast(null), 3200);
    } catch {
      setError("آپلود فایل با خطا مواجه شد.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...values };
      GROUPS.forEach((group) =>
        group.fields.forEach((field) => {
          if (field.type === "lines") {
            payload[field.key] = String(values[field.key] ?? "")
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
          }
          if (field.type === "number") {
            payload[field.key] = Number(values[field.key] ?? 0);
          }
        }),
      );
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "ذخیره تنظیمات انجام نشد.");
        return;
      }
      setToast("تنظیمات با موفقیت ذخیره شد.");
      window.setTimeout(() => setToast(null), 2600);
      router.refresh();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {toast ? (
        <div className="fixed bottom-5 left-5 z-[80] max-w-xs rounded-xl bg-forest-950 px-4 py-3 text-[11px] font-semibold leading-5 text-white shadow-card">
          ✓ {toast}
        </div>
      ) : null}
      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div> : null}

      {GROUPS.map((group) => (
        <section key={group.title} className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <header className="mb-3 border-b border-cream-100 pb-2">
            <h2 className="text-xs font-extrabold text-forest-950">{group.title}</h2>
            <p className="mt-0.5 text-[10px] text-forest-800/50">{group.description}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => (
              <label key={field.key} className={`field ${field.full ? "sm:col-span-2" : ""}`}>
                <span className="label text-[11px]">{field.label}</span>
                {field.type === "textarea" || field.type === "lines" ? (
                  <textarea
                    className={`input text-xs ${field.type === "lines" ? "min-h-28 leading-6" : "min-h-20"}`}
                    value={String(values[field.key] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="input text-xs"
                    value={String(values[field.key] ?? "")}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {field.optionLabels?.[option] ??
                          (option === "video"
                            ? "ویدیو (پخش خودکار و تکرار)"
                            : option === "gif"
                              ? "گیف"
                              : option === "image"
                                ? "تصویر"
                                : option)}
                      </option>
                    ))}
                  </select>
                ) : field.type === "media" ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-col gap-1.5 sm:flex-row">
                      <input
                        className="input w-full text-[11px]"
                        dir="ltr"
                        placeholder="https://… یا آپلود کنید"
                        value={String(values[field.key] ?? "")}
                        onChange={(event) => setValue(field.key, event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputs.current[field.key]?.click()}
                        disabled={uploadingKey === field.key}
                        className="btn btn-ghost btn-sm shrink-0 whitespace-nowrap"
                      >
                        {uploadingKey === field.key ? "آپلود…" : "⬆ آپلود"}
                      </button>
                    </div>
                    <input
                      ref={(element) => {
                        fileInputs.current[field.key] = element;
                      }}
                      type="file"
                      accept="video/mp4,video/webm,image/gif,image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadFile(field.key, file);
                        event.target.value = "";
                      }}
                    />
                    {String(values[field.key] ?? "").match(/\.(mp4|webm|mov)$/i) ? (
                      <video
                        src={String(values[field.key])}
                        className="h-24 w-full rounded-lg bg-forest-950 object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : String(values[field.key] ?? "") ? (
                      <img src={String(values[field.key])} alt="" className="h-24 w-full rounded-lg object-cover" />
                    ) : null}
                  </div>
                ) : (
                  <input
                    className="input text-xs"
                    type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
                    autoComplete={field.type === "password" ? "new-password" : undefined}
                    dir={
                      field.key.includes("Image") ||
                      field.key.includes("Url") ||
                      field.key === "instagram" ||
                      field.key === "telegram"
                        ? "ltr"
                        : "rtl"
                    }
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setValue(field.key, field.type === "number" ? Number(event.target.value) : event.target.value)
                    }
                  />
                )}
                {field.hint ? <span className="hint">{field.hint}</span> : null}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 flex items-center justify-between gap-2 rounded-2xl border border-cream-200 bg-white/95 p-3 shadow-card backdrop-blur">
        <p className="text-[10px] text-forest-800/55">تغییرات پس از ذخیره، بلافاصله در سایت اعمال می‌شود.</p>
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
          {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}
