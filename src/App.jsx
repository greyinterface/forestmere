import { useState, useRef } from "react";

// ─── PHASE 1.1 TACONIC DATA ────────────────────────────────────────────────────

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
  { code: "31-640", name: "Sheet Pile Retaining Wall & Caissons", budget: 416472, cat: "Sitework" },
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
  { id: "AWD-001", date: "08/07/2025", vendor: "Renlita Custom Opening Solutions", contract: "25-104-GD-S", code: "08-330", division: "Garage Doors", desc: "Car Barn – Renlita S-1000 Floataway Motorized Lift-Up Garage Doors (Supply)", award: 233394.24, cos: 12600, current: 245994.24 },
  { id: "AWD-002", date: "08/07/2025", vendor: "Custom Remodeling & Carpentry", contract: "25-104-GD-I", code: "08-330", division: "Garage Doors", desc: "Garage Doors Installation – Car Barn and Boat House", award: 86229, cos: 0, current: 86229 },
  { id: "AWD-003", date: "08/05/2025", vendor: "Avery's Custom Masonry", contract: "25-104-MAS", code: "04-570", division: "Chimney / Fireplace", desc: 'Main Residence – Isokern Magnum 48" & 60" fireplaces', award: 67927.5, cos: 0, current: 67927.5 },
  { id: "AWD-004", date: "07/14/2025", vendor: "Royal Green", contract: "25-104-APP", code: "11-300", division: "Residential Equipment", desc: "Main Residence & Pavilion – Kitchen appliances, laundry, refrigeration", award: 45551.16, cos: 0, current: 45551.16 },
  { id: "AWD-005", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", contract: "25-104-CIV", code: "31-200", division: "Excavations & Backfilling", desc: "Site/Civil – Earthwork, excavations, backfilling", award: 996944, cos: 73382, current: 1070326 },
  { id: "AWD-006", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", contract: "25-104-CIV", code: "32-100", division: "Driveway & Curbing", desc: "Site/Civil – Driveway & Curbing", award: 251906, cos: 0, current: 251906 },
  { id: "AWD-007", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", contract: "25-104-CIV", code: "33-340", division: "Site Drainage Systems", desc: "Site/Civil – Site Drainage Systems", award: 196790, cos: 0, current: 196790 },
  { id: "AWD-008", date: "06/30/2025", vendor: "Kubricky Jointa Lime, LLC", contract: "25-104-CIV", code: "31-110", division: "Site Clearing", desc: "Site/Civil – Site Clearing", award: 80483.35, cos: 0, current: 80483.35 },
  { id: "AWD-009", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "26-100", division: "Electrical Power & Switching", desc: "Electrical Power & Switching – Main distribution", award: 244183, cos: 0, current: 244183 },
  { id: "AWD-010", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "26-320", division: "Electrical Generators", desc: "Electrical Generators", award: 12000, cos: 0, current: 12000 },
  { id: "AWD-011", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "26-500", division: "Interior Lighting Fixtures", desc: "Interior Lighting Fixtures (Supply)", award: 129229, cos: 0, current: 129229 },
  { id: "AWD-012", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "26-560", division: "Exterior Lighting Fixtures", desc: "Exterior Lighting Fixtures (Supply)", award: 87250, cos: 0, current: 87250 },
  { id: "AWD-013", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "33-370", division: "Electrical Service", desc: "Electrical Service – Site electrical distribution", award: 686196, cos: 12600, current: 698796 },
  { id: "AWD-014", date: "06/17/2025", vendor: "Krueger Electrical Contracting", contract: "25-104-ELEC", code: "33-150", division: "Gas Services / Tank", desc: "Gas Services/Tank", award: 10000, cos: 0, current: 10000 },
  { id: "AWD-015", date: "07/18/2025", vendor: "Wagner Pools", contract: "25-104-HT", code: "13-110", division: "Hot Tub", desc: "Pavilion – 60 SF Rectangle Spa, Gunite Shell with Auto-Cover", award: 142000, cos: 0, current: 142000 },
  { id: "AWD-016", date: "08/04/2025", vendor: "Simon's & Co.", contract: "25-104-PF", code: "22-400", division: "Plumbing Fixtures", desc: "Main Residence & Pavilion – Plumbing fixtures, faucets, toilets", award: 70460.38, cos: 0, current: 70460.38 },
  { id: "AWD-017", date: "07/07/2025", vendor: "Foard Panel", contract: "25-104-SIPS", code: "06-120", division: "SIPS Panels", desc: "Car Barn – SIPS Panels (Supply only)", award: 115710, cos: 0, current: 115710 },
  { id: "AWD-018", date: "07/08/2025", vendor: "Rhea Windows", contract: "25-104-WIN", code: "08-400", division: "Windows and Exterior Doors", desc: "Main Residence – Windows (Supply only)", award: 130205.09, cos: 0, current: 130205.09 },
  { id: "AWD-019", date: "10/13/2025", vendor: "Trident", contract: "—", code: "31-640", division: "Sheet Pile Retaining Wall & Caissons", desc: "Boat House Structural", award: 474149.7, cos: 0, current: 474149.7 },
  { id: "AWD-020", date: "10/11/2025", vendor: "reSawn Timber Co.", contract: "—", code: "06-210", division: "Exterior Finish Carpentry - Material", desc: "Exterior Finish Carpentry (Materials Only)", award: 229728.58, cos: 0, current: 229728.58 },
];

const CHANGE_ORDERS = [
  { no: "CO-007", code: "03-330", div: "Cast In Place Concrete", origBudget: 401900, approvedCO: 148000, fees: 16725, total: 164725, revisedBudget: 549900, notes: "Includes waived fee of $7,695.", date: "Jan 20, 2026" },
  { no: "CO-009", code: "31-640", div: "Sheet Pile Retaining Wall & Caissons", origBudget: 416472, approvedCO: 57677.7, fees: 9516.82, total: 67194.52, revisedBudget: 474149.7, notes: null, date: "Jan 20, 2026" },
  { no: "CO-003", code: "33-370", div: "Electrical Service", origBudget: 788495, approvedCO: 1710, fees: 282.15, total: 1992.15, revisedBudget: 790205, notes: "Savings from buyout applied ($12,910 – $11,200).", date: "Jan 20, 2026" },
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
];

const LINE_ITEMS = [
  { code: "01-001", name: "Project Staffing", budget: 1367556.67, cos: 0, done: 164366.64, pct: 0.1202, inv: { "C25-104-Deposit": null, "#1621": 18225, "#1693": 33185, "#1750": 26170, "#1819": 40816.64, "#1880": 22475, "#1956": 23495 } },
  { code: "02-002", name: "Site Preparation", budget: 423400, cos: 0, done: 96619.74, pct: 0.2282, inv: { "#1621": 48297.32, "#1693": 9217.82, "#1750": 6264.82, "#1819": 6608.71, "#1880": 9759.30, "#1956": 16471.77 } },
  { code: "02-100", name: "Debris Removal", budget: 33000, cos: 0, done: 1733, pct: 0.0525, inv: { "#1880": 1733 } },
  { code: "03-330", name: "Cast In Place Concrete", budget: 401900, cos: 148000, done: 137250, pct: 0.2496, inv: { "#1819": 137250 } },
  { code: "06-210", name: "Ext. Finish Carpentry – Material", budget: 273230, cos: 0, done: 76576.19, pct: 0.2803, inv: { "#1880": 76576.19 } },
  { code: "08-330", name: "Garage Doors", budget: 332508, cos: 0, done: 62254.20, pct: 0.1872, inv: { "#1693": 62254.20 } },
  { code: "08-400", name: "Exterior Doors", budget: 207649, cos: 0, done: 65102.54, pct: 0.3135, inv: { "#1621": 65102.54 } },
  { code: "11-300", name: "Residential Equipment", budget: 53441, cos: 0, done: 22755.58, pct: 0.4258, inv: { "#1956": 22755.58 } },
  { code: "31-200", name: "Excavations & Backfilling", budget: 996944, cos: 73382, done: 628329.89, pct: 0.6303, inv: { "#1621": 198067, "#1693": 241737, "#1750": 180000, "#1819": 0, "#1880": 0, "#1956": 8653.28 } },
  { code: "31-110", name: "Site Clearing", budget: 87510, cos: 0, done: 87510, pct: 1.0, inv: { "#1621": 42207.55, "#1693": 45302.45 } },
  { code: "33-340", name: "Site Drainage Systems", budget: 196790, cos: 0, done: 114792.44, pct: 0.5833, inv: { "#1750": 114792.44 } },
  { code: "33-370", name: "Electrical Service", budget: 788495, cos: 1992.15, done: 402240.82, pct: 0.509, inv: { "#1750": 63730, "#1880": 0, "#1956": 7500 } },
  { code: "26-100", name: "Electrical Power & Switching", budget: 244183, cos: 0, done: 81161.65, pct: 0.3357, inv: { "#1750": 81161.65 } },
  { code: "32-100", name: "Driveway & Curbing", budget: 251906, cos: 0, done: 115737.16, pct: 0.4594, inv: { "#1750": 115737.16 } },
];

const INV_NUMS = ["C25-104-Deposit", "#1621", "#1693", "#1750", "#1819", "#1880", "#1956"];

// ─── VENDOR DATA ───────────────────────────────────────────────────────────────

const IVAN_ZDRAHAL = {
  name: "Ivan Zdrahal Professional Engineering, PLLC",
  role: "Civil Engineering & Construction Management",
  phases: [
    { phase: "Phase A", desc: "Master Plan Evaluation, Lodge Building design, Bidding & construction services", budget: 91884.43, invoiced: 91884.43, status: "Complete" },
    { phase: "Phase B", desc: "APA Permit Application (Great Hall), Environmental Assessment, APA response", budget: 150115, invoiced: 150115, status: "Complete" },
    { phase: "Phase C – Design", desc: "Design revisions: Car Barn, Main Residence, Hot Tub Pavilion, Woods Road", budget: 90005, invoiced: 90005, status: "Complete" },
    { phase: "Phase C – CM", desc: "Construction management services in Phase C to date", budget: 24426.25, invoiced: 24426.25, status: "Complete" },
    { phase: "Future – Guest Cabin Design", desc: "Civil Engineering plans for Proposed Guest Cabin (Phase C)", budget: 16000, invoiced: 4835, status: "In Progress" },
    { phase: "Future – CM Phase C (cont.)", desc: "Continuation of construction management in Phase C", budget: 15000, invoiced: 4750, status: "In Progress" },
    { phase: "Future – CM Phase B (Rec/Pub)", desc: "Construction management for Recreational Complex & Pub Building (Phase B)", budget: 25000, invoiced: 0, status: "Not Started" },
    { phase: "Contingencies", desc: "Allowances for design changes and/or scope changes", budget: 25000, invoiced: 0, status: "Not Started" },
  ],
  invoices: [
    { invNum: "103443", date: "01/05/2026", desc: "CM Phase C – Technician + Subconsultant + Admin", amount: 2655, budget: "CM Phase C" },
    { invNum: "103449", date: "01/06/2026", desc: "Guest Cabin Design", amount: 1465, budget: "Guest Cabin Design" },
    { invNum: "103454", date: "02/05/2026", desc: "Guest Cabin Design", amount: 3370, budget: "Guest Cabin Design" },
    { invNum: "103453", date: "02/06/2026", desc: "Final Phase Construction Management", amount: 2095, budget: "CM Phase C" },
  ],
};

const REED_HILDERBRAND = {
  name: "Reed Hilderbrand",
  role: "Landscape Architecture",
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
    { phase: "Reimbursable – Travel/Lodging/Meals", desc: "Site visits for owner meetings & construction obs.", budget: null, invoiced: 32973, status: "Ongoing" },
    { phase: "Reimbursable – Subconsultants", desc: "Trail advisory + site electrical network design", budget: null, invoiced: 19176, status: "Ongoing" },
  ],
};

const ARCHITECTUREFIRM = {
  name: "Architecturefirm",
  role: "Architecture",
  phases: [
    { phase: "S-1 Site Study / Framework Plan", desc: "06/2022–12/2024", projFee: 0, billed: 276863, remaining: 0, status: "Complete" },
    { phase: "S-2 APA / DEC Permit Drawings", desc: "02/2023–12/2024", projFee: 0, billed: 73745, remaining: 0, status: "Complete" },
    { phase: "L-1 Lodge – Design & Documentation", desc: "01/2023–11/2023  ·  $4.45M const.", projFee: 467772, billed: 280128, remaining: 0, status: "Complete" },
    { phase: "L-2 Lodge – Construction Administration", desc: "12/2023–02/2024", projFee: 0, billed: 24730, remaining: 0, status: "Complete" },
    { phase: "0-1 Pub V1 – Design & Documentation", desc: "03/2024–08/2024  ·  $1.76M const.", projFee: 184995, billed: 155000, remaining: 0, status: "Complete" },
    { phase: "0-2 Barns V1 (4x) – Design & Documentation", desc: "11/2023–08/2024  ·  $2.46M const.", projFee: 257950, billed: 232000, remaining: 0, status: "Complete" },
    { phase: "0-3 Staff Housing – Design & Documentation", desc: "11/2023–02/2024  ·  $1.25M const.", projFee: 131245, billed: 38775, remaining: 0, status: "Complete" },
    { phase: "1-1 Pub V2 – Design & Documentation", desc: "09/2024–03/2025  ·  $2.79M const.", projFee: 220042, billed: 218545, remaining: 0, status: "Complete" },
    { phase: "1-2 Recreation Hall – Design & Doc.", desc: "11/2023–08/2024  ·  $1.65M const.", projFee: 173075, billed: 180000, remaining: 0, status: "Complete" },
    { phase: "1-3 Caretaker Res. – Design & Doc.", desc: "11/2023–08/2024  ·  $1.0M const.", projFee: 104996, billed: 50960, remaining: 0, status: "Complete" },
    { phase: "1-4 Barns V2 (2x) – Design & Doc.", desc: "09/2024–03/2025  ·  $1.79M const.", projFee: 93924, billed: 37560, remaining: 0, status: "Complete" },
    { phase: "1-5 Boathouse – Design & Doc.", desc: "11/2023–08/2025  ·  $771k const.", projFee: 81015, billed: 125130, remaining: 0, status: "Complete" },
    { phase: "1-6 Main Res. & Pavilion – Design & Doc.", desc: "09/2024–04/2025  ·  $2.99M const.", projFee: 313799, billed: 239303, remaining: 0, status: "Complete" },
    { phase: "1-7 Great Hall – Design & Doc.", desc: "TBD  ·  $5.76M const.", projFee: 605183, billed: 0, remaining: 605183, status: "Not Started" },
    { phase: "1-8 Guest Cabin", desc: "10/2025–03/2026  ·  $1.0M const.", projFee: 100000, billed: 1730, remaining: 98270, status: "In Progress" },
    { phase: "CA-1 Phase 1.1 Construction Admin.", desc: "22 months · $12k–$16k/month est.", projFee: 288000, billed: 101800, remaining: 186200, status: "In Progress" },
    { phase: "FFE – Furniture, Furnishings & Equipment", desc: "Scope TBD", projFee: 0, billed: 29215, remaining: 0, status: "Ongoing" },
    { phase: "Reimbursable Expenses", desc: "Travel, lodging, meals, reproductions", projFee: 0, billed: 2704.62, remaining: 0, status: "Ongoing" },
  ],
};

// ─── PRIOR PHASES DATA ─────────────────────────────────────────────────────────

const PRIOR_PHASES = [
  {
    id: "demolition",
    name: "Demolition",
    jobNum: "C25-102",
    gc: "Taconic Builders Inc.",
    subcontractor: "Mayville Enterprises Inc.",
    startDate: "Jan 2025",
    endDate: "May 2025",
    scope: "Demolition of existing site structures",
    originalContract: 446966,
    approvedCOs: -40552.24,
    finalContract: 406413.76,
    totalPaid: 335189.43,
    status: "Complete",
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
    id: "road",
    name: "Road Construction",
    jobNum: "C24-RC",
    gc: "Taconic Builders Inc.",
    subcontractor: "Luck Builders Inc.",
    startDate: "Jan 2024",
    endDate: "Mid 2024",
    scope: "Clearing, grubbing, road construction from Rte 30 to Lodge including loop. Utility trenching, waterline, erosion control.",
    originalContract: 457500,
    approvedCOs: 0,
    finalContract: 457500,
    totalPaid: 457500,
    status: "Complete",
    lineItems: [
      { code: "1", desc: "Clearing & Grubbing", budget: 55000, paid: 55000 },
      { code: "2", desc: "Strip & Clean Existing Pavement (Sta. 0+00 to 21+00)", budget: 30000, paid: 30000 },
      { code: "3", desc: "Erosion Control & Tree Protection", budget: 47950, paid: 47950 },
      { code: "4", desc: "Road Construction (Sta. 21+00 to House, incl. Loop)", budget: 420000, paid: 420000 },
      { code: "5", desc: "Utility Trenching & Backfill", budget: 97000, paid: 97000 },
    ],
    cos: [],
    notes: "Award letter dated Jan 8, 2024. Luck Builders selected from competitive bid. Taconic CD pricing dated Jan 6, 2024 ($450,000 estimate). Final award $457,500.",
  },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const $ = (n) => n == null ? "—" : "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n) => (n * 100).toFixed(1) + "%";
const totalBudget = BUDGET.reduce((s, b) => s + b.budget, 0);
const totalAwarded = AWARDS.reduce((s, a) => s + a.current, 0);
const totalPaid = INVOICES.filter(i => i.status === "Paid").reduce((s, i) => s + i.approved, 0);
const totalCOs = CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0);
const awardedByCode = {};
AWARDS.forEach(a => { awardedByCode[a.code] = (awardedByCode[a.code] || 0) + a.current; });

// All-in total paid across all vendors and phases
const izPaid = IVAN_ZDRAHAL.phases.reduce((s, p) => s + p.invoiced, 0);
const rhPaid = REED_HILDERBRAND.phases.reduce((s, p) => s + p.invoiced, 0);
const afPaid = ARCHITECTUREFIRM.phases.reduce((s, p) => s + p.billed, 0);
const priorPaid = PRIOR_PHASES.reduce((s, p) => s + p.totalPaid, 0);
const taconicPaid = totalPaid;
const grandTotalPaid = izPaid + rhPaid + afPaid + priorPaid + taconicPaid;

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
const Tag = ({ text, color }) => {
  const c = { green: "text-emerald-400", amber: "text-amber-400", red: "text-red-400", muted: "text-zinc-500", blue: "text-blue-400" };
  return <span className={`text-xs font-medium ${c[color] || c.muted}`}>{text}</span>;
};

const statusColor = (s) => {
  if (!s) return "muted";
  if (s === "Complete") return "green";
  if (s === "In Progress" || s === "Ongoing") return "amber";
  if (s === "Not Started") return "muted";
  return "muted";
};

const Stat = ({ label, value, accent, sub }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
    <div className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">{label}</div>
    <div className={`text-xl font-semibold tabular-nums ${accent ? "text-amber-400" : "text-white"}`}>{value}</div>
    {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
  </div>
);

const BarFill = ({ value, max }) => {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max * 1.02;
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: over ? "#ef4444" : "#d97706" }} />
    </div>
  );
};

