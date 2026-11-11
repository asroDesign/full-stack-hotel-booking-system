import { eq, sql } from "drizzle-orm";
import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";
import { db } from "@/db";
import { admins, hotelPayrollEntries, hotelPayrollPeriods, hotelPayrollPolicies, hotelShiftAssignments, hotelShiftTemplates, hotelShifts, hotelStaff, settings, type StaffDuty } from "@/db/schema";
import { calculatePayroll, defaultPayrollPolicy, type PayrollMetrics, type PayrollProfileCore } from "@/lib/hotel-payroll-core";

const seedKey = "seed_hotel_staff_payroll_demo_v1";
const people = [
  ["آرمان نادری", "reception", "سرپرست پذیرش", 31_000_000], ["مریم بهرامی", "reception", "کارشناس پذیرش", 30_000_000], ["سامان رستگار", "reception", "کارشناس پذیرش", 29_000_000], ["نگار شریفی", "reception", "کارشناس پذیرش", 29_500_000], ["کیان فرهمند", "reception", "کارشناس پذیرش", 28_000_000],
  ["الهام موسوی", "housekeeping", "سرپرست خانه‌داری", 25_000_000], ["پیمان قاسمی", "housekeeping", "کارشناس خانه‌داری", 23_000_000], ["سحر نیک‌پی", "housekeeping", "کارشناس خانه‌داری", 22_500_000], ["نوید مرادی", "housekeeping", "کارشناس خانه‌داری", 23_000_000], ["لیلا کاظمی", "housekeeping", "کارشناس خانه‌داری", 22_000_000],
  ["یاسر حیدری", "housekeeping", "کارشناس خانه‌داری", 23_500_000], ["رعنا امینی", "housekeeping", "کارشناس خانه‌داری", 22_500_000], ["میلاد صالحی", "housekeeping", "کارشناس خانه‌داری", 23_000_000],
  ["نازنین عباسی", "maintenance", "سرپرست تأسیسات", 35_000_000], ["فرزاد صادقی", "maintenance", "تکنسین تأسیسات", 33_000_000], ["بهاره کریمی", "maintenance", "تکنسین تأسیسات", 32_000_000],
  ["امیرحسین یوسفی", "operations", "سرپرست عملیات", 34_000_000], ["ترانه محمدی", "operations", "کارشناس عملیات هتل", 28_000_000], ["شایان رحیمی", "operations", "کارشناس عملیات هتل", 27_000_000], ["مونا جعفری", "operations", "کارشناس عملیات هتل", 27_500_000],
] as const;
const shiftSpecs = [
  { name: "شیفت صبح", startTime: "07:00", endTime: "15:00", breakMinutes: 30 },
  { name: "شیفت عصر", startTime: "15:00", endTime: "23:00", breakMinutes: 30 },
  { name: "شیفت شب", startTime: "23:00", endTime: "07:00", breakMinutes: 30 },
];
const dutyLabel: Record<StaffDuty, string> = { reception: "پذیرش", housekeeping: "خانه‌داری", maintenance: "تأسیسات", operations: "عملیات" };

function tehranDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? "00";
  return get("year") + "-" + get("month") + "-" + get("day");
}

