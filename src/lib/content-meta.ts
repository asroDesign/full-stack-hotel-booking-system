/* Client-safe metadata for homepage sections (no database imports). */

export const HOME_SECTIONS: { key: string; title: string }[] = [
  { key: "features", title: "نوار ویژگی‌ها" },
  { key: "rooms", title: "اتاق‌ها" },
  { key: "offers", title: "پیشنهادهای ویژه و کد تخفیف" },
  { key: "spotlight", title: "سکشن ویژه (استخر، اسپا، …)" },
  { key: "dining", title: "رستوران و کافه" },
  { key: "amenities", title: "امکانات" },
  { key: "services", title: "خدمات" },
  { key: "attractions", title: "جاذبه‌های گردشگری" },
  { key: "gallery", title: "گالری تصاویر" },
  { key: "reviews", title: "نظرات مهمانان" },
  { key: "faq", title: "سوالات متداول" },
  { key: "track", title: "پیگیری رزرو" },
  { key: "map", title: "نقشه و موقعیت" },
];

/** Keep saved order, drop unknown keys and append newly added sections. */
export function normalizeOrder(order: string[]) {
  const keys = HOME_SECTIONS.map((s) => s.key);
  const kept = order.filter((k, i) => keys.includes(k) && order.indexOf(k) === i);
  return [...kept, ...keys.filter((k) => !kept.includes(k))];
}

