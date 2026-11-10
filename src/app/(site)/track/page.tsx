import { getContent } from "@/lib/content";
import { TrackSection } from "@/components/site/booking-sections";

export const metadata = { title: "پیگیری رزرو" };

export default async function TrackPage() {
  const { booking } = await getContent();
  return (
    <div className="relative overflow-hidden pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-brand-950 to-slate-50" />
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <TrackSection title={booking.trackTitle} text={booking.trackText} />
      </div>
    </div>
  );
}