export async function ensureHotelStaffPayrollDemo() {
  if (process.env.DEMO_MODE === "false" || process.env.SEED_DEMO === "false") return;
  const [demoMode] = await db.select().from(settings).where(eq(settings.key, "demoMode"));
  if (demoMode && demoMode.value !== "1") return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(1405112026)`);
    const [marker] = await tx.select({ key: settings.key }).from(settings).where(eq(settings.key, seedKey));
    if (marker) return;
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(hotelStaff);
    const [{ shiftCount }] = await tx.select({ shiftCount: sql<number>`count(*)::int` }).from(hotelShifts);
    const [{ periodCount }] = await tx.select({ periodCount: sql<number>`count(*)::int` }).from(hotelPayrollPeriods);
    if (count || periodCount) {
      await tx.insert(settings).values({ key: seedKey, value: "skipped-existing-data" }).onConflictDoNothing();
      return;
    }

    const [admin] = await tx.select({ id: admins.id }).from(admins).orderBy(admins.id).limit(1);
    const createdBy = admin?.id ?? null;
    const today = tehranDate();
    const { jy: year, jm: month } = toJalaali(...today.split("-").map(Number) as [number, number, number]);
    const monthDays = jalaaliMonthLength(year, month);
    const from = toGregorian(year, month, 1);
    const to = toGregorian(year, month, monthDays);
    const dateFrom = `${from.gy}-${String(from.gm).padStart(2, "0")}-${String(from.gd).padStart(2, "0")}`;
    const dateTo = `${to.gy}-${String(to.gm).padStart(2, "0")}-${String(to.gd).padStart(2, "0")}`;
    const defaultPolicy = defaultPayrollPolicy(year);
    await tx.insert(hotelPayrollPolicies).values({ ...defaultPolicy, updatedBy: createdBy }).onConflictDoNothing();
    const [savedPolicy] = await tx.select().from(hotelPayrollPolicies).where(eq(hotelPayrollPolicies.jalaliYear, year));
    const policy = savedPolicy ?? defaultPolicy;

    const shifts = shiftCount
      ? await tx.select().from(hotelShifts).orderBy(hotelShifts.id)
      : await tx.insert(hotelShifts).values(shiftSpecs).returning();
    const staff = await tx.insert(hotelStaff).values(people.map(([fullName, duty, jobTitle, salary], index) => {
      const married = index % 2 === 0;
      const childrenCount = index % 5 === 0 ? 2 : index % 5 === 2 ? 1 : 0;
      const insuredHistoryDays = 500 + index * 100;
      const salaryMode = [0, 13, 16].includes(index) ? "fixed" as const : "statutory" as const;
      const employmentStartDate = `${2021 + index % 5}-01-${String((index % 25) + 1).padStart(2, "0")}`;
      return {
        fullName, phone: "", duty, jobTitle,
        nationalId: `99999999${String(index + 1).padStart(2, "0")}`,
        fatherName: "اطلاعات نمایشی", maritalStatus: married ? "married" : "single",
        employmentStartDate, contractType: index % 3 === 0 ? "permanent" : "temporary",
        jobCode: `DEMO-${String(index + 1).padStart(3, "0")}`,
        insuranceNumber: `DEMO-${year}-${String(index + 1).padStart(4, "0")}`,
        insuredHistoryDays, childrenCount,
        childAllowanceEligible: childrenCount > 0 && insuredHistoryDays >= policy.minimumInsuredHistoryDaysForChildAllowance,
        salaryMode, monthlySalary: salary, monthlyBaseSalaryToman: salary,
        fixedAgreedSalaryToman: salaryMode === "fixed" ? salary + 3_000_000 : 0,
        managementAllowanceToman: index % 5 === 0 ? 2_000_000 : 0,
        annualServiceBaseToman: 500_000, overtimeEligible: true,
        insuranceEnabled: true, incomeTaxEnabled: true, includeHousing: true, includeFood: true,
        includeMaritalAllowance: true, includeChildAllowance: true, includeSeniority: true,
        bankAccountName: fullName, isActive: true,
        notes: "دادهٔ نمایشی؛ کد ملی و شماره بیمه ساختگی‌اند و برای استفاده واقعی یا ارسال به سازمان‌ها معتبر نیستند.",
        createdBy, updatedBy: createdBy,
      };
    })).returning();

    const templates = await tx.insert(hotelShiftTemplates).values(staff.map((person, index) => {
      const shift = shifts[index % shifts.length];
      const duty = people[index][1] as StaffDuty;
      return { staffId: person.id, shiftId: shift.id, name: `${dutyLabel[duty]} · ${shift.name}`, weekdays: "0,1,2,3,4,5,6", duty, isLead: index % 3 === 0, location: `بخش ${dutyLabel[duty]}`, createdBy };
    })).returning();
    await tx.insert(hotelShiftAssignments).values(staff.map((person, index) => ({
      workDate: today, shiftId: shifts[index % shifts.length].id, templateId: templates[index].id,
      staffId: person.id, duty: people[index][1] as StaffDuty, isLead: templates[index].isLead,
      notes: "برنامهٔ نمایشی", createdBy, updatedBy: createdBy,
    })));

    const [period] = await tx.insert(hotelPayrollPeriods).values({
      title: `${year}/${String(month).padStart(2, "0")} · لیست حقوق نمایشی`, dateFrom, dateTo,
      jalaliYear: year, jalaliMonth: month, status: "draft",
      policySnapshot: policy as unknown as Record<string, unknown>, createdBy,
      approvalNote: "این دوره فقط برای نمایش روند حقوق و دستمزد ساخته شده است.",
    }).returning();

    const entries = staff.map((person, index) => {
      const [fullName, duty, jobTitle] = people[index];
      const shift = shifts[index % shifts.length];
      const metrics: PayrollMetrics = {
        workMinutes: 10_560, overtimeMinutes: (index % 5) * 60,
        fridayMinutes: index % 4 === 0 ? 480 : 0, holidayMinutes: 0,
        nightMinutes: shift.name === "شیفت شب" ? 1_200 : 0,
        annualLeaveMinutes: index === 1 ? 480 : 0, sickLeaveMinutes: index === 4 ? 240 : 0,
        unpaidLeaveMinutes: index === 7 ? 240 : 0, otherLeaveMinutes: 0,
        shortMinutes: 0, rewardToman: 0, taxableRewardToman: 0, insurableRewardToman: 0, penaltyToman: 0,
        warnings: ["محاسبات این ردیف نمونه هستند و برای پرداخت واقعی استفاده نشوند."],
      };
      const profile: PayrollProfileCore = {
        id: person.id, name: fullName, nationalId: person.nationalId, insuranceNumber: person.insuranceNumber,
        jobTitle, jobCode: person.jobCode, employmentStartDate: person.employmentStartDate,
        employmentEndDate: null, maritalStatus: person.maritalStatus, childrenCount: person.childrenCount,
        childAllowanceEligible: person.childAllowanceEligible, insuredHistoryDays: person.insuredHistoryDays,
        salaryMode: person.salaryMode === "fixed" ? "fixed" : "statutory",
        monthlyBaseSalaryToman: person.monthlyBaseSalaryToman, fixedAgreedSalaryToman: person.fixedAgreedSalaryToman,
        managementAllowanceToman: person.managementAllowanceToman, annualServiceBaseToman: person.annualServiceBaseToman,
        overtimeEligible: person.overtimeEligible, insuranceEnabled: person.insuranceEnabled,
        incomeTaxEnabled: person.incomeTaxEnabled, includeHousing: person.includeHousing, includeFood: person.includeFood,
        includeMaritalAllowance: person.includeMaritalAllowance, includeChildAllowance: person.includeChildAllowance,
        includeSeniority: person.includeSeniority,
      };
      const result = calculatePayroll({ profile, policy, year, month, monthDays, metrics });
      const earning = (key: string) => result.earnings.filter((item) => item.key === key).reduce((sum, item) => sum + item.amountToman, 0);
      return {
        periodId: period.id, staffId: person.id,
        staffSnapshot: { name: fullName, jobTitle, duty, nationalId: person.nationalId, insuranceNumber: person.insuranceNumber, demo: true },
        regularMinutes: result.workMinutes, overtimeMinutes: result.overtimeMinutes,
        fridayMinutes: result.fridayMinutes, holidayMinutes: result.holidayMinutes, nightMinutes: result.nightMinutes,
        leaveMinutes: result.leaveMinutes, unpaidLeaveMinutes: result.unpaidLeaveMinutes, shortMinutes: result.shortMinutes,
        earningComponents: result.earnings, deductionComponents: result.deductions,
        basePay: earning("base"), overtimePay: earning("overtime"), bonus: earning("reward"),
        deductions: result.deductions.reduce((sum, item) => sum + item.amountToman, 0),
        grossToman: result.grossToman, employeeInsuranceToman: result.employeeInsuranceToman,
        employerInsuranceToman: result.employerInsuranceToman, incomeTaxToman: result.incomeTaxToman,
        penaltyToman: result.penaltyToman, netPay: result.netToman, netToman: result.netToman,
        paymentStatus: "unpaid" as const, notes: result.warnings.join("\n"),
      };
    });
    await tx.insert(hotelPayrollEntries).values(entries);
    await tx.insert(settings).values({ key: seedKey, value: "1" }).onConflictDoNothing();
  });
}
