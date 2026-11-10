import { headers } from "next/headers";
import { PageHeader } from "@/components/admin/ui";

const Code = ({ children }: { children: string }) => (
  <pre dir="ltr" className="overflow-x-auto rounded-box bg-neutral p-4 text-left text-xs leading-6 text-neutral-content"><code>{children}</code></pre>
);

export default async function ApiDocs() {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/api/partner/v1`;
  const endpoints: [string, string, string][] = [
    ["GET", "/rooms", "لیست اتاق‌ها، ظرفیت، قیمت پایه و گزینه‌ها"],
    ["GET", "/availability?checkIn=2025-06-01&checkOut=2025-06-03&guests=2", "اتاق‌های خالی با قیمت کل، کمیسیون و خالص همکار"],
    ["POST", "/reservations", "ثبت خودکار رزرو (یکتا با externalRef)"],
    ["GET", "/reservations/{externalRef | trackingCode}", "استعلام وضعیت رزرو"],
    ["POST", "/reservations/{externalRef}/cancel", "لغو رزرو (در صورت مجاز بودن)"],
  ];
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="مستندات وب‌سرویس همکاران" desc="ارسال خودکار رزروها از آژانس‌ها و سایت‌های همکار به سیستم مدیریت هتل" />
      <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5 text-sm leading-7">
        <h3 className="font-extrabold">آدرس پایه</h3>
        <Code>{base}</Code>
        <h3 className="mt-2 font-extrabold">احراز هویت و امضا</h3>
        <p>هر همکار یک <b>توکن (Bearer Token)</b> و یک <b>کلید امضا (Signing Secret)</b> اختصاصی دارد که از صفحه «آژانس‌ها و سایت‌های همکار» صادر می‌شود. هر درخواست باید سه هدر زیر را داشته باشد:</p>
        <Code>{`Authorization: Bearer <TOKEN>
X-Timestamp:   <unix seconds>            # حداکثر ±۳۰۰ ثانیه اختلاف با زمان سرور
X-Signature:   hex( HMAC_SHA256( SECRET, "<timestamp>.<METHOD>.<path>.<rawBody>" ) )
Content-Type:  application/json          # برای POST`}</Code>
        <p><code dir="ltr">path</code> فقط مسیر بدون دامنه و بدون query است، مثلاً <code dir="ltr">/api/partner/v1/reservations</code>. برای GET، rawBody رشته خالی است. محدودیت: ۱۲۰ درخواست در دقیقه برای هر همکار. در صورت تعریف IP مجاز، درخواست از سایر IPها رد می‌شود.</p>
      </div></section>
      <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-2 p-5">
        <h3 className="font-extrabold">سرویس‌ها</h3>
        <div className="overflow-x-auto"><table className="table table-sm"><tbody>{endpoints.map(([m, p, d]) => <tr key={p}><td><span className={m === "GET" ? "badge badge-info badge-sm" : "badge badge-success badge-sm"}>{m}</span></td><td dir="ltr" className="font-mono text-left text-xs">{p}</td><td className="text-sm">{d}</td></tr>)}</tbody></table></div>
      </div></section>
      <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5 text-sm">
        <h3 className="font-extrabold">نمونه بدنه ثبت رزرو</h3>
        <Code>{`POST /api/partner/v1/reservations
{
  "externalRef": "AG-2025-000123",          // شناسه یکتای رزرو در سیستم شما (ارسال مجدد = همان رزرو)
  "roomId": 12,
  "checkIn": "2025-06-01",                   // میلادی YYYY-MM-DD
  "checkOut": "2025-06-03",
  "guests": 2,
  "options": ["dinner"],                     // اختیاری – شناسه گزینه‌ها از /rooms
  "guest": { "name": "علی رضایی", "phone": "09121234567", "email": "", "nationalId": "0012345678" },
  "companions": [ { "fullName": "مریم رضایی", "idNumber": "0012345679", "nationality": "ایرانی", "relation": "همسر" } ],
  "notes": "ورود دیرهنگام"
}

201 Created
{ "ok": true, "reservation": { "trackingCode": "TR-8K2M4P", "reservationCode": "ATL-4821-KMP", "status": "confirmed",
  "total": 29000000, "commission": 2900000, "net": 26100000, ... } }

خطاها: 401 bad_signature | 409 not_available | 422 validation | 429 rate_limited`}</Code>
      </div></section>
      <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
        <h3 className="font-extrabold">نمونه کد ساخت امضا</h3>
        <div className="text-xs font-bold">PHP</div>
        <Code>{`$ts   = (string) time();
$path = "/api/partner/v1/reservations";
$body = json_encode($payload, JSON_UNESCAPED_UNICODE);
$sig  = hash_hmac("sha256", "$ts.POST.$path.$body", $SECRET);
$ch = curl_init("${base}/reservations");
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer $TOKEN", "X-Timestamp: $ts", "X-Signature: $sig", "Content-Type: application/json"]]);
$res = json_decode(curl_exec($ch), true);`}</Code>
        <div className="text-xs font-bold">Node.js</div>
        <Code>{`import crypto from "node:crypto";
const ts = Math.floor(Date.now() / 1000).toString();
const path = "/api/partner/v1/availability";
const sig = crypto.createHmac("sha256", SECRET).update(\`\${ts}.GET.\${path}.\`).digest("hex");
const r = await fetch("${base}/availability?checkIn=2025-06-01&checkOut=2025-06-03&guests=2", {
  headers: { Authorization: \`Bearer \${TOKEN}\`, "X-Timestamp": ts, "X-Signature": sig },
});`}</Code>
        <div className="text-xs font-bold">Python</div>
        <Code>{`import hmac, hashlib, time, json, requests
ts = str(int(time.time())); path = "/api/partner/v1/reservations"
body = json.dumps(payload, ensure_ascii=False)
sig = hmac.new(SECRET.encode(), f"{ts}.POST.{path}.{body}".encode(), hashlib.sha256).hexdigest()
requests.post("${base}/reservations", data=body.encode(), headers={"Authorization": f"Bearer {TOKEN}",
  "X-Timestamp": ts, "X-Signature": sig, "Content-Type": "application/json"})`}</Code>
      </div></section>
    </div>
  );
}
