"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney, toFa } from "@/lib/format";

export type FieldType = "text" | "number" | "textarea" | "boolean" | "select" | "lines" | "pairs";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
  rows?: number;
};

export type ManagerItem = Record<string, unknown> & { id: number };

type Props = {
  resource: string;
  title: string;
  description?: string;
  fields: Field[];
  initialItems: ManagerItem[];
  defaults: Record<string, unknown>;
  imageField?: string;
  titleField: string;
  subtitleField?: string;
  priceField?: string;
  activeField?: string;
  addLabel?: string;
  emptyHint?: string;
};

type FormValue = string | boolean | string[] | { name: string; price: number }[];

function toFormValues(fields: Field[], item: Record<string, unknown> | null, defaults: Record<string, unknown>) {
  const values: Record<string, FormValue> = {};
  fields.forEach((field) => {
    const source = item?.[field.name] ?? defaults[field.name] ?? (field.type === "boolean" ? false : "");
    if (field.type === "lines") {
      values[field.name] = Array.isArray(source) ? (source as string[]).map(String) : [];
    } else if (field.type === "pairs") {
      values[field.name] = Array.isArray(source)
        ? (source as { name?: string; price?: number }[]).map((row) => ({
            name: String(row?.name ?? ""),
            price: Number(row?.price ?? 0),
          }))
        : [];
    } else if (field.type === "boolean") {
      values[field.name] = Boolean(source);
    } else {
      values[field.name] = String(source ?? "");
    }
  });
  return values;
}

