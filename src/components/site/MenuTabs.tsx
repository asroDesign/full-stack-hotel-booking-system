"use client";

import { useMemo, useState } from "react";
import { formatMoney, toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export type MenuItemRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  featured: boolean;
};

export default function MenuTabs({ items }: { items: MenuItemRow[] }) {
  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.category)));
    return ["همه", ...unique];
  }, [items]);
  const [active, setActive] = useState(categories[0] ?? "همه");

  const filtered = active === "همه" ? items : items.filter((item) => item.category === active);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-300 bg-white/60 px-6 py-14 text-center">
        <p className="text-sm font-bold text-forest-950">منوی کافه به‌زودی منتشر می‌شود</p>
        <p className="mt-1 text-[11px] text-forest-800/55">
          برای اطلاع از منوی روز با پذیرش تماس بگیرید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="neu-inset tabs tabs-box flex w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-full border-0 bg-transparent p-1.5">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`tab whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
              active === category ? "tab-active neu-raised-sm text-forest-800" : "text-forest-800/55"
            }`}
          >
            {category}
            <span className="mr-1 text-[9px] opacity-60">
              {toFa(category === "همه" ? items.length : items.filter((item) => item.category === category).length)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="neu-raised neu-hover group flex gap-3 overflow-hidden rounded-2xl p-2.5"
          >
            {item.imageUrl ? (
              <SmartImage
                src={item.imageUrl}
                alt={item.name}
                loading="lazy"
                className="neu-inset-sm h-20 w-24 shrink-0 rounded-xl object-cover p-1"
              />
            ) : (
              <div className="neu-inset flex h-20 w-24 shrink-0 items-center justify-center rounded-xl text-xl">🍽</div>
            )}
            <div className="flex min-w-0 flex-1 flex-col py-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-extrabold text-forest-950">{item.name}</p>
                {item.featured ? (
                  <span className="neu-pill neu-pill-accent !px-2 !py-0.5 !text-[8px]">ویژه</span>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-5 text-forest-800/60">{item.description}</p>
              ) : null}
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-[9px] font-semibold text-forest-800/45">{item.category}</span>
                <span className="text-[11px] font-black text-forest-700">{formatMoney(item.price)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
