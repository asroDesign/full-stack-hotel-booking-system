"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Film, Plus, Trash2, Upload, Link2 } from "lucide-react";
import { DynIcon, iconNames } from "@/components/dyn-icon";
import { cn, faNum } from "@/lib/utils";

export type MediaItemValue = { url: string; type: "video" | "image"; duration: number };

const guessType = (url: string): "video" | "image" =>
  /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";

/**
 * Chunked upload: the file is sent in small pieces so neither the browser nor
 * the server ever holds the whole file in memory at once.
 */
/** Browsers often report HEIC/HEIF (iPhone photos) with an empty or generic MIME type. */
export function fileMime(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "heic" || ext === "heif") return `image/${ext}`;
  if (file.type) return file.type === "image/jpg" ? "image/jpeg" : file.type;
  const map: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
  return map[ext] ?? "";
}
export const isImageFile = (f: File) => fileMime(f).startsWith("image/");
export const IMAGE_ACCEPT = "image/*,.heic,.heif";

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; type: "video" | "image" }> {
  const init = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, mime: fileMime(file), size: file.size }),
  });
  const meta = await init.json().catch(() => ({}));
  if (!init.ok) throw new Error(meta.error || "خطا در شروع آپلود");
  const { id, chunkSize, url, type } = meta as { id: string; chunkSize: number; url: string; type: "video" | "image" };
  const total = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < total; i++) {
    const part = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
    let attempt = 0;
    for (;;) {
      const res = await fetch(`/api/upload/${id}?i=${i}`, { method: "PUT", body: part, headers: { "Content-Type": "application/octet-stream" } });
      if (res.ok) break;
      const err = await res.json().catch(() => ({}));
      if (res.status < 500 || ++attempt >= 3) {
        fetch(`/api/upload/${id}`, { method: "DELETE" }).catch(() => {});
        throw new Error(err.error || "خطا در آپلود");
      }
    }
    onProgress?.(Math.round(((i + 1) / total) * 100));
  }
  onProgress?.(100);
  const done = await fetch(`/api/upload/${id}`, { method: "POST" }); // server converts images to WebP here
  if (!done.ok) throw new Error((await done.json().catch(() => ({}))).error || "خطا در تکمیل آپلود");
  return { url, type };
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

export function MediaListEditor({ value, onChange }: { value: MediaItemValue[]; onChange: (v: MediaItemValue[]) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    const added: MediaItemValue[] = [];
    try {
      const arr = Array.from(files);
      for (let i = 0; i < arr.length; i++) {
        const r = await uploadFile(arr[i], (pct) => setProgress(`${faNum(i + 1)} از ${faNum(arr.length)} · ${faNum(pct)}٪`));
        added.push({ url: r.url, type: r.type, duration: r.type === "image" ? 6 : 0 });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      if (added.length) onChange([...value, ...added]);
      setBusy(false);
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const update = (i: number, patch: Partial<MediaItemValue>) =>
    onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          <Film className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          هنوز رسانه‌ای اضافه نشده. ویدیو، GIF یا تصویر آپلود کنید؛ به ترتیب و پشت سر هم پخش می‌شوند.
        </div>
      ) : (
        <ol className="space-y-2">
          {value.map((m, i) => (
            <li key={m.url + i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{faNum(i + 1)}</span>
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                {m.type === "video" ? (
                  <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{m.type === "video" ? "ویدیو" : /\.gif/i.test(m.url) ? "GIF" : "تصویر"}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="truncate text-left text-xs text-slate-500" dir="ltr">{m.url}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select value={m.type} onChange={(e) => update(i, { type: e.target.value as "video" | "image" })} className="rounded-lg border border-slate-200 px-2 py-1">
                    <option value="video">ویدیو (تا پایان پخش)</option>
                    <option value="image">تصویر / GIF</option>
                  </select>
                  {m.type === "image" && (
                    <label className="flex items-center gap-1 text-slate-600">
                      مدت نمایش
                      <input type="number" min={2} max={60} value={m.duration || 6} onChange={(e) => update(i, { duration: Number(e.target.value) || 6 })} className="w-14 rounded-lg border border-slate-200 px-2 py-1" />
                      ثانیه
                    </label>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => onChange(move(value, i, i - 1))} disabled={i === 0} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => onChange(move(value, i, i + 1))} disabled={i === value.length - 1} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="لینک ویدیو mp4 یا تصویر/GIF" dir="ltr" className="input w-full pr-9 text-left" />
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const u = url.trim();
            if (!u) return;
            const t = guessType(u);
            onChange([...value, { url: u, type: t, duration: t === "image" ? 6 : 0 }]);
            setUrl("");
          }}
        >
          <Plus className="h-4 w-4" /> افزودن لینک
        </button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn btn-primary">
          {busy ? <span className="loading loading-spinner loading-sm" /> : <Upload className="h-4 w-4" />}
          {busy ? `در حال آپلود ${progress}` : "آپلود ویدیو / GIF"}
        </button>
        <input ref={fileRef} type="file" accept="video/*,image/*,.heic,.heif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      <p className="text-xs text-slate-400">ویدیوها بی‌صدا و تا پایان پخش می‌شوند، سپس رسانه بعدی نمایش داده می‌شود. حداکثر حجم ویدیو ۱۵۰ مگابایت (MP4 / WEBM) و تصویر ۲۵ مگابایت (JPG، PNG، HEIC و …؛ همه به WebP بهینه تبدیل می‌شوند).</p>
      {err && <p className="text-xs text-rose-600">{err}</p>}
    </div>
  );
}

/** Single video URL with upload button – for forms (posts as `name`). */
export function VideoUrlInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const isFile = value && !/youtube|youtu\.be|aparat|<iframe/i.test(value);
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" className="input w-full flex-1 text-left" placeholder="لینک mp4، آپارات یا یوتیوب" />
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn">
          {busy ? <><span className="loading loading-spinner loading-sm" /> {faNum(pct)}٪</> : <><Upload className="h-4 w-4" /> آپلود ویدیو</>}
        </button>
        {value && (
          <button type="button" onClick={() => setValue("")} className="btn px-3 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
        )}
        <input
          ref={ref}
          type="file"
          accept="video/*,image/gif"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setErr("");
            try {
              setPct(0);
              setValue((await uploadFile(f, setPct)).url);
            } catch (er) {
              setErr(er instanceof Error ? er.message : "خطا");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      {isFile && (
        <video src={value} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />
      )}
    </div>
  );
}

export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-brand-700 hover:border-brand-400">
        <DynIcon name={value} className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 grid w-72 grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          {iconNames.map((n) => (
            <button
              type="button"
              key={n}
              title={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={cn("grid aspect-square place-items-center rounded-lg", value === n ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              <DynIcon name={n} className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StringListEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{faNum(i + 1)}</span>
          <input value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} className="input w-full" placeholder={placeholder} />
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => onChange(move(value, i, i - 1))} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ""])} className="btn w-full border-dashed">
        <Plus className="h-4 w-4" /> افزودن مورد
      </button>
    </div>
  );
}