export default function CollectionManager({
  resource,
  title,
  description,
  fields,
  initialItems,
  defaults,
  imageField,
  titleField,
  subtitleField,
  priceField,
  activeField = "active",
  addLabel = "افزودن مورد جدید",
  emptyHint,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ManagerItem[]>(initialItems);
  const [editing, setEditing] = useState<ManagerItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState<Record<string, FormValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  function openCreate() {
    setEditing(null);
    setValues(toFormValues(fields, null, defaults));
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: ManagerItem) {
    setEditing(item);
    setValues(toFormValues(fields, item, defaults));
    setError(null);
    setModalOpen(true);
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    fields.forEach((field) => {
      const raw = values[field.name];
      if (field.type === "lines") {
        payload[field.name] = (Array.isArray(raw) ? raw : [])
          .map((line) => String(line).trim())
          .filter(Boolean);
      } else if (field.type === "pairs") {
        const rows = (Array.isArray(raw) ? raw : []) as { name?: string; price?: number }[];
        payload[field.name] = rows
          .map((row) => ({ name: String(row?.name ?? "").trim(), price: Number(row?.price) || 0 }))
          .filter((row) => row.name.length > 0);
      } else if (field.type === "number") {
        payload[field.name] = Number(raw || 0);
      } else if (field.type === "boolean") {
        payload[field.name] = Boolean(raw);
      } else {
        payload[field.name] = String(raw ?? "");
      }
    });
    return payload;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const response = await fetch(editing ? `/api/admin/${resource}/${editing.id}` : `/api/admin/${resource}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "ذخیره انجام نشد.");
        return;
      }
      const saved = data.item as ManagerItem;
      setItems((current) =>
        editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
      );
      setModalOpen(false);
      router.refresh();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: ManagerItem) {
    const nextValue = !Boolean(item[activeField]);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, [activeField]: nextValue } : entry)),
    );
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/${resource}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [activeField]: nextValue }),
      });
      if (!response.ok) {
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, [activeField]: !nextValue } : entry)),
        );
      } else {
        router.refresh();
      }
    } catch {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, [activeField]: !nextValue } : entry)),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ManagerItem) {
    if (!window.confirm("این مورد حذف شود؟ این عمل قابل بازگشت نیست.")) return;
    const snapshot = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/${resource}/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        setItems(snapshot);
        window.alert(data.error ?? "حذف انجام نشد.");
      } else {
        router.refresh();
      }
    } catch {
      setItems(snapshot);
      window.alert("خطای شبکه. حذف انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const haystack = fields
      .map((field) => (typeof item[field.name] === "string" ? (item[field.name] as string) : ""))
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-forest-950">{title}</h2>
          {description ? <p className="mt-0.5 text-[10px] text-forest-800/55">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو…"
            className="input h-9 w-40 py-1.5 text-[11px]"
          />
          <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-semibold text-forest-800/60">
            {toFa(filtered.length)} مورد
          </span>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            ＋ {addLabel}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-300 bg-white/60 px-6 py-12 text-center">
          <span className="text-2xl">🗂️</span>
          <p className="text-xs font-bold text-forest-900">موردی یافت نشد</p>
          <p className="max-w-sm text-[11px] leading-6 text-forest-800/55">
            {emptyHint ?? "برای شروع اولین مورد را اضافه کنید."}
          </p>
          <button type="button" onClick={openCreate} className="btn btn-ghost btn-sm mt-1">
            {addLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isActive = Boolean(item[activeField]);
            const image = imageField ? String(item[imageField] ?? "") : "";
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-3 shadow-soft transition sm:flex-row sm:items-center ${
                  isActive ? "border-cream-200" : "border-dashed border-cream-300 opacity-70"
                }`}
              >
                {image ? (
                  <img src={image} alt="" className="h-16 w-full rounded-xl object-cover sm:h-14 sm:w-20" loading="lazy" />
                ) : (
                  <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-cream-100 text-lg">📄</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-extrabold text-forest-950">{String(item[titleField] ?? "—")}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                  {subtitleField ? (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-forest-800/55">{String(item[subtitleField] ?? "")}</p>
                  ) : null}
                  {priceField ? (
                    <p className="mt-0.5 text-[10px] font-bold text-gold-600">{formatMoney(Number(item[priceField] ?? 0))}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => toggleActive(item)}
                    className="rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-forest-800 transition hover:bg-cream-50 disabled:opacity-50"
                  >
                    {isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-forest-200 bg-forest-50 px-2.5 py-1.5 text-[10px] font-semibold text-forest-800 transition hover:bg-forest-100"
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => remove(item)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <div className="modal modal-open z-[70] bg-forest-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form
            onSubmit={submit}
            className="modal-box my-4 w-full max-w-3xl space-y-4 rounded-3xl bg-white p-5 shadow-card sm:p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-forest-950">
                  {editing ? "ویرایش" : "افزودن"} — {title}
                </h3>
                <p className="mt-0.5 text-[10px] text-forest-800/50">
                  فیلدهای ستاره‌دار الزامی هستند. تغییرات بلافاصله در سایت اعمال می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-300 text-forest-800"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pl-1 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.name} className={`field ${field.span === 2 ? "sm:col-span-2" : ""}`}>
                  <span className="label text-[11px]">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      className="input min-h-20 text-xs"
                      rows={field.rows ?? 3}
                      placeholder={field.placeholder}
                      value={String(values[field.name] ?? "")}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    />
                  ) : field.type === "lines" ? (
                    <div className="space-y-1.5 rounded-xl border border-cream-200 bg-cream-50/60 p-2">
                      {(Array.isArray(values[field.name]) ? (values[field.name] as string[]) : []).map((line, index) => (
                        <div key={index} className="flex gap-1.5">
                          <input
                            className="input h-8 flex-1 py-1 text-[11px]"
                            value={line}
                            placeholder={field.placeholder ?? "عنوان مورد"}
                            onChange={(event) => {
                              const list = [...(values[field.name] as string[])];
                              list[index] = event.target.value;
                              setValues({ ...values, [field.name]: list });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (values[field.name] as string[]).filter((_, i) => i !== index);
                              setValues({ ...values, [field.name]: list });
                            }}
                            className="rounded-lg border border-rose-200 px-2 text-[10px] font-bold text-rose-600"
                            aria-label="حذف مورد"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(Array.isArray(values[field.name]) ? (values[field.name] as string[]) : []), ""];
                          setValues({ ...values, [field.name]: list });
                        }}
                        className="btn btn-ghost btn-sm w-full text-[10px]"
                      >
                        ＋ افزودن مورد
                      </button>
                    </div>
                  ) : field.type === "pairs" ? (
                    <div className="space-y-1.5 rounded-xl border border-cream-200 bg-cream-50/60 p-2">
                      {(Array.isArray(values[field.name]) ? (values[field.name] as { name: string; price: number }[]) : []).map(
                        (row, index) => (
                          <div key={index} className="flex gap-1.5">
                            <input
                              className="input h-8 flex-1 py-1 text-[11px]"
                              value={row.name}
                              placeholder="نام گزینه (مثلاً صبحانه)"
                              onChange={(event) => {
                                const list = [...(values[field.name] as { name: string; price: number }[])];
                                list[index] = { ...list[index], name: event.target.value };
                                setValues({ ...values, [field.name]: list });
                              }}
                            />
                            <input
                              className="input h-8 w-28 py-1 text-[11px]"
                              value={String(row.price ?? 0)}
                              placeholder="مبلغ"
                              inputMode="numeric"
                              onChange={(event) => {
                                const list = [...(values[field.name] as { name: string; price: number }[])];
                                list[index] = { ...list[index], price: Number(event.target.value) || 0 };
                                setValues({ ...values, [field.name]: list });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const list = (values[field.name] as { name: string; price: number }[]).filter((_, i) => i !== index);
                                setValues({ ...values, [field.name]: list });
                              }}
                              className="rounded-lg border border-rose-200 px-2 text-[10px] font-bold text-rose-600"
                              aria-label="حذف گزینه"
                            >
                              ✕
                            </button>
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const list = [
                            ...(Array.isArray(values[field.name]) ? (values[field.name] as { name: string; price: number }[]) : []),
                            { name: "", price: 0 },
                          ];
                          setValues({ ...values, [field.name]: list });
                        }}
                        className="btn btn-ghost btn-sm w-full text-[10px]"
                      >
                        ＋ افزودن گزینه با مبلغ
                      </button>
                    </div>
                  ) : field.type === "select" ? (
                    <select
                      className="input text-xs"
                      value={String(values[field.name] ?? "")}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <span className="flex items-center gap-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })}
                        className="accent-forest-800"
                      />
                      <span className="text-[11px] text-forest-800/70">فعال باشد</span>
                    </span>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      className="input text-xs"
                      dir={field.name.toLowerCase().includes("url") || field.name.toLowerCase().includes("image") ? "ltr" : "rtl"}
                      placeholder={field.placeholder}
                      value={String(values[field.name] ?? "")}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    />
                  )}
                  {field.hint ? <span className="hint">{field.hint}</span> : null}
                  {imageField === field.name && String(values[field.name] ?? "") ? (
                    <img
                      src={String(values[field.name])}
                      alt=""
                      className="mt-1 h-20 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </label>
              ))}
            </div>

            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p> : null}

            <div className="modal-action flex-wrap gap-2 border-t border-cream-100 pt-3">
              <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    در حال ذخیره…
                  </>
                ) : editing ? (
                  "ذخیره تغییرات"
                ) : (
                  "افزودن"
                )}
              </button>
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">
                انصراف
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
