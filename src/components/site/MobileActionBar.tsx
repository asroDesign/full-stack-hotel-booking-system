import Link from "next/link";
import { phoneHref } from "@/lib/format";

export default function MobileActionBar({ phone, whatsappLink }: { phone: string; whatsappLink: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-400/30 bg-[#08211d]/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <a
          href={phoneHref(phone)}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 text-[11px] font-bold text-cream-100"
        >
          ☎ تماس با پذیرش
        </a>
        <a
          href={whatsappLink || "#"}
          target="_blank"
          rel="noreferrer"
          aria-label="واتس‌اپ"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-sm text-cream-100"
        >
          💬
        </a>
        <Link href="/booking" className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-gold-400 text-[11px] font-black text-[#1d1a10]">
          رزرو اقامت
          <span aria-hidden="true">←</span>
        </Link>
      </div>
    </div>
  );
}
