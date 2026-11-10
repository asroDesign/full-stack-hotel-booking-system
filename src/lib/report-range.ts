import { isoToJalali, jalaliToISO, todayISO } from "./utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function reportRange(sp: { from?: string; to?: string }) {
  const today = todayISO();
  const { jy } = isoToJalali(today);
  const from = sp.from && ISO.test(sp.from) ? sp.from : jalaliToISO(jy, 1, 1);
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;
  return from <= to ? { from, to } : { from: to, to: from };
}
