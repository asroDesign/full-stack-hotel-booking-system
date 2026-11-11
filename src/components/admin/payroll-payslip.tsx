import type { hotelPayrollEntries, hotelPayrollPeriods, hotelStaff } from "@/db/schema";
import { faNum, formatJalali } from "@/lib/utils";

type PayrollSlipRow = {
  entry: typeof hotelPayrollEntries.$inferSelect;
  period: typeof hotelPayrollPeriods.$inferSelect;
  staff: typeof hotelStaff.$inferSelect;
};

const money = (amount: number) => `${faNum(amount.toLocaleString("en-US"))} تومان`;
const dutyLabels: Record<string, string> = { reception: "پذیرش", housekeeping: "خانه‌داری", maintenance: "تأسیسات", operations: "عملیات" };
const minutes = (value: number) => {
  const safe = Math.max(0, value);
  return `${faNum(Math.floor(safe / 60))} ساعت و ${faNum(safe % 60)} دقیقه`;
};

function field(row: PayrollSlipRow, key: string, fallback?: string | number | null) {
  const value = row.entry.staffSnapshot[key];
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback === null || fallback === undefined || fallback === "" ? "—" : String(fallback);
}

export function PayrollPayslip({ row, hotelName }: { row: PayrollSlipRow; hotelName: string }) {
  const paidDate = row.entry.paidAt?.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" }) || "—";
  const totalEarnings = row.entry.earningComponents.reduce((sum, item) => sum + item.amountToman, 0);
  const totalDeductions = row.entry.deductionComponents.reduce((sum, item) => sum + item.amountToman, 0);
  const maritalStatus = field(row, "maritalStatus", row.staff.maritalStatus);
  const maritalLabel = ({ married: "متأهل", single: "مجرد", unknown: "ثبت‌نشده" } as Record<string, string>)[maritalStatus] || maritalStatus;
  return <article className="payslip-print" dir="rtl" aria-label={"فیش حقوقی " + row.staff.fullName}>
    <header className="payslip-header">
      <div><div className="payslip-hotel">{hotelName}</div><h1>فیش حقوق و دستمزد</h1><div className="payslip-muted">نسخهٔ قابل چاپ و بایگانی</div></div>
      <div className="payslip-period"><strong>{row.period.title}</strong><span>{formatJalali(row.period.dateFrom)} تا {formatJalali(row.period.dateTo)}</span><span>تاریخ چاپ: {new Date().toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}</span></div>
    </header>

    <section className="payslip-block">
      <h2>مشخصات پرسنلی</h2>
      <div className="payslip-grid">
        <div><span>نام و نام خانوادگی</span><b>{field(row, "name", row.staff.fullName)}</b></div>
        <div><span>عنوان شغلی</span><b>{field(row, "jobTitle", row.staff.jobTitle || dutyLabels[row.staff.duty] || row.staff.duty)}</b></div>
        <div><span>کد ملی</span><b dir="ltr">{field(row, "nationalId", row.staff.nationalId)}</b></div>
        <div><span>شماره بیمه</span><b dir="ltr">{field(row, "insuranceNumber", row.staff.insuranceNumber)}</b></div>
        <div><span>کد شغلی</span><b>{field(row, "jobCode", row.staff.jobCode)}</b></div>
        <div><span>وضعیت تأهل</span><b>{maritalLabel}</b></div>
        <div><span>تعداد فرزند</span><b>{field(row, "childrenCount", row.staff.childrenCount)}</b></div>
        <div><span>تاریخ شروع همکاری</span><b>{field(row, "employmentStartDate", row.staff.employmentStartDate) !== "—" ? formatJalali(field(row, "employmentStartDate", row.staff.employmentStartDate)) : "—"}</b></div>
        <div><span>نام صاحب حساب</span><b>{field(row, "bankAccountName", row.staff.bankAccountName)}</b></div>
        <div><span>شماره حساب</span><b dir="ltr">{field(row, "bankAccountNumber", row.staff.bankAccountNumber)}</b></div>
        <div><span>شماره شبا</span><b dir="ltr">{field(row, "iban", row.staff.iban)}</b></div>
      </div>
    </section>

    <section className="payslip-block">
      <h2>کارکرد دوره</h2>
      <div className="payslip-metrics">
        <div><span>کارکرد عادی</span><b>{minutes(row.entry.regularMinutes)}</b></div>
        <div><span>اضافه‌کاری</span><b>{minutes(row.entry.overtimeMinutes)}</b></div>
        <div><span>جمعه‌کاری</span><b>{minutes(row.entry.fridayMinutes)}</b></div>
        <div><span>تعطیل‌کاری</span><b>{minutes(row.entry.holidayMinutes)}</b></div>
        <div><span>شب‌کاری</span><b>{minutes(row.entry.nightMinutes)}</b></div>
        <div><span>مرخصی ثبت‌شده</span><b>{minutes(row.entry.leaveMinutes)}</b></div>
        <div><span>مرخصی بدون حقوق</span><b>{minutes(row.entry.unpaidLeaveMinutes)}</b></div>
        <div><span>کسر کار</span><b>{minutes(row.entry.shortMinutes)}</b></div>
      </div>
    </section>

    <section className="payslip-block">
      <h2>ریز حقوق و مزایا</h2>
      <table className="payslip-table"><thead><tr><th>شرح</th><th>مشمول بیمه</th><th>مشمول مالیات</th><th>مبلغ (تومان)</th></tr></thead><tbody>
        {row.entry.earningComponents.length ? row.entry.earningComponents.map((item) => <tr key={item.key}><td>{item.label || item.key}</td><td>{item.insurable ? "بله" : "خیر"}</td><td>{item.taxable ? "بله" : "خیر"}</td><td>{money(item.amountToman)}</td></tr>) : <tr><td colSpan={4}>جزئیات مزایا ثبت نشده است.</td></tr>}
        <tr className="payslip-total"><td colSpan={3}>جمع حقوق و مزایا</td><td>{money(totalEarnings)}</td></tr>
      </tbody></table>
    </section>

    <section className="payslip-block">
      <h2>کسورات</h2>
      <table className="payslip-table"><thead><tr><th>شرح کسر</th><th>مبلغ (تومان)</th></tr></thead><tbody>
        {row.entry.deductionComponents.length ? row.entry.deductionComponents.map((item) => <tr key={item.key}><td>{item.label}</td><td>{money(item.amountToman)}</td></tr>) : <tr><td>کسوری ثبت نشده است.</td><td>{money(0)}</td></tr>}
        <tr className="payslip-total"><td>جمع کسورات</td><td>{money(totalDeductions)}</td></tr>
      </tbody></table>
      <div className="payslip-metrics payslip-insurance"><div><span>سهم بیمه کارفرما (اطلاعاتی)</span><b>{money(row.entry.employerInsuranceToman)}</b></div></div>
    </section>

    <section className="payslip-net"><span>خالص پرداختی</span><strong>{money(row.entry.netToman)}</strong></section>
    <section className="payslip-payment"><div><span>وضعیت پرداخت</span><b>{row.entry.paymentStatus === "paid" ? "پرداخت‌شده" : "پرداخت‌نشده"}</b></div><div><span>تاریخ پرداخت</span><b>{paidDate}</b></div><div><span>شماره پیگیری</span><b dir="ltr">{row.entry.paymentRef || "—"}</b></div></section>
    {row.entry.notes && <section className="payslip-notes"><b>یادداشت محاسبه:</b><div>{row.entry.notes}</div></section>}
    <footer className="payslip-signatures"><div>امضای کارمند</div><div>مهر و امضای کارفرما</div></footer>
  </article>;
}
