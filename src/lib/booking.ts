import type { Room, Service } from "@/db/schema";

export function toBookRoom(r: Room) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    price: r.pricePerNight,
    capacity: r.capacity,
    maxGuests: r.capacity + r.extraBeds,
    extraGuestPrice: r.extraGuestPrice,
    options: r.options ?? [],
  };
}

export function toBookService(s: Service) {
  return {
    id: s.id,
    name: s.name,
    price: s.price,
    priceUnit: s.priceUnit,
    timeSlots: s.timeSlots,
    slotPrices: s.slotPrices ?? {},
    includedGuests: s.includedGuests,
    extraGuestPrice: s.extraGuestPrice,
    maxGuests: s.maxGuests,
    rules: s.rules,
  };
}

export function minServicePrice(s: { price: number; slotPrices: Record<string, number> }) {
  const vals = Object.values(s.slotPrices ?? {});
  return vals.length ? Math.min(...vals) : s.price;
}
