import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-4 text-center">
      <span className="text-6xl">🌲</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-gold-600">خطای ۴۰۴</p>
      <h1 className="text-2xl font-black text-forest-950">این صفحه در جنگل گم شد</h1>
      <p className="max-w-md text-xs leading-7 text-forest-800/60">
        آدرسی که دنبال آن بودید پیدا نشد. می‌توانید به صفحه اصلی برگردید یا از میان اتاق‌ها و امکانات هتل کاج انتخاب
        کنید.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          بازگشت به صفحه اصلی
        </Link>
        <Link href="/rooms" className="btn btn-ghost">
          مشاهده اتاق‌ها
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          تماس با پذیرش
        </Link>
      </div>
    </div>
  );
}
