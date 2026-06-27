# Gemini-in-Sheets dashboard prompt

Open the close-out spreadsheet → click the **Gemini ✦** icon (top-right) →
paste the prompt below. It builds an owner dashboard from the tabs the web app
fills. (You can also run `buildDashboard` in Apps Script for a formula-based
version — this prompt is the flexible alternative.)

> Note: this dashboard shows profit/income. Keep the spreadsheet shared with
> owners/managers only — staff use the web app, which never shows these figures.

---

```
You are helping me analyze data for a USPS Contract Postal Unit (pack-and-ship
store). The spreadsheet has these tabs, filled automatically by a web app.

TAB "Closeouts" — one row per day:
- Timestamp, Date, Closed by, Starting bank ($), Cash ($), CC payments (#),
  CC total ($), Total sales ($), Petty cash out ($), Drawer counted ($),
  Expected drawer ($), Over/Short ($), Stamps used ($), Postage left in CRM ($),
  Prepaid pkgs, Voided pkgs, # Employees, Report photo, Notes,
  Commissionable mail ($), Est. CPU pay ($), Passport renewals (#),
  Notaries (#), Service income ($), Est. total income ($),
  Fax pages (#), Copies 1-3 (#), Copies 4-10 (#), Supplies income ($)

TAB "Employees" — one row per employee per day:
- Timestamp, Date, Employee, Clock in, Clock out, Customers helped,
  Told notary, Told passport, Closed by

TAB "Report Lines" — one row per line of the daily USPS category-code report:
- Timestamp, Date, Section, CAT, Description, Qty, Value ($)
  (Section = Mailing Services, Special Services, Affixed Postage, Prepaid Mail;
   CAT = short code like PRPE, FCML, PKGS, CERM.)

TAB "Openings" — one row per morning:
- Timestamp, Date, Opened by, Starting bank ($), Checklist done, Notes

TAB "Appointments" — one row per booking:
- Logged, Service, Customer, Phone, Appt date, Appt time, Booked by, Notes

TAB "Supplies" — one row per packing-supply item sold per day:
- Timestamp, Date, Item, Qty, Unit price ($), Line total ($)

How profit/income works (already calculated in Closeouts, do not recompute):
- Est. CPU pay = 19.5% of Commissionable mail + $0.25 per prepaid piece.
- Service income = Passport renewals x $35 + Notaries x $11
  + Fax pages x $1.50 + Copies 1-3 x $1 + Copies 4-10 x $3.
- Supplies income = sum of supply line totals (Supplies tab) for the day.
- Est. total income = Est. CPU pay + Service income + Supplies income.

Create a new tab called "Dashboard" with these sections, using LIVE formulas
(QUERY / SUMIFS) that auto-update as new rows are added:

1. TODAY snapshot (most recent Closeouts row): Date, Total sales, Cash, Card,
   Money in register (Drawer counted), Over/Short, Postage left in CRM,
   Est. CPU pay, Service income, Est. total income.

2. INCOME — CURRENT MONTH: totals for Commissionable mail, Est. CPU pay,
   Passport renewals (#), Notaries (#), Fax pages (#), Copies 1-3 (#),
   Copies 4-10 (#), Service income, Supplies income, and Est. total income.
   Also show Est. total income per day for the month as a list/mini-table.

3. OPERATIONS — CURRENT MONTH: total sales, cash, card, stamps/postage used,
   prepaid packages, voided packages, and net Over/Short. Flag days where
   |Over/Short| > 5.

4. POSTAGE BALANCE WATCH: most recent "Postage left in CRM ($)"; flag/highlight
   "RELOAD" when below 200; list the end-of-day postage balance per day this
   month to show the trend.

5. PER-EMPLOYEE (current month, from "Employees"): for each employee, total
   customers helped, total told notary, total told passport, the % of their
   customers they mentioned each service to, and total hours worked (derive
   hours from Clock in/Clock out, treated as 24-hour HH:MM text via TIMEVALUE).

6. CATEGORY MIX (current month, from "Report Lines"): total Qty and Value ($)
   per Section, plus a top-10 list of CAT codes by Value and by Qty.

7. SUPPLIES SOLD (current month, from "Supplies"): per Item, total Qty and
   total Revenue ($), sorted by Revenue descending.

Format money as currency and dates as dates, use clear headers, and reference
the source tabs so the Dashboard stays current automatically.
```

---

## If Gemini stumbles
- Static values instead of updating: *"Make that section use live QUERY/SUMIFS
  formulas referencing the source tabs, not fixed values."*
- Hours-worked errors: *"Treat Clock in/out as 24-hour HH:MM text and convert
  with TIMEVALUE before subtracting."*
- Month filtering: *"Filter to the current month using
  Date >= EOMONTH(TODAY(),-1)+1 and Date <= EOMONTH(TODAY(),0)."*
