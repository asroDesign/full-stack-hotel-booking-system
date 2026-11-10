import type { Settings } from "@/db/schema";

export type HotelModules = {
  pool: boolean;
  restaurant: boolean;
  cafe: boolean;
  spa: boolean;
};

export function modulesFromSettings(settings: Settings): HotelModules {
  return {
    pool: Boolean(settings.modulePool),
    restaurant: Boolean(settings.moduleRestaurant),
    cafe: Boolean(settings.moduleCafe),
    spa: Boolean(settings.moduleSpa),
  };
}

export function hasDining(modules: HotelModules): boolean {
  return modules.restaurant || modules.cafe;
}

const STAR_WORDS: Record<number, string> = {
  1: "یک‌ستاره",
  2: "دوستاره",
  3: "سه‌ستاره",
  4: "چهارستاره",
  5: "پنج‌ستاره",
};

export function starWord(stars: number): string {
  return STAR_WORDS[stars] ?? "سه‌ستاره";
}

export function normalizeStars(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

export type NavItem = { href: string; label: string };

export function publicNav(modules: HotelModules): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "خانه" },
    { href: "/rooms", label: "اتاق‌ها" },
    { href: "/offers", label: "پیشنهادها" },
    ...(hasDining(modules) ? [{ href: "/dining", label: "کافه و رستوران" }] : []),
    { href: "/facilities", label: "امکانات" },
    ...(modules.pool ? [{ href: "/pool", label: "استخر" }] : []),
    { href: "/events", label: "رویدادها" },
    { href: "/attractions", label: "اطراف هتل" },
    { href: "/gallery", label: "گالری" },
    { href: "/reviews", label: "نظرات" },
    { href: "/about", label: "درباره ما" },
    { href: "/contact", label: "تماس" },
  ];
  return items;
}
