import { useState, useRef, useEffect } from "react";

// ─── localStorage helpers ───────────────────────────────────────────────────────
function loadLS(key, fallback) {
  try { const raw = localStorage.getItem("forestmere_" + key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem("forestmere_" + key, JSON.stringify(val)); } catch {}
}

// ─── DATA ──────────────────────────────────────────────────────────────────────

const BUDGET = [
  { code: "01-000", name: "General Conditions", budget: 1823957, cat: "General" },
  { code: "03-330", name: "Cast In Place Concrete", budget: 401900, cat: "Structure" },
  { code: "04-570", name: "Chimney / Fireplace", budget: 97923, cat: "Structure" },
  { code: "06-100", name: "Rough Carpentry - Labor", budget: 139000, cat: "Structure" },
  { code: "06-110", name: "Rough Carpentry - Material", budget: 146581, cat: "Structure" },
  { code: "06-120", name: "SIPS Panels (Car Barn & Maint.)", budget: 166258, cat: "Structure" },
  { code: "06-200", name: "Exterior Finish Carpentry - Labor", budget: 422678, cat: "Structure" },
  { code: "06-210", name: "Exterior Finish Carpentry - Material", budget: 273230, cat: "Structure" },
  { code: "06-400", name: "Architectural Woodwork (Casework)", budget: 472630, cat: "Finishes" },
  { code: "06-460", name: "Interior Wood Trims - Labor", budget: 129018, cat: "Finishes" },
  { code: "06-470", name: "Interior Wood Trims - Material", budget: 125167, cat: "Finishes" },
  { code: "07-100", name: "Exterior Waterproofing", budget: 26280, cat: "Envelope" },
  { code: "07-200", name: "Building Insulation", budget: 70444, cat: "Envelope" },
  { code: "07-500", name: "Roofing Systems", budget: 213803, cat: "Envelope" },
  { code: "08-140", name: "Interior Wood Doors & Frames", budget: 58081, cat: "Openings" },
  { code: "08-300", name: "Specialty Doors & Frames", budget: 8000, cat: "Openings" },
  { code: "08-330", name: "Garage Doors", budget: 332508, cat: "Openings" },
  { code: "08-400", name: "Windows and Exterior Doors", budget: 207649, cat: "Openings" },
  { code: "08-600", name: "Skylights", budget: 16380, cat: "Openings" },
  { code: "08-700", name: "Door Hardware", budget: 29912, cat: "Openings" },
  { code: "08-800", name: "Glazing", budget: 6840, cat: "Openings" },
  { code: "09-200", name: "Gypsum Board", budget: 4500, cat: "Finishes" },
  { code: "09-300", name: "Tile & Stone", budget: 409095, cat: "Finishes" },
  { code: "09-640", name: "Wood Flooring", budget: 36670, cat: "Finishes" },
  { code: "09-911", name: "Exterior Finishing", budget: 10179, cat: "Finishes" },
  { code: "09-912", name: "Interior Finishing", budget: 26205, cat: "Finishes" },
  { code: "10-280", name: "Toilet & Bathroom Accessories", budget: 10900, cat: "Specialties" },
  { code: "11-300", name: "Residential Equipment", budget: 53441, cat: "Equipment" },
  { code: "12-200", name: "Window Treatments & Controls", budget: 67531, cat: "Furnishings" },
  { code: "13-110", name: "Hot Tub", budget: 232000, cat: "Special" },
  { code: "13-200", name: "Special Purpose Rooms", budget: 100125, cat: "Special" },
  { code: "21-130", name: "Fire Suppression", budget: 50000, cat: "MEP" },
  { code: "22-100", name: "Plumbing", budget: 128831, cat: "MEP" },
  { code: "22-400", name: "Plumbing Fixtures", budget: 74612, cat: "MEP" },
  { code: "23-100", name: "HVAC", budget: 398900, cat: "MEP" },
  { code: "26-100", name: "Electrical Power & Switching", budget: 244183, cat: "MEP" },
  { code: "26-320", name: "Electrical Generators", budget: 12000, cat: "MEP" },
  { code: "26-500", name: "Interior Lighting Fixtures", budget: 129229, cat: "MEP" },
  { code: "26-560", name: "Exterior Lighting Fixtures", budget: 87250, cat: "MEP" },
  { code: "31-110", name: "Site Clearing", budget: 87510, cat: "Sitework" },
  { code: "31-200", name: "Excavations & Backfilling", budget: 996944, cat: "Sitework" },
  { code: "31-640", name: "Sheet Pile / Caissons", budget: 416472, cat: "Sitework" },
  { code: "32-010", name: "Paving (Hardscape)", budget: 446557, cat: "Sitework" },
  { code: "32-100", name: "Driveway & Curbing", budget: 251906, cat: "Sitework" },
  { code: "32-320", name: "Site Retaining Walls", budget: 145433, cat: "Sitework" },
  { code: "32-900", name: "Plantings & Shrubs", budget: 375047, cat: "Landscape" },
  { code: "33-100", name: "Water Service", budget: 108240, cat: "Utilities" },
  { code: "33-150", name: "Gas Services / Tank", budget: 10000, cat: "Utilities" },
  { code: "33-300", name: "Septic / Sewer Systems", budget: 132770, cat: "Utilities" },
  { code: "33-340", name: "Site Drainage Systems", budget: 196790, cat: "Utilities" },
  { code: "33-370", name: "Electrical Service", budget: 788495, cat: "Utilities" },
];

const AWARDS = [
  { id: "AWD-001", date: "08/07/2025", vendor: "Renlita Custom Opening Solutions", code: "08-330", division: "Garage Doors", desc: "Car Barn – Renlita S-1000 Floataway Motorized Lift-Up Garage Doors (Supply)", award: 233394.24, cos: 12600, current: 245994.24 },
  { id: "AWD-002", date: "08/07/2025", vendor: "Custom Remodeling & Carpentry", code: "08-330", division: "Garage Doors", desc: "Garage Doors Installation – Car Barn and Boat House", award: 86229, cos: 0, current: 86229 },
  { id: "AWD-003", date: "08/05/2025", vendor: "Avery's Custom Masonry", code: "04-570", division: "Chimney / Fireplace", desc: 'Main Residence – Isokern Magnum 48" & 60" fireplaces', award: 67927.5, cos: 0, current: 67927.5 },
  { id: "AWD-004", date: "07/14/2025", vendor: "Royal Green", code: "11-300", division: "Residential Equipment", desc: "Main Residence & Pavilion – Kitchen appliances, laundry, refrigeration", award: 45551.16, cos: 0, current: 45551.16 },
  { id: "AWD-005", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", code: "31-200", division: "Excavations & Backfilling", desc: "Site/Civil – Earthwork, excavations, backfilling", award: 996944, cos: 73382, current: 1070326 },
  { id: "AWD-006", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", code: "32-100", division: "Driveway & Curbing", desc: "Site/Civil – Driveway & Curbing", award: 251906, cos: 0, current: 251906 },
  { id: "AWD-007", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", code: "33-340", division: "Site Drainage Systems", desc: "Site/Civil – Site Drainage Systems", award: 196790, cos: 0, current: 196790 },
  { id: "AWD-008", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", code: "31-110", division: "Site Clearing", desc: "Site/Civil – Site Clearing", award: 80483.35, cos: 0, current: 80483.35 },
  { id: "AWD-009", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "26-100", division: "Electrical Power & Switching", desc: "Main distribution", award: 244183, cos: 0, current: 244183 },
  { id: "AWD-010", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "26-320", division: "Electrical Generators", desc: "Electrical Generators", award: 12000, cos: 0, current: 12000 },
  { id: "AWD-011", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "26-500", division: "Interior Lighting Fixtures", desc: "Interior Lighting Fixtures (Supply)", award: 129229, cos: 0, current: 129229 },
  { id: "AWD-012", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "26-560", division: "Exterior Lighting Fixtures", desc: "Exterior Lighting Fixtures (Supply)", award: 87250, cos: 0, current: 87250 },
  { id: "AWD-013", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "33-370", division: "Electrical Service", desc: "Site electrical distribution", award: 686196, cos: 12600, current: 698796 },
  { id: "AWD-014", date: "06/17/2025", vendor: "Krueger Electrical Contracting", code: "33-150", division: "Gas Services / Tank", desc: "Gas Services/Tank", award: 10000, cos: 0, current: 10000 },
  { id: "AWD-015", date: "07/18/2025", vendor: "Wagner Pools", code: "13-110", division: "Hot Tub", desc: "Pavilion – 60 SF Rectangle Spa, Gunite Shell with Auto-Cover", award: 142000, cos: 0, current: 142000 },
  { id: "AWD-016", date: "08/04/2025", vendor: "Simon's & Co.", code: "22-400", division: "Plumbing Fixtures", desc: "Main Residence & Pavilion – Plumbing fixtures, faucets, toilets", award: 70460.38, cos: 0, current: 70460.38 },
  { id: "AWD-017", date: "07/07/2025", vendor: "Foard Panel", code: "06-120", division: "SIPS Panels", desc: "Car Barn – SIPS Panels (Supply only)", award: 115710, cos: 0, current: 115710 },
  { id: "AWD-018", date: "07/08/2025", vendor: "Rhea Windows", code: "08-400", division: "Windows and Exterior Doors", desc: "Main Residence – Windows (Supply only)", award: 130205.09, cos: 0, current: 130205.09 },
  { id: "AWD-019", date: "10/13/2025", vendor: "Trident", code: "31-640", division: "Sheet Pile / Caissons", desc: "Boat House Structural", award: 474149.7, cos: 0, current: 474149.7 },
  { id: "AWD-020", date: "10/11/2025", vendor: "reSawn Timber Co.", code: "06-210", division: "Exterior Finish Carpentry - Material", desc: "Exterior Finish Carpentry (Materials Only)", award: 229728.58, cos: 0, current: 229728.58 },
];

const CHANGE_ORDERS = [
  { no: "CO-007", code: "03-330", div: "Cast In Place Concrete", origBudget: 401900, approvedCO: 148000, fees: 16725, total: 164725, revisedBudget: 549900, notes: "Includes waived fee of $7,695.", date: "Jan 20, 2026" },
  { no: "CO-009", code: "31-640", div: "Sheet Pile / Caissons", origBudget: 416472, approvedCO: 57677.7, fees: 9516.82, total: 67194.52, revisedBudget: 474149.7, notes: null, date: "Jan 20, 2026" },
  { no: "CO-003", code: "33-370", div: "Electrical Service", origBudget: 788495, approvedCO: 1710, fees: 282.15, total: 1992.15, revisedBudget: 790205, notes: "Savings from buyout applied.", date: "Jan 20, 2026" },
  { no: "CO-013", code: "23-100", div: "HVAC", origBudget: 398900, approvedCO: 50787, fees: 8379.86, total: 59166.86, revisedBudget: 449687, notes: null, date: "Jan 20, 2026" },
  { no: "CO-016", code: "23-100", div: "HVAC (Additional)", origBudget: 449687, approvedCO: 38425, fees: 5187.38, total: 43612.38, revisedBudget: 488112, notes: "Additional HVAC scope.", date: "Jan 20, 2026" },
];

const INVOICES = [
  { id: "PAY-001", reqDate: "06/18/2025", invNum: "C25-104-Deposit", desc: "Initial Deposit – 11% of contract", jobTotal: 1436830.08, fees: 0, depositApplied: 0, retainage: 0, amtDue: 1436830.08, approved: 1436830.08, paidDate: "06/18/2025", status: "Paid", notes: null },
  { id: "PAY-002", reqDate: "08/11/2025", invNum: "#1621", desc: "Period to: July 31, 2025", jobTotal: 373689.41, fees: 63172.19, depositApplied: -291331.16, retainage: -34210.34, amtDue: 111320.10, approved: 111340.10, paidDate: "08/11/2025", status: "Paid", notes: null },
  { id: "PAY-003", reqDate: "09/16/2025", invNum: "#1693", desc: "Period to: August 31, 2025", jobTotal: 445713.57, fees: 75347.88, depositApplied: -161669.51, retainage: -47865.87, amtDue: 311526.07, approved: 311536.07, paidDate: "09/18/2025", status: "Paid", notes: null },
  { id: "PAY-004", reqDate: "10/17/2025", invNum: "#1750", desc: "Period to: September 30, 2025", jobTotal: 574205.05, fees: 97069.36, depositApplied: -70273.47, retainage: -63883.97, amtDue: 537116.97, approved: 537116.97, paidDate: "11/07/2025", status: "Paid", notes: null },
  { id: "PAY-005", reqDate: "11/19/2025", invNum: "#1819", desc: "Period to: October 31, 2025", jobTotal: 525618.85, fees: 88855.86, depositApplied: -126944.29, retainage: -56704.94, amtDue: 430825.48, approved: 430845.48, paidDate: "12/30/2025", status: "Paid", notes: null },
  { id: "PAY-006", reqDate: "12/22/2025", invNum: "#1880", desc: "Period to: November 30, 2025", jobTotal: 196594.55, fees: 33234.30, depositApplied: -66221.94, retainage: -11728.54, amtDue: 151878.37, approved: 151878.37, paidDate: null, status: "Pending Payment", notes: "$430,845.48 paid twice in error. Balance to be applied against next invoice." },
  { id: "PAY-007", reqDate: "01/23/2026", invNum: "#1956", desc: "Period to: December 31, 2025", jobTotal: 78875.63, fees: 13333.93, depositApplied: -26602.41, retainage: -2948.72, amtDue: 62658.43, approved: 62658.43, paidDate: null, status: "Pending Payment", notes: null },
  { id: "PAY-008", reqDate: "02/10/2026", invNum: "#1976", desc: "Period to: January 31, 2026", jobTotal: 286511, fees: 48435, depositApplied: -121719, retainage: -30465, amtDue: 182762, approved: 182771, paidDate: null, status: "Pending Payment", notes: null },
];

const LINE_ITEMS = [
  { code: "01-001", name: "Project Staffing", budget: 1367556.67, cos: 0, done: 186786.64, pct: 0.1366, inv: { "C25-104-Deposit": null, "#1621": 18225, "#1693": 33185, "#1750": 26170, "#1819": 40816.64, "#1880": 22475, "#1956": 23495, "#1976": 22420 } },
  { code: "02-002", name: "Site Preparation", budget: 423400, cos: 0, done: 104490.15, pct: 0.2468, inv: { "#1621": 48297.32, "#1693": 9217.82, "#1750": 6264.82, "#1819": 6608.71, "#1880": 9759.30, "#1956": 16471.77, "#1976": 7870.41 } },
  { code: "02-100", name: "Debris Removal", budget: 33000, cos: 0, done: 1733, pct: 0.0525, inv: { "#1880": 1733 } },
  { code: "03-330", name: "Cast In Place Concrete", budget: 401900, cos: 148000, done: 137250, pct: 0.2496, inv: { "#1819": 137250 } },
  { code: "06-210", name: "Ext. Finish Carpentry – Material", budget: 273230, cos: 0, done: 76576.19, pct: 0.2803, inv: { "#1880": 76576.19 } },
  { code: "08-330", name: "Garage Doors", budget: 332508, cos: 0, done: 62254.20, pct: 0.1872, inv: { "#1693": 62254.20 } },
  { code: "08-400", name: "Exterior Doors", budget: 207649, cos: 0, done: 65102.54, pct: 0.3135, inv: { "#1621": 65102.54 } },
  { code: "11-300", name: "Residential Equipment", budget: 53441, cos: 0, done: 22755.58, pct: 0.4258, inv: { "#1956": 22755.58 } },
  { code: "31-200", name: "Excavations & Backfilling", budget: 996944, cos: 73382, done: 628329.89, pct: 0.6303, inv: { "#1621": 198067, "#1693": 241737, "#1750": 180000, "#1956": 8653.28 } },
  { code: "31-110", name: "Site Clearing", budget: 87510, cos: 0, done: 87510, pct: 1.0, inv: { "#1621": 42207.55, "#1693": 45302.45 } },
  { code: "31-640", name: "Sheet Pile / Caissons", budget: 416472, cos: 57677.7, done: 250470.25, pct: 0.5283, inv: { "#1976": 250470.25 } },
  { code: "33-340", name: "Site Drainage Systems", budget: 196790, cos: 0, done: 114792.44, pct: 0.5833, inv: { "#1750": 114792.44 } },
  { code: "33-370", name: "Electrical Service", budget: 788495, cos: 1992.15, done: 407990.82, pct: 0.5161, inv: { "#1750": 63730, "#1956": 7500, "#1976": 5750 } },
  { code: "26-100", name: "Electrical Power & Switching", budget: 244183, cos: 0, done: 81161.65, pct: 0.3357, inv: { "#1750": 81161.65 } },
  { code: "32-100", name: "Driveway & Curbing", budget: 251906, cos: 0, done: 115737.16, pct: 0.4594, inv: { "#1750": 115737.16 } },
];

const INV_NUMS = ["C25-104-Deposit", "#1621", "#1693", "#1750", "#1819", "#1880", "#1956", "#1976"];

const PRIOR_PHASES = [
  {
    id: "demolition", name: "Demolition", jobNum: "C25-102", gc: "Taconic Builders Inc.",
    subcontractor: "Mayville Enterprises Inc.", startDate: "Jan 2025", endDate: "May 2025",
    scope: "Demolition of existing site structures",
    originalContract: 446966, approvedCOs: -40552.24, finalContract: 406413.76, totalPaid: 335189.43, status: "Complete",
    lineItems: [
      { code: "01-001", desc: "General Conditions (Staffing)", budget: 43038, paid: 31212.82 },
      { code: "02-001", desc: "Site Maintenance / Prep", budget: 40300, paid: 0 },
      { code: "02-410", desc: "Demolition (Mayville Enterprises)", budget: 298995, paid: 285495 },
    ],
    cos: [
      { no: "CO-002", desc: "Relocate temp service – Krueger Electrical", amount: 6804.77 },
      { no: "CO-004", desc: "Closeout CO – scope reduction & savings", amount: -47357.01 },
    ],
    notes: "Final invoice #1423 dated March 31, 2025. Closeout CO-004 reduced scope and returned unused budget.",
  },
  {
    id: "road", name: "Road Construction", jobNum: "C24-RC", gc: "Taconic Builders Inc.",
    subcontractor: "Luck Builders Inc.", startDate: "Jan 2024", endDate: "Mid 2024",
    scope: "Clearing, grubbing, road from Rte 30 to Lodge incl. loop. Utility trenching, waterline, erosion control.",
    originalContract: 457500, approvedCOs: 0, finalContract: 457500, totalPaid: 457500, status: "Complete",
    lineItems: [
      { code: "1", desc: "Clearing & Grubbing", budget: 55000, paid: 55000 },
      { code: "2", desc: "Strip & Clean Existing Pavement (0+00 to 21+00)", budget: 30000, paid: 30000 },
      { code: "3", desc: "Erosion Control & Tree Protection", budget: 47950, paid: 47950 },
      { code: "4", desc: "Road Construction (21+00 to House, incl. Loop)", budget: 420000, paid: 420000 },
      { code: "5", desc: "Utility Trenching & Backfill", budget: 97000, paid: 97000 },
    ],
    cos: [],
    notes: "Award letter Jan 8, 2024. Luck Builders selected from competitive bid. Final award $457,500.",
  },
];

// ─── VENDOR DATA ───────────────────────────────────────────────────────────────

const VENDORS = {
  ivan: {
    key: "ivan",
    name: "Ivan Zdrahal PE",
    fullName: "Ivan Zdrahal Professional Engineering, PLLC",
    role: "Civil Engineering & Construction Management",
    color: "#a78bfa",
    phases: [
      { phase: "Phase A", desc: "Master Plan Evaluation, Lodge Building design, Bidding & construction services", budget: 91884.43, invoiced: 91884.43, status: "Complete" },
      { phase: "Phase B", desc: "APA Permit Application (Great Hall), Environmental Assessment, APA response", budget: 150115, invoiced: 150115, status: "Complete" },
      { phase: "Phase C – Design", desc: "Design revisions: Car Barn, Main Residence, Hot Tub Pavilion, Woods Road", budget: 90005, invoiced: 90005, status: "Complete" },
      { phase: "Phase C – CM", desc: "Construction management services in Phase C to date", budget: 24426.25, invoiced: 24426.25, status: "Complete" },
      { phase: "Guest Cabin Design", desc: "Civil Engineering plans for Proposed Guest Cabin (Phase C)", budget: 16000, invoiced: 4835, status: "In Progress" },
      { phase: "CM Phase C (cont.)", desc: "Continuation of construction management in Phase C", budget: 15000, invoiced: 4750, status: "In Progress" },
      { phase: "CM Phase B (Rec/Pub)", desc: "Construction management for Recreational Complex & Pub Building", budget: 25000, invoiced: 0, status: "Not Started" },
      { phase: "Contingencies", desc: "Allowances for design/scope changes", budget: 25000, invoiced: 0, status: "Not Started" },
    ],
    invoices: [
      { invNum: "103443", date: "01/05/2026", desc: "CM Phase C – Technician + Subconsultant + Admin", amount: 2655, status: "Pending" },
      { invNum: "103449", date: "01/06/2026", desc: "Guest Cabin Design", amount: 1465, status: "Pending" },
      { invNum: "103454", date: "02/05/2026", desc: "Guest Cabin Design", amount: 3370, status: "Pending" },
      { invNum: "103453", date: "02/06/2026", desc: "Final Phase Construction Management", amount: 2095, status: "Pending" },
    ],
  },
  reed: {
    key: "reed",
    name: "Reed Hilderbrand",
    fullName: "Reed Hilderbrand",
    role: "Landscape Architecture",
    color: "#34d399",
    phases: [
      { phase: "Framework Plan", desc: "Forestmere Lakes Planning", budget: 150000, invoiced: 146906, status: "Complete" },
      { phase: "Initial Consulting / House Predesign", desc: "T&M", budget: null, invoiced: 11180, status: "Complete" },
      { phase: "APA Permitting", desc: "T&M", budget: null, invoiced: 692248, status: "Complete" },
      { phase: "Lodge – Schematic Design", desc: "Lodge House", budget: 45000, invoiced: 41199, status: "Complete" },
      { phase: "Lodge – Design Development", desc: "Lodge House", budget: 65000, invoiced: 64944, status: "Complete" },
      { phase: "Lodge – Construction Documents", desc: "Lodge House", budget: 110000, invoiced: 106813, status: "Complete" },
      { phase: "Lodge – Bidding/Const. Observation", desc: "Lodge House", budget: 105000, invoiced: 34243, status: "Complete" },
      { phase: "Phase 1 – Design Development", desc: "Main Res, Pavilion, Boat House, Car Barn", budget: 160000, invoiced: 158508, status: "Complete" },
      { phase: "Phase 1 – Construction Documents", desc: "Main Res, Pavilion, Boat House, Car Barn", budget: 280000, invoiced: 216844, status: "In Progress" },
      { phase: "Phase 1.1 – Reduced Scope Documentation", desc: "T&M – Reduced scope study & revisions", budget: 40000, invoiced: 40000, status: "Complete" },
      { phase: "Phase 1.1 – Bidding/Const. Observation", desc: "T&M – Ongoing through April 2027", budget: null, invoiced: 110453.75, status: "In Progress" },
      { phase: "Guest Cabin – Permitting", desc: "APA Jurisdictional Inquiry", budget: 15000, invoiced: 3212.5, status: "In Progress" },
      { phase: "Guest Cabin – Design & Documentation", desc: "Paving, planting, grading; coordination", budget: 70000, invoiced: 25297.5, status: "In Progress" },
      { phase: "Guest Cabin – Bidding/Const. Observation", desc: "T&M estimate", budget: 50000, invoiced: 0, status: "Not Started" },
      { phase: "Phase 1.2 – Construction Documents", desc: "Pub, Rec Hall, Caretaker Res, Maintenance Barn", budget: 60000, invoiced: 0, status: "Not Started" },
      { phase: "Reimbursable – Travel/Lodging/Meals", desc: "Site visits, owner meetings & construction obs.", budget: null, invoiced: 32973, status: "Ongoing" },
      { phase: "Reimbursable – Subconsultants", desc: "Trail advisory + site electrical network design", budget: null, invoiced: 19176, status: "Ongoing" },
    ],
    invoices: [
      { invNum: "RH-2025-11", date: "11/01/2025", desc: "Phase 1.1 CA – October 2025", amount: 18500, status: "Paid" },
      { invNum: "RH-2025-12", date: "12/01/2025", desc: "Phase 1.1 CA – November 2025 + Guest Cabin", amount: 22750, status: "Paid" },
      { invNum: "RH-2026-01", date: "01/15/2026", desc: "Phase 1.1 CA – December 2025", amount: 15200, status: "Pending" },
    ],
  },
  arch: {
    key: "arch",
    name: "Architecturefirm",
    fullName: "Architecturefirm",
    role: "Architecture",
    color: "#60a5fa",
    phases: [
      { phase: "S-1 Site Study / Framework Plan", desc: "06/2022–12/2024", budget: 0, invoiced: 276863, status: "Complete" },
      { phase: "S-2 APA / DEC Permit Drawings", desc: "02/2023–12/2024", budget: 0, invoiced: 73745, status: "Complete" },
      { phase: "L-1 Lodge – Design & Documentation", desc: "01/2023–11/2023 · $4.45M const.", budget: 467772, invoiced: 280128, status: "Complete" },
      { phase: "L-2 Lodge – Construction Administration", desc: "12/2023–02/2024", budget: 0, invoiced: 24730, status: "Complete" },
      { phase: "0-1 Pub V1 – Design & Documentation", desc: "03/2024–08/2024 · $1.76M const.", budget: 184995, invoiced: 155000, status: "Complete" },
      { phase: "0-2 Barns V1 (4x) – Design & Documentation", desc: "11/2023–08/2024 · $2.46M const.", budget: 257950, invoiced: 232000, status: "Complete" },
      { phase: "0-3 Staff Housing – Design & Documentation", desc: "11/2023–02/2024 · $1.25M const.", budget: 131245, invoiced: 38775, status: "Complete" },
      { phase: "1-1 Pub V2 – Design & Documentation", desc: "09/2024–03/2025 · $2.79M const.", budget: 220042, invoiced: 218545, status: "Complete" },
      { phase: "1-2 Recreation Hall – Design & Doc.", desc: "11/2023–08/2024 · $1.65M const.", budget: 173075, invoiced: 180000, status: "Complete" },
      { phase: "1-3 Caretaker Res. – Design & Doc.", desc: "11/2023–08/2024 · $1.0M const.", budget: 104996, invoiced: 50960, status: "Complete" },
      { phase: "1-4 Barns V2 (2x) – Design & Doc.", desc: "09/2024–03/2025 · $1.79M const.", budget: 93924, invoiced: 37560, status: "Complete" },
      { phase: "1-5 Boathouse – Design & Doc.", desc: "11/2023–08/2025 · $771k const.", budget: 81015, invoiced: 125130, status: "Complete" },
      { phase: "1-6 Main Res. & Pavilion – Design & Doc.", desc: "09/2024–04/2025 · $2.99M const.", budget: 313799, invoiced: 239303, status: "Complete" },
      { phase: "1-7 Great Hall – Design & Doc.", desc: "TBD · $5.76M const.", budget: 605183, invoiced: 0, status: "Not Started" },
      { phase: "1-8 Guest Cabin", desc: "10/2025–03/2026 · $1.0M const.", budget: 100000, invoiced: 1730, status: "In Progress" },
      { phase: "CA-1 Phase 1.1 Construction Admin.", desc: "22 months · ~$13k/month", budget: 288000, invoiced: 101800, status: "In Progress" },
      { phase: "FFE – Furniture, Furnishings & Equipment", desc: "Scope TBD", budget: 0, invoiced: 29215, status: "Ongoing" },
      { phase: "Reimbursable Expenses", desc: "Travel, lodging, meals, reproductions", budget: 0, invoiced: 2704.62, status: "Ongoing" },
    ],
    invoices: [
      { invNum: "AF-2025-09", date: "09/15/2025", desc: "CA Phase 1.1 – August 2025", amount: 14200, status: "Paid" },
      { invNum: "AF-2025-10", date: "10/15/2025", desc: "CA Phase 1.1 – September 2025 + FFE", amount: 18750, status: "Paid" },
      { invNum: "AF-2025-11", date: "11/15/2025", desc: "CA Phase 1.1 – October 2025", amount: 15600, status: "Paid" },
      { invNum: "AF-2025-12", date: "12/15/2025", desc: "CA Phase 1.1 – November 2025 + Guest Cabin", amount: 23365, status: "Pending" },
    ],
  },
};

// ─── COMPUTED TOTALS ───────────────────────────────────────────────────────────
const $f = (n) => n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pf = (n) => (n * 100).toFixed(1) + "%";
const totalBudget = BUDGET.reduce((s, b) => s + b.budget, 0);
const totalAwarded = AWARDS.reduce((s, a) => s + a.current, 0);
const taconicPaid = INVOICES.filter(i => i.status === "Paid").reduce((s, i) => s + i.approved, 0);
const taconicPending = INVOICES.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amtDue, 0);
const totalCOs = CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0);
const awardedByCode = {};
AWARDS.forEach(a => { awardedByCode[a.code] = (awardedByCode[a.code] || 0) + a.current; });
const izPaid = VENDORS.ivan.phases.reduce((s, p) => s + p.invoiced, 0);
const rhPaid = VENDORS.reed.phases.reduce((s, p) => s + p.invoiced, 0);
const afPaid = VENDORS.arch.phases.reduce((s, p) => s + p.invoiced, 0);
const priorPaid = PRIOR_PHASES.reduce((s, p) => s + p.totalPaid, 0);
const grandTotalPaid = izPaid + rhPaid + afPaid + priorPaid + taconicPaid;

// ─── PRIMITIVES ────────────────────────────────────────────────────────────────
const cx = (...a) => a.filter(Boolean).join(" ");

const Tag = ({ text, color = "muted" }) => {
  const map = {
    green:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber:  "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
    red:    "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
    blue:   "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
    muted:  "bg-zinc-100   text-zinc-500   dark:bg-zinc-800      dark:text-zinc-500",
  };
  return <span className={cx("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", map[color])}>{text}</span>;
};

const statusTag = (s) => {
  if (s === "Complete")   return <Tag text="Complete"    color="green" />;
  if (s === "In Progress")return <Tag text="In Progress" color="amber" />;
  if (s === "Ongoing")    return <Tag text="Ongoing"     color="blue"  />;
  if (s === "Pending")    return <Tag text="Pending"     color="amber" />;
  if (s === "Paid")       return <Tag text="Paid"        color="green" />;
  if (s === "Pending Payment") return <Tag text="Pending Payment" color="amber" />;
  if (s === "Approved")       return <Tag text="Approved ✓"      color="blue"  />;
  return <Tag text={s} />;
};

const BarFill = ({ value, max, color }) => {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max * 1.02;
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: over ? "#ef4444" : (color || "#d97706") }} />
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{children}</span>
    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
  </div>
);

// Clickable stat card
const Stat = ({ label, value, sub, accent, onClick }) => (
  <div onClick={onClick} className={cx(
    "rounded-xl p-4 border transition-all select-none",
    "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600",
    onClick && "cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm active:scale-[0.98]"
  )}>
    <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-widest font-medium">{label}</div>
    <div className={cx("text-xl font-bold tabular-nums", accent ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-white")}>{value}</div>
    {sub && <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</div>}
    {onClick && <div className="text-xs text-amber-500 mt-1 font-medium">View detail →</div>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={cx("bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl shadow-sm", className)}>{children}</div>
);

// Table helpers
const TH = ({ children, right, className = "" }) => (
  <th className={cx("px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 whitespace-nowrap", right ? "text-right" : "text-left", className)}>{children}</th>
);
const TD = ({ children, right, mono, muted, bold, colSpan, className = "" }) => (
  <td colSpan={colSpan} className={cx("px-3 py-2.5 text-xs", right && "text-right tabular-nums", mono && "font-mono", muted && "text-zinc-400 dark:text-zinc-500", bold && "font-semibold", className)}>{children}</td>
);
const TR = ({ children, onClick, subtle }) => (
  <tr onClick={onClick} className={cx("border-b border-zinc-50 dark:border-zinc-600/50 transition-colors", onClick && "cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10", subtle && "bg-zinc-50/50 dark:bg-zinc-800/40")}>{children}</tr>
);

// ─── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cx("bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-2xl flex flex-col shadow-2xl w-full", wide ? "max-w-4xl" : "max-w-2xl")}
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-600 shrink-0">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xl transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// Key-value grid inside modals
function KVGrid({ rows }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2.5">
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">{k}</div>
          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-words">{v ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ setTab }) {
  const [modal, setModal] = useState(null);
  const pendingInvs = INVOICES.filter(i => i.status !== "Paid");
  const catBudget = {};
  BUDGET.forEach(b => { catBudget[b.cat] = (catBudget[b.cat] || 0) + b.budget; });

  const spendRows = [
    { name: "Taconic Builders (GC Phase 1.1)", paid: taconicPaid, color: "#d97706" },
    { name: "Architecturefirm",                paid: afPaid,      color: "#60a5fa" },
    { name: "Reed Hilderbrand",                paid: rhPaid,      color: "#34d399" },
    { name: "Ivan Zdrahal PE",                 paid: izPaid,      color: "#a78bfa" },
    { name: "Demolition (C25-102)",            paid: 335189.43,   color: "#f87171" },
    { name: "Road Construction",               paid: 457500,      color: "#fb923c" },
  ];

  return (
    <div className="space-y-5">
      {/* Pending alert — clickable */}
      {pendingInvs.length > 0 && (
        <button onClick={() => setTab("invoices")} className="w-full text-left flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
          <span className="text-amber-500 mt-0.5">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Payment Action Required</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
              {pendingInvs.length} invoice{pendingInvs.length > 1 ? "s" : ""} pending: {pendingInvs.map(i => i.invNum).join(", ")} — total {$f(taconicPending)}
            </p>
          </div>
          <span className="text-amber-400 text-sm mt-0.5">→</span>
        </button>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Grand Total Paid" value={$f(grandTotalPaid)} sub="All vendors & phases" accent onClick={() => setModal("spend")} />
        <Stat label="GC Control Budget" value={$f(totalBudget)} sub="Taconic Phase 1.1" onClick={() => setTab("budget")} />
        <Stat label="GC Awarded" value={$f(totalAwarded)} sub={pf(totalAwarded / totalBudget) + " of budget"} onClick={() => setTab("awards")} />
        <Stat label="GC Paid to Date" value={$f(taconicPaid)} sub={pf(taconicPaid / totalAwarded) + " of awarded"} onClick={() => setTab("invoices")} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Approved COs" value={$f(totalCOs)} sub={CHANGE_ORDERS.length + " change orders"} onClick={() => setTab("cos")} />
        <Stat label="Retainage Held" value="$217,342" sub="Released at substantial completion" onClick={() => setModal("retainage")} />
        <Stat label="GC Pending" value={$f(taconicPending)} accent sub={pendingInvs.length + " invoices outstanding"} onClick={() => setTab("invoices")} />
        <Stat label="GC Balance to Finish" value="$10.14M" sub="Remaining on GC contract" onClick={() => setTab("lineitem")} />
      </div>

      {/* Spend by vendor + category charts */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionTitle>Total Spend by Vendor / Phase</SectionTitle>
          <div className="space-y-3">
            {spendRows.map(v => (
              <button key={v.name} onClick={() => setModal({ type: "spendDetail", row: v })} className="w-full flex items-center gap-3 text-xs text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg px-1 py-1 transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                <span className="text-zinc-600 dark:text-zinc-400 w-44 shrink-0 truncate">{v.name}</span>
                <div className="flex-1"><BarFill value={v.paid} max={grandTotalPaid} color={v.color} /></div>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold tabular-nums w-24 text-right">{$f(v.paid)}</span>
              </button>
            ))}
            <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-600 pt-2 mt-1">
              <span className="text-xs font-semibold text-zinc-500">Grand Total</span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{$f(grandTotalPaid)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Phase 1.1 Budget vs. Awarded by Category</SectionTitle>
          <div className="space-y-2">
            {Object.entries(catBudget).sort((a, b) => b[1] - a[1]).map(([cat, bud]) => {
              const awd = AWARDS.filter(a => BUDGET.find(b => b.code === a.code)?.cat === cat).reduce((s, a) => s + a.current, 0);
              return (
                <button key={cat} onClick={() => setModal({ type: "catDetail", cat })} className="w-full flex items-center gap-3 text-xs text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg px-1 py-1 transition-colors">
                  <span className="text-zinc-500 dark:text-zinc-600 w-20 shrink-0">{cat}</span>
                  <div className="flex-1"><BarFill value={awd} max={bud} /></div>
                  <span className="text-zinc-500 dark:text-zinc-500 tabular-nums w-20 text-right">{$f(bud)}</span>
                  <span className="text-zinc-400 dark:text-zinc-600 w-12 text-right">{awd > 0 ? pf(awd / bud) : "—"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Project info */}
      <Card className="p-5">
        <SectionTitle>Project Details</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["Project",          "Camp Forestmere"],
            ["Owner",            "JXM / Camp Forestmere Corp."],
            ["Location",         "Paul Smiths, NY 12970"],
            ["General Contractor","Taconic Builders Inc."],
            ["GC Contract Start","Jun 23, 2025"],
            ["GC Duration",      "22 months"],
            ["Est. GC Completion","April 2027"],
            ["PM",               "Joseph Hamilton"],
            ["Architect",        "Architecturefirm"],
            ["Landscape Arch.",  "Reed Hilderbrand"],
            ["Civil Engineer",   "Ivan Zdrahal PE"],
          ].map(([k, v]) => (
            <div key={k} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5">
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">{k}</div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      {modal === "spend" && (
        <Modal title="Grand Total Spend Breakdown" subtitle="All vendors and prior phases" onClose={() => setModal(null)}>
          <table className="w-full text-xs">
            <thead><tr><TH>Vendor / Phase</TH><TH right>Paid to Date</TH><TH right>% of Total</TH></tr></thead>
            <tbody>
              {spendRows.map(v => (
                <TR key={v.name}><TD bold className="text-zinc-800 dark:text-zinc-200">{v.name}</TD><TD right bold>{$f(v.paid)}</TD><TD right muted>{pf(v.paid / grandTotalPaid)}</TD></TR>
              ))}
            </tbody>
            <tfoot><TR subtle><TD bold colSpan={1} className="text-zinc-700 dark:text-zinc-300">Total</TD><TD right bold className="text-zinc-900 dark:text-white">{$f(grandTotalPaid)}</TD><TD right muted>100%</TD></TR></tfoot>
          </table>
        </Modal>
      )}

      {modal === "retainage" && (
        <Modal title="Retainage Held" subtitle="Per Taconic Invoice #1956 (Dec 31, 2025)" onClose={() => setModal(null)}>
          <KVGrid rows={[["Total Retainage Held", "$217,342.38"], ["Retainage Rate", "~7% of completed work"], ["Completed Work Retainage", "$217,342.38"], ["Stored Material Retainage", "$0.00"], ["Release Trigger", "Substantial Completion"], ["Estimated Release", "April 2027"]]} />
        </Modal>
      )}

      {modal?.type === "catDetail" && (
        <Modal title={`${modal.cat} — Budget Detail`} subtitle="Awards within this category" onClose={() => setModal(null)} wide>
          <table className="w-full text-xs">
            <thead><tr><TH>Code</TH><TH>Division</TH><TH right>Budget</TH><TH right>Awarded</TH><TH right>Variance</TH></tr></thead>
            <tbody>
              {BUDGET.filter(b => b.cat === modal.cat).map(b => {
                const awd = awardedByCode[b.code] || 0;
                return (
                  <TR key={b.code}>
                    <TD mono muted>{b.code}</TD>
                    <TD className="text-zinc-700 dark:text-zinc-300">{b.name}</TD>
                    <TD right muted>{$f(b.budget)}</TD>
                    <TD right bold className={awd ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"}>{awd ? $f(awd) : "—"}</TD>
                    <TD right className={awd ? (b.budget - awd < 0 ? "text-red-500 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400") : "text-zinc-300 dark:text-zinc-700"}>{awd ? $f(b.budget - awd) : "—"}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}

      {modal?.type === "spendDetail" && (
        <Modal title={modal.row.name} subtitle="Spend detail" onClose={() => setModal(null)}>
          <KVGrid rows={[["Vendor / Phase", modal.row.name], ["Total Paid", $f(modal.row.paid)], ["% of Grand Total", pf(modal.row.paid / grandTotalPaid)]]} />
        </Modal>
      )}
    </div>
  );
}

// ─── CONTROL BUDGET ────────────────────────────────────────────────────────────
function BudgetView() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const cats = ["All", ...Array.from(new Set(BUDGET.map(b => b.cat)))];
  const rows = BUDGET.filter(b => (cat === "All" || b.cat === cat) && (b.name.toLowerCase().includes(q.toLowerCase()) || b.code.includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-300 placeholder-zinc-400 outline-none focus:border-amber-400 w-44 shadow-sm" />
        <div className="flex flex-wrap gap-1">
          {cats.map(c => <button key={c} onClick={() => setCat(c)} className={cx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", cat === c ? "bg-amber-600 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}>{c}</button>)}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>Code</TH><TH>Division</TH><TH right>Budget</TH><TH right>Awarded</TH><TH right>Variance</TH><TH className="w-32">% Awarded</TH><TH>Status</TH></tr></thead>
          <tbody>
            {rows.map(b => {
              const awd = awardedByCode[b.code] || 0;
              const vari = b.budget - awd;
              const ap = b.budget > 0 ? awd / b.budget : 0;
              return (
                <TR key={b.code} onClick={() => setModal(b)}>
                  <TD mono muted>{b.code}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200">{b.name}</TD>
                  <TD right muted>{$f(b.budget)}</TD>
                  <TD right bold className={awd > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"}>{awd > 0 ? $f(awd) : "—"}</TD>
                  <TD right className={awd > 0 ? (vari < 0 ? "text-red-500 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-medium") : "text-zinc-300 dark:text-zinc-700"}>{awd > 0 ? $f(vari) : "—"}</TD>
                  <TD>{awd > 0 && <div className="flex items-center gap-2"><BarFill value={awd} max={b.budget} /><span className="text-zinc-400 text-xs w-10">{pf(ap)}</span></div>}</TD>
                  <TD>{awd === 0 ? <Tag text="Not Awarded" /> : ap > 1.05 ? <Tag text="Over Budget" color="red" /> : <Tag text="Awarded" color="green" />}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD bold colSpan={2} className="text-zinc-600 dark:text-zinc-400">Total — {rows.length} items</TD>
              <TD right bold muted>{$f(rows.reduce((s, b) => s + b.budget, 0))}</TD>
              <TD right bold className="text-zinc-900 dark:text-white">{$f(rows.reduce((s, b) => s + (awardedByCode[b.code] || 0), 0))}</TD>
              <TD colSpan={3} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal && (
        <Modal title={`${modal.code} — ${modal.name}`} subtitle={`Category: ${modal.cat}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CSI Code", modal.code], ["Category", modal.cat],
            ["Control Budget", $f(modal.budget)], ["Awarded", $f(awardedByCode[modal.code] || 0)],
            ["Variance", $f(modal.budget - (awardedByCode[modal.code] || 0))],
            ["% Awarded", awardedByCode[modal.code] ? pf(awardedByCode[modal.code] / modal.budget) : "—"],
          ]} />
          {AWARDS.filter(a => a.code === modal.code).length > 0 && (
            <>
              <SectionTitle>Awards for this line</SectionTitle>
              <table className="w-full text-xs">
                <thead><tr><TH>ID</TH><TH>Vendor</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH></tr></thead>
                <tbody>
                  {AWARDS.filter(a => a.code === modal.code).map(a => (
                    <TR key={a.id}>
                      <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                      <TD className="text-zinc-700 dark:text-zinc-300">{a.vendor}</TD>
                      <TD right muted>{$f(a.award)}</TD>
                      <TD right className={a.cos > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-300 dark:text-zinc-700"}>{a.cos > 0 ? `+${$f(a.cos)}` : "—"}</TD>
                      <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current)}</TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── AWARDS ────────────────────────────────────────────────────────────────────
function AwardsView() {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const rows = AWARDS.filter(a =>
    a.vendor.toLowerCase().includes(q.toLowerCase()) ||
    a.id.toLowerCase().includes(q.toLowerCase()) ||
    a.code.includes(q)
  );
  const vendorTotals = AWARDS.reduce((acc, a) => { acc[a.vendor] = (acc[a.vendor] || 0) + a.current; return acc; }, {});

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionTitle>Totals by Subcontractor</SectionTitle>
        <div className="grid md:grid-cols-2 gap-2">
          {Object.entries(vendorTotals).sort((a, b) => b[1] - a[1]).map(([v, t]) => (
            <button key={v} onClick={() => setModal({ type: "vendor", vendor: v })} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg px-3 py-2.5 transition-colors text-left">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{v}</span>
              <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-white ml-3 shrink-0">{$f(t)}</span>
            </button>
          ))}
        </div>
      </Card>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search vendor, ID, or code…" className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-300 placeholder-zinc-400 outline-none focus:border-amber-400 w-60 shadow-sm" />
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>ID</TH><TH>Date</TH><TH>Vendor</TH><TH>Division</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH><TH right>Budget</TH><TH right>Variance</TH></tr></thead>
          <tbody>
            {rows.map(a => {
              const bAmt = BUDGET.find(b => b.code === a.code)?.budget;
              const vari = bAmt != null ? bAmt - a.current : null;
              return (
                <TR key={a.id} onClick={() => setModal({ type: "award", award: a })}>
                  <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                  <TD muted>{a.date}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200 max-w-[160px] truncate">{a.vendor}</TD>
                  <TD muted className="max-w-[120px] truncate">{a.division}</TD>
                  <TD right muted>{$f(a.award)}</TD>
                  <TD right className={a.cos > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300 dark:text-zinc-700"}>{a.cos > 0 ? `+${$f(a.cos)}` : "—"}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current)}</TD>
                  <TD right muted>{bAmt ? $f(bAmt) : "—"}</TD>
                  <TD right className={vari != null ? (vari < 0 ? "text-red-500 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-medium") : "text-zinc-300 dark:text-zinc-700"}>{vari != null ? $f(vari) : "—"}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={4} bold muted>Total ({rows.length})</TD>
              <TD right muted bold>{$f(rows.reduce((s, a) => s + a.award, 0))}</TD>
              <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(rows.reduce((s, a) => s + a.cos, 0))}</TD>
              <TD right bold className="text-zinc-900 dark:text-white">{$f(rows.reduce((s, a) => s + a.current, 0))}</TD>
              <TD colSpan={2} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal?.type === "award" && (
        <Modal title={`${modal.award.id} — ${modal.award.vendor}`} subtitle={modal.award.division} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Award ID", modal.award.id], ["Date", modal.award.date],
            ["Vendor", modal.award.vendor], ["Division", modal.award.division],
            ["CSI Code", modal.award.code], ["Description", modal.award.desc],
            ["Original Award", $f(modal.award.award)], ["Change Orders", modal.award.cos > 0 ? `+${$f(modal.award.cos)}` : "—"],
            ["Current Contract", $f(modal.award.current)],
            ["Budget Line", $f(BUDGET.find(b => b.code === modal.award.code)?.budget)],
            ["Variance", $f((BUDGET.find(b => b.code === modal.award.code)?.budget || 0) - modal.award.current)],
          ]} />
        </Modal>
      )}
      {modal?.type === "vendor" && (
        <Modal title={modal.vendor} subtitle={`${AWARDS.filter(a => a.vendor === modal.vendor).length} awards`} onClose={() => setModal(null)} wide>
          <table className="w-full text-xs">
            <thead><tr><TH>ID</TH><TH>Division</TH><TH>Description</TH><TH right>Award</TH><TH right>Current</TH></tr></thead>
            <tbody>
              {AWARDS.filter(a => a.vendor === modal.vendor).map(a => (
                <TR key={a.id}>
                  <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{a.division}</TD>
                  <TD muted className="max-w-xs">{a.desc}</TD>
                  <TD right muted>{$f(a.award)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── CHANGE ORDERS ─────────────────────────────────────────────────────────────
function COsView() {
  const [modal, setModal] = useState(null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total COs" value={String(CHANGE_ORDERS.length)} sub="All approved" onClick={() => setModal("list")} />
        <Stat label="Net CO Amount" value={$f(CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0))} sub="Before fees" accent onClick={() => setModal("list")} />
        <Stat label="Total incl. Fees" value={$f(CHANGE_ORDERS.reduce((s, c) => s + c.total, 0))} sub="13.5% fee + 3% ins." onClick={() => setModal("list")} />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>CO #</TH><TH>Date</TH><TH>Division</TH><TH right>Orig. Budget</TH><TH right>CO Amount</TH><TH right>Fees</TH><TH right>Total w/ Fees</TH><TH right>Revised Budget</TH><TH>Notes</TH></tr></thead>
          <tbody>
            {CHANGE_ORDERS.map(co => (
              <TR key={co.no} onClick={() => setModal(co)}>
                <TD mono className="text-amber-600 dark:text-amber-400 font-bold">{co.no}</TD>
                <TD muted>{co.date}</TD>
                <TD bold className="text-zinc-800 dark:text-zinc-200">{co.div}</TD>
                <TD right muted>{$f(co.origBudget)}</TD>
                <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(co.approvedCO)}</TD>
                <TD right muted>{$f(co.fees)}</TD>
                <TD right bold className="text-zinc-800 dark:text-zinc-200">+{$f(co.total)}</TD>
                <TD right className="text-zinc-700 dark:text-zinc-300">{$f(co.revisedBudget)}</TD>
                <TD muted className="italic max-w-xs">{co.notes || "—"}</TD>
              </TR>
            ))}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={4} bold muted>Totals</TD>
              <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0))}</TD>
              <TD right muted bold>{$f(CHANGE_ORDERS.reduce((s, c) => s + c.fees, 0))}</TD>
              <TD right bold className="text-zinc-900 dark:text-white">+{$f(CHANGE_ORDERS.reduce((s, c) => s + c.total, 0))}</TD>
              <TD colSpan={2} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal && typeof modal === "object" && modal.no && (
        <Modal title={`${modal.no} — ${modal.div}`} subtitle={`Approved ${modal.date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CO Number", modal.no], ["Date", modal.date], ["Division", modal.div],
            ["Original Budget", $f(modal.origBudget)], ["CO Amount", `+${$f(modal.approvedCO)}`],
            ["GC Fee (13.5%)", $f(modal.approvedCO * 0.135)], ["Insurance (3%)", $f(modal.approvedCO * 0.03)],
            ["Total incl. Fees", `+${$f(modal.total)}`], ["Revised Budget", $f(modal.revisedBudget)],
            ["Notes", modal.notes || "—"],
          ]} />
        </Modal>
      )}
    </div>
  );
}

// ─── INVOICES ──────────────────────────────────────────────────────────────────
// ─── INVOICE DETAIL MODAL ──────────────────────────────────────────────────────
function InvoiceDetailModal({ inv, uploads, onClose, onSave }) {
  const [pdfView, setPdfView]   = useState(null);
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({
    status:   inv.status,
    paidDate: inv.paidDate || "",
    notes:    inv.notes    || "",
    reqDate:  inv.reqDate  || "",
    jobTotal: inv.jobTotal,
    fees:     inv.fees,
    depositApplied: inv.depositApplied,
    retainage: inv.retainage,
    amtDue:   inv.amtDue,
    approved: inv.approved,
  });
  const fileRef = useRef();
  const [newPdf, setNewPdf]   = useState(null); // pending replacement PDF

  const linkedDocs = uploads.filter(u =>
    u.linkedId === inv.id ||
    u.linkedId === inv.invNum ||
    u.autoPayId === inv.id
  );

  const inp = "w-full bg-white dark:bg-zinc-600 border border-zinc-200 dark:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-amber-400";

  const handleSave = () => {
    onSave(inv.id, editForm, newPdf);
    setEditing(false);
    setNewPdf(null);
  };

  return (
    <Modal
      title={`${inv.invNum} — ${inv.desc}`}
      subtitle={`${inv.id} · Requested ${inv.reqDate}`}
      onClose={() => { onClose(); setPdfView(null); }}
      wide
    >
      {/* Header action buttons */}
      <div className="flex justify-end gap-2 -mt-1 mb-1">
        {editing
          ? <>
              <button onClick={() => { setEditing(false); setNewPdf(null); }} className="text-xs border border-zinc-200 dark:border-zinc-600 text-zinc-500 rounded-lg px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button onClick={handleSave} className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg px-4 py-1.5 transition-colors shadow-sm">Save Changes</button>
            </>
          : <button onClick={() => setEditing(true)} className="text-xs border border-zinc-200 dark:border-zinc-600 text-zinc-500 rounded-lg px-3 py-1.5 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center gap-1.5">✎ Edit</button>
        }
      </div>

      {/* View mode */}
      {!editing && (
        <>
          <KVGrid rows={[
            ["Invoice Number", inv.invNum], ["Request Date", inv.reqDate],
            ["Paid Date", inv.paidDate || "—"], ["Status", inv.status],
            ["Job Total", $f(inv.jobTotal)], ["GC Fees", $f(inv.fees)],
            ["Deposit Applied", $f(inv.depositApplied)], ["Retainage Held", $f(Math.abs(inv.retainage))],
            ["Amount Due", $f(inv.amtDue)], ["Approved Amount", $f(inv.approved)],
          ]} />
          {inv.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">{inv.notes}</p>
            </div>
          )}
        </>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                {["Pending Payment", "Paid", "In Progress", "On Hold"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Paid Date</label>
              <input type="date" value={editForm.paidDate} onChange={e => setEditForm(f => ({ ...f, paidDate: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Request Date</label>
              <input type="date" value={editForm.reqDate} onChange={e => setEditForm(f => ({ ...f, reqDate: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Job Total ($)</label>
              <input type="number" value={editForm.jobTotal} onChange={e => setEditForm(f => ({ ...f, jobTotal: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">GC Fees ($)</label>
              <input type="number" value={editForm.fees} onChange={e => setEditForm(f => ({ ...f, fees: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Deposit Applied ($)</label>
              <input type="number" value={editForm.depositApplied} onChange={e => setEditForm(f => ({ ...f, depositApplied: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Retainage ($)</label>
              <input type="number" value={editForm.retainage} onChange={e => setEditForm(f => ({ ...f, retainage: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Amount Due ($)</label>
              <input type="number" value={editForm.amtDue} onChange={e => setEditForm(f => ({ ...f, amtDue: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Approved Amount ($)</label>
              <input type="number" value={editForm.approved} onChange={e => setEditForm(f => ({ ...f, approved: parseFloat(e.target.value) || 0 }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Notes</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Add a note…" className={inp + " resize-none"} />
          </div>
          {/* Replace PDF */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Replace Attached PDF</label>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => setNewPdf(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-600 rounded-lg px-4 py-3 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-600 transition-colors text-left">
              {newPdf ? `📄 ${newPdf.name} — ready to save` : "Click to select a replacement PDF (optional)"}
            </button>
          </div>
        </div>
      )}

      {/* Attached Documents — always shown */}
      <div>
        <SectionTitle>Attached Documents</SectionTitle>
        {linkedDocs.length === 0
          ? <p className="text-xs text-zinc-400 italic">No documents attached. Go to Document Upload, select Taconic Builders, and link to <span className="font-mono">{inv.id}</span>.</p>
          : linkedDocs.map(doc => (
            <div key={doc.id} className="mb-2">
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span>📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-400">{doc.size} · Uploaded {doc.date}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setPdfView(pdfView?.id === doc.id ? null : doc)}
                    className={cx("text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors", pdfView?.id === doc.id ? "bg-amber-600 text-white border-amber-600" : "border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600")}
                  >
                    {pdfView?.id === doc.id ? "Hide PDF" : "View PDF"}
                  </button>
                  <a href={doc.dataUrl} download={doc.name} className="text-xs font-semibold border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 rounded-lg px-3 py-1.5 transition-colors inline-flex items-center">↓ Download</a>
                </div>
              </div>
              {pdfView?.id === doc.id && (
                <div className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-600 overflow-hidden">
                  <iframe src={doc.dataUrl} className="w-full" style={{ height: "60vh" }} title={doc.name} />
                </div>
              )}
            </div>
          ))
        }
      </div>
    </Modal>
  );
}

function InvoicesView({ uploads = [], syncedPayments = [], invoiceOverrides = {}, setInvoiceOverrides }) {
  const [modal, setModal] = useState(null);

  // onSave handler — merges edits into invoiceOverrides keyed by inv.id
  const handleInvoiceSave = (invId, editForm, newPdf) => {
    setInvoiceOverrides(prev => ({ ...prev, [invId]: { ...prev[invId], ...editForm } }));
    // If a replacement PDF was provided, add it to uploads linked to this invoice
    // (handled via the Document Upload tab — just close the modal for now)
  };

  // Merge: base INVOICES → user overrides → live tracker sync
  const existingRefs = new Set(INVOICES.map(inv => inv.invNum.replace("#", "")));

  const mergedInvoices = INVOICES.map(inv => {
    const override = invoiceOverrides[inv.id] || {};
    const merged = { ...inv, ...override };
    const invNumClean = merged.invNum.replace("#", "");
    const match = syncedPayments.find(p =>
      p.entity === "Camp Forestmere" &&
      p.description?.toLowerCase().includes("taconic") &&
      (p.ref === invNumClean || p.ref === merged.invNum)
    );
    const trackerApproved = match && (match.status === "Done" || match.status === "PaymentApproved");
    if (trackerApproved && merged.status !== "Paid") {
      return { ...merged, status: "Paid", paidDate: match.paidDate || new Date().toLocaleDateString("en-US"), _synced: true, _syncDate: match.updatedAt || new Date().toISOString() };
    }
    if (match && !trackerApproved) {
      return { ...merged, _synced: true, _syncDate: match.updatedAt || new Date().toISOString() };
    }
    return merged;
  });

  // Auto-add NEW Camp Forestmere Taconic invoices from Tracker that don't exist in INVOICES yet
  if (syncedPayments && syncedPayments.length > 0) {
    const unmatchedCF = syncedPayments.filter(p =>
      p.entity === "Camp Forestmere" &&
      p.description?.toLowerCase().includes("taconic") &&
      p.ref &&
      !existingRefs.has(p.ref) &&
      !existingRefs.has("#" + p.ref)
    );
    unmatchedCF.forEach(p => {
      const isPaid = p.status === "Done" || p.status === "PaymentApproved";
      mergedInvoices.push({
        id: p.id || "PAY-SYNC-" + p.ref,
        reqDate: p.dateReceived || new Date().toLocaleDateString("en-US"),
        invNum: "#" + p.ref,
        desc: p.noticeType || "From JXM Tracker",
        jobTotal: p.amount || 0,
        fees: 0,
        depositApplied: 0,
        retainage: 0,
        amtDue: p.amount || 0,
        approved: p.amount || 0,
        paidDate: isPaid ? (p.paidDate || new Date().toLocaleDateString("en-US")) : null,
        status: isPaid ? "Paid" : "Pending Payment",
        notes: "Auto-synced from JXM Payment Tracker",
        _synced: true,
        _syncDate: p.updatedAt || new Date().toISOString(),
        _autoCreated: true,
      });
    });
  }

  const pendingTotal = mergedInvoices.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amtDue, 0);
  const paidCount = mergedInvoices.filter(i => i.status === "Paid").length;
  const syncedCount = mergedInvoices.filter(i => i._synced).length;

  return (
    <div className="space-y-4">
      {/* Sync status banner */}
      {syncedPayments.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Live sync active — JXM Payment Tracker
          </span>
          {syncedCount > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-500 ml-auto">{syncedCount} invoice{syncedCount !== 1 ? "s" : ""} updated from tracker</span>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Gross Invoiced" value={$f(mergedInvoices.reduce((s, i) => s + i.jobTotal, 0))} sub="Before retainage & deposits" onClick={() => setModal("all")} />
        <Stat label="Total Paid" value={$f(mergedInvoices.filter(i => i.status === "Paid").reduce((s,i) => s + i.approved, 0))} sub={paidCount + " invoices paid"} onClick={() => setModal("paid")} />
        <Stat label="Retainage Held" value="$217,342" sub="Released at close" onClick={() => setModal("retainage")} />
        <Stat label="Pending" value={$f(pendingTotal)} accent sub={mergedInvoices.filter(i => i.status !== "Paid").length + " invoices outstanding"} onClick={() => setModal("pending")} />
      </div>
      <div className="space-y-2">
        {mergedInvoices.map(invRow => (
          <button key={invRow.id} className="w-full text-left bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl shadow-sm overflow-hidden hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer active:scale-[0.99]" onClick={() => setModal(invRow)}>
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 w-20 shrink-0">{invRow.id}</span>
                <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 w-28 shrink-0">{invRow.invNum}</span>
                <span className="text-xs text-zinc-400 truncate">{invRow.desc}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{$f(invRow.approved)}</span>
                <div className="flex flex-col items-center gap-0.5">
                  {statusTag(invRow.status)}
                  {invRow._synced && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline" title={invRow._syncDate ? "Synced: " + new Date(invRow._syncDate).toLocaleString("en-US") : "Synced"} onClick={(e) => { e.stopPropagation(); alert("Synced on: " + (invRow._syncDate ? new Date(invRow._syncDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Unknown")); }}>⇄ synced</span>}
                </div>
                {invRow.notes && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 rounded-full px-2 py-0.5">⚑ Note</span>}
                <span className="text-zinc-300 dark:text-zinc-700">›</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {modal && typeof modal === "object" && modal.id && (
        <InvoiceDetailModal inv={modal} uploads={uploads} onClose={() => setModal(null)} onSave={handleInvoiceSave} />
      )}
      {modal === "retainage" && (
        <Modal title="Retainage Held" subtitle="Per Invoice #1956" onClose={() => setModal(null)}>
          <KVGrid rows={[["Total Retainage", "$217,342.38"], ["Completed Work", "$217,342.38"], ["Stored Materials", "$0.00"], ["Release Trigger", "Substantial Completion"], ["Estimated Release", "April 2027"]]} />
        </Modal>
      )}
      {(modal === "all" || modal === "paid" || modal === "pending") && (
        <Modal title={modal === "all" ? "All Invoices" : modal === "paid" ? "Paid Invoices" : "Pending Invoices"} onClose={() => setModal(null)} wide>
          <table className="w-full text-xs">
            <thead><tr><TH>Invoice</TH><TH>Description</TH><TH right>Job Total</TH><TH right>Approved</TH><TH>Status</TH></tr></thead>
            <tbody>
              {INVOICES.filter(i => modal === "all" || (modal === "paid" ? i.status === "Paid" : i.status !== "Paid")).map(i => (
                <TR key={i.id}>
                  <TD mono className="text-amber-600 dark:text-amber-400">{i.invNum}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{i.desc}</TD>
                  <TD right muted>{$f(i.jobTotal)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(i.approved)}</TD>
                  <TD>{statusTag(i.status)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── LINE ITEM BILLING ─────────────────────────────────────────────────────────
function LineItemView() {
  const [sel, setSel] = useState("All");
  const [modal, setModal] = useState(null);
  const rows = LINE_ITEMS.filter(li => sel === "All" || (li.inv[sel] != null && li.inv[sel] > 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400 font-medium">Filter by invoice:</span>
        {["All", ...INV_NUMS].map(n => (
          <button key={n} onClick={() => setSel(n)} className={cx("px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all", sel === n ? "bg-amber-600 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}>{n}</button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <TH>Code</TH><TH>Description</TH>
            <TH right>Control Budget</TH><TH right>Approved COs</TH>
            <TH right>Revised Budget</TH><TH right>Completed</TH>
            <TH className="w-36">Progress</TH>
            {sel !== "All" && <TH right>{sel}</TH>}
          </tr></thead>
          <tbody>
            {rows.map(li => {
              const rev = li.budget + li.cos;
              return (
                <TR key={li.code} onClick={() => setModal(li)}>
                  <TD mono muted>{li.code}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200">{li.name}</TD>
                  <TD right muted>{$f(li.budget)}</TD>
                  <TD right className={li.cos > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300 dark:text-zinc-700"}>{li.cos > 0 ? `+${$f(li.cos)}` : "—"}</TD>
                  <TD right muted>{$f(rev)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(li.done)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <BarFill value={li.done} max={rev} />
                      <span className="text-zinc-400 text-xs w-10 shrink-0">{pf(li.pct)}</span>
                    </div>
                  </TD>
                  {sel !== "All" && <TD right className="text-amber-600 dark:text-amber-400 font-bold">{li.inv[sel] ? $f(li.inv[sel]) : "—"}</TD>}
                </TR>
              );
            })}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={`${modal.code} — ${modal.name}`} subtitle="Line item billing detail" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Control Budget", $f(modal.budget)], ["Approved COs", modal.cos > 0 ? `+${$f(modal.cos)}` : "—"],
            ["Revised Budget", $f(modal.budget + modal.cos)], ["Completed to Date", $f(modal.done)],
            ["% Complete", pf(modal.pct)], ["Balance to Finish", $f((modal.budget + modal.cos) - modal.done)],
          ]} />
          <SectionTitle>Breakdown by Invoice</SectionTitle>
          <table className="w-full text-xs">
            <thead><tr><TH>Invoice</TH><TH right>Amount Billed</TH></tr></thead>
            <tbody>
              {INV_NUMS.map(n => modal.inv[n] ? (
                <TR key={n}>
                  <TD mono muted>{n}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(modal.inv[n])}</TD>
                </TR>
              ) : null)}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── CASH FLOW ─────────────────────────────────────────────────────────────────
function CashFlowView() {
  const [modal, setModal] = useState(null);
  const bars = [
    { m: "Jan", v: 461105 }, { m: "Feb", v: 164106 }, { m: "Mar", v: 164106 },
    { m: "Apr", v: 200000 }, { m: "May", v: 210000 }, { m: "Jun", v: 220000 },
    { m: "Jul", v: 280000 }, { m: "Aug", v: 280000 }, { m: "Sep", v: 280000 },
    { m: "Oct", v: 200000 }, { m: "Nov", v: 175000 }, { m: "Dec", v: 150000 },
  ];
  const maxV = Math.max(...bars.map(b => b.v));
  const carryoverItems = [
    ["01-001", "Project Staffing (22 months)", 296747, 656427, 953174],
    ["31-640", "Sheet Pile / Caissons",        416472,      0, 416472],
    ["31-200", "Excavations & Backfilling",    377267,      0, 377267],
    ["33-370", "Electrical Service",           314905,  78850, 393754],
    ["03-330", "Cast In Place Concrete",       264650,      0, 264650],
    ["06-200", "Ext. Finish Carpentry - Labor",169071, 253607, 422678],
    ["32-010", "Paving (Hardscape)",            89311, 357245, 446556],
    ["09-300", "Tile & Stone",                 245457, 163638, 409095],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="2025 Carryover" value="$4,541,872" sub="Unfinished 2025 work" accent onClick={() => setModal("carryover")} />
        <Stat label="2026 New Projected" value="$3,902,018" sub="Newly scheduled work" onClick={() => setModal("monthly")} />
        <Stat label="Total 2026 Spend" value="$8,443,889" sub="Carryover + new" onClick={() => setModal("monthly")} />
      </div>

      <Card className="p-5">
        <SectionTitle>2026 Monthly Projection </SectionTitle>
        <div className="flex items-end gap-1.5 h-36">
          {bars.map(d => {
            const h = Math.round((d.v / maxV) * 100);
            return (
              <button key={d.m} onClick={() => setModal({ type: "month", ...d })} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-zinc-400 dark:text-zinc-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-none" style={{ fontSize: "8px" }}>
                  {$f(d.v).replace("$", "").replace(",000", "k")}
                </span>
                <div className="w-full rounded-sm bg-zinc-200 dark:bg-zinc-700 group-hover:bg-amber-400 dark:group-hover:bg-amber-600 transition-colors" style={{ height: `${h}%` }} />
                <span className="text-zinc-400 dark:text-zinc-600 leading-none" style={{ fontSize: "9px" }}>{d.m}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-600">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Top 2025 Carryover Items</span>
        </div>
        <table className="w-full">
          <thead><tr><TH>Code</TH><TH>Description</TH><TH right>2025 Carryover</TH><TH right>2026 New</TH><TH right>Grand Total</TH></tr></thead>
          <tbody>
            {carryoverItems.map(r => (
              <TR key={r[0]} onClick={() => setModal({ type: "carryoverItem", code: r[0], desc: r[1], carryover: r[2], new2026: r[3], total: r[4] })}>
                <TD mono muted>{r[0]}</TD>
                <TD bold className="text-zinc-800 dark:text-zinc-200">{r[1]}</TD>
                <TD right className="text-amber-600 dark:text-amber-400 font-bold">{$f(r[2])}</TD>
                <TD right muted>{r[3] > 0 ? $f(r[3]) : "—"}</TD>
                <TD right bold className="text-zinc-900 dark:text-white">{$f(r[4])}</TD>
              </TR>
            ))}
          </tbody>
        </table>
      </Card>

      {modal?.type === "month" && (
        <Modal title={`${modal.m} 2026 — Projected Spend`} subtitle="" onClose={() => setModal(null)}>
          <KVGrid rows={[["Month", `${modal.m} 2026`], ["Projected Amount", $f(modal.v)], ["% of Annual Total", pf(modal.v / bars.reduce((s, b) => s + b.v, 0))]]} />
        </Modal>
      )}
      {modal?.type === "carryoverItem" && (
        <Modal title={`${modal.code} — ${modal.desc}`} subtitle="Cash flow carryover detail" onClose={() => setModal(null)}>
          <KVGrid rows={[["Code", modal.code], ["2025 Carryover", $f(modal.carryover)], ["2026 New Projected", modal.new2026 > 0 ? $f(modal.new2026) : "—"], ["Grand Total", $f(modal.total)]]} />
        </Modal>
      )}
    </div>
  );
}

// ─── PRIOR PHASES ──────────────────────────────────────────────────────────────
function PriorPhasesView() {
  const [modal, setModal] = useState(null);
  const totalPriorPaid = PRIOR_PHASES.reduce((s, p) => s + p.totalPaid, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Prior Phases" value="2" sub="Demolition + Road Construction" onClick={() => setModal("summary")} />
        <Stat label="Total Paid" value={$f(totalPriorPaid)} sub="Both phases complete" accent onClick={() => setModal("summary")} />
        <Stat label="Status" value="Complete" sub="All prior work closed out" />
      </div>

      <Card className="p-5">
        <SectionTitle>Project Timeline</SectionTitle>
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
          {[
            { label: "Road Construction", date: "Jan–Mid 2024", color: "#fb923c", amount: "$457,500", phase: PRIOR_PHASES[1] },
            { label: "Demolition",        date: "Jan–May 2025", color: "#f87171", amount: "$335,189 paid", phase: PRIOR_PHASES[0] },
            { label: "Phase 1.1 (GC)",    date: "Jun 23, 2025", color: "#d97706", amount: "Ongoing" },
            { label: "Est. Completion",   date: "April 2027",   color: "#9ca3af", amount: "—" },
          ].map((item, i) => (
            <div key={i} onClick={() => item.phase && setModal(item.phase)} className={cx("flex items-start gap-4 mb-5 relative", item.phase && "cursor-pointer group")}>
              <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900" style={{ background: item.color }} />
              <div>
                <p className={cx("text-xs font-semibold text-zinc-800 dark:text-zinc-300", item.phase && "group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors")}>
                  {item.label}{item.phase && <span className="ml-1 opacity-50">→</span>}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.date} · {item.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {PRIOR_PHASES.map(phase => (
        <Card key={phase.id} className="overflow-hidden cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors" onClick={() => setModal(phase)}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{phase.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{phase.jobNum} · {phase.gc} · {phase.startDate}–{phase.endDate}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-zinc-900 dark:text-white">{$f(phase.totalPaid)}</p>
                <p className="text-xs text-zinc-400">Total paid</p>
              </div>
              <Tag text="Complete" color="green" />
              <span className="text-zinc-300 dark:text-zinc-600">›</span>
            </div>
          </div>
        </Card>
      ))}

      {modal && typeof modal === "object" && modal.id && (
        <Modal title={modal.name} subtitle={`${modal.jobNum} · ${modal.gc}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Job Number", modal.jobNum], ["General Contractor", modal.gc],
            ["Subcontractor", modal.subcontractor], ["Dates", `${modal.startDate} – ${modal.endDate}`],
            ["Original Contract", $f(modal.originalContract)], ["Approved COs", $f(modal.approvedCOs)],
            ["Final Contract", $f(modal.finalContract)], ["Total Paid", $f(modal.totalPaid)],
          ]} />
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400 italic">{modal.scope}</div>
          <SectionTitle>Line Items</SectionTitle>
          <table className="w-full text-xs">
            <thead><tr><TH>Code</TH><TH>Description</TH><TH right>Budget</TH><TH right>Paid</TH></tr></thead>
            <tbody>
              {modal.lineItems.map(li => (
                <TR key={li.code}>
                  <TD mono muted>{li.code}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{li.desc}</TD>
                  <TD right muted>{$f(li.budget)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(li.paid)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
          {modal.cos.length > 0 && (
            <>
              <SectionTitle>Change Orders</SectionTitle>
              {modal.cos.map(co => (
                <div key={co.no} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/40 rounded-lg px-3 py-2.5 mb-1.5 text-xs">
                  <span className="font-mono text-amber-600 dark:text-amber-400 mr-3">{co.no}</span>
                  <span className="text-zinc-500 flex-1">{co.desc}</span>
                  <span className={cx("tabular-nums font-bold ml-4", co.amount < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {co.amount < 0 ? `-${$f(-co.amount)}` : `+${$f(co.amount)}`}
                  </span>
                </div>
              ))}
            </>
          )}
          {modal.notes && <p className="text-xs text-zinc-400 italic border-t border-zinc-100 dark:border-zinc-600 pt-3">{modal.notes}</p>}
        </Modal>
      )}
      {modal === "summary" && (
        <Modal title="Prior Phases Summary" onClose={() => setModal(null)}>
          <table className="w-full text-xs">
            <thead><tr><TH>Phase</TH><TH>Subcontractor</TH><TH right>Final Contract</TH><TH right>Total Paid</TH><TH>Status</TH></tr></thead>
            <tbody>
              {PRIOR_PHASES.map(p => (
                <TR key={p.id}>
                  <TD bold className="text-zinc-800 dark:text-zinc-200">{p.name}</TD>
                  <TD muted>{p.subcontractor}</TD>
                  <TD right muted>{$f(p.finalContract)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(p.totalPaid)}</TD>
                  <TD><Tag text="Complete" color="green" /></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── VENDORS HUB ───────────────────────────────────────────────────────────────
// vendorInvoices is lifted to App level so Documents tab can share it
function VendorsView({ vendorInvoices, setVendorInvoices }) {
  const [vendorKey, setVendorKey] = useState("ivan");
  const [subTab, setSubTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [phaseView, setPhaseView] = useState("table"); // "table" | "cards" | "timeline"
  const vendor = VENDORS[vendorKey];

  const totalInvoiced = (v) => v.phases.reduce((s, p) => s + (p.invoiced || 0), 0);
  const totalBudgeted = (v) => v.phases.reduce((s, p) => s + (p.budget || 0), 0);

  const vendorCards = [
    { key: "ivan", label: VENDORS.ivan.name, sub: VENDORS.ivan.role, total: totalInvoiced(VENDORS.ivan) },
    { key: "reed", label: VENDORS.reed.name, sub: VENDORS.reed.role, total: totalInvoiced(VENDORS.reed) },
    { key: "arch", label: VENDORS.arch.name, sub: VENDORS.arch.role, total: totalInvoiced(VENDORS.arch) },
  ];

  const inv = totalInvoiced(vendor);
  const bud = totalBudgeted(vendor);
  const rem = bud > 0 ? bud - inv : null;

  // Dynamic invoices = static seed + user-added
  const dynInvoices = [...vendor.invoices, ...(vendorInvoices[vendorKey] || [])];

  // Add invoice form state
  const [addForm, setAddForm] = useState({ invNum: "", date: "", desc: "", amount: "", status: "Pending" });
  const [editingInv, setEditingInv] = useState(null); // index into dynInvoices
  const [editForm, setEditForm] = useState({});
  const [addingInv, setAddingInv] = useState(false);
  const [invFile, setInvFile] = useState(null);
  const invFileRef = useRef();

  const saveNewInv = () => {
    if (!addForm.invNum || !addForm.amount) return;
    const newInv = { ...addForm, amount: parseFloat(addForm.amount.replace(/[^0-9.]/g, "")) || 0, _user: true };
    setVendorInvoices(prev => ({ ...prev, [vendorKey]: [...(prev[vendorKey] || []), newInv] }));
    setAddForm({ invNum: "", date: "", desc: "", amount: "", status: "Pending" });
    setAddingInv(false);
  };

  const saveEdit = (idx) => {
    const isStatic = idx < vendor.invoices.length;
    if (isStatic) {
      // Can't edit static — store override
      setVendorInvoices(prev => {
        const existing = [...(prev[vendorKey] || [])];
        // store edit override keyed by invNum
        return { ...prev, [vendorKey + "_edits"]: { ...(prev[vendorKey + "_edits"] || {}), [editForm.invNum]: editForm } };
      });
    } else {
      const userIdx = idx - vendor.invoices.length;
      setVendorInvoices(prev => {
        const arr = [...(prev[vendorKey] || [])];
        arr[userIdx] = { ...arr[userIdx], ...editForm };
        return { ...prev, [vendorKey]: arr };
      });
    }
    setEditingInv(null);
  };

  const deleteInv = (idx) => {
    if (idx < vendor.invoices.length) return; // can't delete static
    const userIdx = idx - vendor.invoices.length;
    setVendorInvoices(prev => {
      const arr = [...(prev[vendorKey] || [])];
      arr.splice(userIdx, 1);
      return { ...prev, [vendorKey]: arr };
    });
  };

  const inp = "w-full bg-white dark:bg-zinc-600 border border-zinc-200 dark:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-amber-400";

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <aside className="w-48 shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-400 mb-3 px-1">Vendors</p>
        <div className="space-y-1">
          {vendorCards.map(v => (
            <button key={v.key} onClick={() => { setVendorKey(v.key); setSubTab("overview"); setModal(null); setAddingInv(false); setEditingInv(null); }}
              className={cx("w-full text-left px-3 py-3 rounded-xl transition-all border", vendorKey === v.key ? "bg-white dark:bg-zinc-600 border-zinc-200 dark:border-zinc-500 shadow-sm" : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-600/50")}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: VENDORS[v.key].color }} />
                <span className={cx("text-xs font-semibold", vendorKey === v.key ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400")}>{v.label}</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-4 leading-tight">{v.sub}</p>
              <p className="text-xs font-mono font-bold tabular-nums text-zinc-500 dark:text-zinc-400 mt-1 pl-4">{$f(v.total)}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-600 pt-4">
          <div className="bg-zinc-50 dark:bg-zinc-600/50 rounded-lg px-3 py-2.5">
            <div className="text-xs text-zinc-400 mb-0.5">Combined Invoiced</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">{$f(vendorCards.reduce((s, v) => s + v.total, 0))}</div>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">{vendor.fullName}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{vendor.role}</p>
          </div>
          <Tag text="Active" color="amber" />
        </div>

        <div className="flex border-b border-zinc-200 dark:border-zinc-600 mb-5">
          {["overview", "phases", "invoices"].map(t => (
            <button key={t} onClick={() => { setSubTab(t); setModal(null); setAddingInv(false); setEditingInv(null); }}
              className={cx("px-4 py-2.5 text-xs font-semibold capitalize transition-all border-b-2 -mb-px", subTab === t ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
              {t}
              {t === "invoices" && <span className="ml-1 text-zinc-400">({dynInvoices.length})</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {subTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Invoiced" value={$f(inv)} sub="All phases" accent onClick={() => setSubTab("invoices")} />
              {rem != null
                ? <Stat label="Remaining Budget" value={$f(rem)} sub="Against fixed fees" onClick={() => setSubTab("phases")} />
                : <Stat label="Billing Type" value="T&M" sub="Billed monthly as incurred" />}
              <Stat label="Invoices on File" value={String(dynInvoices.length)} sub="Tracked invoices" onClick={() => setSubTab("invoices")} />
            </div>

            {/* Phase view toggle */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Phase Status</SectionTitle>
                <div className="flex gap-1 -mt-4">
                  {[["table","⊞ Table"],["cards","▦ Cards"],["timeline","↕ List"]].map(([v,l]) => (
                    <button key={v} onClick={() => setPhaseView(v)} className={cx("px-2.5 py-1 text-xs rounded-lg transition-all font-medium", phaseView === v ? "bg-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200")}>{l}</button>
                  ))}
                </div>
              </div>

              {/* TABLE view */}
              {phaseView === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-zinc-100 dark:border-zinc-600">
                      <TH>Phase</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH>
                    </tr></thead>
                    <tbody>
                      {vendor.phases.map((p, i) => {
                        const b = p.budget || 0; const inv2 = p.invoiced || 0;
                        const r = b > 0 ? b - inv2 : null;
                        return (
                          <TR key={i} onClick={() => { setSubTab("phases"); setModal(p); }}>
                            <TD bold className="text-zinc-800 dark:text-zinc-200">{p.phase}</TD>
                            <TD right muted>{b > 0 ? $f(b) : "T&M"}</TD>
                            <TD right bold className="text-zinc-900 dark:text-white">{$f(inv2)}</TD>
                            <TD right className={r == null ? "text-zinc-400" : r < 0 ? "text-red-500 font-bold" : r > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300"}>{r == null ? "T&M" : r > 0 ? $f(r) : r < 0 ? `-${$f(-r)}` : "—"}</TD>
                            <TD>{statusTag(p.status)}</TD>
                          </TR>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CARDS view */}
              {phaseView === "cards" && (
                <div className="grid md:grid-cols-2 gap-2">
                  {vendor.phases.map((p, i) => {
                    const b = p.budget || 0; const inv2 = p.invoiced || 0;
                    return (
                      <button key={i} onClick={() => { setSubTab("phases"); setModal(p); }} className="text-left bg-zinc-50 dark:bg-zinc-600/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl p-3 border border-zinc-100 dark:border-zinc-600 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">{p.phase}</span>
                          {statusTag(p.status)}
                        </div>
                        {b > 0 && <BarFill value={inv2} max={b} color={VENDORS[vendorKey].color} />}
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-zinc-400">{b > 0 ? $f(b) + " budget" : "T&M"}</span>
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{$f(inv2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TIMELINE / LIST view */}
              {phaseView === "timeline" && (
                <div className="relative pl-5">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-600" />
                  {vendor.phases.map((p, i) => {
                    const dotColor = p.status === "Complete" ? "#10b981" : p.status === "Not Started" ? "#a1a1aa" : VENDORS[vendorKey].color;
                    return (
                      <button key={i} onClick={() => { setSubTab("phases"); setModal(p); }} className="w-full text-left flex gap-3 mb-3 group relative">
                        <div className="absolute -left-3.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-700 shrink-0" style={{ background: dotColor }} />
                        <div className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-600/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg px-3 py-2 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.phase}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {statusTag(p.status)}
                              <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{$f(p.invoiced || 0)}</span>
                            </div>
                          </div>
                          {p.desc && <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.desc}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* PHASES */}
        {subTab === "phases" && (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead><tr>
                <TH>Phase</TH><TH>Description</TH>
                <TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH>
              </tr></thead>
              <tbody>
                {vendor.phases.map((p, i) => {
                  const bPhase = p.budget || 0; const invPhase = p.invoiced || 0;
                  const remPhase = bPhase > 0 ? bPhase - invPhase : null;
                  return (
                    <TR key={i} onClick={() => setModal(p)}>
                      <TD bold className="text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{p.phase}</TD>
                      <TD muted className="max-w-xs">{p.desc}</TD>
                      <TD right muted>{bPhase > 0 ? $f(bPhase) : "T&M"}</TD>
                      <TD right bold className="text-zinc-900 dark:text-white">{$f(invPhase)}</TD>
                      <TD right className={remPhase == null ? "text-zinc-400" : remPhase < 0 ? "text-red-500 dark:text-red-400 font-bold" : remPhase > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300 dark:text-zinc-700"}>{remPhase == null ? "T&M" : remPhase > 0 ? $f(remPhase) : remPhase < 0 ? `-${$f(-remPhase)}` : "—"}</TD>
                      <TD>{statusTag(p.status)}</TD>
                    </TR>
                  );
                })}
              </tbody>
              <tfoot>
                <TR subtle>
                  <TD bold colSpan={3} muted>Total</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(inv)}</TD>
                  <TD right bold className="text-amber-600 dark:text-amber-400">{rem != null ? $f(rem) : "T&M"}</TD>
                  <TD />
                </TR>
              </tfoot>
            </table>
          </Card>
        )}

        {/* INVOICES */}
        {subTab === "invoices" && (
          <div className="space-y-3">
            {/* Add Invoice button */}
            <div className="flex justify-end">
              <button onClick={() => { setAddingInv(v => !v); setEditingInv(null); }} className={cx("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors", addingInv ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300" : "bg-amber-600 text-white hover:bg-amber-500")}>
                {addingInv ? "Cancel" : "+ Add Invoice"}
              </button>
            </div>

            {/* Add Invoice form */}
            {addingInv && (
              <Card className="p-4">
                <SectionTitle>New Invoice — {vendor.name}</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div><label className="text-xs text-zinc-500 block mb-1">Invoice #</label><input value={addForm.invNum} onChange={e => setAddForm(f => ({...f, invNum: e.target.value}))} placeholder="e.g. INV-001" className={inp} /></div>
                  <div><label className="text-xs text-zinc-500 block mb-1">Date</label><input value={addForm.date} onChange={e => setAddForm(f => ({...f, date: e.target.value}))} placeholder="MM/DD/YYYY" className={inp} /></div>
                  <div><label className="text-xs text-zinc-500 block mb-1">Amount ($)</label><input value={addForm.amount} onChange={e => setAddForm(f => ({...f, amount: e.target.value}))} placeholder="0.00" className={inp} /></div>
                  <div className="md:col-span-2"><label className="text-xs text-zinc-500 block mb-1">Description</label><input value={addForm.desc} onChange={e => setAddForm(f => ({...f, desc: e.target.value}))} placeholder="Invoice description…" className={inp} /></div>
                  <div><label className="text-xs text-zinc-500 block mb-1">Status</label>
                    <select value={addForm.status} onChange={e => setAddForm(f => ({...f, status: e.target.value}))} className={inp}>
                      {["Pending","Paid","In Review"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveNewInv} disabled={!addForm.invNum || !addForm.amount} className={cx("px-4 py-2 text-xs font-bold rounded-lg transition-colors", addForm.invNum && addForm.amount ? "bg-amber-600 text-white hover:bg-amber-500" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed")}>Save Invoice</button>
                  <button onClick={() => setAddingInv(false)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Cancel</button>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <table className="w-full">
                <thead><tr><TH>Invoice #</TH><TH>Date</TH><TH>Description</TH><TH right>Amount</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
                <tbody>
                  {dynInvoices.map((inv2, i) => {
                    const edits = vendorInvoices[vendorKey + "_edits"] || {};
                    const displayInv = i < vendor.invoices.length && edits[inv2.invNum] ? {...inv2, ...edits[inv2.invNum]} : inv2;
                    const isEditing = editingInv === i;
                    return isEditing ? (
                      <tr key={i} className="bg-amber-50 dark:bg-amber-900/10 border-b border-zinc-100 dark:border-zinc-600">
                        <TD><input value={editForm.invNum || ""} onChange={e => setEditForm(f => ({...f, invNum: e.target.value}))} className={inp + " w-24"} /></TD>
                        <TD><input value={editForm.date || ""} onChange={e => setEditForm(f => ({...f, date: e.target.value}))} className={inp + " w-24"} /></TD>
                        <TD><input value={editForm.desc || ""} onChange={e => setEditForm(f => ({...f, desc: e.target.value}))} className={inp + " w-48"} /></TD>
                        <TD right><input value={editForm.amount || ""} onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} className={inp + " w-24 text-right"} /></TD>
                        <TD><select value={editForm.status || "Pending"} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className={inp + " w-24"}>
                          {["Pending","Paid","In Review"].map(s => <option key={s}>{s}</option>)}
                        </select></TD>
                        <TD>
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(i)} className="text-xs px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold">Save</button>
                            <button onClick={() => setEditingInv(null)} className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded-lg hover:text-zinc-700 dark:hover:text-zinc-200">Cancel</button>
                          </div>
                        </TD>
                      </tr>
                    ) : (
                      <TR key={i} onClick={() => setModal({ _inv: true, ...displayInv })}>
                        <TD mono className="text-amber-600 dark:text-amber-400 font-bold">{displayInv.invNum}</TD>
                        <TD muted>{displayInv.date}</TD>
                        <TD className="text-zinc-700 dark:text-zinc-300">{displayInv.desc}</TD>
                        <TD right bold className="text-zinc-900 dark:text-white">{$f(typeof displayInv.amount === "number" ? displayInv.amount : parseFloat(displayInv.amount) || 0)}</TD>
                        <TD>{statusTag(displayInv.status)}</TD>
                        <TD onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingInv(i); setEditForm({...displayInv}); }} className="text-xs px-2 py-1 border border-zinc-200 dark:border-zinc-600 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 transition-colors">Edit</button>
                            {i >= vendor.invoices.length && <button onClick={() => deleteInv(i)} className="text-xs px-2 py-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors">✕</button>}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
                <tfoot>
                  <TR subtle>
                    <TD bold colSpan={3} muted>Total</TD>
                    <TD right bold className="text-zinc-900 dark:text-white">{$f(dynInvoices.reduce((s, i) => s + (typeof i.amount === "number" ? i.amount : parseFloat(i.amount) || 0), 0))}</TD>
                    <TD colSpan={2} />
                  </TR>
                </tfoot>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* Phase modal */}
      {modal && !modal._inv && (
        <Modal title={modal.phase} subtitle={vendor.fullName} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Phase", modal.phase], ["Status", modal.status],
            ["Budget", modal.budget > 0 ? $f(modal.budget) : "T&M"],
            ["Invoiced", $f(modal.invoiced)],
            ["Remaining", modal.budget > 0 ? $f(modal.budget - modal.invoiced) : "T&M"],
            ["Description", modal.desc],
          ]} />
        </Modal>
      )}
      {modal?._inv && (
        <Modal title={`Invoice ${modal.invNum}`} subtitle={`${vendor.name} · ${modal.date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[["Invoice Number", modal.invNum], ["Date", modal.date], ["Description", modal.desc], ["Amount", $f(typeof modal.amount === "number" ? modal.amount : parseFloat(modal.amount) || 0)], ["Status", modal.status]]} />
        </Modal>
      )}
    </div>
  );
}

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────────
// vendorInvoices passed in so documents tab shows vendor invoices too
function UploadsView({ uploads, setUploads, archive, setArchive, vendorInvoices, syncedPayments = [] }) {
  const [form, setForm] = useState({ type: "Invoice", vendor: "", linkedId: "", note: "", createNew: false });
  const [pending, setPending] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef();

  // Vendor invoice links — static + user-added
  const vendorInvLinks = {
    ivan: [...VENDORS.ivan.invoices, ...(vendorInvoices?.ivan || [])].map(i => ({ id: i.invNum, label: `${i.invNum} – ${i.desc}` })),
    reed: [...VENDORS.reed.invoices, ...(vendorInvoices?.reed || [])].map(i => ({ id: i.invNum, label: `${i.invNum} – ${i.desc}` })),
    arch: [...VENDORS.arch.invoices, ...(vendorInvoices?.arch || [])].map(i => ({ id: i.invNum, label: `${i.invNum} – ${i.desc}` })),
  };

  const TACONIC_LINKS = INVOICES.map(i => ({ id: i.id, label: `${i.id} · ${i.invNum} — ${i.desc}` }));
  const AWARD_LINKS   = AWARDS.map(a => ({ id: a.id, label: `${a.id} · ${a.vendor}` }));
  const CO_LINKS      = CHANGE_ORDERS.map(c => ({ id: c.no, label: `${c.no} · ${c.div}` }));

  // What links to show based on type + vendor selection
  const getLinks = () => {
    if (form.type === "Award Letter") return AWARD_LINKS;
    if (form.type === "Change Order") return CO_LINKS;
    if (form.type === "Invoice") {
      if (form.vendor === "taconic" && !form.createNew) return TACONIC_LINKS;
      if (form.vendor && vendorInvLinks[form.vendor]) return vendorInvLinks[form.vendor];
    }
    return [];
  };

  const links = getLinks();

  const processFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return alert("Please select a PDF file.");
    setPending(file);
  };

  const save = () => {
    if (!pending) return;
    const vendorLabel = form.vendor === "taconic" ? "Taconic Builders" : form.vendor ? VENDORS[form.vendor]?.name : "";
    let linkedId = form.createNew ? null : form.linkedId;
    let autoPayId = null;
    if (form.createNew) {
      const existingPay = uploads.filter(u => u.autoPayId).map(u => parseInt(u.autoPayId.replace("PAY-", ""), 10));
      const maxExisting = Math.max(...INVOICES.map((_, i) => i + 1), ...existingPay, 0);
      autoPayId = `PAY-${String(maxExisting + 1).padStart(3, "0")}`;
      linkedId = autoPayId;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setUploads(prev => [...prev, {
        id: `DOC-${Date.now()}`,
        name: pending.name,
        type: form.type,
        vendor: form.vendor,
        vendorLabel,
        linkedId,
        autoPayId,
        note: form.note,
        size: `${(pending.size / 1024).toFixed(0)} KB`,
        date: new Date().toLocaleDateString("en-US"),
        dataUrl: e.target.result
      }]);
      setPending(null);
      setForm({ type: "Invoice", vendor: "", linkedId: "", note: "", createNew: false });
    };
    reader.onerror = () => alert("Failed to read file. Please try again.");
    reader.readAsDataURL(pending);
  };

  const byType = uploads.reduce((acc, u) => { (acc[u.type] = acc[u.type] || []).push(u); return acc; }, {});
  const inp = "w-full bg-white dark:bg-zinc-600 border border-zinc-200 dark:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-amber-400";

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle>Upload Document</SectionTitle>
        <div className="grid md:grid-cols-2 gap-5">
          <div
            className={cx("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors", dragOver ? "border-amber-400 bg-amber-50 dark:bg-amber-900/10" : "border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500")}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
          >
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => processFile(e.target.files[0])} />
            {pending
              ? <div><p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{pending.name}</p><p className="text-xs text-zinc-400 mt-1">{(pending.size / 1024).toFixed(0)} KB — ready to save</p></div>
              : <div><p className="text-sm text-zinc-400">Drop PDF here or click to browse</p><p className="text-xs text-zinc-300 dark:text-zinc-500 mt-1">PDF only</p></div>}
          </div>

          <div className="space-y-3">
            {/* Type */}
            <div><label className="text-xs text-zinc-500 block mb-1">Document Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, vendor: "", linkedId: "", createNew: false }))} className={inp}>
                {["Invoice", "Award Letter", "Change Order", "Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Vendor selector — shown for Invoice type */}
            {form.type === "Invoice" && (
              <div><label className="text-xs text-zinc-500 block mb-1">Vendor</label>
                <select value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value, linkedId: "", createNew: false }))} className={inp}>
                  <option value="">— Select vendor —</option>
                  <option value="taconic">Taconic Builders (GC)</option>
                  <option value="ivan">Ivan Zdrahal PE</option>
                  <option value="reed">Reed Hilderbrand</option>
                  <option value="arch">Architecturefirm</option>
                </select>
              </div>
            )}

            {/* Taconic: toggle between link existing vs create new entry */}
            {form.type === "Invoice" && form.vendor === "taconic" && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setForm(f => ({ ...f, createNew: false, linkedId: "" }))}
                  className={cx("flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors", !form.createNew ? "bg-amber-600 text-white border-amber-600" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}
                >
                  Link Existing
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, createNew: true, linkedId: "NEW" }))}
                  className={cx("flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors", form.createNew ? "bg-amber-600 text-white border-amber-600" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}
                >
                  + New Entry
                </button>
              </div>
            )}

            {/* New entry badge */}
            {form.createNew && form.vendor === "taconic" && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Will be logged as a new Taconic entry</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-500/60 mt-0.5">Auto-assigned PAY-ID on save. Appears in the invoice tracker.</p>
              </div>
            )}

            {/* Link to record — depends on vendor, only shown for "link existing" */}
            {links.length > 0 && !form.createNew && (
              <div><label className="text-xs text-zinc-500 block mb-1">Link to Invoice / Record</label>
                <select value={form.linkedId} onChange={e => setForm(f => ({ ...f, linkedId: e.target.value }))} className={inp}>
                  <option value="">— Select —</option>
                  {links.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            )}

            {/* Note */}
            <div><label className="text-xs text-zinc-500 block mb-1">Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Add a note…" className={inp} />
            </div>

            {/* Save button - needs file + link selection */}
            {(() => {
              const canSave = pending && (form.createNew || form.linkedId || form.type !== "Invoice" || !form.vendor);
              return (
                <button onClick={save} disabled={!canSave} className={cx("w-full py-2.5 rounded-lg text-xs font-bold transition-colors", canSave ? "bg-amber-600 text-white hover:bg-amber-500 shadow-sm" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed")}>
                  {!pending ? "Select a PDF first" : (!form.vendor && form.type === "Invoice") ? "Select a vendor" : (!form.linkedId && !form.createNew && form.vendor) ? "Select an invoice to link" : "Save Document"}
                </button>
              );
            })()}
          </div>
        </div>
      </Card>

      {uploads.length === 0
        ? <div className="text-center py-16 text-zinc-300 dark:text-zinc-600 text-sm">No documents uploaded yet.</div>
        : Object.entries(byType).map(([type, docs]) => (
          <Card key={type} className="overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-600 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{type}s</span>
              <span className="text-xs text-zinc-400">{docs.length} file{docs.length > 1 ? "s" : ""}</span>
            </div>
            {docs.map(doc => (
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors border-b border-zinc-50 dark:border-zinc-600/40 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {doc.size} · {doc.date}
                      {doc.vendorLabel && ` · ${doc.vendorLabel}`}
                      {doc.autoPayId && <span className="ml-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 rounded-full px-2 py-0.5 text-xs font-semibold">New entry · {doc.autoPayId}</span>}
                      {!doc.autoPayId && doc.linkedId && ` · ↳ ${doc.linkedId}`}
                      {doc.note && ` · ${doc.note}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => setViewing(doc)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-600 rounded-lg px-2.5 py-1 hover:border-zinc-400 transition-colors">View</button>
                  <button onClick={() => { setArchive(prev => [...prev, { ...doc, deletedAt: new Date().toLocaleDateString("en-US") }]); setUploads(prev => prev.filter(u => u.id !== doc.id)); }} className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors px-1.5 py-1" title="Delete (moves to archive)">✕</button>
                </div>
              </div>
            ))}
          </Card>
        ))
      }

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setViewing(null)}>
          <div className="bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl" style={{ maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-600 shrink-0">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-200 text-sm">{viewing.name}</p>
                <p className="text-xs text-zinc-400">{viewing.type}{viewing.vendorLabel ? ` · ${viewing.vendorLabel}` : ""} · {viewing.size} · {viewing.date}</p>
              </div>
              <button onClick={() => setViewing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <iframe src={viewing.dataUrl} className="w-full rounded-lg border border-zinc-100 dark:border-zinc-600" style={{ height: "65vh" }} title={viewing.name} />
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD HISTORY LOG ───────────────────────────────────────────── */}
      {uploads.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-600 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Upload History</span>
            <span className="text-xs text-zinc-400">{uploads.length} active document{uploads.length !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full">
            <thead><tr>
              <TH>#</TH><TH>File Name</TH><TH>Type</TH><TH>Vendor</TH><TH>Linked To</TH><TH>Uploaded</TH><TH>Size</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {uploads.map((doc, i) => (
                <TR key={doc.id}>
                  <TD muted mono>{i + 1}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200 max-w-xs truncate">
                    <span className="flex items-center gap-1.5">
                      📄 {doc.name}
                      {doc.autoPayId && <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 rounded-full px-1.5 py-0.5">New</span>}
                    </span>
                  </TD>
                  <TD muted>{doc.type}</TD>
                  <TD muted>{doc.vendorLabel || "—"}</TD>
                  <TD mono muted>{doc.autoPayId || doc.linkedId || "—"}</TD>
                  <TD muted>{doc.date}</TD>
                  <TD muted>{doc.size}</TD>
                  <TD>
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewing(doc)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-600 rounded px-2 py-0.5 transition-colors">View</button>
                      <button
                        onClick={() => { setArchive(prev => [...prev, { ...doc, deletedAt: new Date().toLocaleDateString("en-US") }]); setUploads(prev => prev.filter(u => u.id !== doc.id)); }}
                        className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 border border-transparent hover:border-red-200 dark:hover:border-red-800 rounded px-2 py-0.5 transition-colors"
                        title="Delete — moves to archive"
                      >Delete</button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── SYNCED FROM JXM TRACKER ─────────────────────────────────────── */}
      {syncedPayments.length > 0 && (() => {
        const cfSynced = syncedPayments.filter(p => p.entity === "Camp Forestmere" && p.ref);
        if (cfSynced.length === 0) return null;
        return (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-600 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Synced from JXM Tracker</span>
              </div>
              <span className="text-xs text-zinc-400">{cfSynced.length} synced entr{cfSynced.length !== 1 ? "ies" : "y"}</span>
            </div>
            <table className="w-full">
              <thead><tr>
                <TH>Ref #</TH><TH>Description</TH><TH>Entity</TH><TH>Amount</TH><TH>Status</TH><TH>Synced</TH>
              </tr></thead>
              <tbody>
                {cfSynced.map(p => (
                  <TR key={p.id + "-sync"}>
                    <TD mono bold>{p.ref}</TD>
                    <TD>{p.description || "—"}</TD>
                    <TD muted>{p.entity}</TD>
                    <TD mono>{p.amount ? "$" + Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}</TD>
                    <TD>
                      <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === "Done" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                        {p.status === "Done" ? "Paid" : p.status || "Pending"}
                      </span>
                    </TD>
                    <TD muted>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })()}

      {/* ── ARCHIVE (deleted docs) ───────────────────────────────────────── */}
      {archive.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-600 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Archive</span>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">{archive.length} deleted</span>
            </div>
            <button
              onClick={() => { if (window.confirm("Permanently clear the archive? This cannot be undone.")) setArchive([]); }}
              className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors"
            >Clear archive</button>
          </div>
          <table className="w-full">
            <thead><tr>
              <TH>File Name</TH><TH>Type</TH><TH>Vendor</TH><TH>Was Linked To</TH><TH>Uploaded</TH><TH>Deleted</TH><TH>Actions</TH>
            </tr></thead>
            <tbody>
              {archive.map((doc) => (
                <TR key={doc.id + "-arch"} subtle>
                  <TD muted className="max-w-xs truncate">
                    <span className="flex items-center gap-1.5 opacity-60">📄 {doc.name}</span>
                  </TD>
                  <TD muted>{doc.type}</TD>
                  <TD muted>{doc.vendorLabel || "—"}</TD>
                  <TD mono muted>{doc.autoPayId || doc.linkedId || "—"}</TD>
                  <TD muted>{doc.date}</TD>
                  <TD muted className="text-red-400 dark:text-red-500">{doc.deletedAt}</TD>
                  <TD>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setUploads(prev => [...prev, { ...doc, deletedAt: undefined }]); setArchive(prev => prev.filter(a => a.id !== doc.id)); }}
                        className="text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-2 py-0.5 transition-colors font-semibold"
                      >↩ Restore</button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard"         },
  { id: "budget",    label: "Control Budget"    },
  { id: "awards",    label: "Awards"            },
  { id: "cos",       label: "Change Orders"     },
  { id: "vendors",   label: "Vendors"           },
  { id: "invoices",  label: "Invoices"          },
  { id: "lineitem",  label: "Line Item Billing" },
  { id: "cashflow",  label: "Cash Flow"         },
  { id: "prior",     label: "Prior Phases"      },
  { id: "uploads",   label: "Document Upload"   },
];

export default function App() {
  const [tab, setTab]          = useState("dashboard");
  const [uploads, setUploads]       = useState(() => loadLS("uploads", []));
  const [archive, setArchive]       = useState(() => loadLS("archive", [])); // deleted docs archive — rollback from here
  const [dark, setDark]             = useState(false);
  const [vendorInvoices, setVendorInvoices] = useState(() => loadLS("vendorInvoices", {}));
  const [invoiceOverrides, setInvoiceOverrides] = useState(() => loadLS("invoiceOverrides", {})); // user edits to invoice fields
  const [syncedPayments, setSyncedPayments] = useState([]); // live sync from JXM tracker
  const [syncFlash, setSyncFlash]   = useState(false); // pulse indicator on sync

  // Persist to localStorage on change
  useEffect(() => { saveLS("uploads", uploads); }, [uploads]);
  useEffect(() => { saveLS("archive", archive); }, [archive]);
  useEffect(() => { saveLS("vendorInvoices", vendorInvoices); }, [vendorInvoices]);
  useEffect(() => { saveLS("invoiceOverrides", invoiceOverrides); }, [invoiceOverrides]);

  // ── Sync from JXM Payment Tracker API ───────────────────────────────────────
  // Fetches from the tracker's /api/sync endpoint — works across domains
  // Runs on load (Ctrl+R) + polls every 60s for live updates
  useEffect(() => {
    const SYNC_URL = "https://jxm-tracker-production.up.railway.app/api/sync";

    const fetchSync = () => {
      fetch(SYNC_URL)
        .then(r => r.json())
        .then(data => {
          if (data.payments && data.payments.length > 0) {
            setSyncedPayments(data.payments);
            setSyncFlash(true);
            setTimeout(() => setSyncFlash(false), 3000);
          }
        })
        .catch(() => {}); // silent fail if tracker is down
    };

    // Fetch immediately on load / Ctrl+R
    fetchSync();

    // Poll every 60 seconds for live updates
    const interval = setInterval(fetchSync, 60000);
    return () => clearInterval(interval);
  }, []);

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", dark);
  }

  return (
    <div>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors duration-200" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 3px; }
          .dark ::-webkit-scrollbar-thumb { background: #71717a; }
        `}</style>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-600 shadow-sm dark:shadow-none">
          <div className="max-w-screen-xl mx-auto px-6 pt-4 pb-0 flex items-end justify-between">
            <div className="pb-3">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Camp Forestmere</h1>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Active Construction</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5 flex items-center gap-2">
                <span>Paul Smiths, NY · Updated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                {syncFlash && <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold animate-pulse">⇄ Tracker synced</span>}
              </p>
            </div>
            <div className="pb-3 flex items-center gap-3">
              {uploads.length > 0 && <span className="text-xs text-zinc-400">{uploads.length} doc{uploads.length > 1 ? "s" : ""}</span>}
              <button
                onClick={() => setDark(d => !d)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors shadow-sm"
              >
                {dark ? "☀ Light mode" : "◑ Dark mode"}
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="max-w-screen-xl mx-auto px-6 flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cx(
                  "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all",
                  tab === t.id
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-transparent text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
                )}
              >
                {t.label}
                {t.id === "uploads" && uploads.length > 0 && <span className="ml-1 text-amber-500">·{uploads.length}</span>}
              </button>
            ))}
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-screen-xl mx-auto px-6 py-6">
          {tab === "dashboard" && <Dashboard setTab={setTab} />}
          {tab === "budget"    && <BudgetView />}
          {tab === "awards"    && <AwardsView />}
          {tab === "invoices"  && <InvoicesView uploads={uploads} syncedPayments={syncedPayments} invoiceOverrides={invoiceOverrides} setInvoiceOverrides={setInvoiceOverrides} />}
          {tab === "lineitem"  && <LineItemView />}
          {tab === "cos"       && <COsView />}
          {tab === "cashflow"  && <CashFlowView />}
          {tab === "prior"     && <PriorPhasesView />}
          {tab === "vendors"   && <VendorsView vendorInvoices={vendorInvoices} setVendorInvoices={setVendorInvoices} />}
          {tab === "uploads"   && <UploadsView uploads={uploads} setUploads={setUploads} archive={archive} setArchive={setArchive} vendorInvoices={vendorInvoices} syncedPayments={syncedPayments} />}
        </main>
      </div>
    </div>
  );
}
