export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin, sanitizeText } from "@/lib/security";
import { createJournalEntry } from "@/lib/accounting";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const lines = Array.isArray(body.lines)
      ? body.lines.slice(0, 20).map((line: Record<string, unknown>) => ({
          accountId: Number(line.accountId) || 0,
          debit: Math.max(0, Number(line.debit) || 0),
          credit: Math.max(0, Number(line.credit) || 0),
          description: sanitizeText(line.description, 200),
        }))
      : [];
    const result = await createJournalEntry({
      date: String(body.date ?? "").slice(0, 10),
      description: sanitizeText(body.description, 300),
      reference: sanitizeText(body.reference, 120),
      source: "manual",
      createdBy: admin.email,
      lines,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, entry: result }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/accounting/entries]", error);
    return NextResponse.json({ error: "ثبت سند انجام نشد." }, { status: 500 });
  }
}
