import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;

// ─── DATABASE ──────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget (
      code VARCHAR(10) PRIMARY KEY,
      name TEXT NOT NULL,
      budget NUMERIC(14,2) NOT NULL,
      cat VARCHAR(50) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS awards (
      id VARCHAR(20) PRIMARY KEY,
      award_date VARCHAR(20),
      vendor TEXT,
      code VARCHAR(10),
      division TEXT,
      description TEXT,
      award_amount NUMERIC(14,2),
      co_amount NUMERIC(14,2) DEFAULT 0,
      current_amount NUMERIC(14,2)
    );
    CREATE TABLE IF NOT EXISTS change_orders (
      no VARCHAR(20) PRIMARY KEY,
      code VARCHAR(10),
      div TEXT,
      orig_budget NUMERIC(14,2),
      approved_co NUMERIC(14,2),
      fees NUMERIC(14,2),
      total NUMERIC(14,2),
      revised_budget NUMERIC(14,2),
      notes TEXT,
      co_date VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(20) PRIMARY KEY,
      req_date VARCHAR(20),
      inv_num VARCHAR(50),
      description TEXT,
      job_total NUMERIC(14,2),
      fees NUMERIC(14,2),
      deposit_applied NUMERIC(14,2),
      retainage NUMERIC(14,2),
      amt_due NUMERIC(14,2),
      approved NUMERIC(14,2),
      paid_date VARCHAR(20),
      status VARCHAR(30),
      notes TEXT,
      actual_paid NUMERIC(14,2),
      credit_applied NUMERIC(14,2)
    );
    -- Add columns if they don't exist yet (safe migration)
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS actual_paid NUMERIC(14,2);
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_applied NUMERIC(14,2);
    CREATE TABLE IF NOT EXISTS line_items (
      code VARCHAR(20) PRIMARY KEY,
      name TEXT,
      budget NUMERIC(14,2),
      cos NUMERIC(14,2) DEFAULT 0,
      done NUMERIC(14,2) DEFAULT 0,
      pct NUMERIC(8,4) DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS line_item_billings (
      line_item_code VARCHAR(20),
      inv_num VARCHAR(50),
      amount NUMERIC(14,2),
      PRIMARY KEY (line_item_code, inv_num)
    );
    CREATE TABLE IF NOT EXISTS vendors (
      key VARCHAR(20) PRIMARY KEY,
      name TEXT,
      full_name TEXT,
      role TEXT,
      color VARCHAR(20)
    );
    CREATE TABLE IF NOT EXISTS vendor_phases (
      id SERIAL PRIMARY KEY,
      vendor_key VARCHAR(20),
      phase TEXT,
      description TEXT,
      budget NUMERIC(14,2),
      invoiced NUMERIC(14,2) DEFAULT 0,
      status VARCHAR(30),
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vendor_invoices (
      id SERIAL PRIMARY KEY,
      vendor_key VARCHAR(20),
      inv_num VARCHAR(50),
      inv_date VARCHAR(20),
      description TEXT,
      amount NUMERIC(14,2),
      status VARCHAR(30) DEFAULT 'Pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS prior_phases (
      id VARCHAR(50) PRIMARY KEY,
      name TEXT,
      job_num VARCHAR(50),
      gc TEXT,
      subcontractor TEXT,
      start_date VARCHAR(30),
      end_date VARCHAR(30),
      scope TEXT,
      original_contract NUMERIC(14,2),
      approved_cos NUMERIC(14,2),
      final_contract NUMERIC(14,2),
      total_paid NUMERIC(14,2),
      status VARCHAR(30),
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS prior_phase_line_items (
      id SERIAL PRIMARY KEY,
      phase_id VARCHAR(50),
      code VARCHAR(20),
      description TEXT,
      budget NUMERIC(14,2),
      paid NUMERIC(14,2)
    );
    CREATE TABLE IF NOT EXISTS prior_phase_cos (
      id SERIAL PRIMARY KEY,
      phase_id VARCHAR(50),
      no VARCHAR(20),
      description TEXT,
      amount NUMERIC(14,2)
    );
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type VARCHAR(50),
      vendor_key VARCHAR(20),
      vendor_label TEXT,
      linked_id TEXT,
      note TEXT,
      file_data BYTEA,
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cash_flow_monthly (
      month VARCHAR(10) PRIMARY KEY,
      value NUMERIC(14,2)
    );
    CREATE TABLE IF NOT EXISTS pending_document_items (
      id SERIAL PRIMARY KEY,
      doc_id INTEGER,
      item_type VARCHAR(50),
      item_data JSONB,
      status VARCHAR(30) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM budget');
  if (parseInt(rows[0].count) > 0) return;

  console.log('Seeding database with initial data...');

  // BUDGET
  const budgetRows = [
    ['01-000','General Conditions',1823957,'General'],
    ['03-330','Cast In Place Concrete',401900,'Structure'],
    ['04-570','Chimney / Fireplace',97923,'Structure'],
    ['06-100','Rough Carpentry - Labor',139000,'Structure'],
    ['06-110','Rough Carpentry - Material',146581,'Structure'],
    ['06-120','SIPS Panels (Car Barn & Maint.)',166258,'Structure'],
    ['06-200','Exterior Finish Carpentry - Labor',422678,'Structure'],
    ['06-210','Exterior Finish Carpentry - Material',273230,'Structure'],
    ['06-400','Architectural Woodwork (Casework)',472630,'Finishes'],
    ['06-460','Interior Wood Trims - Labor',129018,'Finishes'],
    ['06-470','Interior Wood Trims - Material',125167,'Finishes'],
    ['07-100','Exterior Waterproofing',26280,'Envelope'],
    ['07-200','Building Insulation',70444,'Envelope'],
    ['07-500','Roofing Systems',213803,'Envelope'],
    ['08-140','Interior Wood Doors & Frames',58081,'Openings'],
    ['08-300','Specialty Doors & Frames',8000,'Openings'],
    ['08-330','Garage Doors',332508,'Openings'],
    ['08-400','Windows and Exterior Doors',207649,'Openings'],
    ['08-600','Skylights',16380,'Openings'],
    ['08-700','Door Hardware',29912,'Openings'],
    ['08-800','Glazing',6840,'Openings'],
    ['09-200','Gypsum Board',4500,'Finishes'],
    ['09-300','Tile & Stone',409095,'Finishes'],
    ['09-640','Wood Flooring',36670,'Finishes'],
    ['09-911','Exterior Finishing',10179,'Finishes'],
    ['09-912','Interior Finishing',26205,'Finishes'],
    ['10-280','Toilet & Bathroom Accessories',10900,'Specialties'],
    ['11-300','Residential Equipment',53441,'Equipment'],
    ['12-200','Window Treatments & Controls',67531,'Furnishings'],
    ['13-110','Hot Tub',232000,'Special'],
    ['13-200','Special Purpose Rooms',100125,'Special'],
    ['21-130','Fire Suppression',50000,'MEP'],
    ['22-100','Plumbing',128831,'MEP'],
    ['22-400','Plumbing Fixtures',74612,'MEP'],
    ['23-100','HVAC',398900,'MEP'],
    ['26-100','Electrical Power & Switching',244183,'MEP'],
    ['26-320','Electrical Generators',12000,'MEP'],
    ['26-500','Interior Lighting Fixtures',129229,'MEP'],
    ['26-560','Exterior Lighting Fixtures',87250,'MEP'],
    ['31-110','Site Clearing',87510,'Sitework'],
    ['31-200','Excavations & Backfilling',996944,'Sitework'],
    ['31-640','Sheet Pile / Caissons',416472,'Sitework'],
    ['32-010','Paving (Hardscape)',446557,'Sitework'],
    ['32-100','Driveway & Curbing',251906,'Sitework'],
    ['32-320','Site Retaining Walls',145433,'Sitework'],
    ['32-900','Plantings & Shrubs',375047,'Landscape'],
    ['33-100','Water Service',108240,'Utilities'],
    ['33-150','Gas Services / Tank',10000,'Utilities'],
    ['33-300','Septic / Sewer Systems',132770,'Utilities'],
    ['33-340','Site Drainage Systems',196790,'Utilities'],
    ['33-370','Electrical Service',788495,'Utilities'],
  ];
  for (const [code, name, budget, cat] of budgetRows) {
    await pool.query('INSERT INTO budget VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [code, name, budget, cat]);
  }

  // AWARDS
  const awardsRows = [
    ['AWD-001','08/07/2025','Renlita Custom Opening Solutions','08-330','Garage Doors','Car Barn – Renlita S-1000 Floataway Motorized Lift-Up Garage Doors (Supply)',233394.24,12600,245994.24],
    ['AWD-002','08/07/2025','Custom Remodeling & Carpentry','08-330','Garage Doors','Garage Doors Installation – Car Barn and Boat House',86229,0,86229],
    ['AWD-003','08/05/2025','Avery\'s Custom Masonry','04-570','Chimney / Fireplace','Main Residence – Isokern Magnum 48" & 60" fireplaces',67927.5,0,67927.5],
    ['AWD-004','07/14/2025','Royal Green','11-300','Residential Equipment','Main Residence & Pavilion – Kitchen appliances, laundry, refrigeration',45551.16,0,45551.16],
    ['AWD-005','06/30/2025','Kubricky Jointa Lime, LLC','31-200','Excavations & Backfilling','Site/Civil – Earthwork, excavations, backfilling',996944,73382,1070326],
    ['AWD-006','06/30/2025','Kubricky Jointa Lime, LLC','32-100','Driveway & Curbing','Site/Civil – Driveway & Curbing',251906,0,251906],
    ['AWD-007','06/30/2025','Kubricky Jointa Lime, LLC','33-340','Site Drainage Systems','Site/Civil – Site Drainage Systems',196790,0,196790],
    ['AWD-008','06/30/2025','Kubricky Jointa Lime, LLC','31-110','Site Clearing','Site/Civil – Site Clearing',80483.35,0,80483.35],
    ['AWD-009','06/17/2025','Krueger Electrical Contracting','26-100','Electrical Power & Switching','Main distribution',244183,0,244183],
    ['AWD-010','06/17/2025','Krueger Electrical Contracting','26-320','Electrical Generators','Electrical Generators',12000,0,12000],
    ['AWD-011','06/17/2025','Krueger Electrical Contracting','26-500','Interior Lighting Fixtures','Interior Lighting Fixtures (Supply)',129229,0,129229],
    ['AWD-012','06/17/2025','Krueger Electrical Contracting','26-560','Exterior Lighting Fixtures','Exterior Lighting Fixtures (Supply)',87250,0,87250],
    ['AWD-013','06/17/2025','Krueger Electrical Contracting','33-370','Electrical Service','Site electrical distribution',686196,12600,698796],
    ['AWD-014','06/17/2025','Krueger Electrical Contracting','33-150','Gas Services / Tank','Gas Services/Tank',10000,0,10000],
    ['AWD-015','07/18/2025','Wagner Pools','13-110','Hot Tub','Pavilion – 60 SF Rectangle Spa, Gunite Shell with Auto-Cover',142000,0,142000],
    ['AWD-016','08/04/2025','Simon\'s & Co.','22-400','Plumbing Fixtures','Main Residence & Pavilion – Plumbing fixtures, faucets, toilets',70460.38,0,70460.38],
    ['AWD-017','07/07/2025','Foard Panel','06-120','SIPS Panels','Car Barn – SIPS Panels (Supply only)',115710,0,115710],
    ['AWD-018','07/08/2025','Rhea Windows','08-400','Windows and Exterior Doors','Main Residence – Windows (Supply only)',130205.09,0,130205.09],
    ['AWD-019','10/13/2025','Trident','31-640','Sheet Pile / Caissons','Boat House Structural',474149.7,0,474149.7],
    ['AWD-020','10/11/2025','reSawn Timber Co.','06-210','Exterior Finish Carpentry - Material','Exterior Finish Carpentry (Materials Only)',229728.58,0,229728.58],
  ];
  for (const r of awardsRows) {
    await pool.query('INSERT INTO awards VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING', r);
  }

  // CHANGE ORDERS
  const cosRows = [
    ['CO-003','33-370','Electrical Service',788495,1710,282.15,1992.15,790205,'Savings from buyout applied.','Jan 20, 2026'],
    ['CO-007','03-330','Cast In Place Concrete',401900,148000,16725,164725,549900,'Includes waived fee of $7,695. Waived fee of $7,695 applied.','Jan 20, 2026'],
    ['CO-009','31-640','Sheet Pile / Caissons',416472,57677.7,9516.82,67194.52,474149.7,null,'Jan 20, 2026'],
    ['CO-013','23-100','HVAC',398900,50787,8379.86,59166.86,449687,null,'Jan 20, 2026'],
    ['CO-015','26-100','Electrical Power & Switching - Deduction per Schaefer Engineering',244183,-41620.49,-6867.38,-48487.87,202562.51,'Credit/deduction per revised scope.','Jan 20, 2026'],
    ['CO-016','23-100','HVAC (Additional)',449687,38425,5187.38,43612.38,488112,'Additional HVAC scope.','Jan 20, 2026'],
    ['CO-017a','06-470','Interior Wood Trims - Material',125167,11396.84,1880.48,13277.32,136563.84,null,'Jan 20, 2026'],
    ['CO-017b','09-640','Wood Flooring',36670,5282.92,871.68,6154.60,41952.92,null,'Jan 20, 2026'],
    ['CO-018','13-200','Special Purpose Rooms',100125,4785,789.53,5574.53,104910,'IR Installation scope addition.','Jan 20, 2026'],
  ];
  for (const r of cosRows) {
    await pool.query('INSERT INTO change_orders VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING', r);
  }

  // INVOICES
  const invoicesRows = [
    ['PAY-001','06/18/2025','C25-104-Deposit','Initial Deposit – 11% of contract',1436830.08,0,0,0,1436830.08,1436830.08,'06/18/2025','Paid',null],
    ['PAY-002','08/11/2025','#1621','Period to: July 31, 2025',373689.41,63172.19,-291331.16,-34210.34,111320.10,111340.10,'08/11/2025','Paid',null],
    ['PAY-003','09/16/2025','#1693','Period to: August 31, 2025',445713.57,75347.88,-161669.51,-47865.87,311526.07,311536.07,'09/18/2025','Paid',null],
    ['PAY-004','10/17/2025','#1750','Period to: September 30, 2025',574205.05,97069.36,-70273.47,-63883.97,537116.97,537116.97,'11/07/2025','Paid',null],
    ['PAY-005','11/19/2025','#1819','Period to: October 31, 2025',525618.85,88855.86,-126944.29,-56704.94,430825.48,430845.48,'12/30/2025','Paid',null],
    ['PAY-006','12/22/2025','#1880','Period to: November 30, 2025',196594.55,33234.30,-66221.94,-11728.54,151878.37,151878.37,'12/22/2025','Paid','Payment applied against credit on account. Excess balance applied to subsequent invoices.'],
    ['PAY-007','01/23/2026','#1956','Period to: December 31, 2025',78875.63,13333.93,-26602.41,-2948.72,62658.43,62658.43,'01/23/2026','Paid','Settled via credit on account. No wire required.'],
  ];
  for (const r of invoicesRows) {
    await pool.query('INSERT INTO invoices (id,req_date,inv_num,description,job_total,fees,deposit_applied,retainage,amt_due,approved,paid_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING', r);
  }
  // Set actual_paid and credit_applied for overpayment invoices
  await pool.query("UPDATE invoices SET actual_paid=430845.48, credit_applied=0 WHERE id='PAY-006' AND (actual_paid IS NULL)");
  await pool.query("UPDATE invoices SET actual_paid=0, credit_applied=62658.43, paid_date='01/23/2026', status='Paid' WHERE id='PAY-007' AND status='Pending Payment'");
  await pool.query("UPDATE invoices SET paid_date='12/22/2025', status='Paid' WHERE id='PAY-006' AND status='Pending Payment'");
  // Update notes to clean language
  await pool.query("UPDATE invoices SET notes='Payment applied against credit on account. Excess balance applied to subsequent invoices.' WHERE id='PAY-006'");
  await pool.query("UPDATE invoices SET notes='Settled via credit on account. No wire required.' WHERE id='PAY-007' AND notes IS NULL");

  // LINE ITEMS
  const lineItemsRows = [
    ['01-001','Project Staffing',1367556.67,0,164366.64,0.1202],
    ['02-002','Site Preparation',423400,0,96619.74,0.2282],
    ['02-100','Debris Removal',33000,0,1733,0.0525],
    ['03-330','Cast In Place Concrete',401900,148000,137250,0.2496],
    ['06-210','Ext. Finish Carpentry – Material',273230,0,76576.19,0.2803],
    ['08-330','Garage Doors',332508,0,62254.20,0.1872],
    ['08-400','Exterior Doors',207649,0,65102.54,0.3135],
    ['11-300','Residential Equipment',53441,0,22755.58,0.4258],
    ['31-200','Excavations & Backfilling',996944,73382,628329.89,0.6303],
    ['31-110','Site Clearing',87510,0,87510,1.0],
    ['33-340','Site Drainage Systems',196790,0,114792.44,0.5833],
    ['33-370','Electrical Service',788495,1992.15,402240.82,0.509],
    ['26-100','Electrical Power & Switching',244183,0,81161.65,0.3357],
    ['32-100','Driveway & Curbing',251906,0,115737.16,0.4594],
  ];
  for (const r of lineItemsRows) {
    await pool.query('INSERT INTO line_items VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', r);
  }
  // Extra line items needed for complete billing data
  const extraLineItems = [
    ['26-320','Electric Generators',12000,0,0,0],
    ['26-500','Interior Lighting Fixtures',129229,0,0,0],
    ['26-560','Exterior Lighting Fixtures',87250,0,0,0],
    ['33-100','Water Service',108240,0,0,0],
    ['33-150','Gas Services / Tank',10000,0,0,0],
    ['33-300','Septic / Sewer Systems',132770,0,0,0],
    ['97-000','Fee (GC 13.5%)',0,0,0,0],
    ['98-000','Insurance (3%)',0,0,0,0],
    ['99-200','Deposit Applied',0,0,0,0],
  ];
  for (const r of extraLineItems) {
    await pool.query('INSERT INTO line_items (code,name,budget,cos,done,pct) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', r);
  }

  // LINE ITEM BILLINGS — complete data from Excel Line Item Billing tab
  // Covers PAY-001 (Deposit) through PAY-007 (#1956) — 67 billings
  const billings = [
    // 01-001 Project Staffing
    ['01-001','#1621',18225],['01-001','#1693',33185],['01-001','#1750',26170],
    ['01-001','#1819',40816.64],['01-001','#1880',22475],['01-001','#1956',23495],
    // 02-002 Site Preparation
    ['02-002','#1621',48297.32],['02-002','#1693',9217.82],['02-002','#1750',6264.82],
    ['02-002','#1819',6608.71],['02-002','#1880',9759.30],['02-002','#1956',16471.77],
    // 02-100 Debris Removal
    ['02-100','#1880',1733],
    // 03-330 Cast In Place Concrete
    ['03-330','#1819',137250],
    // 06-210 Ext Finish Carpentry Material
    ['06-210','#1880',76576.19],
    // 08-330 Garage Doors
    ['08-330','#1693',62254.20],
    // 08-400 Exterior Doors
    ['08-400','#1621',65102.54],
    // 11-300 Residential Equipment
    ['11-300','#1956',22755.58],
    // 26-100 Electrical Power & Switching
    ['26-100','#1621',48356.60],['26-100','#1750',14300],
    ['26-100','#1819',13505.05],['26-100','#1880',5000],
    // 26-320 Electric Generators
    ['26-320','#1621',240],
    // 26-500 Interior Lighting Fixtures
    ['26-500','#1621',25036],
    // 26-560 Exterior Lighting Fixtures
    ['26-560','#1621',3200],['26-560','#1880',2000],
    // 31-110 Site Clearing
    ['31-110','#1750',87510],
    // 31-200 Excavations & Backfilling
    ['31-200','#1693',243500],['31-200','#1750',232274.75],
    ['31-200','#1819',123082.39],['31-200','#1880',20819.47],['31-200','#1956',8653.28],
    // 32-100 Driveway & Curbing
    ['32-100','#1750',90685.48],['32-100','#1819',20440.68],['32-100','#1880',4611],
    // 33-100 Water Service
    ['33-100','#1693',27600],['33-100','#1819',3302.11],
    // 33-150 Gas Services
    ['33-150','#1621',2000],
    // 33-300 Septic / Sewer Systems
    ['33-300','#1819',69169.10],['33-300','#1880',5720],
    // 33-340 Foundation Drainage
    ['33-340','#1819',86891.85],['33-340','#1880',27900.59],
    // 33-370 Electrical Service
    ['33-370','#1621',163231.95],['33-370','#1693',69956.55],['33-370','#1750',117000],
    ['33-370','#1819',24552.32],['33-370','#1880',20000],['33-370','#1956',7500],
    // 97-000 Fee (GC Fee per invoice)
    ['97-000','#1621',50448.07],['97-000','#1693',60171.33],['97-000','#1750',77517.68],
    ['97-000','#1819',70958.54],['97-000','#1880',26540.26],['97-000','#1956',10648.21],
    // 98-000 Insurance
    ['98-000','#1621',12724.12],['98-000','#1693',15176.55],['98-000','#1750',19551.68],
    ['98-000','#1819',17897.32],['98-000','#1880',6694.04],['98-000','#1956',2685.72],
    // 99-200 Deposit Applied (negative = credit against invoice)
    ['99-200','C25-104-Deposit',1436830.08],
    ['99-200','#1621',-291331.16],['99-200','#1693',-161669.51],['99-200','#1750',-70273.47],
    ['99-200','#1819',-126944.29],['99-200','#1880',-66221.94],['99-200','#1956',-26602.41],
  ];
  for (const r of billings) {
    await pool.query('INSERT INTO line_item_billings VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', r);
  }

  // VENDORS
  await pool.query(`INSERT INTO vendors VALUES ('ivan','Ivan Zdrahal PE','Ivan Zdrahal Professional Engineering, PLLC','Civil Engineering & Construction Management','#a78bfa') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO vendors VALUES ('reed','Reed Hilderbrand','Reed Hilderbrand','Landscape Architecture','#34d399') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO vendors VALUES ('arch','Architecturefirm','Architecturefirm','Architecture','#60a5fa') ON CONFLICT DO NOTHING`);

  // VENDOR PHASES — Ivan
  const ivanPhases = [
    ['ivan','Phase A','Master Plan Evaluation, Lodge Building design, Bidding & construction services',91884.43,91884.43,'Complete',1],
    ['ivan','Phase B','APA Permit Application (Great Hall), Environmental Assessment, APA response',150115,150115,'Complete',2],
    ['ivan','Phase C – Design','Design revisions: Car Barn, Main Residence, Hot Tub Pavilion, Woods Road',90005,90005,'Complete',3],
    ['ivan','Phase C – CM','Construction management services in Phase C to date',24426.25,24426.25,'Complete',4],
    ['ivan','Guest Cabin Design','Civil Engineering plans for Proposed Guest Cabin (Phase C)',16000,4835,'In Progress',5],
    ['ivan','CM Phase C (cont.)','Continuation of construction management in Phase C',15000,4750,'In Progress',6],
    ['ivan','CM Phase B (Rec/Pub)','Construction management for Recreational Complex & Pub Building',25000,0,'Not Started',7],
    ['ivan','Contingencies','Allowances for design/scope changes',25000,0,'Not Started',8],
  ];
  for (const r of ivanPhases) {
    await pool.query('INSERT INTO vendor_phases (vendor_key,phase,description,budget,invoiced,status,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)', r);
  }

  // VENDOR PHASES — Reed
  const reedPhases = [
    ['reed','Framework Plan','Forestmere Lakes Planning',150000,146906,'Complete',1],
    ['reed','Initial Consulting / House Predesign','T&M',null,11180,'Complete',2],
    ['reed','APA Permitting','T&M',null,692248,'Complete',3],
    ['reed','Lodge – Schematic Design','Lodge House',45000,41199,'Complete',4],
    ['reed','Lodge – Design Development','Lodge House',65000,64944,'Complete',5],
    ['reed','Lodge – Construction Documents','Lodge House',110000,106813,'Complete',6],
    ['reed','Lodge – Bidding/Const. Observation','Lodge House',105000,34243,'Complete',7],
    ['reed','Phase 1 – Design Development','Main Res, Pavilion, Boat House, Car Barn',160000,158508,'Complete',8],
    ['reed','Phase 1 – Construction Documents','Main Res, Pavilion, Boat House, Car Barn',280000,216844,'In Progress',9],
    ['reed','Phase 1.1 – Reduced Scope Documentation','T&M – Reduced scope study & revisions',40000,40000,'Complete',10],
    ['reed','Phase 1.1 – Bidding/Const. Observation','T&M – Ongoing through April 2027',null,110453.75,'In Progress',11],
    ['reed','Guest Cabin – Permitting','APA Jurisdictional Inquiry',15000,3212.5,'In Progress',12],
    ['reed','Guest Cabin – Design & Documentation','Paving, planting, grading; coordination',70000,25297.5,'In Progress',13],
    ['reed','Guest Cabin – Bidding/Const. Observation','T&M estimate',50000,0,'Not Started',14],
    ['reed','Phase 1.2 – Construction Documents','Pub, Rec Hall, Caretaker Res, Maintenance Barn',60000,0,'Not Started',15],
    ['reed','Reimbursable – Travel/Lodging/Meals','Site visits, owner meetings & construction obs.',null,32973,'Ongoing',16],
    ['reed','Reimbursable – Subconsultants','Trail advisory + site electrical network design',null,19176,'Ongoing',17],
  ];
  for (const r of reedPhases) {
    await pool.query('INSERT INTO vendor_phases (vendor_key,phase,description,budget,invoiced,status,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)', r);
  }

  // VENDOR PHASES — Arch
  const archPhases = [
    ['arch','S-1 Site Study / Framework Plan','06/2022–12/2024',0,276863,'Complete',1],
    ['arch','S-2 APA / DEC Permit Drawings','02/2023–12/2024',0,73745,'Complete',2],
    ['arch','L-1 Lodge – Design & Documentation','01/2023–11/2023 · $4.45M const.',467772,280128,'Complete',3],
    ['arch','L-2 Lodge – Construction Administration','12/2023–02/2024',0,24730,'Complete',4],
    ['arch','0-1 Pub V1 – Design & Documentation','03/2024–08/2024 · $1.76M const.',184995,155000,'Complete',5],
    ['arch','0-2 Barns V1 (4x) – Design & Documentation','11/2023–08/2024 · $2.46M const.',257950,232000,'Complete',6],
    ['arch','0-3 Staff Housing – Design & Documentation','11/2023–02/2024 · $1.25M const.',131245,38775,'Complete',7],
    ['arch','1-1 Pub V2 – Design & Documentation','09/2024–03/2025 · $2.79M const.',220042,218545,'Complete',8],
    ['arch','1-2 Recreation Hall – Design & Doc.','11/2023–08/2024 · $1.65M const.',173075,180000,'Complete',9],
    ['arch','1-3 Caretaker Res. – Design & Doc.','11/2023–08/2024 · $1.0M const.',104996,50960,'Complete',10],
    ['arch','1-4 Barns V2 (2x) – Design & Doc.','09/2024–03/2025 · $1.79M const.',93924,37560,'Complete',11],
    ['arch','1-5 Boathouse – Design & Doc.','11/2023–08/2025 · $771k const.',81015,125130,'Complete',12],
    ['arch','1-6 Main Res. & Pavilion – Design & Doc.','09/2024–04/2025 · $2.99M const.',313799,239303,'Complete',13],
    ['arch','1-7 Great Hall – Design & Doc.','TBD · $5.76M const.',605183,0,'Not Started',14],
    ['arch','1-8 Guest Cabin','10/2025–03/2026 · $1.0M const.',100000,1730,'In Progress',15],
    ['arch','CA-1 Phase 1.1 Construction Admin.','22 months · ~$13k/month',288000,101800,'In Progress',16],
    ['arch','FFE – Furniture, Furnishings & Equipment','Scope TBD',0,29215,'Ongoing',17],
    ['arch','Reimbursable Expenses','Travel, lodging, meals, reproductions',0,2704.62,'Ongoing',18],
  ];
  for (const r of archPhases) {
    await pool.query('INSERT INTO vendor_phases (vendor_key,phase,description,budget,invoiced,status,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)', r);
  }

  // VENDOR INVOICES — Ivan
  const ivanInvoices = [
    ['ivan','103443','01/05/2026','CM Phase C – Technician + Subconsultant + Admin',2655,'Pending'],
    ['ivan','103449','01/06/2026','Guest Cabin Design',1465,'Pending'],
    ['ivan','103454','02/05/2026','Guest Cabin Design',3370,'Pending'],
    ['ivan','103453','02/06/2026','Final Phase Construction Management',2095,'Pending'],
  ];
  for (const r of ivanInvoices) {
    await pool.query('INSERT INTO vendor_invoices (vendor_key,inv_num,inv_date,description,amount,status) VALUES ($1,$2,$3,$4,$5,$6)', r);
  }

  // VENDOR INVOICES — Reed
  const reedInvoices = [
    ['reed','RH-2025-11','11/01/2025','Phase 1.1 CA – October 2025',18500,'Paid'],
    ['reed','RH-2025-12','12/01/2025','Phase 1.1 CA – November 2025 + Guest Cabin',22750,'Paid'],
    ['reed','RH-2026-01','01/15/2026','Phase 1.1 CA – December 2025',15200,'Pending'],
  ];
  for (const r of reedInvoices) {
    await pool.query('INSERT INTO vendor_invoices (vendor_key,inv_num,inv_date,description,amount,status) VALUES ($1,$2,$3,$4,$5,$6)', r);
  }

  // VENDOR INVOICES — Arch
  const archInvoices = [
    ['arch','AF-2025-09','09/15/2025','CA Phase 1.1 – August 2025',14200,'Paid'],
    ['arch','AF-2025-10','10/15/2025','CA Phase 1.1 – September 2025 + FFE',18750,'Paid'],
    ['arch','AF-2025-11','11/15/2025','CA Phase 1.1 – October 2025',15600,'Paid'],
    ['arch','AF-2025-12','12/15/2025','CA Phase 1.1 – November 2025 + Guest Cabin',23365,'Pending'],
  ];
  for (const r of archInvoices) {
    await pool.query('INSERT INTO vendor_invoices (vendor_key,inv_num,inv_date,description,amount,status) VALUES ($1,$2,$3,$4,$5,$6)', r);
  }

  // PRIOR PHASES
  await pool.query(`INSERT INTO prior_phases VALUES ('demolition','Demolition','C25-102','Taconic Builders Inc.','Mayville Enterprises Inc.','Jan 2025','May 2025','Demolition of existing site structures',446966,-40552.24,406413.76,335189.43,'Complete','Final invoice #1423 dated March 31, 2025. Closeout CO-004 reduced scope and returned unused budget.') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO prior_phases VALUES ('road','Road Construction','C24-RC','Taconic Builders Inc.','Luck Builders Inc.','Jan 2024','Mid 2024','Clearing, grubbing, road from Rte 30 to Lodge incl. loop. Utility trenching, waterline, erosion control.',457500,0,457500,457500,'Complete','Award letter Jan 8, 2024. Luck Builders selected from competitive bid. Final award $457,500.') ON CONFLICT DO NOTHING`);

  // PRIOR PHASE LINE ITEMS
  const priorItems = [
    ['demolition','01-001','General Conditions (Staffing)',43038,31212.82],
    ['demolition','02-001','Site Maintenance / Prep',40300,0],
    ['demolition','02-410','Demolition (Mayville Enterprises)',298995,285495],
    ['road','1','Clearing & Grubbing',55000,55000],
    ['road','2','Strip & Clean Existing Pavement (0+00 to 21+00)',30000,30000],
    ['road','3','Erosion Control & Tree Protection',47950,47950],
    ['road','4','Road Construction (21+00 to House, incl. Loop)',420000,420000],
    ['road','5','Utility Trenching & Backfill',97000,97000],
  ];
  for (const r of priorItems) {
    await pool.query('INSERT INTO prior_phase_line_items (phase_id,code,description,budget,paid) VALUES ($1,$2,$3,$4,$5)', r);
  }

  // PRIOR PHASE COs
  await pool.query(`INSERT INTO prior_phase_cos (phase_id,no,description,amount) VALUES ('demolition','CO-002','Relocate temp service – Krueger Electrical',6804.77)`);
  await pool.query(`INSERT INTO prior_phase_cos (phase_id,no,description,amount) VALUES ('demolition','CO-004','Closeout CO – scope reduction & savings',-47357.01)`);

  // CASH FLOW
  const cashFlow = [
    ['Jan',461105],['Feb',164106],['Mar',164106],['Apr',200000],['May',210000],['Jun',220000],
    ['Jul',280000],['Aug',280000],['Sep',280000],['Oct',200000],['Nov',175000],['Dec',150000],
  ];
  for (const [month, value] of cashFlow) {
    await pool.query('INSERT INTO cash_flow_monthly VALUES ($1,$2) ON CONFLICT DO NOTHING', [month, value]);
  }

  console.log('Database seeded successfully.');
}

// ─── EXPRESS APP ──────────────────────────────────────────────────────────────
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// ─── GET ALL DATA (single call on app load) ────────────────────────────────────
app.get('/api/data', async (req, res) => {
  try {
    const [
      budgetR, awardsR, cosR, invoicesR,
      lineItemsR, billingsR,
      vendorsR, phasesR, vendorInvsR,
      priorR, priorItemsR, priorCosR,
      cashR, docsR
    ] = await Promise.all([
      pool.query('SELECT * FROM budget ORDER BY code'),
      pool.query('SELECT * FROM awards ORDER BY id'),
      pool.query('SELECT * FROM change_orders ORDER BY co_date'),
      pool.query('SELECT * FROM invoices ORDER BY id'),
      pool.query('SELECT * FROM line_items ORDER BY code'),
      pool.query('SELECT * FROM line_item_billings'),
      pool.query('SELECT * FROM vendors'),
      pool.query('SELECT * FROM vendor_phases ORDER BY vendor_key, sort_order'),
      pool.query('SELECT * FROM vendor_invoices ORDER BY inv_date ASC'),
      pool.query('SELECT * FROM prior_phases'),
      pool.query('SELECT * FROM prior_phase_line_items'),
      pool.query('SELECT * FROM prior_phase_cos'),
      pool.query('SELECT * FROM cash_flow_monthly ORDER BY CASE month WHEN \'Jan\' THEN 1 WHEN \'Feb\' THEN 2 WHEN \'Mar\' THEN 3 WHEN \'Apr\' THEN 4 WHEN \'May\' THEN 5 WHEN \'Jun\' THEN 6 WHEN \'Jul\' THEN 7 WHEN \'Aug\' THEN 8 WHEN \'Sep\' THEN 9 WHEN \'Oct\' THEN 10 WHEN \'Nov\' THEN 11 WHEN \'Dec\' THEN 12 END'),
      pool.query('SELECT id,name,type,vendor_key,vendor_label,linked_id,note,file_size,mime_type,uploaded_at FROM documents ORDER BY uploaded_at DESC'),
    ]);

    // Attach billings to line items
    const lineItems = lineItemsR.rows.map(li => ({
      ...li,
      budget: parseFloat(li.budget),
      cos: parseFloat(li.cos),
      done: parseFloat(li.done),
      pct: parseFloat(li.pct),
      inv: {}
    }));
    billingsR.rows.forEach(b => {
      const item = lineItems.find(l => l.code === b.line_item_code);
      if (item) item.inv[b.inv_num] = parseFloat(b.amount);
    });

    // Build vendors object
    const vendors = {};
    vendorsR.rows.forEach(v => {
      vendors[v.key] = {
        ...v,
        phases: phasesR.rows.filter(p => p.vendor_key === v.key).map(p => ({
          ...p,
          budget: p.budget ? parseFloat(p.budget) : null,
          invoiced: parseFloat(p.invoiced),
        })),
        invoices: vendorInvsR.rows.filter(i => i.vendor_key === v.key).map(i => ({
          ...i,
          amount: parseFloat(i.amount),
        })),
      };
    });

    // Build prior phases
    const priorPhases = priorR.rows.map(p => ({
      ...p,
      original_contract: parseFloat(p.original_contract),
      approved_cos: parseFloat(p.approved_cos),
      final_contract: parseFloat(p.final_contract),
      total_paid: parseFloat(p.total_paid),
      lineItems: priorItemsR.rows.filter(l => l.phase_id === p.id).map(l => ({
        ...l, budget: parseFloat(l.budget), paid: parseFloat(l.paid)
      })),
      cos: priorCosR.rows.filter(c => c.phase_id === p.id).map(c => ({
        ...c, amount: parseFloat(c.amount)
      })),
    }));

    // Normalize numeric fields
    const normalize = (rows, fields) => rows.map(r => {
      const n = { ...r };
      fields.forEach(f => { if (n[f] != null) n[f] = parseFloat(n[f]); });
      return n;
    });

    res.json({
      budget: normalize(budgetR.rows, ['budget']),
      awards: normalize(awardsR.rows, ['award_amount','co_amount','current_amount']),
      changeOrders: normalize(cosR.rows, ['orig_budget','approved_co','fees','total','revised_budget']),
      invoices: normalize(invoicesR.rows, ['job_total','fees','deposit_applied','retainage','amt_due','approved']),
      lineItems,
      vendors,
      priorPhases,
      cashFlow: cashR.rows.map(r => ({ m: r.month, v: parseFloat(r.value) })),
      documents: docsR.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────
app.post('/api/invoices', async (req, res) => {
  try {
    const d = req.body;
    const { rows } = await pool.query(
      `INSERT INTO invoices (id,req_date,inv_num,description,job_total,fees,deposit_applied,retainage,amt_due,approved,paid_date,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [d.id, d.reqDate, d.invNum, d.desc, d.jobTotal, d.fees, d.depositApplied, d.retainage, d.amtDue, d.approved, d.paidDate || null, d.status, d.notes || null]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/line-item-billings/rollback/:invNum', async (req, res) => {
  try {
    const invNum = decodeURIComponent(req.params.invNum);
    // Get all line items billed on this invoice
    const billed = await pool.query('SELECT line_item_code, amount FROM line_item_billings WHERE inv_num=$1', [invNum]);
    // Delete the billings
    await pool.query('DELETE FROM line_item_billings WHERE inv_num=$1', [invNum]);
    // Recalculate done/pct for each affected line item
    for (const row of billed.rows) {
      const billedSum = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM line_item_billings WHERE line_item_code=$1', [row.line_item_code]);
      const completedToDate = parseFloat(billedSum.rows[0].total) || 0;
      const liRow = await pool.query('SELECT budget, cos FROM line_items WHERE code=$1', [row.line_item_code]);
      if (liRow.rows.length > 0) {
        const revised = parseFloat(liRow.rows[0].budget||0) + parseFloat(liRow.rows[0].cos||0);
        const pct = revised > 0 ? completedToDate / revised : 0;
        await pool.query('UPDATE line_items SET done=$1, pct=$2 WHERE code=$3', [completedToDate, pct, row.line_item_code]);
      }
    }
    res.json({ ok: true, affected: billed.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { status, paidDate, notes, actualPaid, creditApplied } = req.body;
    const { rows } = await pool.query(
      'UPDATE invoices SET status=$1, paid_date=$2, notes=$3, actual_paid=$4, credit_applied=$5 WHERE id=$6 RETURNING *',
      [status, paidDate || null, notes || null, actualPaid ?? null, creditApplied ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CREDIT BALANCE ───────────────────────────────────────────────────────────
app.get('/api/credit-balance', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, inv_num, approved, actual_paid, credit_applied, status FROM invoices ORDER BY id');
    let creditBalance = 0;
    const ledger = [];
    for (const inv of rows) {
      const approved = parseFloat(inv.approved || 0);
      const actualPaid = parseFloat(inv.actual_paid || 0);
      const creditUsed = parseFloat(inv.credit_applied || 0);
      // If actual_paid > approved, that's an overpayment adding to credit
      if (actualPaid > 0 && actualPaid > approved) {
        const overpayment = actualPaid - approved;
        creditBalance += overpayment;
        ledger.push({ id: inv.id, inv: inv.inv_num, event: 'Overpayment', amount: overpayment, balance: creditBalance });
      } else if (creditUsed > 0) {
        creditBalance -= creditUsed;
        ledger.push({ id: inv.id, inv: inv.inv_num, event: 'Credit Applied', amount: -creditUsed, balance: creditBalance });
      }
    }
    res.json({ creditBalance, ledger });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CHANGE ORDERS ────────────────────────────────────────────────────────────
app.post('/api/change-orders', async (req, res) => {
  try {
    const d = req.body;
    const { rows } = await pool.query(
      `INSERT INTO change_orders (no,code,div,orig_budget,approved_co,fees,total,revised_budget,notes,co_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [d.no, d.code, d.div, d.origBudget, d.approvedCO, d.fees, d.total, d.revisedBudget, d.notes || null, d.date]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/change-orders/:no', async (req, res) => {
  try {
    const { code, div, origBudget, approvedCO, fees, total, revisedBudget, notes, date } = req.body;
    const { rows } = await pool.query(
      'UPDATE change_orders SET code=$1, div=$2, orig_budget=$3, approved_co=$4, fees=$5, total=$6, revised_budget=$7, notes=$8, co_date=$9 WHERE no=$10 RETURNING *',
      [code, div, origBudget, approvedCO, fees, total, revisedBudget, notes||null, date, req.params.no]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/change-orders/:no', async (req, res) => {
  try {
    await pool.query('DELETE FROM change_orders WHERE no=$1', [req.params.no]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── VENDOR INVOICES ──────────────────────────────────────────────────────────
app.post('/api/vendors/:key/invoices', async (req, res) => {
  try {
    const { invNum, date, desc, amount, status } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO vendor_invoices (vendor_key,inv_num,inv_date,description,amount,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.params.key, invNum, date, desc, parseFloat(amount) || 0, status || 'Pending']
    );
    res.json({ ...rows[0], amount: parseFloat(rows[0].amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vendors/invoices/:id', async (req, res) => {
  try {
    const { invNum, date, desc, amount, status, notes } = req.body;
    const { rows } = await pool.query(
      'UPDATE vendor_invoices SET inv_num=$1, inv_date=$2, description=$3, amount=$4, status=$5, notes=$6 WHERE id=$7 RETURNING *',
      [invNum, date, desc, parseFloat(amount) || 0, status, notes || null, req.params.id]
    );
    res.json({ ...rows[0], amount: parseFloat(rows[0].amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/vendors/invoices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vendor_invoices WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
// ─── LINE ITEM BILLING UPSERT + DELETE ───────────────────────────────────────
app.post('/api/line-item-billings', async (req, res) => {
  try {
    const { code, invNum, amount } = req.body;
    await pool.query(
      'INSERT INTO line_item_billings (line_item_code, inv_num, amount) VALUES ($1,$2,$3) ON CONFLICT (line_item_code, inv_num) DO UPDATE SET amount=$3',
      [code, invNum, amount]
    );
    // Recalculate done/pct
    const sum = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM line_item_billings WHERE line_item_code=$1 AND amount > 0', [code]);
    const done = parseFloat(sum.rows[0].total) || 0;
    const li = await pool.query('SELECT budget, cos FROM line_items WHERE code=$1', [code]);
    if (li.rows.length > 0) {
      const revised = parseFloat(li.rows[0].budget||0) + parseFloat(li.rows[0].cos||0);
      const pct = revised > 0 ? Math.min(done/revised, 1) : 0;
      await pool.query('UPDATE line_items SET done=$1, pct=$2 WHERE code=$3', [done, pct, code]);
    }
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ─── LINE ITEM BILLING DELETE ─────────────────────────────────────────────────
app.delete('/api/line-item-billings/:code/:invNum', async (req, res) => {
  try {
    const { code, invNum } = req.params;
    await pool.query('DELETE FROM line_item_billings WHERE line_item_code=$1 AND inv_num=$2', [code, invNum]);
    // Recalculate done/pct for this line item
    const billedSum = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM line_item_billings WHERE line_item_code=$1', [code]);
    const completedToDate = parseFloat(billedSum.rows[0].total) || 0;
    const liRow = await pool.query('SELECT budget, cos FROM line_items WHERE code=$1', [code]);
    if (liRow.rows.length > 0) {
      const revised = parseFloat(liRow.rows[0].budget||0) + parseFloat(liRow.rows[0].cos||0);
      const pct = revised > 0 ? completedToDate / revised : 0;
      await pool.query('UPDATE line_items SET done=$1, pct=$2 WHERE code=$3', [completedToDate, pct, code]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/documents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, type, vendor_key, vendor_label, linked_id, note, uploaded_at FROM documents ORDER BY uploaded_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    const { name, type, vendor_key, vendor_label, linked_id, note } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO documents (name,type,vendor_key,vendor_label,linked_id,note,file_data,file_size,mime_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,name,type,vendor_key,vendor_label,linked_id,note,file_size,mime_type,uploaded_at`,
      [name, type, vendor_key || null, vendor_label || null, linked_id || null, note || null,
       req.file.buffer, req.file.size, req.file.mimetype]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/documents/:id/file', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT file_data, mime_type, name FROM documents WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', rows[0].mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${rows[0].name}"`);
    res.send(rows[0].file_data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});



// ─── RECONCILIATION ENGINE ────────────────────────────────────────────────────
app.get('/api/reconciliation', async (req, res) => {
  try {
    const [budgetR, cosR, invoicesR, lineItemsR, billingsR] = await Promise.all([
      pool.query('SELECT * FROM budget'),
      pool.query('SELECT * FROM change_orders'),
      pool.query('SELECT * FROM invoices ORDER BY id'),
      pool.query('SELECT * FROM line_items'),
      pool.query('SELECT * FROM line_item_billings'),
    ]);

    const checks = [];

    // ── CHECK 1: Original contract amount ──────────────────────────────────
    const budgetTotal = budgetR.rows.reduce((s, b) => s + parseFloat(b.budget), 0);
    const TACONIC_CONTRACT = 13093419.47;
    const contractDiff = Math.abs(budgetTotal - TACONIC_CONTRACT);
    checks.push({
      id: 'contract_amount',
      label: 'Original Contract Amount',
      description: 'Control budget total matches Taconic contract value',
      expected: TACONIC_CONTRACT,
      actual: budgetTotal,
      diff: budgetTotal - TACONIC_CONTRACT,
      pass: contractDiff < 5,
      severity: contractDiff > 100 ? 'error' : 'warn',
    });

    // ── CHECK 2: Approved COs — Change Orders sheet vs Line Item Billing ───
    const coTotal = cosR.rows.reduce((s, c) => s + parseFloat(c.approved_co), 0);
    const liCoTotal = lineItemsR.rows.reduce((s, l) => s + parseFloat(l.cos || 0), 0);
    const coDiff = Math.abs(coTotal - liCoTotal);
    checks.push({
      id: 'co_total',
      label: 'Change Orders vs Line Item Billing COs',
      description: 'Sum of approved COs matches CO column in Line Item Billing',
      expected: coTotal,
      actual: liCoTotal,
      diff: liCoTotal - coTotal,
      pass: coDiff < 5,
      severity: 'error',
    });

    // ── CHECK 3: Each invoice — line items sum vs invoice job total ─────────
    const invNums = invoicesR.rows.map(i => i.inv_num);
    for (const inv of invoicesR.rows) {
      const billedRows = billingsR.rows.filter(b => b.inv_num === inv.inv_num);
      const liSum = billedRows.reduce((s, b) => s + parseFloat(b.amount), 0);
      const jobTotal = parseFloat(inv.job_total);
      // Only check if we have line item data for this invoice
      if (billedRows.length > 0) {
        const diff = Math.abs(liSum - jobTotal);
        checks.push({
          id: `inv_${inv.id}`,
          label: `${inv.inv_num} — Line Items vs Job Total`,
          description: `Sum of line items billed should equal invoice job total`,
          expected: jobTotal,
          actual: liSum,
          diff: liSum - jobTotal,
          pass: diff < 1,
          severity: diff > 100 ? 'error' : 'warn',
          invoiceId: inv.id,
        });
      }
    }

    // ── CHECK 4: Total paid vs sum of approved invoices ────────────────────
    const paidInvs = invoicesR.rows.filter(i => i.status === 'Paid');
    const totalPaid = paidInvs.reduce((s, i) => s + parseFloat(i.approved), 0);
    const totalApproved = invoicesR.rows.reduce((s, i) => s + parseFloat(i.approved), 0);
    checks.push({
      id: 'paid_total',
      label: 'Total Paid Invoices',
      description: `${paidInvs.length} of ${invoicesR.rows.length} invoices paid`,
      expected: totalApproved,
      actual: totalPaid,
      diff: totalPaid - totalApproved,
      pass: true, // informational only
      severity: 'info',
      note: `$${(totalApproved - totalPaid).toLocaleString('en-US', {maximumFractionDigits:0})} outstanding`,
    });

    // ── CHECK 5: Revised contract = original + COs ────────────────────────
    const revisedExpected = TACONIC_CONTRACT + coTotal;
    const TACONIC_REVISED = 13397251.74;
    const revisedDiff = Math.abs(revisedExpected - TACONIC_REVISED);
    checks.push({
      id: 'revised_contract',
      label: 'Revised Contract Amount',
      description: 'Original contract + approved COs = revised contract',
      expected: TACONIC_REVISED,
      actual: revisedExpected,
      diff: revisedExpected - TACONIC_REVISED,
      pass: revisedDiff < 5,
      severity: 'error',
    });

    // ── CHECK 6: Retainage — cumulative running total ─────────────────────
    let retainageRunning = 0;
    const retainageChecks = [];
    for (const inv of invoicesR.rows) {
      retainageRunning += Math.abs(parseFloat(inv.retainage || 0));
      retainageChecks.push({ inv: inv.inv_num, cumulative: retainageRunning });
    }
    const EXPECTED_RETAINAGE = 247807.87; // from invoice #1976
    const lastRetainage = retainageRunning;
    const retainageDiff = Math.abs(lastRetainage - EXPECTED_RETAINAGE);
    checks.push({
      id: 'retainage_total',
      label: 'Cumulative Retainage Held',
      description: 'Running retainage matches Taconic certified total',
      expected: EXPECTED_RETAINAGE,
      actual: lastRetainage,
      diff: lastRetainage - EXPECTED_RETAINAGE,
      pass: retainageDiff < 5,
      severity: 'error',
      detail: retainageChecks,
    });

    // ── CHECK 7: Completed to date — line items vs invoice statement ───────
    const liCompletedTotal = lineItemsR.rows.reduce((s, l) => s + parseFloat(l.done || 0), 0);
    const TACONIC_COMPLETED = 3472724.02; // from invoice #1976 page 2
    const completedDiff = Math.abs(liCompletedTotal - TACONIC_COMPLETED);
    checks.push({
      id: 'completed_to_date',
      label: 'Completed to Date',
      description: 'Sum of line items completed matches Taconic statement',
      expected: TACONIC_COMPLETED,
      actual: liCompletedTotal,
      diff: liCompletedTotal - TACONIC_COMPLETED,
      pass: completedDiff < 100,
      severity: completedDiff > 1000 ? 'error' : 'warn',
      note: completedDiff > 100 ? 'May reflect line items not yet entered for latest invoice' : null,
    });

    const passed = checks.filter(c => c.pass).length;
    const failed = checks.filter(c => !c.pass && c.severity === 'error').length;
    const warned = checks.filter(c => !c.pass && c.severity === 'warn').length;

    res.json({ checks, summary: { total: checks.length, passed, failed, warned } });
  } catch (err) {
    console.error('Reconciliation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DB MIGRATION: ensure all line items seeded properly ────────────────────
app.post('/api/admin/reseed-billings', async (req, res) => {
  try {
    // Clear existing billings and reseed from Excel
    await pool.query('DELETE FROM line_item_billings');
    const billings = [
      ['01-001','#1621',18225],['01-001','#1693',33185],['01-001','#1750',26170],
      ['01-001','#1819',40816.64],['01-001','#1880',22475],['01-001','#1956',23495],
      ['02-002','#1621',48297.32],['02-002','#1693',9217.82],['02-002','#1750',6264.82],
      ['02-002','#1819',6608.71],['02-002','#1880',9759.30],['02-002','#1956',16471.77],
      ['02-100','#1880',1733],['03-330','#1819',137250],['06-210','#1880',76576.19],
      ['08-330','#1693',62254.20],['08-400','#1621',65102.54],['11-300','#1956',22755.58],
      ['26-100','#1621',48356.60],['26-100','#1750',14300],['26-100','#1819',13505.05],['26-100','#1880',5000],
      ['26-320','#1621',240],['26-500','#1621',25036],['26-560','#1621',3200],['26-560','#1880',2000],
      ['31-110','#1750',87510],
      ['31-200','#1693',243500],['31-200','#1750',232274.75],['31-200','#1819',123082.39],
      ['31-200','#1880',20819.47],['31-200','#1956',8653.28],
      ['32-100','#1750',90685.48],['32-100','#1819',20440.68],['32-100','#1880',4611],
      ['33-100','#1693',27600],['33-100','#1819',3302.11],['33-150','#1621',2000],
      ['33-300','#1819',69169.10],['33-300','#1880',5720],
      ['33-340','#1819',86891.85],['33-340','#1880',27900.59],
      ['33-370','#1621',163231.95],['33-370','#1693',69956.55],['33-370','#1750',117000],
      ['33-370','#1819',24552.32],['33-370','#1880',20000],['33-370','#1956',7500],
      ['97-000','#1621',50448.07],['97-000','#1693',60171.33],['97-000','#1750',77517.68],
      ['97-000','#1819',70958.54],['97-000','#1880',26540.26],['97-000','#1956',10648.21],
      ['98-000','#1621',12724.12],['98-000','#1693',15176.55],['98-000','#1750',19551.68],
      ['98-000','#1819',17897.32],['98-000','#1880',6694.04],['98-000','#1956',2685.72],
      ['99-200','C25-104-Deposit',1436830.08],
      ['99-200','#1621',-291331.16],['99-200','#1693',-161669.51],['99-200','#1750',-70273.47],
      ['99-200','#1819',-126944.29],['99-200','#1880',-66221.94],['99-200','#1956',-26602.41],
    ];
    for (const b of billings) {
      await pool.query('INSERT INTO line_item_billings VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', b);
    }
    // Recalculate done/pct for all line items
    const allCodes = await pool.query('SELECT DISTINCT line_item_code FROM line_item_billings');
    for (const row of allCodes.rows) {
      const code = row.line_item_code;
      const sum = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM line_item_billings WHERE line_item_code=$1 AND amount > 0', [code]);
      const done = parseFloat(sum.rows[0].total) || 0;
      const li = await pool.query('SELECT budget, cos FROM line_items WHERE code=$1', [code]);
      if (li.rows.length > 0) {
        const revised = parseFloat(li.rows[0].budget||0) + parseFloat(li.rows[0].cos||0);
        const pct = revised > 0 ? Math.min(done/revised, 1) : 0;
        await pool.query('UPDATE line_items SET done=$1, pct=$2 WHERE code=$3', [done, pct, code]);
      }
    }
    res.json({ ok: true, billings: billings.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reseed-line-items', async (req, res) => {
  try {
    // Add any missing line items that were billed but not in line_items table
    const missingItems = [
      ['33-100','Water Service',108240,0,30902.11,0.2855],
      ['33-150','Gas Services / Tank',10000,0,2000,0.2000],
      ['33-300','Septic / Sewer Systems',132770,0,74889.10,0.5641],
    ];
    for (const r of missingItems) {
      await pool.query('INSERT INTO line_items (code,name,budget,cos,done,pct) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', r);
    }
    // Add billings for these items
    const extraBillings = [
      ['33-100','#1621',5412],['33-100','#1693',5412],['33-100','#1750',11684.22],['33-100','#1956',8393.89],
      ['33-150','#1621',500],['33-150','#1956',1500],
      ['33-300','#1750',63250.60],['33-300','#1956',11638.50],
    ];
    for (const r of extraBillings) {
      await pool.query('INSERT INTO line_item_billings VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', r);
    }
    res.json({ ok: true, message: 'Missing line items seeded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DOCUMENT PARSING (AI) ────────────────────────────────────────────────────
app.post('/api/parse-document', upload.single('file'), async (req, res) => {
  try {
    const docType = req.body.doc_type || 'taconic_invoice';
    const pdfBuffer = req.file.buffer;

    // Use pdf-parse to extract text - no API key needed, works offline
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    if (!text || !text.trim()) throw new Error('Could not extract text from PDF');

    if (docType === 'taconic_invoice') {
      const parsed = parseTaconicInvoice(text);
      return res.json({ ok: true, parsed });
    }

    if (docType === 'change_order') {
      const parsed = parseChangeOrder(text);
      return res.json({ ok: true, parsed });
    }

    if (docType === 'vendor_invoice') {
      const parsed = parseVendorInvoice(text);
      return res.json({ ok: true, parsed });
    }

    // Award letter - basic extraction
    const amountMatch = text.match(/\$([\d,]+(?:\.\d{2})?)/);
    return res.json({ ok: true, parsed: {
      vendor: text.split('\n').find(l => l.trim().length > 3 && l.trim().length < 50) || '',
      awardAmount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g,'')) : 0,
      description: text.slice(0, 200)
    }});

  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── TACONIC AIA G702/G703 PARSER ─────────────────────────────────────────────
function parseTaconicInvoice(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Helper: find number after label
  const findNum = (pattern) => {
    const m = text.match(pattern);
    return m ? parseFloat(m[1].replace(/[,$]/g,'')) : 0;
  };
  const findStr = (pattern) => {
    const m = text.match(pattern);
    return m ? m[1].trim() : '';
  };

  // Header fields
  const invNum = findStr(/Invoice\s*(?:No\.?|Number|#)[:\s]*([\d]+)/i) ||
                 findStr(/Application\s*(?:No\.?|Number|#)[:\s]*([\d]+)/i);
  const invoiceDate = findStr(/(?:Invoice\s*Date|Date)[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4})/i);
  const periodTo = findStr(/Period\s*(?:To|Ending)[:\s]*([^\n]+)/i);

  const originalContract = findNum(/Original\s*Contract\s*(?:Amount)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const approvedChanges   = findNum(/(?:Approved\s*Changes?|Net\s*Change)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const revisedContract   = findNum(/(?:Revised\s*Contract|Contract\s*to\s*Date)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const completedToDate   = findNum(/(?:Total\s*Completed|Contract\s*Completed)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const totalRetainage    = findNum(/(?:Total\s*Retainage|Less\s*Retainage)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const previousRequests  = findNum(/(?:Previous\s*(?:Certificates?|Requests?)|Less\s*Previous)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const currentAmountDue  = findNum(/(?:Current\s*(?:Payment|Amount)\s*Due|Amount\s*Due)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const balanceToFinish   = findNum(/Balance\s*(?:to\s*Finish|Remaining)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);

  // Parse Schedule of Values / Continuation Sheet
  // Format: CODE  DESCRIPTION  SCHEDULED_VALUE  PREV_BILLED  THIS_PERIOD  ...
  const lineItemsBilled = [];
  
  // Look for lines matching CSI code pattern (XX-XXX or similar)
  const csiPattern = /^(\d{2}-\d{3}[a-z]?|\d{2}-\d{4}|\d{2}-\d{2}|\d{5,6})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;
  
  for (const line of lines) {
    const m = line.match(csiPattern);
    if (m) {
      const thisperiod = parseFloat(m[5].replace(/,/g,''));
      if (thisperiod > 0) {
        lineItemsBilled.push({
          code: m[1],
          name: m[2].trim(),
          previousBilled: parseFloat(m[4].replace(/,/g,'')),
          currentBill: thisperiod,
          completedToDate: parseFloat(m[3].replace(/,/g,'')),
          pctComplete: 0
        });
      }
    }
  }

  // Also try tab/space delimited table rows
  if (lineItemsBilled.length === 0) {
    // Alternative: look for dollar amounts after known codes
    const altPattern = /([0-9]{2}-[0-9]{3})\b(.{5,40})\b([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;
    for (const line of lines) {
      const m = line.match(altPattern);
      if (m) {
        const thisperiod = parseFloat(m[5].replace(/,/g,''));
        if (thisperiod > 0) {
          lineItemsBilled.push({
            code: m[1], name: m[2].trim(),
            currentBill: thisperiod,
            previousBilled: parseFloat(m[4].replace(/,/g,'')),
            completedToDate: parseFloat(m[3].replace(/,/g,'')),
          });
        }
      }
    }
  }

  // Parse fees section
  const gcFee = findNum(/(?:GC\s*Fee|General\s*Conditions\s*Fee|Contractor.*Fee)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const insurance = findNum(/(?:Insurance|Builders?\s*Risk)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const depositApplied = findNum(/(?:Deposit\s*Applied|Less\s*Deposit)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  const retainageThisPeriod = findNum(/(?:Retainage\s*(?:This\s*Period|Withheld)|Current\s*Retainage)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);

  return {
    header: { invNum, invoiceDate, periodTo, originalContract, approvedChanges,
              revisedContract, completedToDate, totalRetainage, previousRequests,
              currentAmountDue, balanceToFinish },
    lineItemsBilled,
    fees: { gcFee, insurance, depositApplied, retainageThisPeriod }
  };
}

function parseChangeOrder(text) {
  const findStr = (p) => { const m = text.match(p); return m ? m[1].trim() : ''; };
  const findNum = (p) => { const m = text.match(p); return m ? parseFloat(m[1].replace(/[,$]/g,'')) : 0; };
  return {
    coNumber:       findStr(/(?:Change\s*Order|CO)\s*(?:No\.?|#)[:\s]*([\w-]+)/i),
    date:           findStr(/Date[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4})/i),
    csiCode:        findStr(/(?:CSI|Division|Code)[:\s]*([\d-]+)/i),
    division:       findStr(/(?:Division|Scope|Work)[:\s]*([^\n]{5,60})/i),
    originalBudget: findNum(/(?:Original|Current)\s*(?:Contract|Budget)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i),
    coAmount:       findNum(/(?:Amount\s*of\s*(?:this\s*)?Change|Change\s*Order\s*Amount)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i),
    description:    findStr(/(?:Description|Scope)[:\s]*([^\n]{10,200})/i),
  };
}

function parseVendorInvoice(text) {
  const findStr = (p) => { const m = text.match(p); return m ? m[1].trim() : ''; };
  const findNum = (p) => { const m = text.match(p); return m ? parseFloat(m[1].replace(/[,$]/g,'')) : 0; };
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  return {
    invNum:   findStr(/(?:Invoice|Inv)\s*(?:No\.?|Number|#)[:\s]*([\w-]+)/i),
    date:     findStr(/(?:Invoice\s*Date|Date)[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4})/i),
    vendorName: lines[0] || '',
    description: lines.slice(1,3).join(' '),
    amount:   findNum(/(?:Total|Amount\s*Due|Balance\s*Due)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i),
    total:    findNum(/(?:Total|Amount\s*Due|Balance\s*Due)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i),
  };
}


app.post('/api/approve-items', async (req, res) => {
  try {
    const { items } = req.body;
    const results = [];
    for (const item of items) {
      try {
        if (item.type === 'invoice_header') {
          const d = item.data;
          await pool.query(`INSERT INTO invoices (id,req_date,inv_num,description,job_total,fees,deposit_applied,retainage,amt_due,approved,paid_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
            [d.id, d.reqDate, d.invNum, d.description, d.jobTotal, d.fees, d.depositApplied, d.retainage, d.amtDue, d.amtDue, null, 'Pending Payment', null]);
          results.push({ type: item.type, ok: true });
        } else if (item.type === 'line_item_billing') {
          const d = item.data;
          const currentBill = parseFloat(d.currentBill) || 0;

          // Insert the billing record first
          await pool.query('INSERT INTO line_item_billings (line_item_code,inv_num,amount) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [d.code, d.invNum, currentBill]);

          // Auto-calculate completed to date = sum of ALL billings for this line item
          const billedSum = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM line_item_billings WHERE line_item_code=$1', [d.code]);
          const completedToDate = parseFloat(billedSum.rows[0].total) || 0;

          // Check if line item exists
          const ex = await pool.query('SELECT code, budget, cos FROM line_items WHERE code=$1', [d.code]);
          if (ex.rows.length > 0) {
            // Auto-calculate pct = completedToDate / (budget + cos)
            const revised = parseFloat(ex.rows[0].budget || 0) + parseFloat(ex.rows[0].cos || 0);
            const pct = revised > 0 ? completedToDate / revised : 0;
            await pool.query('UPDATE line_items SET done=$1, pct=$2 WHERE code=$3', [completedToDate, pct, d.code]);
          } else {
            // Create new line item - use completedToDate as budget placeholder
            await pool.query('INSERT INTO line_items (code,name,budget,cos,done,pct) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
              [d.code, d.name || d.code, completedToDate, 0, completedToDate, 1.0]);
          }
          results.push({ type: item.type, code: d.code, ok: true });
        }
      } catch (ie) { results.push({ type: item.type, ok: false, error: ie.message }); }
    }
    res.json({ ok: true, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVE FRONTEND (production) ──────────────────────────────────────────────
if (!IS_DEV) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── START ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await createSchema();
    await seedIfEmpty();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Camp Forestmere API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
