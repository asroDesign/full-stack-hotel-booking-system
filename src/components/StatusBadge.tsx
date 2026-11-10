import { BOOKING_STATUS, MESSAGE_STATUS, type BookingStatus } from "@/lib/constants";

const BOOKING_BADGE: Record<string, string> = {
  pending_payment: "badge-warning",
  awaiting_review: "badge-info",
  confirmed: "badge-success",
  rejected: "badge-error",
  cancelled: "badge-ghost",
};

const MESSAGE_BADGE: Record<string, string> = {
  new: "badge-error",
  read: "badge-warning",
  replied: "badge-success",
};

export function BookingStatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const meta = BOOKING_STATUS[status as BookingStatus] ?? BOOKING_STATUS.pending_payment;
  const tone = BOOKING_BADGE[status] ?? "badge-warning";
  return (
    <span className={`badge ${tone} gap-1.5 whitespace-nowrap font-semibold ${size === "sm" ? "badge-sm text-[10px]" : "badge-md text-xs"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function MessageStatusBadge({ status }: { status: string }) {
  const meta = MESSAGE_STATUS[status] ?? MESSAGE_STATUS.new;
  const tone = MESSAGE_BADGE[status] ?? "badge-error";
  return <span className={`badge ${tone} badge-sm text-[10px] font-semibold`}>{meta.label}</span>;
}
