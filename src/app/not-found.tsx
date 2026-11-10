import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-950 p-6 text-center text-white">
      <div>
        <div className="text-gradient text-8xl font-black">۴۰۴</div>
        <h1 className="mt-4 text-2xl font-bold">صفحه مورد نظر پیدا نشد</h1>
        <p className="mt-2 text-white/60">ممکن است آدرس اشتباه باشد یا این صفحه حذف شده باشد.</p>
        <Link href="/" className="btn btn-secondary mt-8">بازگشت به صفحه اصلی</Link>
      </div>
    </div>
  );
}