const Divider = ({ title }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</span>
    <div className="flex-1 h-px bg-zinc-800" />
  </div>
);

const TH = ({ children, right }) => (
  <th className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${right ? "text-right" : "text-left"}`}>{children}</th>
);
const TD = ({ children, right, mono, className = "", colSpan }) => (
  <td colSpan={colSpan} className={`px-3 py-2.5 text-xs ${right ? "text-right tabular-nums" : ""} ${mono ? "font-mono" : ""} ${className}`}>{children}</td>
);

// ─── PDF UPLOAD VIEW ───────────────────────────────────────────────────────────
function UploadsView({ uploads, setUploads }) {
  const [form, setForm] = useState({ type: "Invoice", linkedId: "", note: "" });
  const [pending, setPending] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef();

  const LINKS = {
    "Invoice": INVOICES.map(i => ({ id: i.id, label: `${i.id} · ${i.invNum} – ${i.desc}` })),
    "Award Letter": AWARDS.map(a => ({ id: a.id, label: `${a.id} · ${a.vendor} (${a.division})` })),
    "Change Order": CHANGE_ORDERS.map(c => ({ id: c.no, label: `${c.no} · ${c.div}` })),
    "Other": [],
  };

  const processFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return alert("Please select a PDF file.");
    setPending(file);
  };

  const save = () => {
    if (!pending) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploads(prev => [...prev, {
        id: `DOC-${Date.now()}`,
        name: pending.name,
        type: form.type,
        linkedId: form.linkedId,
        note: form.note,
        size: `${(pending.size / 1024).toFixed(0)} KB`,
        date: new Date().toLocaleDateString("en-US"),
        dataUrl: e.target.result,
      }]);
      setPending(null);
      setForm({ type: "Invoice", linkedId: "", note: "" });
    };
    reader.readAsDataURL(pending);
  };

  const byType = uploads.reduce((acc, u) => { (acc[u.type] = acc[u.type] || []).push(u); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <Divider title="Upload Document" />
        <div className="grid md:grid-cols-2 gap-5">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-amber-500 bg-amber-500/5" : "border-zinc-700 hover:border-zinc-600"}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
          >
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => processFile(e.target.files[0])} />
            {pending ? (
              <div><p className="text-sm text-amber-400 font-medium">{pending.name}</p><p className="text-xs text-zinc-600 mt-1">{(pending.size / 1024).toFixed(0)} KB · Ready to save</p></div>
            ) : (
              <div><p className="text-sm text-zinc-500">Drop PDF here or click to browse</p><p className="text-xs text-zinc-700 mt-1">PDF files only</p></div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-600 block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, linkedId: "" }))} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 outline-none">
                {["Invoice", "Award Letter", "Change Order", "Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {LINKS[form.type]?.length > 0 && (
              <div>
                <label className="text-xs text-zinc-600 block mb-1">Link to record</label>
                <select value={form.linkedId} onChange={e => setForm(f => ({ ...f, linkedId: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 outline-none">
                  <option value="">— Select —</option>
                  {LINKS[form.type].map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-600 block mb-1">Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Add a note…" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none" />
            </div>
            <button onClick={save} disabled={!pending} className={`w-full py-2 rounded text-xs font-semibold transition-colors ${pending ? "bg-amber-600 text-black hover:bg-amber-500" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>Save Document</button>
          </div>
        </div>
      </div>

      {uploads.length === 0 ? (
        <div className="text-center py-16 text-zinc-700 text-sm">No documents uploaded yet.</div>
      ) : (
        Object.entries(byType).map(([type, docs]) => (
          <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{type}s</span>
              <span className="text-xs text-zinc-600">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
            </div>
            {docs.map(doc => (
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/40 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{doc.size}</span><span className="text-zinc-700">·</span><span>{doc.date}</span>
                      {doc.linkedId && <><span className="text-zinc-700">·</span><span className="text-amber-500/70">↳ {doc.linkedId}</span></>}
                      {doc.note && <><span className="text-zinc-700">·</span><span className="italic">{doc.note}</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button onClick={() => setViewing(doc)} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-700 hover:border-zinc-500 rounded px-2.5 py-1">View</button>
                  <button onClick={() => setUploads(prev => prev.filter(u => u.id !== doc.id))} className="text-xs text-zinc-700 hover:text-red-400 transition-colors px-1.5 py-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setViewing(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl flex flex-col" style={{ maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <div><p className="text-sm font-semibold text-zinc-200">{viewing.name}</p><p className="text-xs text-zinc-500">{viewing.type} · {viewing.size} · {viewing.date}</p></div>
              <button onClick={() => setViewing(null)} className="text-zinc-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <iframe src={viewing.dataUrl} className="w-full rounded border border-zinc-800" style={{ height: "65vh" }} title={viewing.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ uploads }) {
  const pending = INVOICES.filter(i => i.status !== "Paid");
  const pendingTotal = pending.reduce((s, i) => s + i.amtDue, 0);
  const catBudget = {};
  BUDGET.forEach(b => { catBudget[b.cat] = (catBudget[b.cat] || 0) + b.budget; });

  const vendorSummary = [
    { name: "Taconic Builders (Ph. 1.1 GC)", paid: taconicPaid, pending: pendingTotal, color: "#d97706" },
    { name: "Architecturefirm", paid: afPaid, pending: 0, color: "#60a5fa" },
    { name: "Reed Hilderbrand", paid: rhPaid, pending: 0, color: "#34d399" },
    { name: "Ivan Zdrahal Engineering", paid: izPaid, pending: 0, color: "#a78bfa" },
    { name: "Demolition (C25-102)", paid: 335189.43, pending: 0, color: "#f87171" },
    { name: "Road Construction", paid: 457500, pending: 0, color: "#fb923c" },
  ];

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3">
          <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-400">Payment Action Required</p>
            <p className="text-xs text-zinc-500 mt-0.5">{pending.length} Taconic invoices pending — {pending.map(i => i.invNum).join(", ")} — totaling {$(pendingTotal)}</p>
          </div>
        </div>
      )}

      {/* All-in totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Grand Total Paid (All)" value={$(grandTotalPaid)} sub="All vendors + prior phases" accent />
        <Stat label="Phase 1.1 GC Budget" value={$(totalBudget)} sub="Taconic control budget" />
        <Stat label="Phase 1.1 Awarded" value={$(totalAwarded)} sub={`${pct(totalAwarded / totalBudget)} of budget`} />
        <Stat label="Phase 1.1 Paid to GC" value={$(taconicPaid)} sub={`${pct(taconicPaid / totalAwarded)} of awarded`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Approved COs (Ph. 1.1)" value={$(totalCOs)} sub={`${CHANGE_ORDERS.length} change orders`} />
        <Stat label="Retainage Held" value="$217,342" sub="Released at close" />
        <Stat label="Taconic Pending" value={$(pendingTotal)} sub={`${pending.length} invoices outstanding`} accent />
        <Stat label="Balance to Finish (GC)" value="$10.14M" sub="Incl. retainage" />
      </div>

      {/* Project info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[["Project","Camp Forestmere – Phase 1.1"],["General Contractor","Taconic Builders Inc."],["Start / Duration","Jun 23, 2025 · 22 months"],["Est. Completion","April 2027"],["Owner","JXM / Camp Forestmere Corp."],["Project Manager","Joseph Hamilton"],["Tracker","Brittany Klumak (BK)"],["Documents",`${uploads.length} uploaded`]].map(([k, v]) => (
            <div key={k}><span className="text-zinc-600 block">{k}</span><span className="text-zinc-300">{v}</span></div>
          ))}
        </div>
      </div>

      {/* Spend by vendor */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="Total Spend by Vendor / Phase" />
        <div className="space-y-2">
          {vendorSummary.map(v => (
            <div key={v.name} className="flex items-center gap-3 text-xs">
              <span className="text-zinc-500 w-52 shrink-0 truncate">{v.name}</span>
              <div className="flex-1"><BarFill value={v.paid} max={grandTotalPaid} /></div>
              <span className="text-zinc-300 tabular-nums w-28 text-right">{$(v.paid)}</span>
              {v.pending > 0 && <span className="text-amber-500/70 tabular-nums w-24 text-right">+{$(v.pending)} pending</span>}
            </div>
          ))}
          <div className="flex items-center gap-3 text-xs border-t border-zinc-800 pt-2 mt-2">
            <span className="text-zinc-400 font-semibold w-52 shrink-0">TOTAL PAID</span>
            <div className="flex-1" />
            <span className="text-white font-semibold tabular-nums w-28 text-right">{$(grandTotalPaid)}</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="Ph. 1.1 Budget vs. Awarded by Category" />
        <div className="space-y-2">
          {Object.entries(catBudget).sort((a, b) => b[1] - a[1]).map(([cat, bud]) => {
            const awd = AWARDS.filter(a => BUDGET.find(b => b.code === a.code)?.cat === cat).reduce((s, a) => s + a.current, 0);
            return (
              <div key={cat} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-600 w-24 shrink-0">{cat}</span>
                <div className="flex-1"><BarFill value={awd} max={bud} /></div>
                <span className="text-zinc-500 w-24 text-right tabular-nums">{$(bud)}</span>
                <span className="text-zinc-700 w-16 text-right">{awd > 0 ? pct(awd / bud) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Taconic reconciliation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="Taconic Statement Reconciliation (Inv. #1956)" />
        <table className="w-full text-xs">
          <thead><tr className="border-b border-zinc-800 text-zinc-600">
            <th className="pb-2 text-left font-medium">Line Item</th>
            <th className="pb-2 text-right font-medium">Per Taconic</th>
            <th className="pb-2 text-right font-medium">Our Check</th>
            <th className="pb-2 text-right font-medium">Diff</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {[
              ["Original Contract", 13093419.47, 13093419.47, 0],
              ["Approved Changes", 303832.27, 303832.27, 0],
              ["Revised Contract", 13397251.74, 13397251.74, 0],
              ["Completed to Date", 3259497.88, 3259497.88, 0],
              ["Retainage Held", 217342.38, 217342.38, 0],
              ["Total Earned Less Retainage", 3042155.50, 3042155.50, 0],
              ["Current Amount Due", 62658.43, 62658.43, 0],
            ].map(([label, t, c, d]) => (
              <tr key={label}>
                <td className="py-1.5 text-zinc-400">{label}</td>
                <td className="py-1.5 text-right tabular-nums text-zinc-400">{$(t)}</td>
                <td className="py-1.5 text-right tabular-nums text-zinc-400">{$(c)}</td>
                <td className={`py-1.5 text-right tabular-nums font-medium ${Math.abs(d) > 100 ? "text-amber-400" : "text-zinc-700"}`}>{d === 0 ? "—" : `${d > 0 ? "+" : "-"}${$(Math.abs(d))}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-emerald-500/70 mt-3">✓ Invoice #1956 reconciles cleanly. #1880 still pending — note double-payment credit to apply.</p>
      </div>
    </div>
  );
}

// ─── BUDGET VIEW ───────────────────────────────────────────────────────────────
function BudgetView() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const cats = ["All", ...Array.from(new Set(BUDGET.map(b => b.cat)))];
  const rows = BUDGET.filter(b => (cat === "All" || b.cat === cat) && (b.name.toLowerCase().includes(q.toLowerCase()) || b.code.includes(q)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 w-40" />
        <div className="flex flex-wrap gap-1">
          {cats.map(c => <button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1 rounded text-xs transition-all ${cat === c ? "bg-amber-600 text-black font-semibold" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{c}</button>)}
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>Code</TH><TH>Division</TH><TH right>Budget</TH><TH right>Awarded</TH><TH right>Variance</TH><TH>% Awarded</TH><TH>Status</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {rows.map(b => {
              const awd = awardedByCode[b.code] || 0;
              const vari = b.budget - awd;
              const ap = b.budget > 0 ? awd / b.budget : 0;
              return (
                <tr key={b.code} className="hover:bg-zinc-800/15 transition-colors">
                  <TD mono className="text-zinc-600">{b.code}</TD>
                  <TD className="text-zinc-300">{b.name}</TD>
                  <TD right className="text-zinc-500">{$(b.budget)}</TD>
                  <TD right className={awd > 0 ? "text-zinc-200" : "text-zinc-700"}>{awd > 0 ? $(awd) : "—"}</TD>
                  <TD right className={awd > 0 ? (vari < 0 ? "text-red-400" : "text-zinc-400") : "text-zinc-700"}>{awd > 0 ? (vari < 0 ? `-${$(-vari)}` : $(vari)) : "—"}</TD>
                  <TD className="w-32">{awd > 0 && <div className="flex items-center gap-2"><BarFill value={awd} max={b.budget} /><span className="text-zinc-600 w-10">{pct(ap)}</span></div>}</TD>
                  <TD><Tag text={awd === 0 ? "Not Awarded" : ap > 1.05 ? "Over Budget" : "Awarded"} color={awd === 0 ? "muted" : ap > 1.05 ? "red" : "green"} /></TD>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD className="text-zinc-500 font-semibold" colSpan={2}>Total ({rows.length})</TD>
            <TD right className="text-zinc-300 font-semibold">{$(rows.reduce((s, b) => s + b.budget, 0))}</TD>
            <TD right className="text-zinc-200 font-semibold">{$(rows.reduce((s, b) => s + (awardedByCode[b.code] || 0), 0))}</TD>
            <TD colSpan={3} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── AWARDS VIEW ───────────────────────────────────────────────────────────────
function AwardsView({ uploads }) {
  const [q, setQ] = useState("");
  const rows = AWARDS.filter(a => a.vendor.toLowerCase().includes(q.toLowerCase()) || a.id.includes(q) || a.code.includes(q));
  const vendorTotals = AWARDS.reduce((acc, a) => { acc[a.vendor] = (acc[a.vendor] || 0) + a.current; return acc; }, {});
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="By Vendor" />
        <div className="grid md:grid-cols-2 gap-2">
          {Object.entries(vendorTotals).sort((a, b) => b[1] - a[1]).map(([v, t]) => (
            <div key={v} className="flex justify-between bg-zinc-800/40 rounded px-3 py-2">
              <span className="text-xs text-zinc-300 truncate">{v}</span>
              <span className="text-xs tabular-nums text-zinc-200 ml-4 shrink-0">{$(t)}</span>
            </div>
          ))}
        </div>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 w-48" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>ID</TH><TH>Date</TH><TH>Vendor</TH><TH>Div.</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH><TH right>Budget</TH><TH right>Variance</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {rows.map(a => {
              const bItem = BUDGET.find(b => b.code === a.code);
              const bAmt = bItem?.budget;
              const vari = bAmt != null ? bAmt - a.current : null;
              return (
                <tr key={a.id} className="hover:bg-zinc-800/15 transition-colors">
                  <TD mono className="text-amber-500/70">{a.id}</TD>
                  <TD className="text-zinc-600">{a.date}</TD>
                  <TD className="text-zinc-200 font-medium max-w-[180px] truncate">{a.vendor}</TD>
                  <TD mono className="text-zinc-600">{a.code}</TD>
                  <TD right className="text-zinc-400">{$(a.award)}</TD>
                  <TD right className={a.cos > 0 ? "text-amber-500/70" : "text-zinc-700"}>{a.cos > 0 ? `+${$(a.cos)}` : "—"}</TD>
                  <TD right className="text-zinc-200 font-semibold">{$(a.current)}</TD>
                  <TD right className="text-zinc-500">{bAmt ? $(bAmt) : "—"}</TD>
                  <TD right className={vari != null ? (vari < 0 ? "text-red-400" : "text-zinc-400") : "text-zinc-700"}>{vari != null ? (vari < 0 ? `-${$(-vari)}` : $(vari)) : "—"}</TD>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={4} className="text-zinc-500 font-semibold">Total ({rows.length})</TD>
            <TD right className="text-zinc-400 font-semibold">{$(rows.reduce((s, a) => s + a.award, 0))}</TD>
            <TD right className="text-amber-500/70 font-semibold">+{$(rows.reduce((s, a) => s + a.cos, 0))}</TD>
            <TD right className="text-zinc-200 font-semibold">{$(rows.reduce((s, a) => s + a.current, 0))}</TD>
            <TD colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── CHANGE ORDERS VIEW ────────────────────────────────────────────────────────
function COsView({ uploads }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total COs" value={String(CHANGE_ORDERS.length)} sub="Approved by Mark" />
        <Stat label="Net CO Amount" value={$(CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0))} sub="Excl. fees" accent />
        <Stat label="Incl. Fees" value={$(CHANGE_ORDERS.reduce((s, c) => s + c.total, 0))} sub="13.5% + 3% ins." />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>CO #</TH><TH>Date</TH><TH>Division</TH><TH right>Orig. Budget</TH><TH right>CO Amount</TH><TH right>Fees</TH><TH right>Total w/ Fees</TH><TH right>Revised Budget</TH><TH>Notes</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {CHANGE_ORDERS.map(co => (
              <tr key={co.no} className="hover:bg-zinc-800/15 transition-colors">
                <TD mono className="text-amber-500/70">{co.no}</TD>
                <TD className="text-zinc-600">{co.date}</TD>
                <TD className="text-zinc-300">{co.div}</TD>
                <TD right className="text-zinc-500">{$(co.origBudget)}</TD>
                <TD right className="text-amber-400 font-semibold">+{$(co.approvedCO)}</TD>
                <TD right className="text-zinc-500">{$(co.fees)}</TD>
                <TD right className="text-zinc-300">+{$(co.total)}</TD>
                <TD right className="text-zinc-200">{$(co.revisedBudget)}</TD>
                <TD className="text-zinc-600 max-w-xs italic">{co.notes || "—"}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={4} className="text-zinc-500 font-semibold">Totals</TD>
            <TD right className="text-zinc-200 font-semibold">+{$(CHANGE_ORDERS.reduce((s, c) => s + c.approvedCO, 0))}</TD>
            <TD right className="text-zinc-400 font-semibold">{$(CHANGE_ORDERS.reduce((s, c) => s + c.fees, 0))}</TD>
            <TD right className="text-amber-500/70 font-semibold">+{$(CHANGE_ORDERS.reduce((s, c) => s + c.total, 0))}</TD>
            <TD colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── INVOICES VIEW ─────────────────────────────────────────────────────────────
function InvoicesView({ uploads }) {
  const [expanded, setExpanded] = useState(null);
  const getDocs = (id) => uploads.filter(u => u.type === "Invoice" && u.linkedId === id);
  const pendingTotal = INVOICES.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amtDue, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Gross Invoiced" value={$(INVOICES.reduce((s, i) => s + i.jobTotal, 0))} sub="Before retainage & deposits" />
        <Stat label="Total Paid" value={$(totalPaid)} sub={`${INVOICES.filter(i => i.status === "Paid").length} invoices`} />
        <Stat label="Retainage Held" value="$217,342" sub="Released at close" />
        <Stat label="Pending" value={$(pendingTotal)} sub={`${INVOICES.filter(i => i.status !== "Paid").length} outstanding`} accent />
      </div>
      <div className="space-y-2">
        {INVOICES.map(inv => {
          const docs = getDocs(inv.id);
          const open = expanded === inv.id;
          return (
            <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <button className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-zinc-800/20 transition-colors" onClick={() => setExpanded(open ? null : inv.id)}>
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-xs text-amber-500/70 w-20 shrink-0">{inv.id}</span>
                  <span className="font-mono text-xs text-zinc-300 font-semibold w-28 shrink-0">{inv.invNum}</span>
                  <span className="text-xs text-zinc-500 truncate">{inv.desc}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {docs.length > 0 && <span className="text-amber-500/60 text-xs">📄 {docs.length}</span>}
                  <span className="text-sm font-semibold text-zinc-200 tabular-nums">{$(inv.approved)}</span>
                  <Tag text={inv.status} color={inv.status === "Paid" ? "green" : "amber"} />
                  <span className="text-zinc-700 text-xs">{open ? "▲" : "▼"}</span>
                </div>
              </button>
              {open && (
                <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                    {[["Request Date", inv.reqDate], ["Paid Date", inv.paidDate || "—"], ["Job Total", $(inv.jobTotal)], ["GC Fees", $(inv.fees)], ["Deposit Applied", $(inv.depositApplied)], ["Retainage", $(Math.abs(inv.retainage))], ["Amount Due", $(inv.amtDue)], ["Approved", $(inv.approved)]].map(([k, v]) => (
                      <div key={k}><span className="text-zinc-600 block">{k}</span><span className="text-zinc-300">{v}</span></div>
                    ))}
                  </div>
                  {inv.notes && <p className="text-xs text-amber-400/70 bg-zinc-800 rounded px-3 py-2 mt-1">{inv.notes}</p>}
                  {docs.length > 0 && <div className="mt-3 pt-3 border-t border-zinc-800"><p className="text-xs text-zinc-600 mb-2">Attached</p><div className="flex gap-2 flex-wrap">{docs.map(d => <span key={d.id} className="text-xs text-amber-500/60 bg-zinc-800 rounded px-2 py-1">📄 {d.name}</span>)}</div></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LINE ITEM VIEW ────────────────────────────────────────────────────────────
function LineItemView() {
  const [sel, setSel] = useState("All");
  const rows = LINE_ITEMS.filter(li => sel === "All" || (li.inv[sel] != null && li.inv[sel] > 0));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-600">Invoice:</span>
        {["All", ...INV_NUMS].map(n => <button key={n} onClick={() => setSel(n)} className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${sel === n ? "bg-amber-600 text-black font-semibold" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{n}</button>)}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50">
            <TH>Code</TH><TH>Description</TH><TH right>Control Budget</TH><TH right>Approved COs</TH><TH right>Revised Budget</TH><TH right>Completed</TH><TH>% Done</TH>
            {sel !== "All" && <TH right>{sel}</TH>}
          </tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {rows.map(li => {
              const rev = li.budget + li.cos;
              return (
                <tr key={li.code} className="hover:bg-zinc-800/15 transition-colors">
                  <TD mono className="text-zinc-600">{li.code}</TD>
                  <TD className="text-zinc-300">{li.name}</TD>
                  <TD right className="text-zinc-500">{$(li.budget)}</TD>
                  <TD right className={li.cos > 0 ? "text-amber-500/70" : "text-zinc-700"}>{li.cos > 0 ? `+${$(li.cos)}` : "—"}</TD>
                  <TD right className="text-zinc-400">{$(rev)}</TD>
                  <TD right className="text-zinc-200 font-semibold">{$(li.done)}</TD>
                  <TD className="w-28"><div className="flex items-center gap-2"><BarFill value={li.done} max={rev} /><span className="text-zinc-600 w-10">{pct(li.pct)}</span></div></TD>
                  {sel !== "All" && <TD right className="text-amber-500/70 font-semibold">{li.inv[sel] ? $(li.inv[sel]) : "—"}</TD>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CASH FLOW VIEW ────────────────────────────────────────────────────────────
function CashFlowView() {
  const bars = [{ m: "Jan", v: 461105 }, { m: "Feb", v: 164106 }, { m: "Mar", v: 164106 }, { m: "Apr", v: 200000 }, { m: "May", v: 210000 }, { m: "Jun", v: 220000 }, { m: "Jul", v: 280000 }, { m: "Aug", v: 280000 }, { m: "Sep", v: 280000 }, { m: "Oct", v: 200000 }, { m: "Nov", v: 175000 }, { m: "Dec", v: 150000 }];
  const maxV = Math.max(...bars.map(b => b.v));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="2025 Carryover" value="$4,541,872" sub="Unfinished 2025 work" accent />
        <Stat label="2026 New Projected" value="$3,902,018" sub="Newly scheduled" />
        <Stat label="Total 2026 Spend" value="$8,443,889" sub="Carryover + new" />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="2026 Monthly Projection (BK Forecast)" />
        <div className="flex items-end gap-1.5 h-32">
          {bars.map(d => {
            const h = Math.round((d.v / maxV) * 100);
            return (
              <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-zinc-700 text-center leading-none" style={{ fontSize: "8px" }}>{$(d.v).replace("$", "").replace(",000", "k")}</span>
                <div className="w-full rounded-sm bg-zinc-700 hover:bg-zinc-500 transition-colors cursor-default" style={{ height: `${h}%` }} title={$(d.v)} />
                <span className="text-zinc-600 leading-none" style={{ fontSize: "9px" }}>{d.m}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="Top 2025 Carryover Items" />
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 text-zinc-600"><TH>Code</TH><TH>Description</TH><TH right>2025 Carryover</TH><TH right>2026 New</TH><TH right>Grand Total</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {[["01-001", "Project Staffing (22 months)", 296747, 656427, 953174], ["31-640", "Sheet Pile / Caissons", 416472, 0, 416472], ["31-200", "Excavations & Backfilling", 377267, 0, 377267], ["33-370", "Electrical Service", 314905, 78850, 393754], ["03-330", "Cast In Place Concrete", 264650, 0, 264650], ["06-200", "Ext. Finish Carpentry - Labor", 169071, 253607, 422678], ["32-010", "Paving (Hardscape)", 89311, 357245, 446556], ["09-300", "Tile & Stone", 245457, 163638, 409095]].map(r => (
              <tr key={r[0]} className="hover:bg-zinc-800/15 transition-colors">
                <TD mono className="text-zinc-600">{r[0]}</TD>
                <TD className="text-zinc-300">{r[1]}</TD>
                <TD right className="text-amber-500/70">{$(r[2])}</TD>
                <TD right className="text-zinc-400">{r[3] > 0 ? $(r[3]) : "—"}</TD>
                <TD right className="text-zinc-200 font-semibold">{$(r[4])}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PRIOR PHASES VIEW ─────────────────────────────────────────────────────────
function PriorPhasesView() {
  const [expanded, setExpanded] = useState(null);
  const totalPriorPaid = PRIOR_PHASES.reduce((s, p) => s + p.totalPaid, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Prior Phases" value={String(PRIOR_PHASES.length)} sub="Demolition + Road Construction" />
        <Stat label="Total Paid (Prior)" value={$(totalPriorPaid)} sub="Confirmed amounts only" accent />
        <Stat label="Status" value="Complete" sub="Both phases closed out" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Divider title="Phase Timeline" />
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-700" />
          {[
            { label: "Road Construction", date: "Jan–Mid 2024", color: "#fb923c", amount: "$457,500" },
            { label: "Demolition", date: "Jan–May 2025", color: "#f87171", amount: "$335,189 paid" },
            { label: "Phase 1.1 Start", date: "Jun 23, 2025", color: "#d97706", amount: "Ongoing" },
            { label: "Est. Completion", date: "April 2027", color: "#4b5563", amount: "—" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 mb-4 relative">
              <div className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-zinc-900" style={{ background: item.color }} />
              <div>
                <p className="text-xs font-semibold text-zinc-300">{item.label}</p>
                <p className="text-xs text-zinc-600">{item.date} · {item.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {PRIOR_PHASES.map(phase => {
        const open = expanded === phase.id;
        return (
          <div key={phase.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors" onClick={() => setExpanded(open ? null : phase.id)}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-200">{phase.name}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{phase.jobNum} · {phase.gc} · {phase.startDate} – {phase.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-200">{$(phase.totalPaid)}</p>
                  <p className="text-xs text-zinc-600">Total paid</p>
                </div>
                <Tag text={phase.status} color={statusColor(phase.status)} />
                <span className="text-zinc-700 text-xs">{open ? "▲" : "▼"}</span>
              </div>
            </button>

            {open && (
              <div className="border-t border-zinc-800 px-5 py-5 bg-zinc-950/20 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {[["Subcontractor", phase.subcontractor], ["Original Contract", $(phase.originalContract)], ["Approved COs", $(phase.approvedCOs)], ["Final Contract", $(phase.finalContract)], ["Total Paid", $(phase.totalPaid)], ["Scope", phase.scope]].map(([k, v]) => (
                    <div key={k}><span className="text-zinc-600 block">{k}</span><span className="text-zinc-300">{v}</span></div>
                  ))}
                </div>

                {phase.lineItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Line Items</p>
                    <table className="w-full">
                      <thead><tr className="border-b border-zinc-800"><TH>Code</TH><TH>Description</TH><TH right>Budget</TH><TH right>Paid</TH></tr></thead>
                      <tbody className="divide-y divide-zinc-800/30">
                        {phase.lineItems.map(li => (
                          <tr key={li.code} className="hover:bg-zinc-800/10">
                            <TD mono className="text-zinc-600">{li.code}</TD>
                            <TD className="text-zinc-300">{li.desc}</TD>
                            <TD right className="text-zinc-500">{$(li.budget)}</TD>
                            <TD right className="text-zinc-200 font-semibold">{$(li.paid)}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {phase.cos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Change Orders</p>
                    <div className="space-y-1">
                      {phase.cos.map(co => (
                        <div key={co.no} className="flex justify-between text-xs bg-zinc-800/30 rounded px-3 py-2">
                          <span className="font-mono text-amber-500/70 mr-3">{co.no}</span>
                          <span className="text-zinc-400 flex-1">{co.desc}</span>
                          <span className={`tabular-nums ml-4 font-semibold ${co.amount < 0 ? "text-emerald-400" : "text-amber-400"}`}>{co.amount < 0 ? `-${$(-co.amount)}` : `+${$(co.amount)}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase.notes && <p className="text-xs text-zinc-600 italic border-t border-zinc-800 pt-3">{phase.notes}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── VENDOR: IVAN ZDRAHAL ──────────────────────────────────────────────────────
function IvanZdrahalView() {
  const totalBudget = IVAN_ZDRAHAL.phases.reduce((s, p) => s + (p.budget || 0), 0);
  const totalInvoiced = IVAN_ZDRAHAL.phases.reduce((s, p) => s + p.invoiced, 0);
  const remaining = totalBudget - totalInvoiced;

  return (
    <div className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{IVAN_ZDRAHAL.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{IVAN_ZDRAHAL.role}</p>
        </div>
        <Tag text="Active" color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Budget" value={$(totalBudget)} sub="All phases combined" />
        <Stat label="Total Invoiced" value={$(totalInvoiced)} sub="Paid to date" accent />
        <Stat label="Remaining Budget" value={$(remaining)} sub="Future services" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800"><span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Budget by Phase</span></div>
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>Phase</TH><TH>Description</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {IVAN_ZDRAHAL.phases.map(p => {
              const rem = (p.budget || 0) - p.invoiced;
              return (
                <tr key={p.phase} className="hover:bg-zinc-800/15 transition-colors">
                  <TD className="text-zinc-300 font-medium">{p.phase}</TD>
                  <TD className="text-zinc-500 max-w-xs">{p.desc}</TD>
                  <TD right className="text-zinc-500">{p.budget ? $(p.budget) : "T&M"}</TD>
                  <TD right className="text-zinc-200 font-semibold">{$(p.invoiced)}</TD>
                  <TD right className={rem < 0 ? "text-red-400" : rem > 0 ? "text-zinc-400" : "text-zinc-700"}>{p.budget ? (rem > 0 ? $(rem) : rem < 0 ? `-${$(-rem)}` : "—") : "T&M"}</TD>
                  <TD><Tag text={p.status} color={statusColor(p.status)} /></TD>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={2} className="text-zinc-500 font-semibold">Grand Total</TD>
            <TD right className="text-zinc-400 font-semibold">{$(totalBudget)}</TD>
            <TD right className="text-zinc-200 font-semibold">{$(totalInvoiced)}</TD>
            <TD right className="text-zinc-400 font-semibold">{$(remaining)}</TD>
            <TD />
          </tr></tfoot>
        </table>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800"><span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Recent Invoices (Phase 2)</span></div>
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>Invoice #</TH><TH>Date</TH><TH>Description</TH><TH right>Amount</TH><TH>Budget Line</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {IVAN_ZDRAHAL.invoices.map(inv => (
              <tr key={inv.invNum + inv.date} className="hover:bg-zinc-800/15 transition-colors">
                <TD mono className="text-amber-500/70">{inv.invNum}</TD>
                <TD className="text-zinc-600">{inv.date}</TD>
                <TD className="text-zinc-300">{inv.desc}</TD>
                <TD right className="text-zinc-200 font-semibold">{$(inv.amount)}</TD>
                <TD className="text-zinc-500">{inv.budget}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={3} className="text-zinc-500 font-semibold">Total (Phase 2 to date)</TD>
            <TD right className="text-zinc-200 font-semibold">{$(IVAN_ZDRAHAL.invoices.reduce((s, i) => s + i.amount, 0))}</TD>
            <TD />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── VENDOR: REED HILDERBRAND ─────────────────────────────────────────────────
function ReedHilderbrandView() {
  const totalInvoiced = REED_HILDERBRAND.phases.reduce((s, p) => s + p.invoiced, 0);
  const totalBudgeted = REED_HILDERBRAND.phases.reduce((s, p) => s + (typeof p.budget === "number" ? p.budget : 0), 0);
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Complete", "In Progress", "Not Started", "Ongoing"];
  const rows = REED_HILDERBRAND.phases.filter(p => filter === "All" || p.status === filter);

  return (
    <div className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{REED_HILDERBRAND.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{REED_HILDERBRAND.role} · Budget date: Nov 12, 2025</p>
        </div>
        <Tag text="Active" color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Invoiced" value={$(totalInvoiced)} sub="All phases" accent />
        <Stat label="Fixed-Fee Budgeted" value={$(totalBudgeted)} sub="Non-T&M phases" />
        <Stat label="Phase 1.1 CA Ongoing" value="T&M" sub="~$20-25k/active month" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded text-xs transition-all ${filter === f ? "bg-amber-600 text-black font-semibold" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{f}</button>)}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>Phase</TH><TH>Description</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {rows.map((p, i) => {
              const rem = typeof p.budget === "number" ? p.budget - p.invoiced : null;
              return (
                <tr key={i} className="hover:bg-zinc-800/15 transition-colors">
                  <TD className="text-zinc-300 font-medium">{p.phase}</TD>
                  <TD className="text-zinc-500 max-w-xs">{p.desc}</TD>
                  <TD right className="text-zinc-500">{typeof p.budget === "number" ? $(p.budget) : p.budget || "T&M"}</TD>
                  <TD right className="text-zinc-200 font-semibold">{$(p.invoiced)}</TD>
                  <TD right className={rem == null ? "text-zinc-700" : rem < 0 ? "text-red-400" : rem > 0 ? "text-zinc-400" : "text-zinc-700"}>
                    {rem == null ? "T&M" : rem > 0 ? $(rem) : rem < 0 ? `-${$(-rem)}` : "—"}
                  </TD>
                  <TD><Tag text={p.status} color={statusColor(p.status)} /></TD>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={3} className="text-zinc-500 font-semibold">Total Invoiced</TD>
            <TD right className="text-zinc-200 font-semibold">{$(totalInvoiced)}</TD>
            <TD colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── VENDOR: ARCHITECTUREFIRM ─────────────────────────────────────────────────
function ArchitecturefirmView() {
  const totalBilled = ARCHITECTUREFIRM.phases.reduce((s, p) => s + p.billed, 0);
  const totalRemaining = ARCHITECTUREFIRM.phases.reduce((s, p) => s + p.remaining, 0);
  const totalProj = ARCHITECTUREFIRM.phases.reduce((s, p) => s + (p.projFee || 0), 0);
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Complete", "In Progress", "Not Started", "Ongoing"];
  const rows = ARCHITECTUREFIRM.phases.filter(p => filter === "All" || p.status === filter);

  return (
    <div className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{ARCHITECTUREFIRM.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{ARCHITECTUREFIRM.role} · Fee summary updated Nov 7, 2025</p>
        </div>
        <Tag text="Active" color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Billed" value={$(totalBilled)} sub="All phases" accent />
        <Stat label="Projected Fees" value={$(totalProj)} sub="Fixed-fee phases" />
        <Stat label="Fee Remaining" value={$(totalRemaining)} sub="Incl. Great Hall ($605k)" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[["Overall Billed", "$2,119,154"], ["Remaining to Bill", "$902,842"], ["CA Phase 1.1", "$61,690 billed / ~$216k–$288k est."], ["FFE Design", "$29,215 billed / TBD remaining"]].map(([k, v]) => (
            <div key={k}><span className="text-zinc-600 block">{k}</span><span className="text-zinc-300">{v}</span></div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded text-xs transition-all ${filter === f ? "bg-amber-600 text-black font-semibold" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{f}</button>)}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800 bg-zinc-950/50"><TH>Phase</TH><TH>Description</TH><TH right>Proj. Fee</TH><TH right>Billed</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
          <tbody className="divide-y divide-zinc-800/30">
            {rows.map((p, i) => (
              <tr key={i} className="hover:bg-zinc-800/15 transition-colors">
                <TD className="text-zinc-300 font-medium">{p.phase}</TD>
                <TD className="text-zinc-500 max-w-xs">{p.desc}</TD>
                <TD right className="text-zinc-500">{p.projFee ? $(p.projFee) : "—"}</TD>
                <TD right className="text-zinc-200 font-semibold">{$(p.billed)}</TD>
                <TD right className={p.remaining > 0 ? "text-amber-400" : "text-zinc-700"}>{p.remaining > 0 ? $(p.remaining) : "—"}</TD>
                <TD><Tag text={p.status} color={statusColor(p.status)} /></TD>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-zinc-700 bg-zinc-950/50">
            <TD colSpan={2} className="text-zinc-500 font-semibold">Totals</TD>
            <TD right className="text-zinc-400 font-semibold">{$(totalProj)}</TD>
            <TD right className="text-zinc-200 font-semibold">{$(totalBilled)}</TD>
            <TD right className="text-amber-400 font-semibold">{$(totalRemaining)}</TD>
            <TD />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "budget", label: "Control Budget" },
  { id: "awards", label: "Awards" },
  { id: "invoices", label: "Invoices" },
  { id: "lineitem", label: "Line Item Billing" },
  { id: "cos", label: "Change Orders" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "prior", label: "Prior Phases" },
  { id: "ivan", label: "Ivan Zdrahal" },
  { id: "reed", label: "Reed Hilderbrand" },
  { id: "arch", label: "Architecturefirm" },
  { id: "uploads", label: "Documents" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [uploads, setUploads] = useState([]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#18181b}
        ::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:3px}
      `}</style>

      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-6 pt-4 pb-0 flex items-center justify-between">
          <div className="pb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">Camp Forestmere</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">Phase 1.1</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">Taconic Builders</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1" />
            </div>
            <p className="text-xs text-zinc-700 mt-0.5">JXM / Camp Forestmere Corp. · Mar 5, 2026</p>
          </div>
          {uploads.length > 0 && <span className="text-xs text-zinc-600 pb-3">{uploads.length} doc{uploads.length !== 1 ? "s" : ""}</span>}
        </div>
        <div className="max-w-screen-xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs whitespace-nowrap border-b-2 transition-all ${tab === t.id ? "border-amber-500 text-white font-medium" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}>
              {t.label}
              {t.id === "uploads" && uploads.length > 0 && <span className="ml-1.5 text-amber-500/60">{uploads.length}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab === "dashboard" && <Dashboard uploads={uploads} />}
        {tab === "budget" && <BudgetView />}
        {tab === "awards" && <AwardsView uploads={uploads} />}
        {tab === "invoices" && <InvoicesView uploads={uploads} />}
        {tab === "lineitem" && <LineItemView />}
        {tab === "cos" && <COsView uploads={uploads} />}
        {tab === "cashflow" && <CashFlowView />}
        {tab === "prior" && <PriorPhasesView />}
        {tab === "ivan" && <IvanZdrahalView />}
        {tab === "reed" && <ReedHilderbrandView />}
        {tab === "arch" && <ArchitecturefirmView />}
        {tab === "uploads" && <UploadsView uploads={uploads} setUploads={setUploads} />}
      </main>
    </div>
  );
}
