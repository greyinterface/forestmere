import { useState, useEffect, useRef, createContext, useContext } from "react";
import { SmartUploadView } from "./SmartUpload.jsx";

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const API = '/api';
const apiFetch = (path, opts) => fetch(API + path, opts).then(r => r.json());

// ─── DATA CONTEXT ─────────────────────────────────────────────────────────────
const DataCtx = createContext(null);
const useAppData = () => useContext(DataCtx);

function DataProvider({ children }) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      const d = await apiFetch('/data');
      setRaw(d);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-sync Zoho on load (max once per 24 hours — server handles throttling)
    apiFetch('/zoho/auto-sync', { method: 'POST' }).catch(() => {});
    refresh();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f6f8" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading Camp Forestmere...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f6f8" }}>
      <div className="text-center max-w-sm">
        <p className="text-red-500 font-semibold mb-2">Failed to connect to database</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-[#1c2b3a] text-white rounded-lg text-sm font-semibold hover:bg-gray-800">Retry</button>
      </div>
    </div>
  );

  if (!raw) return null;

  // ─── COMPUTED VALUES ────────────────────────────────────────────────────────
  const { budget, awards, changeOrders, invoices, lineItems, vendors, priorPhases, cashFlow, documents, historicalTotal } = raw;

  const awardedByCode = {};
  awards.forEach(a => { awardedByCode[a.code] = (awardedByCode[a.code] || 0) + parseFloat(a.current_amount); });

  const totalBudget   = budget.reduce((s, b) => s + parseFloat(b.budget), 0);
  const totalAwarded  = awards.reduce((s, a) => s + parseFloat(a.current_amount), 0);
  const totalCOs      = changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0);
  const taconicPaid   = invoices.filter(i => i.status?.startsWith('Paid')).reduce((s, i) => s + parseFloat(i.approved), 0);
  const taconicPending = invoices.filter(i => !i.status?.startsWith('Paid')).reduce((s, i) => s + parseFloat(i.approved) - parseFloat(i.credit_applied||0), 0);

  const izPaid  = vendors.ivan?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const rhPaid  = vendors.reed?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const afPaid  = vendors.arch?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const priorPaid = priorPhases.reduce((s, p) => s + parseFloat(p.total_paid), 0);
  const grandTotalPaid = taconicPaid + izPaid + rhPaid + afPaid + priorPaid;

  const INV_NUMS = invoices.map(i => i.inv_num);

  // Inception-to-date grand total = historical payments + prior phases + Phase 1.1 vendors
  // historicalTotal comes from the historical_payments table (writeup data)

  // Live computed values — mirror the Excel GRAND TOTAL row mechanics
  // Original contract is a fixed signed amount — does not change with budget line edits
  const ORIGINAL_CONTRACT = 13093419.47;
  // Revised Contract = Original Contract + all approved COs (incl. GC fee & insurance)
  const revisedContractTotal = ORIGINAL_CONTRACT + changeOrders.reduce((s, c) => s + parseFloat(c.total||0), 0);
  // Completed to Date = sum of all line item billings (done field, already aggregated by server)
  const completedToDate = lineItems.reduce((s, li) => s + li.done, 0);
  // Balance to Finish = Revised Contract - Completed to Date (including retainage)
  const balanceToFinish = revisedContractTotal - completedToDate;
  // Retainage Held = sum of retainage across all invoices (stored as negative in DB, so abs)
  const retainageHeld = invoices.reduce((s, i) => s + Math.abs(parseFloat(i.retainage||0)), 0);

  // True inception-to-date grand total
  // historical payments (writeup, pre-Feb 2024) + prior phases (road+demo) + Phase 1.1 all vendors
  const priorPhasesTotal = priorPhases.reduce((s, p) => s + parseFloat(p.total_paid), 0);

  // inceptionToDateTotal = Zoho bills + 3 journal entries = everything
  // Taconic Phase 1.1 is in Zoho bills so no need to add taconicPaid separately
  // The invoices table is for detailed tracking/reconciliation only — not for totals
  const inceptionToDateTotal = historicalTotal;

  const value = {
    budget, awards, changeOrders, invoices, lineItems, vendors, priorPhases, cashFlow, documents,
    awardedByCode, totalBudget, totalAwarded, totalCOs, taconicPaid, taconicPending,
    izPaid, rhPaid, afPaid, priorPaid, grandTotalPaid, INV_NUMS,
    balanceToFinish, retainageHeld, completedToDate, revisedContractTotal,
    historicalTotal, priorPhasesTotal, inceptionToDateTotal,
    refresh,
  };

  // Expose data globally for SmartUploadView
  window.__appData = value;

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const $f = (n) => n == null ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pf = (n) => (Number(n) * 100).toFixed(1) + "%";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Single source of truth for typography and color — applied everywhere
const T = {
  // Labels / section headers
  label:   "text-xs font-semibold text-gray-400 uppercase tracking-widest",
  // Body copy — primary
  body:    "text-sm text-gray-700",
  // Body copy — secondary / muted
  muted:   "text-sm text-gray-400",
  // Table cell text
  cell:    "text-sm text-gray-700",
  cellMuted: "text-sm text-gray-400",
  cellBold:  "text-sm font-semibold text-gray-900",
  // Stat card value
  statVal: "text-base font-semibold tabular-nums text-gray-900",
  statValAccent: "text-base font-semibold tabular-nums text-indigo-600",
  // Sub-tab label
  subLabel: "text-sm font-semibold",
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const cx = (...a) => a.filter(Boolean).join(" ");

const Tag = ({ text, color = "muted" }) => {
  const map = {
    green:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber:  "bg-indigo-50 text-indigo-600 border border-indigo-200",
    red:    "bg-red-50 text-red-700 border border-red-200",
    blue:   "bg-blue-50 text-blue-700 border border-blue-200",
    gray:   "bg-gray-100   text-gray-500",
    muted:  "bg-gray-100   text-gray-400",
  };
  return <span className={cx("text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap", map[color])}>{text}</span>;
};

const statusTag = (s) => {
  if (s === "Complete")        return <Tag text="Complete"       color="green" />;
  if (s === "In Progress")     return <Tag text="In Progress"    color="amber" />;
  if (s === "Ongoing")         return <Tag text="Ongoing"        color="blue"  />;
  if (s === "Pending")         return <Tag text="Pending"        color="amber" />;
  if (s?.startsWith("Paid - Credit Applied, Balance")) return <Tag text="Paid (Credit + Wire)" color="green" />;
  if (s?.startsWith("Paid - Credit"))  return <Tag text="Paid (Credit)"  color="green" />;
  if (s === "Paid")            return <Tag text="Paid"           color="green" />;
  if (s === "Pending Payment") return <Tag text="Pending Payment" color="amber" />;
  return <Tag text={s || "—"} />;
};

const BarFill = ({ value, max, color }) => {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max * 1.02;
  return (
    <div className="w-full bg-[#f0f0ee] rounded-full h-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: over ? "#ef4444" : (color || "#4f46e5") }} />
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className={cx(T.label, "whitespace-nowrap")}>{children}</span>
    <div className="flex-1 h-px bg-[#ebebea]" />
  </div>
);

const Stat = ({ label, value, sub, accent, onClick }) => (
  <div onClick={onClick} className={cx(
    "bg-white rounded-lg px-4 py-3.5 border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all select-none",
    onClick && "cursor-pointer hover:border-[#c8c8c4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.99]"
  )}>
    <div className={cx(T.label, "mb-2")}>{label}</div>
    <div className={accent ? T.statValAccent : T.statVal}>{value}</div>
    {sub && <div className={cx(T.muted, "mt-1.5 leading-snug")}>{sub}</div>}
    {onClick && <div className="text-sm text-indigo-400 mt-2 font-semibold">View detail →</div>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={cx("bg-white border border-[#e8e8e6] rounded-lg ", className)}>{children}</div>
);

// Table primitives — text-sm throughout, generous row height
const TH = ({ children, right, className = "" }) => (
  <th className={cx("px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 bg-[#faf8f5] whitespace-nowrap border-b border-[#e8e8e6]", right ? "text-right" : "text-left", className)}>{children}</th>
);
const TD = ({ children, right, muted, bold, colSpan, className = "" }) => (
  <td colSpan={colSpan} className={cx("px-4 py-2.5 text-sm", right && "text-right tabular-nums", muted ? "text-gray-400" : "text-gray-700", bold && "font-semibold text-gray-900", className)}>{children}</td>
);
const TR = ({ children, onClick, subtle }) => (
  <tr onClick={onClick} className={cx("border-b border-[#f0f0ee] transition-colors", onClick && "cursor-pointer hover:bg-[#f5f1ea]", subtle && "bg-[#faf8f5]")}>{children}</tr>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cx("bg-white border border-[#d8d8d4] rounded-lg flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full", wide ? "max-w-4xl" : "max-w-2xl")}
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-base font-semibold text-gray-900">{title}</p>
            {subtitle && <p className={cx(T.muted, "mt-0.5")}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xl transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function KVGrid({ rows }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="bg-[#faf8f5] rounded-lg px-4 py-3 border border-gray-100">
          <div className={cx(T.label, "mb-1")}>{k}</div>
          <div className="text-sm font-semibold text-gray-800 break-words">{v ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ setTab }) {
  const {
    budget, awards, invoices, changeOrders, awardedByCode,
    totalBudget, totalAwarded, totalCOs, taconicPaid, taconicPending,
    grandTotalPaid, izPaid, rhPaid, afPaid, priorPhases,
    balanceToFinish, retainageHeld, revisedContractTotal,
    inceptionToDateTotal, historicalTotal,
  } = useAppData();
  const [modal, setModal] = useState(null);
  const [reconSummary, setReconSummary] = useState(null);
  const [spendData, setSpendData] = useState(null);

  useEffect(() => {
    apiFetch('/project-phases').then(d => setSpendData(d)).catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch('/reconciliation').then(r => {
      if (r.summary) setReconSummary(r.summary);
    }).catch(() => {});
  }, []);

  const pendingInvs = invoices.filter(i => !i.status?.startsWith("Paid"));
  const catBudget = {};
  budget.forEach(b => { catBudget[b.cat] = (catBudget[b.cat] || 0) + parseFloat(b.budget); });

  const spendRows = [
    { name: "Taconic Builders (GC)", paid: taconicPaid, color: "#10b981" },
    { name: "Architecturefirm",      paid: afPaid,      color: "#0891b2" },
    { name: "Reed Hilderbrand",      paid: rhPaid,      color: "#059669" },
    { name: "Ivan Zdrahal PE",       paid: izPaid,      color: "#7c3aed" },
  ];
  const phase11GrandTotal = taconicPaid + izPaid + rhPaid + afPaid;

  // Section header helper — consistent across whole Dashboard
  const SectionHeader = ({ label, action, actionLabel }) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#ebebea]" />
      {action && (
        <button onClick={action} className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap">{actionLabel} →</button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Alert banners — only show when needed ── */}
      {reconSummary?.failed > 0 && (
        <button onClick={() => setTab("phase11:reconcile")} className="w-full text-left flex items-center gap-3 bg-red-50/60 border border-red-100 rounded-lg px-4 py-2.5 hover:bg-red-100 transition-colors">
          <span className="text-red-500">✕</span>
          <p className="text-sm font-semibold text-red-700 flex-1">Reconciliation errors detected — {reconSummary.failed} check{reconSummary.failed > 1 ? "s" : ""} failing</p>
          <span className="text-red-400">→</span>
        </button>
      )}
      {reconSummary?.failed === 0 && reconSummary?.total > 0 && (
        <button onClick={() => setTab("phase11:reconcile")} className="w-full text-left flex items-center gap-3 bg-emerald-50/60 border border-emerald-100 rounded-lg px-4 py-2.5 hover:bg-emerald-100 transition-colors">
          <span className="text-emerald-500 text-sm">✓</span>
          <p className="text-sm font-semibold text-emerald-700 flex-1">All {reconSummary.total} reconciliation checks passing</p>
          <span className="text-emerald-400">→</span>
        </button>
      )}
      {pendingInvs.length > 0 && (
        <button onClick={() => setTab("phase11:invoices")} className="w-full text-left flex items-center gap-3 bg-amber-50/60 border border-amber-100 rounded-lg px-4 py-2.5 hover:bg-amber-100 transition-colors">
          <span className="text-amber-500">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Payment action required</p>
            <p className="text-sm text-amber-600 mt-0.5">{pendingInvs.length} invoice{pendingInvs.length > 1 ? "s" : ""} pending: {pendingInvs.map(i => i.inv_num).join(", ")} — {$f(taconicPending)}</p>
          </div>
          <span className="text-amber-500">→</span>
        </button>
      )}

      {/* ── Total Project Spend ── */}
      <div>
        <SectionHeader label="Total Project Spend" action={() => setTab("totalspend")} actionLabel="Full breakdown" />
        <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0ee]">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Inception to Date · All Phases</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{$f(inceptionToDateTotal)}</p>
            </div>
            <button onClick={() => setModal("spend")}
              className="px-4 py-2 bg-[#1c2b3a] hover:bg-[#243447] text-white text-xs font-medium rounded-md transition-colors">
              View Breakdown →
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-50">
            {[
              ["Land & Pre-Construction", "$3,963,000+", "Land acquisition + design"],
              ["Road & Demolition",       "$900,000+",   "Prior completed phases"],
              ["Phase 1.1",              $f(phase11GrandTotal), "Active construction"],
            ].map(([label, val, sub]) => (
              <div key={label} className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-900 tabular-nums">{val}</p>
                <p className="text-sm text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Phase 1.1 — Construction ── */}
      <div>
        <SectionHeader label="Phase 1.1 — Construction (Taconic Builders)" action={() => setTab("phase11")} actionLabel="View Phase 1.1" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Revised Contract"   value={$f(revisedContractTotal)} sub={`Original $13,093,419 + ${$f(revisedContractTotal - 13093419.47)} COs`} onClick={() => setTab("phase11:budget")} />
          <Stat label="GC Awarded"         value={$f(totalAwarded)}         sub={pf(totalAwarded / revisedContractTotal) + " of revised contract"} onClick={() => setTab("phase11:awards")} />
          <Stat label="GC Paid to Date"    value={$f(taconicPaid)}          sub={pf(taconicPaid / totalAwarded) + " of awarded"} accent onClick={() => setTab("phase11:invoices")} />
          <Stat label="Balance to Finish"  value={$f(balanceToFinish)}      sub="Revised contract less completed to date" onClick={() => setTab("phase11:lineitem")} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Approved COs"       value={$f(totalCOs)}             sub={changeOrders.length + " change orders"} onClick={() => setTab("phase11:cos")} />
          <Stat label="Retainage Held"     value={$f(retainageHeld)}        sub="Released at substantial completion" onClick={() => setModal("retainage")} />
          <Stat label="GC Pending"         value={$f(taconicPending)}       sub={pendingInvs.length + " invoices outstanding"} accent onClick={() => setTab("phase11:invoices")} />
          <Stat label="% Complete"         value={pf(taconicPaid / revisedContractTotal)} sub="Based on paid to date" />
        </div>
      </div>

      {/* ── Phase 1.1 charts ── */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-6">
          <SectionHeader label="Phase 1.1 — Spend by Vendor" />
          <p className="text-sm text-gray-400 -mt-3 mb-4">Phase 1.1 only · click for detail</p>
          <div className="space-y-3">
            {spendRows.map(v => (
              <button key={v.name} onClick={() => {
                if (v.name.includes("Taconic")) setTab("phase11:invoices");
                else setTab("designeng");
              }} className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: v.color }} />
                <span className="text-sm text-gray-600 w-48 shrink-0 truncate">{v.name}</span>
                <div className="flex-1"><BarFill value={v.paid} max={phase11GrandTotal} color={v.color} /></div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums w-28 text-right">{$f(v.paid)}</span>
              </button>
            ))}
            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
              <span className="text-sm font-semibold text-gray-500">Phase 1.1 Total</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{$f(phase11GrandTotal)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader label="Phase 1.1 — Budget vs. Awarded by Category" />
          <p className="text-sm text-gray-400 -mt-3 mb-4">Taconic control budget · click for detail</p>
          <div className="space-y-2.5">
            {Object.entries(catBudget).sort((a, b) => b[1] - a[1]).map(([cat, bud]) => {
              const awd = awards.filter(a => budget.find(b => b.code === a.code)?.cat === cat).reduce((s, a) => s + parseFloat(a.current_amount), 0);
              return (
                <button key={cat} onClick={() => setModal({ type: "catDetail", cat })} className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                  <span className="text-sm text-gray-500 w-24 shrink-0">{cat}</span>
                  <div className="flex-1"><BarFill value={awd} max={bud} /></div>
                  <span className="text-sm text-gray-500 tabular-nums w-24 text-right">{$f(bud)}</span>
                  <span className="text-sm text-gray-400 w-14 text-right">{awd > 0 ? pf(awd / bud) : "—"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Project Details ── */}
      <div>
        <SectionHeader label="Project Details" />
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[#f0f0ee]">
            <div className="divide-y divide-[#f0f0ee]">
              {[
                ["Project",            "Camp Forestmere"],
                ["Owner",              "JXM / Camp Forestmere Corp."],
                ["Location",           "Paul Smiths, NY 12970"],
                ["General Contractor", "Taconic Builders Inc."],
                ["Contract Start",     "Jun 23, 2025"],
                ["Contract Duration",  "22 months"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-gray-400">{k}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right ml-4">{v}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-[#f0f0ee]">
              {[
                ["Est. Completion",  "April 2027"],
                ["Project Manager", "Joseph Hamilton"],
                ["Architect",       "Architecturefirm"],
                ["Landscape Arch.", "Reed Hilderbrand"],
                ["Civil Engineer",  "Ivan Zdrahal PE"],
                ["Project #",       "C25-104"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-gray-400">{k}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right ml-4">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Modals ── */}
      {modal === "spend" && (() => {
        const ap = spendData?.allPayments || [];
        const landAmt   = ap.filter(p => p.work_package === "Land Acquisition").reduce((s,p) => s+p.amount_usd, 0);
        const designAmt = ap.filter(p => p.work_package === "Design & Permitting").reduce((s,p) => s+p.amount_usd, 0);
        const roadAmt   = ap.filter(p => p.work_package === "Road Construction").reduce((s,p) => s+p.amount_usd, 0);
        const demoAmt   = ap.filter(p => p.work_package === "Demolition").reduce((s,p) => s+p.amount_usd, 0);
        const ph11Amt   = ap.filter(p => p.work_package === "Phase 1.1").reduce((s,p) => s+p.amount_usd, 0);
        const grandAmt  = landAmt + designAmt + roadAmt + demoAmt + ph11Amt;
        const pct = (n) => grandAmt > 0 ? pf(n / grandAmt) : "—";
        return (
          <Modal title="Total Project Spend" subtitle="Inception to date · all phases · USD" onClose={() => setModal(null)}>
            {!spendData && <p className="text-sm text-gray-400 text-center py-4">Loading…</p>}
            {spendData && (
              <table className="w-full">
                <thead>
                  <tr>
                    <TH>Category</TH>
                    <TH right>Amount (USD)</TH>
                    <TH right>% of Total</TH>
                  </tr>
                </thead>
                <tbody>
                  <TR subtle><TD bold colSpan={3} className="text-indigo-700 uppercase tracking-wider text-xs">Pre-Construction</TD></TR>
                  {[["Land Acquisition", landAmt], ["Design & Permitting", designAmt]].map(([label, amt]) => (
                    <TR key={label}><TD className="pl-8">{label}</TD><TD right bold>{$f(amt)}</TD><TD right muted>{pct(amt)}</TD></TR>
                  ))}
                  <TR subtle><TD bold colSpan={3} className="text-indigo-700 uppercase tracking-wider text-xs">Construction</TD></TR>
                  {[["Road Construction", roadAmt], ["Demolition", demoAmt], ["Phase 1.1", ph11Amt]].map(([label, amt]) => (
                    <TR key={label}><TD className="pl-8">{label}</TD><TD right bold>{$f(amt)}</TD><TD right muted>{pct(amt)}</TD></TR>
                  ))}
                </tbody>
                <tfoot>
                  <TR subtle>
                    <TD bold className="text-gray-900">Total Inception to Date</TD>
                    <TD right bold className="text-gray-900">{$f(grandAmt)}</TD>
                    <TD right muted>100%</TD>
                  </TR>
                </tfoot>
              </table>
            )}
            <button onClick={() => { setModal(null); setTab("totalspend"); }} className="mt-3 w-full py-3 bg-[#1c2b3a] hover:bg-[#243447] text-white text-sm font-semibold rounded-lg transition-colors">View Full Breakdown in Total Spend →</button>
          </Modal>
        );
      })()}
      {modal === "retainage" && (
        <Modal title="Retainage Held" subtitle="10% of completed work — released at substantial completion" onClose={() => setModal(null)}>
          <KVGrid rows={[["Total Retainage Held", $f(retainageHeld)], ["Retainage Rate", "~10% of completed work"], ["Release Trigger", "Substantial Completion"], ["Estimated Release", "April 2027"]]} />
        </Modal>
      )}
      {modal?.type === "catDetail" && (
        <Modal title={`${modal.cat} — Budget Detail`} subtitle="Awards within this category" onClose={() => setModal(null)} wide>
          <table className="w-full">
            <thead><tr><TH>Code</TH><TH>Division</TH><TH right>Budget</TH><TH right>Awarded</TH><TH right>Variance</TH></tr></thead>
            <tbody>
              {budget.filter(b => b.cat === modal.cat).map(b => {
                const awd = awardedByCode[b.code] || 0;
                const variance = awd - parseFloat(b.budget);
                return (
                  <TR key={b.code}>
                    <TD muted className="font-mono text-xs">{b.code}</TD>
                    <TD bold>{b.div}</TD>
                    <TD right muted>{$f(b.budget)}</TD>
                    <TD right bold>{$f(awd)}</TD>
                    <TD right className={variance > 0 ? "text-red-500 font-semibold" : variance < 0 ? "text-emerald-600 font-semibold" : "text-gray-300"}>
                      {variance > 0 ? `+${$f(variance)}` : variance < 0 ? `-${$f(-variance)}` : "—"}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}


// ─── PRIOR PHASES ─────────────────────────────────────────────────────────────
function PriorPhaseShell({ phaseId }) {
  const { priorPhases } = useAppData();
  const phase = priorPhases.find(p => p.id === phaseId);
  const [subTab, setSubTab] = useState("summary");

  const PHASE_META = {
    road: {
      color: "#f59e0b",
      contract: "C23-101",
      label: "Road Construction",
      dateRange: "Jan 2024 – Jun 2024",
    },
    demolition: {
      color: "#ef4444",
      contract: "C25-102",
      label: "Demolition",
      dateRange: "Jan 2025 – May 2025",
    },
  };
  const meta = PHASE_META[phaseId] || {};

  const SUB_TABS = [
    { id: "summary",   label: "Summary"        },
    { id: "budget",    label: "Budget"         },
    { id: "cos",       label: "Change Orders"  },
    { id: "invoices",  label: "Invoices"       },
  ];

  if (!phase) return (
    <div className="text-center py-20 text-gray-400 text-sm">Phase data not found.</div>
  );

  const variance = phase.final_contract - phase.original_contract;

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-0 border-b border-[#e8e8e6] -mt-2">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={cx("px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-all whitespace-nowrap",
              subTab === t.id ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {subTab === "summary" && (
        <div className="space-y-4">
          {/* Status banner */}
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-lg border" style={{ background: meta.color + "10", borderColor: meta.color + "40" }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: meta.color }} />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">{meta.label} — {meta.contract}</p>
              <p className="text-sm text-gray-500 mt-0.5">{phase.gc}{phase.subcontractor ? ` · Sub: ${phase.subcontractor}` : ""} · {phase.start_date} – {phase.end_date}</p>
            </div>
            <Tag text="Complete" color="green" />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Original Contract" value={$f(phase.original_contract)} sub={meta.contract} />
            <Stat label="Approved COs"      value={$f(phase.approved_cos)}      sub={phase.cos?.length > 0 ? `${phase.cos.length} change order${phase.cos.length !== 1 ? "s" : ""}` : "No change orders"} />
            <Stat label="Final Contract"    value={$f(phase.final_contract)}    sub={variance !== 0 ? (variance > 0 ? `+${$f(variance)} over original` : `-${$f(-variance)} under original`) : "Equals original"} />
            <Stat label="Total Paid"        value={$f(phase.total_paid)}        sub="Fully paid · phase closed" accent />
          </div>

          {/* Compact contract details */}
          <div className="border border-[#ede9e3] rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[#ede9e3] bg-[#faf8f5]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contract Details</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#f0f0ee]">
              {[
                ["GC", phase.gc],
                ["Subcontractor", phase.subcontractor || "—"],
                ["Contract #", meta.contract],
                ["Period", `${phase.start_date} – ${phase.end_date}`],
              ].map(([k,v]) => (
                <div key={k} className="px-4 py-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{k}</div>
                  <div className="text-xs font-medium text-gray-700">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scope */}
          {phase.scope && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Scope of Work</p>
              <p className="text-sm text-gray-600 leading-relaxed">{phase.scope}</p>
            </Card>
          )}

          {/* Notes */}
          {phase.notes && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
              <p className="text-sm text-gray-500 leading-relaxed">{phase.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* ── BUDGET ── */}
      {subTab === "budget" && (
        <div className="space-y-4">
          {/* Contract summary ledger */}
          <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
            <div className="px-5 py-2.5 border-b border-[#e8e8e6]">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Contract Summary</span>
            </div>
            <div className="divide-y divide-[#f0f0ee]">
              {[
                ["Original Contract",  $f(phase.original_contract),  "text-gray-800"],
                ["Approved COs",       $f(phase.approved_cos),       variance > 0 ? "text-amber-600" : "text-emerald-600"],
                ["Final Contract",     $f(phase.final_contract),     "text-gray-900 font-bold"],
                ["Total Paid",         $f(phase.total_paid),         "text-indigo-600 font-bold"],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex items-center px-5 py-3">
                  <span className="flex-1 text-sm text-gray-500">{label}</span>
                  <span className={cx("text-sm tabular-nums", cls)}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line items */}
          {phase.lineItems?.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-2.5 border-b border-[#e8e8e6]">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Budget Line Items</span>
              </div>
              <table className="w-full">
                <thead><tr>
                  <TH>Code</TH><TH>Description</TH><TH right>Budget</TH><TH right>Paid</TH><TH right>Variance</TH>
                </tr></thead>
                <tbody>
                  {phase.lineItems.map(li => {
                    const v = li.paid - li.budget;
                    return (
                      <TR key={li.code}>
                        <TD muted className="font-mono text-xs">{li.code}</TD>
                        <TD className="text-gray-700">{li.description}</TD>
                        <TD right muted>{$f(li.budget)}</TD>
                        <TD right bold className="text-gray-900">{$f(li.paid)}</TD>
                        <TD right className={v > 0 ? "text-red-500 font-semibold" : v < 0 ? "text-emerald-600 font-semibold" : "text-gray-300"}>
                          {v > 0 ? `+${$f(v)}` : v < 0 ? `-${$f(-v)}` : "—"}
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
                <tfoot>
                  <TR subtle>
                    <TD bold colSpan={2} muted>Total</TD>
                    <TD right muted>{$f(phase.lineItems.reduce((s,l) => s+l.budget, 0))}</TD>
                    <TD right bold className="text-gray-900">{$f(phase.lineItems.reduce((s,l) => s+l.paid, 0))}</TD>
                    <TD />
                  </TR>
                </tfoot>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── CHANGE ORDERS ── */}
      {subTab === "cos" && (
        <div className="space-y-4">
          {phase.cos?.length > 0 ? (
            <>
              {/* CO summary */}
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Original Contract" value={$f(phase.original_contract)} sub="Pre-CO baseline" />
                <Stat label="Net CO Impact"     value={(phase.approved_cos >= 0 ? "+" : "") + $f(phase.approved_cos)} sub={`${phase.cos.length} change order${phase.cos.length !== 1 ? "s" : ""}`} />
                <Stat label="Final Contract"    value={$f(phase.final_contract)}    sub="Original + all COs" accent />
              </div>
              <Card className="overflow-hidden">
                <div className="px-5 py-2.5 border-b border-[#e8e8e6]">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Change Orders</span>
                </div>
                <table className="w-full">
                  <thead><tr>
                    <TH>CO #</TH><TH>Description</TH><TH right>Amount (USD)</TH>
                  </tr></thead>
                  <tbody>
                    {phase.cos.map(co => (
                      <TR key={co.no}>
                        <TD bold className="text-gray-700 font-mono text-xs">{co.no}</TD>
                        <TD className="text-gray-600">{co.description}</TD>
                        <TD right bold className={co.amount < 0 ? "text-emerald-600" : "text-amber-600"}>
                          {co.amount < 0 ? `-${$f(-co.amount)}` : `+${$f(co.amount)}`}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                  <tfoot>
                    <TR subtle>
                      <TD bold colSpan={2} muted>Net Total</TD>
                      <TD right bold className={phase.approved_cos < 0 ? "text-emerald-600" : "text-amber-600"}>
                        {phase.approved_cos < 0 ? `-${$f(-phase.approved_cos)}` : `+${$f(phase.approved_cos)}`}
                      </TD>
                    </TR>
                  </tfoot>
                </table>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm font-semibold text-gray-500 mb-1">No Change Orders</p>
              <p className="text-sm">This phase had no change orders.</p>
            </div>
          )}
        </div>
      )}
      {/* ── INVOICES ── */}
      {subTab === "invoices" && (
        <PriorPhaseInvoices phaseId={phaseId} phaseMeta={meta} phaseTotalPaid={phase.total_paid} />
      )}
    </div>
  );
}

// ─── PRIOR PHASE INVOICES ─────────────────────────────────────────────────────
function PriorPhaseInvoices({ phaseId, phaseMeta, phaseTotalPaid }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ invoice_num: "", invoice_date: "", vendor: "", description: "", amount: "", notes: "" });

  // reconciled_to key for this phase
  const reconKey = phaseId === "road" ? "prior_phases_road" : "prior_phases_demo";

  const load = () => {
    setLoading(true);
    apiFetch('/project-phases').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [phaseId]);

  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400";

  const saveInvoice = async () => {
    if (!form.invoice_num || !form.invoice_date || !form.amount || saving) return;
    setSaving(true);
    try {
      await apiFetch('/historical-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'Construction',
          work_package: phaseId === 'road' ? 'Road Construction' : 'Demolition',
          payment_date: form.invoice_date,
          vendor: form.vendor || (phaseId === 'road' ? 'Luck Builders Inc.' : 'Mayville Enterprises Inc.'),
          category: 'Construction',
          description: form.description || form.invoice_num,
          amount_usd: parseFloat(form.amount),
          source: 'invoice',
          notes: form.notes || null,
          is_batched: false,
          reconciled_to: reconKey,
        }),
      });
      setForm({ invoice_num: "", invoice_date: "", vendor: "", description: "", amount: "", notes: "" });
      setAdding(false);
      load();
    } catch(e) { alert('Error saving: ' + e.message); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const invoices = (data?.allPayments || []).filter(p => p.reconciled_to === reconKey);
  const totalPaid = invoices.reduce((s, p) => s + p.amount_usd, 0);

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Invoices on File"   value={String(invoices.length)}    sub="Recorded payments" />
        <Stat label="Total Invoiced"     value={$f(totalPaid)}              sub="Sum of all invoices" accent />
        <Stat label="Contract Value"     value={$f(phaseTotalPaid)}         sub="Final contract paid" />
      </div>

      {/* Add invoice button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""} recorded for {phaseMeta.label}</p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-[#1c2b3a] hover:bg-[#243447] text-white text-xs font-medium rounded-md transition-colors">
            + Add Invoice
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <Card className="p-5 border-indigo-200">
          <p className="text-sm font-bold text-gray-900 mb-4">New Invoice / Payment</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Invoice #</label>
              <input className={inp} placeholder="e.g. INV-001" value={form.invoice_num} onChange={e => setForm(f => ({...f, invoice_num: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Date</label>
              <input className={inp} type="date" value={form.invoice_date} onChange={e => setForm(f => ({...f, invoice_date: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Vendor</label>
              <input className={inp} placeholder={phaseId === 'road' ? 'Luck Builders Inc.' : 'Mayville Enterprises Inc.'} value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Amount (USD)</label>
              <input className={inp} type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Description</label>
              <input className={inp} placeholder="Invoice description..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Notes</label>
              <input className={inp} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveInvoice} disabled={saving || !form.invoice_num || !form.invoice_date || !form.amount}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Saving…" : "Save Invoice"}
            </button>
            <button onClick={() => { setAdding(false); setForm({ invoice_num:"", invoice_date:"", vendor:"", description:"", amount:"", notes:"" }); }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Invoice list */}
      {invoices.length === 0 && !adding ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-semibold text-gray-500 mb-1">No invoices recorded yet</p>
          <p className="text-sm">Click "Add Invoice" to record payments for this phase.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr>
              <TH>Invoice #</TH><TH>Date</TH><TH>Vendor</TH><TH>Description</TH><TH right>Amount (USD)</TH>
            </tr></thead>
            <tbody>
              {invoices.sort((a,b) => (a.payment_date||"").localeCompare(b.payment_date||"")).map((inv, i) => (
                <TR key={i} onClick={() => setSelected(selected?.payment_date === inv.payment_date && selected?.description === inv.description ? null : inv)}>
                  <TD bold className="font-mono text-xs">{inv.description?.split(" ")?.[0] || "—"}</TD>
                  <TD muted>{inv.payment_date}</TD>
                  <TD>{inv.vendor}</TD>
                  <TD muted>{inv.description}</TD>
                  <TD right bold>{$f(inv.amount_usd)}</TD>
                </TR>
              ))}
            </tbody>
            <tfoot>
              <TR subtle>
                <TD bold colSpan={4} muted>Total Paid</TD>
                <TD right bold className="text-gray-900">{$f(totalPaid)}</TD>
              </TR>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Note about data source */}
      <p className="text-sm text-gray-400">Payments recorded from Zoho Bills and manual entries. {phaseMeta.contract} is complete — all invoices paid.</p>
    </div>
  );
}

function VendorsView() {
  const { vendors, refresh } = useAppData();
  const [vendorKey, setVendorKey] = useState("ivan");
  const [subTab, setSubTab] = useState("invoices");
  const [modal, setModal] = useState(null);
  const [phaseView, setPhaseView] = useState("table");
  const [addingInv, setAddingInv] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState({ invNum:"", date:"", desc:"", amount:"", status:"Pending" });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const vendor = vendors[vendorKey];
  const totalInvoiced = (v) => v.invoices.reduce((s,i) => s + (i.amount||0), 0);
  const totalBudgeted = (v) => v.phases.reduce((s,p) => s + (p.budget||0), 0);
  const vendorList = ["ivan","reed","arch"].map(k => ({
    key: k, label: vendors[k].name, total: totalInvoiced(vendors[k])
  }));

  const inv = totalInvoiced(vendor);
  const bud = totalBudgeted(vendor);
  const rem = bud > 0 ? bud - inv : null;
  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400";

  const saveNewInv = async () => {
    if (!addForm.invNum || !addForm.amount || saving) return;
    setSaving(true);
    await apiFetch(`/vendors/${vendorKey}/invoices`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ invNum:addForm.invNum, date:addForm.date, desc:addForm.desc, amount:parseFloat(addForm.amount.replace(/[^0-9.]/g,""))||0, status:addForm.status })
    });
    await refresh(); setAddForm({ invNum:"", date:"", desc:"", amount:"", status:"Pending" }); setAddingInv(false); setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingId || saving) return; setSaving(true);
    await apiFetch(`/vendors/invoices/${editingId}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ invNum:editForm.inv_num, date:editForm.inv_date, desc:editForm.description, amount:parseFloat(editForm.amount)||0, status:editForm.status })
    });
    await refresh(); setEditingId(null); setSaving(false);
  };

  const deleteInv = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    await apiFetch(`/vendors/invoices/${id}`, { method:'DELETE' });
    await refresh();
  };

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar — name + total only, no description */}
      <aside className="w-44 shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">Vendors</p>
        <div className="space-y-1">
          {vendorList.map(v => (
            <button key={v.key}
              onClick={() => { setVendorKey(v.key); setSubTab("overview"); setModal(null); setAddingInv(false); setEditingId(null); }}
              className={cx("w-full text-left px-3 py-3 rounded-lg transition-all border", vendorKey===v.key ? "bg-white border-gray-200 shadow-sm" : "border-transparent hover:bg-gray-50")}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: vendors[v.key].color }} />
                <span className={cx("text-sm font-semibold leading-tight", vendorKey===v.key ? "text-gray-900" : "text-gray-500")}>{v.label}</span>
              </div>
              <p className="text-sm font-bold tabular-nums text-gray-400 pl-4">{$f(v.total)}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="bg-[#f5f6f8] rounded-lg px-3 py-2.5">
            <div className="text-sm text-gray-400 mb-0.5">Combined</div>
            <div className="text-sm font-bold text-gray-900">{$f(vendorList.reduce((s,v)=>s+v.total,0))}</div>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{vendor.full_name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{vendor.role}</p>
          </div>
          <Tag text="Active" color="amber" />
        </div>

        <div className="flex border-b border-gray-200 mb-5">
          {[["overview","Overview"],["phases","Budget"],["invoices","Invoices"]].map(([id,lbl]) => (
            <button key={id} onClick={() => { setSubTab(id); setModal(null); setAddingInv(false); setEditingId(null); }}
              className={cx("px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px", subTab===id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {lbl}
              {id==="invoices" && <span className="ml-1 text-gray-300">({vendor.invoices.length})</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {subTab==="overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Invoiced" value={$f(inv)} sub="All budget phases" accent onClick={() => setSubTab("invoices")} />
              {rem != null ? <Stat label="Remaining Budget" value={$f(rem)} sub="Against fixed fees" onClick={() => setSubTab("phases")} /> : <Stat label="Billing Type" value="T&M" sub="Billed monthly" />}
              <Stat label="Invoices on File" value={String(vendor.invoices.length)} sub="Tracked invoices" onClick={() => setSubTab("invoices")} />
            </div>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Budget Status</SectionTitle>
                <div className="flex gap-1 -mt-4">
                  {[["table","Table"],["cards","Cards"],["timeline","List"]].map(([v,l]) => (
                    <button key={v} onClick={() => setPhaseView(v)} className={cx("px-2.5 py-1 text-sm rounded-lg font-medium", phaseView===v ? "bg-[#1c2b3a] text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700")}>{l}</button>
                  ))}
                </div>
              </div>
              {phaseView==="table" && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><TH>Budget Phase</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
                  <tbody>
                    {vendor.phases.map((p,i) => {
                      const b=p.budget||0; const inv2=p.invoiced||0; const r=b>0?b-inv2:null;
                      return (
                        <TR key={i} onClick={() => { setSubTab("phases"); setModal(p); }}>
                          <TD bold className="text-gray-800">{p.phase}</TD>
                          <TD right muted>{b>0?$f(b):"T&M"}</TD>
                          <TD right bold className="text-gray-900">{$f(inv2)}</TD>
                          <TD right className={r==null?"text-gray-400":r<0?"text-red-500 font-bold":r>0?"text-indigo-600 font-medium":"text-gray-300"}>{r==null?"T&M":r>0?$f(r):r<0?`-${$f(-r)}`:"—"}</TD>
                          <TD>{statusTag(p.status)}</TD>
                        </TR>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {phaseView==="cards" && (
                <div className="grid md:grid-cols-2 gap-2">
                  {vendor.phases.map((p,i) => {
                    const b=p.budget||0; const inv2=p.invoiced||0;
                    return (
                      <button key={i} onClick={()=>{setSubTab("phases");setModal(p);}} className="text-left bg-gray-50 hover:bg-indigo-50 rounded-lg p-3 border border-gray-100 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2"><span className="text-sm font-semibold text-gray-800 leading-tight">{p.phase}</span>{statusTag(p.status)}</div>
                        {b>0&&<BarFill value={inv2} max={b} color={vendor.color}/>}
                        <div className="flex justify-between mt-2"><span className="text-sm text-gray-400">{b>0?$f(b)+" budget":"T&M"}</span><span className="text-sm font-bold text-gray-800">{$f(inv2)}</span></div>
                      </button>
                    );
                  })}
                </div>
              )}
              {phaseView==="timeline" && (
                <div className="relative pl-5">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-100" />
                  {vendor.phases.map((p,i) => {
                    const dotColor=p.status==="Complete"?"#10b981":p.status==="Not Started"?"#d1d5db":vendor.color;
                    return (
                      <button key={i} onClick={()=>{setSubTab("phases");setModal(p);}} className="w-full text-left flex gap-3 mb-2 group relative">
                        <div className="absolute -left-3.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{background:dotColor}} />
                        <div className="flex-1 min-w-0 bg-gray-50 hover:bg-indigo-50 rounded-lg px-3 py-2 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800 truncate">{p.phase}</span>
                            <div className="flex items-center gap-2 shrink-0">{statusTag(p.status)}<span className="text-sm font-bold tabular-nums text-gray-700">{$f(p.invoiced||0)}</span></div>
                          </div>
                          {p.description&&<p className="text-sm text-gray-400 mt-0.5 truncate">{p.description}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* BUDGET (was PHASES) */}
        {subTab==="phases" && (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead><tr><TH>Budget Phase</TH><TH>Description</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
              <tbody>
                {vendor.phases.map((p,i) => {
                  const bP=p.budget||0; const invP=p.invoiced||0; const remP=bP>0?bP-invP:null;
                  return (
                    <TR key={i} onClick={()=>setModal(p)}>
                      <TD bold className="text-gray-800 whitespace-nowrap">{p.phase}</TD>
                      <TD muted className="max-w-xs">{p.description}</TD>
                      <TD right muted>{bP>0?$f(bP):"T&M"}</TD>
                      <TD right bold className="text-gray-900">{$f(invP)}</TD>
                      <TD right className={remP==null?"text-gray-400":remP<0?"text-red-500 font-bold":remP>0?"text-indigo-600 font-medium":"text-gray-300"}>{remP==null?"T&M":remP>0?$f(remP):remP<0?`-${$f(-remP)}`:"—"}</TD>
                      <TD>{statusTag(p.status)}</TD>
                    </TR>
                  );
                })}
              </tbody>
              <tfoot>
                <TR subtle>
                  <TD bold colSpan={3} muted>Total</TD>
                  <TD right bold className="text-gray-900">{$f(inv)}</TD>
                  <TD right bold className="text-indigo-600">{rem!=null?$f(rem):"T&M"}</TD>
                  <TD />
                </TR>
              </tfoot>
            </table>
          </Card>
        )}

        {/* INVOICES */}
        {subTab==="invoices" && <InvoiceWorkflow vendorKey={vendorKey} />}
      {subTab==="invoices_old" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setAddingInv(v=>!v); setEditingId(null); }}
                className={cx("px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors", addingInv ? "bg-gray-200 text-gray-600" : "bg-[#1c2b3a] text-white")}>
                {addingInv?"Cancel":"+ Add Invoice"}
              </button>
            </div>
            {addingInv && (
              <Card className="p-4">
                <SectionTitle>New Invoice — {vendor.name}</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div><label className="block text-sm text-gray-400 mb-1">Invoice #</label><input value={addForm.invNum} onChange={e=>setAddForm(f=>({...f,invNum:e.target.value}))} placeholder="e.g. INV-001" className={inp}/></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Date</label><input value={addForm.date} onChange={e=>setAddForm(f=>({...f,date:e.target.value}))} placeholder="MM/DD/YYYY" className={inp}/></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Amount ($)</label><input value={addForm.amount} onChange={e=>setAddForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" className={inp}/></div>
                  <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Description</label><input value={addForm.desc} onChange={e=>setAddForm(f=>({...f,desc:e.target.value}))} placeholder="Invoice description…" className={inp}/></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={addForm.status} onChange={e=>setAddForm(f=>({...f,status:e.target.value}))} className={inp}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveNewInv} disabled={!addForm.invNum||!addForm.amount||saving} className={cx("px-4 py-2 text-sm font-bold rounded-lg transition-colors", addForm.invNum&&addForm.amount&&!saving?"bg-[#1c2b3a] text-white":"bg-gray-100 text-gray-400 cursor-not-allowed")}>{saving?"Saving…":"Save Invoice"}</button>
                  <button onClick={()=>setAddingInv(false)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </Card>
            )}
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead><tr><TH>Invoice #</TH><TH>Date</TH><TH>Description</TH><TH right>Amount</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
                <tbody>
                  {vendor.invoices.map((vinv) => {
                    const isEditing = editingId === vinv.id;
                    return isEditing ? (
                      <tr key={vinv.id} className="bg-indigo-50 border-b border-gray-100">
                        <TD><input value={editForm.inv_num||""} onChange={e=>setEditForm(f=>({...f,inv_num:e.target.value}))} className={inp+" w-24"}/></TD>
                        <TD><input value={editForm.inv_date||""} onChange={e=>setEditForm(f=>({...f,inv_date:e.target.value}))} className={inp+" w-24"}/></TD>
                        <TD><input value={editForm.description||""} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} className={inp+" w-48"}/></TD>
                        <TD right><input value={editForm.amount||""} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} className={inp+" w-24 text-right"}/></TD>
                        <TD><select value={editForm.status||"Pending"} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} className={inp+" w-24"}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></TD>
                        <TD><div className="flex gap-1"><button onClick={saveEdit} className="text-sm px-2 py-1 bg-[#1c2b3a] text-white rounded">{saving?"…":"Save"}</button><button onClick={()=>setEditingId(null)} className="text-sm px-2 py-1 bg-gray-100 text-gray-500 rounded">Cancel</button></div></TD>
                      </tr>
                    ) : (
                      <TR key={vinv.id} onClick={() => setModal({_inv:true,...vinv})}>
                        <TD mono className="text-indigo-600 font-bold">{vinv.inv_num}</TD>
                        <TD muted>{vinv.inv_date}</TD>
                        <TD className="text-gray-600">{vinv.description}</TD>
                        <TD right bold className="text-gray-900">{$f(vinv.amount)}</TD>
                        <TD>{statusTag(vinv.status)}</TD>
                        <TD onClick={e=>e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={()=>{setEditingId(vinv.id);setEditForm({...vinv});}} className="text-sm px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700 hover:border-gray-400">Edit</button>
                            <button onClick={()=>deleteInv(vinv.id)} className="text-sm px-2 py-1 text-gray-300 hover:text-red-500">✕</button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
                <tfoot>
                  <TR subtle><TD bold colSpan={3} muted>Total</TD><TD right bold className="text-gray-900">{$f(vendor.invoices.reduce((s,i)=>s+(i.amount||0),0))}</TD><TD colSpan={2}/></TR>
                </tfoot>
              </table>
            </Card>
          </div>
        )}
      </div>

      {modal && !modal._inv && (
        <Modal title={modal.phase} subtitle={vendor.full_name} onClose={() => setModal(null)}>
          <KVGrid rows={[["Phase", modal.phase],["Status", modal.status],["Budget", modal.budget>0?$f(modal.budget):"T&M"],["Invoiced", $f(modal.invoiced)],["Remaining", modal.budget>0?$f(modal.budget-modal.invoiced):"T&M"],["Description", modal.description]]} />
        </Modal>
      )}
      {modal?._inv && (
        <Modal title={`Invoice ${modal.inv_num}`} subtitle={`${vendor.name} · ${modal.inv_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[["Invoice #", modal.inv_num],["Date", modal.inv_date],["Description", modal.description],["Amount", $f(modal.amount)],["Status", modal.status]]} />
        </Modal>
      )}
    </div>
  );
}

// ─── DOCUMENTS VIEW ───────────────────────────────────────────────────────────
function DocumentsView() {
  const { documents, refresh } = useAppData();
  const [view, setView] = useState("upload");
  const [deleting, setDeleting] = useState(null);

  // Use documents already loaded by DataProvider - no separate fetch needed
  const docs = documents || [];

  const loadDocs = async () => { await refresh(); };

  useEffect(() => {}, []);

  const deleteDoc = async (id) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(id);
    await apiFetch(`/documents/${id}`, { method: 'DELETE' });
    await loadDocs();
    setDeleting(null);
  };

  const rollbackInvoice = async (doc) => {
    if (!doc.linked_id) return;
    if (!confirm(`Roll back ${doc.linked_id}? This will delete the invoice record and all its line item billings.`)) return;
    // Delete line item billings for this invoice
    const invNum = doc.note?.match(/#\d+/)?.[0];
    if (invNum) {
      try { await apiFetch(`/line-item-billings/rollback/${encodeURIComponent(invNum)}`, { method: 'DELETE' }); } catch(e) {}
    }
    // Delete the invoice
    try { await apiFetch(`/invoices/${doc.linked_id}`, { method: 'DELETE' }); } catch(e) {}
    // Delete the document
    await apiFetch(`/documents/${doc.id}`, { method: 'DELETE' });
    await loadDocs();
    await refresh();
  };

  const typeColor = (t) => {
    if (t === "Invoice") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (t === "Change Order") return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
    if (t === "Award Letter") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setView("upload")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${view==="upload" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          Upload Document
        </button>
        <button onClick={() => { setView("history"); loadDocs(); }} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${view==="history" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          Document History {docs.length > 0 ? <span className="ml-1 text-gray-400">({docs.length})</span> : ""}
        </button>
      </div>

      {view === "upload" && <SmartUploadView onSaved={loadDocs} />}

      {view === "history" && (
        <div className="space-y-3">
          {docs.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
            </div>
          )}
          {docs.length > 0 && (
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <TH>File Name</TH>
                    <TH>Type</TH>
                    <TH>Linked To</TH>
                    <TH>Vendor</TH>
                    <TH>Note</TH>
                    <TH>Uploaded</TH>
                    <TH>Actions</TH>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <TR key={doc.id}>
                      <TD bold className="text-gray-800 max-w-[180px] truncate">{doc.name}</TD>
                      <TD><span className={`text-sm font-medium px-2 py-0.5 rounded-full ${typeColor(doc.type)}`}>{doc.type}</span></TD>
                      <TD muted>{doc.linked_id || "—"}</TD>
                      <TD muted>{doc.vendor_label || doc.vendor_key || "—"}</TD>
                      <TD muted className="max-w-[160px] truncate">{doc.note || "—"}</TD>
                      <TD muted>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-US") : "—"}</TD>
                      <TD>
                        <div className="flex gap-1">
                          <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer"
                            className="text-sm px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors">
                            View
                          </a>
                          {doc.type === "Invoice" && doc.linked_id && (
                            <button onClick={() => rollbackInvoice(doc)}
                              className="text-sm px-2 py-1 border border-amber-200 rounded text-amber-500 hover:text-amber-700 hover:border-amber-400 transition-colors">
                              Rollback
                            </button>
                          )}
                          <button onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id}
                            className="text-sm px-2 py-1 text-gray-300 hover:text-red-500 transition-colors">
                            {deleting === doc.id ? "…" : "✕"}
                          </button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


// ─── RECONCILE VIEW ───────────────────────────────────────────────────────────
// ─── ZOHO RECONCILIATION VIEW ─────────────────────────────────────────────────
function ZohoReconcileView() {
  const { invoices } = useAppData();
  const [zohoTaconic, setZohoTaconic] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/project-phases').then(d => {
      const taconic = (d.allPayments || [])
        .filter(p => p.vendor && p.vendor.toLowerCase().includes('taconic'))
        .sort((a,b) => a.payment_date.localeCompare(b.payment_date));
      setZohoTaconic(taconic);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>;

  // Match Zoho bills to app invoices by amount proximity
  const matchInvoice = (zohoAmt) => {
    return invoices.find(inv => Math.abs(parseFloat(inv.job_total||0) - zohoAmt) < 100);
  };

  const roadBills = zohoTaconic.filter(p => p.reconciled_to === 'prior_phases_road');
  const demoBills = zohoTaconic.filter(p => p.reconciled_to === 'prior_phases_demo');
  const phase11Bills = zohoTaconic.filter(p => p.reconciled_to === 'invoices');

  const roadTotal = roadBills.reduce((s,p) => s+p.amount_usd, 0);
  const demoTotal = demoBills.reduce((s,p) => s+p.amount_usd, 0);
  const phase11Total = phase11Bills.reduce((s,p) => s+p.amount_usd, 0);
  const grandTotal = roadTotal + demoTotal + phase11Total;

  const BillRow = ({ bill, inv }) => (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <TD muted>{bill.payment_date}</TD>
      <TD muted className="font-mono text-xs">{bill.description || '—'}</TD>
      <TD right bold className="text-gray-900">{$f(bill.amount_usd)}</TD>
      <TD>
        {inv ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">{inv.inv_num}</span>
          </div>
        ) : bill.reconciled_to === 'prior_phases_road' ? (
          <span className="text-sm text-amber-600 font-medium">Road Construction C23-101</span>
        ) : bill.reconciled_to === 'prior_phases_demo' ? (
          <span className="text-sm text-red-500 font-medium">Demolition C25-102</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </TD>
      <TD>
        {bill.reconciled_to === 'invoices' && (
          inv ? <Tag text="✓ Matched" color="green" /> : <Tag text="⚠ Unmatched" color="amber" />
        )}
        {bill.reconciled_to === 'prior_phases_road' && <Tag text="Prior Phase" color="gray" />}
        {bill.reconciled_to === 'prior_phases_demo' && <Tag text="Prior Phase" color="gray" />}
      </TD>
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4">
          <p className="text-sm font-semibold text-amber-600 mb-1">Road Construction</p>
          <p className="text-sm font-bold text-gray-900">{$f(roadTotal)}</p>
          <p className="text-sm text-amber-500 mt-1">{roadBills.length} Zoho bills · C23-101</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-4">
          <p className="text-sm font-semibold text-red-500 mb-1">Demolition</p>
          <p className="text-sm font-bold text-gray-900">{$f(demoTotal)}</p>
          <p className="text-sm text-red-400 mt-1">{demoBills.length} Zoho bills · C25-102</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-4">
          <p className="text-sm font-semibold text-emerald-600 mb-1">Phase 1.1</p>
          <p className="text-sm font-bold text-gray-900">{$f(phase11Total)}</p>
          <p className="text-sm text-emerald-500 mt-1">{phase11Bills.length} Zoho bills · C25-104</p>
        </div>
      </div>

      {/* Road Construction */}
      {roadBills.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-sm font-bold text-gray-700">Road Construction — C23-101</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{$f(roadTotal)}</span>
          </div>
          <table className="w-full"><thead><tr><TH>Date</TH><TH>Zoho Bill #</TH><TH right>Amount</TH><TH>Reconciles To</TH><TH>Status</TH></tr></thead>
            <tbody>{roadBills.map((b,i) => <BillRow key={i} bill={b} inv={null} />)}</tbody>
          </table>
        </Card>
      )}

      {/* Demolition */}
      {demoBills.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-sm font-bold text-gray-700">Demolition — C25-102</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{$f(demoTotal)}</span>
          </div>
          <table className="w-full"><thead><tr><TH>Date</TH><TH>Zoho Bill #</TH><TH right>Amount</TH><TH>Reconciles To</TH><TH>Status</TH></tr></thead>
            <tbody>{demoBills.map((b,i) => <BillRow key={i} bill={b} inv={null} />)}</tbody>
          </table>
        </Card>
      )}

      {/* Phase 1.1 */}
      {phase11Bills.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-gray-700">Phase 1.1 — C25-104</span>
              <span className="text-sm text-gray-400">Matched to uploaded pay applications</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{$f(phase11Total)}</span>
          </div>
          <table className="w-full"><thead><tr><TH>Date</TH><TH>Zoho Bill #</TH><TH right>Amount</TH><TH>App Invoice</TH><TH>Status</TH></tr></thead>
            <tbody>{phase11Bills.map((b,i) => <BillRow key={i} bill={b} inv={matchInvoice(b.amount_usd)} />)}</tbody>
            <tfoot><TR subtle><TD bold colSpan={2} muted>Total</TD><TD right bold className="text-gray-900">{$f(phase11Total)}</TD><TD colSpan={2}/></TR></tfoot>
          </table>
        </Card>
      )}

      {/* Grand total */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#f0ece6] rounded-lg border border-[#d4cfc8]">
        <span className="text-sm font-bold text-white">Total Taconic — All Phases</span>
        <span className="text-sm font-bold text-gray-900 tabular-nums">{$f(grandTotal)}</span>
      </div>
    </div>
  );
}


function ReconcileView({ setTab }) {
  const { invoices, changeOrders, lineItems, budget, refresh } = useAppData();
  const [recon, setRecon]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issues');

  const [reseeding, setReseeding] = useState(false);
  const [reseedDone, setReseedDone] = useState(false);

  const runReseed = async () => {
    setReseeding(true);
    try {
      await apiFetch('/admin/reseed-billings', { method: 'POST' });
      setReseedDone(true);
      await load();
    } catch(e) {}
    setReseeding(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/reconciliation');
      setRecon(r);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!recon) return (
    <div className="bg-white rounded-lg border border-gray-100 p-8 text-center ">
      <p className="text-gray-400 text-sm mb-3">Could not load reconciliation data.</p>
      <button onClick={load} className="px-4 py-2 bg-[#1c2b3a] text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  const checks   = recon?.checks || [];
  const summary  = recon?.summary || { passed: 0, failed: 0, warned: 0, total: 0 };

  // Separate issues from passing
  const issues  = checks.filter(c => !c.pass);
  const passing = checks.filter(c => c.pass);

  // What invoices are missing line item data?
  const invoicesWithNoLineItems = invoices.filter(inv => {
    if (inv.inv_num === 'C25-104-Deposit') return false;
    const hasData = lineItems.some(li => li.inv && li.inv[inv.inv_num]);
    return !hasData;
  });

  // Plain-English action map per check ID
  const actionMap = {
    co_total: {
      plain: "Your Change Orders in the app don't add up to the same total as the line items. This usually means a CO was uploaded that isn't reflected in the budget lines, or vice versa.",
      fix: "Review the Change Orders tab — make sure every CO has a matching line item code, and that the amounts match exactly.",
      tab: 'cos',
      btnLabel: 'Go to Change Orders →',
    },
    contract_amount: {
      plain: "The sum of your Control Budget lines does not exactly match Taconic's original contract value of $13,093,419.47.",
      fix: "This is usually a rounding difference. Check the Control Budget tab for any lines that may have been entered incorrectly.",
      tab: 'budget',
      btnLabel: 'Review Control Budget →',
    },
    revised_contract: {
      plain: "Original contract + all approved COs does not equal Taconic's certified revised contract amount.",
      fix: "Check that all Change Orders are entered with the correct amounts including fees.",
      tab: 'cos',
      btnLabel: 'Go to Change Orders →',
    },
    retainage_total: {
      plain: "The running retainage total across all invoices does not match the certified retainage amount.",
      fix: "This is likely because PAY-008 or PAY-009 have not been fully entered yet. Upload those invoices via the Documents tab.",
      tab: 'uploads',
      btnLabel: 'Upload Invoices →',
    },
    completed_to_date: {
      plain: "The sum of line items completed does not match Taconic's certified Completed to Date figure. This is expected until all invoices are uploaded.",
      fix: "Upload PAY-008 (#1976) and PAY-009 (#2039) through the Documents tab. Once approved, the line items will update automatically.",
      tab: 'uploads',
      btnLabel: 'Upload Invoices →',
    },
    paid_total: {
      plain: null, // informational only
    },
  };

  return (
    <div className="space-y-4">

      {/* Header scorecard */}
      <div className={`rounded-lg p-5 border ${issues.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${issues.length === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                {issues.length === 0 ? '✓ Books Balanced' : `${issues.length} Item${issues.length > 1 ? 's' : ''} Need Attention`}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {passing.length} of {checks.length} checks passing
              {invoicesWithNoLineItems.length > 0 && ` · ${invoicesWithNoLineItems.length} invoice${invoicesWithNoLineItems.length > 1 ? 's' : ''} missing line item detail`}
            </p>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-400 hover:text-gray-800 transition-colors">
            ↻ Refresh
          </button>
        </div>

        {/* Mini progress bar */}
        <div className="mt-3 flex gap-1 h-1.5">
          {checks.map((c, i) => (
            <div key={i} className={`flex-1 rounded-full ${c.pass ? 'bg-emerald-400' : c.severity === 'error' ? 'bg-red-400' : c.severity === 'warn' ? 'bg-amber-400' : 'bg-blue-400'}`} />
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'issues',   label: `Issues${issues.length > 0 ? ` (${issues.length})` : ''}` },
          { id: 'missing',  label: `Missing Data${invoicesWithNoLineItems.length > 0 ? ` (${invoicesWithNoLineItems.length})` : ''}` },
          { id: 'passing',  label: `All Checks (${checks.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${activeTab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ISSUES TAB */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-xl mb-2">✓</div>
              <p className="font-semibold text-emerald-600">No issues found</p>
              <p className="text-sm text-gray-400 mt-1">All reconciliation checks are passing</p>
            </Card>
          ) : issues.filter(c => c.severity !== 'info').map(c => {
            const action = actionMap[c.id];
            if (!action || !action.plain) return null;
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className={`px-4 py-3 border-b ${c.severity === 'error' ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-amber-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>{c.severity === 'error' ? '✕' : '⚠'}</span>
                      <span className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-700' : 'text-indigo-700'}`}>{c.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">Gap: </span>
                      <span className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>
                        {c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* What it means */}
                  <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">What this means</p>
                    <p className="text-sm text-gray-600">{action.plain}</p>
                  </div>
                  {/* Numbers */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-400 mb-0.5">Expected</p>
                      <p className="text-sm font-bold text-gray-600">{c.expected != null ? $f(c.expected) : '—'}</p>
                    </div>
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-400 mb-0.5">In App</p>
                      <p className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>{c.actual != null ? $f(c.actual) : '—'}</p>
                    </div>
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-400 mb-0.5">Difference</p>
                      <p className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>{c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}</p>
                    </div>
                  </div>
                  {/* How to fix */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <p className="text-sm font-semibold text-blue-600 mb-0.5">How to fix this</p>
                    <p className="text-sm text-blue-700">{action.fix}</p>
                  </div>
                  {action.tab && (
                    <button
                      onClick={() => { if (setTab) setTab(action.tab); }}
                      className="w-full py-2 bg-[#1c2b3a] hover:bg-[#243447] text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      {action.btnLabel}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MISSING DATA TAB */}
      {activeTab === 'missing' && (
        <div className="space-y-3">
          {/* One-time data fix */}
          {!reseedDone && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Fix All Billing Data</p>
                <p className="text-sm text-blue-500 mt-0.5">Reseeds all 67 line item billings from Excel data (PAY-001 to PAY-007) — including Fee, Insurance, Deposit rows. Run this once after deploy.</p>
              </div>
              <button onClick={runReseed} disabled={reseeding}
                className="ml-4 px-4 py-2 text-sm font-bold rounded-lg text-white shrink-0"
                style={{ background: reseeding ? "#93c5fd" : "#1d4ed8" }}>
                {reseeding ? "Running..." : "Fix Billing Data →"}
              </button>
            </div>
          )}
          {reseedDone && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 font-semibold">✓ Data fix applied — line items updated.</div>
          )}
          <Card className="p-4">
            <SectionTitle>Invoices Without Line Item Detail</SectionTitle>
            <p className="text-sm text-gray-400 mb-4">
              These invoices are in the system but have no line items uploaded yet.
              Without line items, the Completed to Date and per-invoice reconciliation checks can't run.
            </p>
            {invoicesWithNoLineItems.length === 0 ? (
              <p className="text-sm text-emerald-600 font-semibold">✓ All invoices have line item detail</p>
            ) : (
              <div className="space-y-2">
                {invoicesWithNoLineItems.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{inv.id} — {inv.inv_num}</span>
                      <p className="text-sm text-gray-400 mt-0.5">{inv.description} · Approved {$f(inv.approved)}</p>
                    </div>
                    <Tag text="Upload PDF to add" color="amber" />
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mt-2">
                  <p className="text-sm text-blue-700 font-semibold">To fix: Go to Documents tab → upload the Taconic invoice PDF → approve the line items</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle>Change Orders Without Supporting Documents</SectionTitle>
            <p className="text-sm text-gray-400 mb-3">COs in the system that don't yet have a signed CO PDF attached.</p>
            <div className="space-y-2">
              {changeOrders.filter(co => !co.has_document).map(co => (
                <div key={co.no} className="flex items-center justify-between bg-[#f5f6f8] rounded-lg px-3 py-2.5">
                  <div>
                    <span className="text-sm font-bold text-indigo-600">{co.no}</span>
                    <span className="text-sm text-gray-500 ml-2">{co.div}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{$f(co.approved_co)}</span>
                </div>
              ))}
              {changeOrders.filter(co => !co.has_document).length === 0 && (
                <p className="text-sm text-emerald-600 font-semibold">✓ All COs have documents attached</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ALL CHECKS TAB */}
      {activeTab === 'passing' && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr><TH>Check</TH><TH right>Expected</TH><TH right>In App</TH><TH right>Diff</TH><TH>Status</TH></tr></thead>
            <tbody>
              {checks.map(c => (
                <TR key={c.id}>
                  <TD bold className="text-gray-800 max-w-xs">
                    <div>{c.label}</div>
                    <div className="text-gray-400 font-normal text-sm mt-0.5">{c.description}</div>
                  </TD>
                  <TD right muted>{c.expected != null ? $f(c.expected) : '—'}</TD>
                  <TD right bold className={c.pass ? 'text-emerald-600' : c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}>
                    {c.actual != null ? $f(c.actual) : '—'}
                  </TD>
                  <TD right className={Math.abs(c.diff||0) < 1 ? 'text-gray-300' : c.diff > 0 ? 'text-indigo-500' : 'text-red-500'}>
                    {c.diff != null && Math.abs(c.diff) > 0.01 ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}
                  </TD>
                  <TD>
                    {c.pass ? <Tag text="✓ Pass" color="green" /> :
                     c.severity === 'info' ? <Tag text="Info" color="muted" /> :
                     c.severity === 'error' ? <Tag text="✕ Error" color="red" /> :
                     <Tag text="⚠ Warning" color="amber" />}
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



// ─── ZOHO SYNC BUTTON ─────────────────────────────────────────────────────────
function ZohoSyncButton({ onSynced }) {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    apiFetch('/zoho/sync-status').then(s => setStatus(s)).catch(() => {});
  }, []);

  const forceSync = async () => {
    setSyncing(true);
    try {
      const r = await apiFetch('/zoho/sync', { method: 'POST' });
      if (r.ok) {
        setStatus({ last_sync: r.synced_at, hours_since: 0, needs_sync: false });
        if (onSynced) onSynced();
      }
    } catch(e) { alert('Sync error: ' + e.message); }
    setSyncing(false);
  };

  const lastSync = status?.last_sync ? new Date(status.last_sync) : null;
  const lastSyncStr = lastSync ? lastSync.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Never';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">Last sync: <span className="text-gray-600 font-medium">{lastSyncStr}</span></span>
      <button onClick={forceSync} disabled={syncing}
        className="px-3 py-1.5 bg-[#1c2b3a] hover:bg-[#243447] disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors">
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}

// ─── TOTAL SPEND VIEW ─────────────────────────────────────────────────────────
const STAGE_COLORS = {
  "Pre-Construction": "#6366f1",
  "Construction":     "#10b981",
};
const WP_COLORS = {
  "Land Acquisition":    "#6366f1",
  "Design & Permitting": "#8b5cf6",
  "Road Construction":   "#f59e0b",
  "Demolition":          "#ef4444",
  "Phase 1.1":           "#10b981",
  "Phase 1.2":           "#6b7280",
  "Great Hall":          "#6b7280",
};
const CAT_COLORS = {
  "Land & Property Acquisition":    "#6366f1",
  "Architecture":                   "#0891b2",
  "Landscape Architecture":         "#059669",
  "Civil & Structural Engineering":  "#7c3aed",
  "Construction":                   "#d97706",
  "Consulting Fees":                "#db2777",
  "Other":                          "#9ca3af",
};

function TotalSpendView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("stage");
  const [expandedStage, setExpandedStage] = useState(null);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [modal, setModal] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const STAGES = ["Pre-Construction", "Construction"];
  const WORK_PACKAGES = ["Land Acquisition", "Design & Permitting", "Road Construction", "Demolition", "Phase 1.1", "Phase 1.2", "Great Hall"];

  const load = () => {
    setLoading(true);
    apiFetch('/project-phases').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const savePhaseTag = async (phaseId) => {
    if (saving) return;
    setSaving(true);
    await apiFetch(`/vendor-phases/${phaseId}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ stage: editForm.stage, work_package: editForm.work_package }),
    });
    setSaving(false);
    setEditingPhase(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400 text-sm">Could not load spend data.</div>;

  const { allPayments, vendorPhaseMapping } = data;

  // ── Totals from allPayments (single source of truth) ──────────────────────
  const landAcqTotal    = allPayments.filter(p => p.work_package === "Land Acquisition").reduce((s,p) => s+p.amount_usd, 0);
  const designPermTotal = allPayments.filter(p => p.work_package === "Design & Permitting").reduce((s,p) => s+p.amount_usd, 0);
  const roadTotal       = allPayments.filter(p => p.work_package === "Road Construction").reduce((s,p) => s+p.amount_usd, 0);
  const demoTotal       = allPayments.filter(p => p.work_package === "Demolition").reduce((s,p) => s+p.amount_usd, 0);
  const phase11Total    = allPayments.filter(p => p.work_package === "Phase 1.1").reduce((s,p) => s+p.amount_usd, 0);
  const preConTotal     = landAcqTotal + designPermTotal;
  const conTotal        = roadTotal + demoTotal + phase11Total;
  const grandTotal      = preConTotal + conTotal;

  // ── By Vendor ─────────────────────────────────────────────────────────────
  const byVendor = {};
  vendorPhaseMapping.forEach(vp => {
    if (!byVendor[vp.vendor_key]) byVendor[vp.vendor_key] = { name: vp.vendor_full_name || vp.vendor_name, total: 0, phases: [] };
    byVendor[vp.vendor_key].total += vp.invoiced;
    byVendor[vp.vendor_key].phases.push(vp);
  });
  byVendor['taconic'] = {
    name: 'Taconic Builders Inc.',
    total: phase11Total + roadTotal + demoTotal,
    phases: [
      { phase: 'Road Construction (C23-101)', invoiced: roadTotal,    stage: 'Construction', work_package: 'Road Construction', status: 'Complete' },
      { phase: 'Demolition (C25-102)',        invoiced: demoTotal,    stage: 'Construction', work_package: 'Demolition',        status: 'Complete' },
      { phase: 'Phase 1.1 (C25-104)',         invoiced: phase11Total, stage: 'Construction', work_package: 'Phase 1.1',         status: 'In Progress' },
    ],
  };

  const bigVendorNames = ['Reed Hilderbrand', 'ArchitectureFirm', 'Ivan Zdrahal', 'Taconic', 'Timothy R Smith'];
  const isBigVendor = (v) => bigVendorNames.some(b => v.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(v.toLowerCase().split(' ')[0]));

  const otherVendorMap = {};
  allPayments.forEach(p => {
    if (isBigVendor(p.vendor)) return;
    if (!otherVendorMap[p.vendor]) otherVendorMap[p.vendor] = { name: p.vendor, total: 0, payments: [] };
    otherVendorMap[p.vendor].total += p.amount_usd;
    otherVendorMap[p.vendor].payments.push(p);
  });

  const landAcqVendor    = allPayments.filter(p => p.work_package === "Land Acquisition");
  const otherVendorTotal = Object.values(otherVendorMap).reduce((s,v) => s+v.total, 0);
  const batchedVendors   = allPayments.filter(p => p.is_batched);
  const batchedTotal     = batchedVendors.reduce((s,p) => s+p.amount_usd, 0);



  // ── Fix other vendors filter — exclude JXM/CFC intercompany entries ─────────
  const EXCLUDE_VENDORS = ['jxm', 'camp forestmere corp', 'forestmere corp', '175660', 'intercompany'];
  const isExcluded = (v) => EXCLUDE_VENDORS.some(e => v.toLowerCase().includes(e));

  // ── Vendor dot color — consistent across Timothy + big 4 ─────────────────
  const VENDOR_COLORS = {
    taconic:      "#10b981",
    ivan:         "#7c3aed",
    reed:         "#059669",
    arch:         "#0891b2",
    land:         "#6366f1",   // Timothy R Smith / Land Acquisition
  };

  return (
    <div className="space-y-4">
      {/* Sync bar — clean, minimal */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-lg shadow-sm">
        <ZohoSyncButton onSynced={load} />
        {batchedTotal > 0 && (
          <span className="text-sm text-amber-600 font-medium">⚑ {$f(batchedTotal)} in batched payments need breakdown</span>
        )}
      </div>

      {/* ── SPEND SUMMARY (clickable rows = the drill-down) ── */}
      <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Total Project Spend</p>
            <p className="text-sm text-gray-400 mt-0.5">Inception to date · All phases · USD</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Grand Total</p>
            <p className="text-base font-bold text-gray-900 tabular-nums">{$f(grandTotal)}</p>
          </div>
        </div>

        {/* Section: Pre-Construction */}
        <div className="px-5 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Pre-Construction</span>
        </div>
        {[
          { name: "Land Acquisition",    total: landAcqTotal,    color: WP_COLORS["Land Acquisition"],    desc: "Cost of land purchase",
            rows: allPayments.filter(p => p.work_package === "Land Acquisition") },
          { name: "Design & Permitting", total: designPermTotal, color: WP_COLORS["Design & Permitting"], desc: "Architecture, engineering & permits",
            rows: allPayments.filter(p => p.work_package === "Design & Permitting") },
        ].map(ph => (
          <button key={ph.name} onClick={() => setModal(ph)}
            className="w-full flex items-center px-5 py-2.5 border-b border-gray-50 hover:bg-[#f5f1ea] transition-colors text-left group">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800">{ph.name}</span>
              <span className="text-sm text-gray-400 ml-2">{ph.desc}</span>
            </div>
            
            <span className="text-sm text-gray-400 tabular-nums w-16 text-right mr-4">{grandTotal > 0 ? pf(ph.total/grandTotal) : "—"}</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums w-36 text-right">{$f(ph.total)}</span>
            <span className="text-gray-300 group-hover:text-indigo-400 text-sm transition-colors">›</span>
          </button>
        ))}
        <div className="px-5 py-2 bg-gray-50 flex items-center border-b border-gray-100">
          <span className="flex-1 text-sm font-semibold text-gray-500">Pre-Construction subtotal</span>
          <span className="text-sm text-gray-400 tabular-nums mr-4">{grandTotal > 0 ? pf(preConTotal/grandTotal) : "—"}</span>
          <span className="text-sm font-bold text-gray-700 tabular-nums w-36 text-right">{$f(preConTotal)}</span>
          <span className="w-4" />
        </div>

        {/* Section: Construction */}
        <div className="px-5 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Construction</span>
        </div>
        {[
          { name: "Road Construction", total: roadTotal,    color: WP_COLORS["Road Construction"], desc: "C23-101",
            rows: allPayments.filter(p => p.work_package === "Road Construction") },
          { name: "Demolition",        total: demoTotal,    color: WP_COLORS["Demolition"],        desc: "C25-102",
            rows: allPayments.filter(p => p.work_package === "Demolition") },
          { name: "Phase 1.1",         total: phase11Total, color: WP_COLORS["Phase 1.1"],         desc: "C25-104 — Taconic Builders",
            rows: allPayments.filter(p => p.work_package === "Phase 1.1") },
        ].map(ph => (
          <button key={ph.name} onClick={() => setModal(ph)}
            className="w-full flex items-center px-5 py-2.5 border-b border-gray-50 hover:bg-[#f5f1ea] transition-colors text-left group">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800">{ph.name}</span>
              <span className="text-sm text-gray-400 ml-2">{ph.desc}</span>
            </div>
            
            <span className="text-sm text-gray-400 tabular-nums w-16 text-right mr-4">{grandTotal > 0 ? pf(ph.total/grandTotal) : "—"}</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums w-36 text-right">{$f(ph.total)}</span>
            <span className="text-gray-300 group-hover:text-indigo-400 text-sm transition-colors">›</span>
          </button>
        ))}
        <div className="px-5 py-2 bg-gray-50 flex items-center border-b border-gray-100">
          <span className="flex-1 text-sm font-semibold text-gray-500">Construction subtotal</span>
          <span className="text-sm text-gray-400 tabular-nums mr-4">{grandTotal > 0 ? pf(conTotal/grandTotal) : "—"}</span>
          <span className="text-sm font-bold text-gray-700 tabular-nums w-36 text-right">{$f(conTotal)}</span>
          <span className="w-4" />
        </div>

        {/* Grand total */}
        <div className="px-5 py-3 bg-[#1c2b3a] flex items-center border-t-2 border-[#1c2b3a]">
          <span className="flex-1 text-sm font-semibold text-white uppercase tracking-widest">Total — Inception to Date</span>
          <span className="text-sm text-gray-400 tabular-nums w-16 text-right mr-4">100%</span>
          <span className="text-sm font-bold text-white tabular-nums w-36 text-right">{$f(grandTotal)}</span>
          <span className="w-4" />
        </div>
      </div>

      {/* View toggle — By Vendor | Phase Mapping (subtle) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[["vendor","By Vendor"],["stage","By Phase"]].map(([id,lbl]) => (
            <button key={id} onClick={() => setViewMode(id)}
              className={cx("px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                viewMode === id ? "bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-gray-500 hover:text-gray-700")}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => setViewMode(viewMode === "mapping" ? "vendor" : "mapping")}
          className={cx("px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
            viewMode === "mapping" ? "border-gray-300 text-gray-500 bg-white" : "border-transparent text-gray-300 hover:text-gray-400 hover:border-gray-200")}>
          Phase Mapping
        </button>
      </div>

      {/* ── BY PHASE (was By Stage) ── */}
      {viewMode === "stage" && (
        <div className="space-y-3">
          {[
            {
              stage: "Pre-Construction", total: preConTotal, color: STAGE_COLORS["Pre-Construction"],
              phases: [
                { name: "Land Acquisition",    total: landAcqTotal,    color: WP_COLORS["Land Acquisition"],
                  desc: "Cost of land purchase",
                  rows: allPayments.filter(p => p.work_package === "Land Acquisition") },
                { name: "Design & Permitting", total: designPermTotal, color: WP_COLORS["Design & Permitting"],
                  desc: "Architecture, engineering & permits",
                  rows: allPayments.filter(p => p.work_package === "Design & Permitting") },
              ]
            },
            {
              stage: "Construction", total: conTotal, color: STAGE_COLORS["Construction"],
              phases: [
                { name: "Road Construction", total: roadTotal,    color: WP_COLORS["Road Construction"],
                  desc: "C23-101", rows: allPayments.filter(p => p.work_package === "Road Construction") },
                { name: "Demolition",        total: demoTotal,    color: WP_COLORS["Demolition"],
                  desc: "C25-102", rows: allPayments.filter(p => p.work_package === "Demolition") },
                { name: "Phase 1.1",         total: phase11Total, color: WP_COLORS["Phase 1.1"],
                  desc: "C25-104 — Taconic Builders", rows: allPayments.filter(p => p.work_package === "Phase 1.1") },
              ]
            }
          ].map(stageData => (
            <div key={stageData.stage} className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedStage(expandedStage === stageData.stage ? null : stageData.stage)}
                className="w-full flex items-center px-5 py-2.5 hover:bg-[#faf8f5] transition-colors text-left">
                <span className="flex-1 text-sm font-bold text-gray-800">{stageData.stage}</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums w-36 text-right mr-3">{$f(stageData.total)}</span>
                <span className="text-gray-300 text-sm w-4 text-center">{expandedStage === stageData.stage ? "▾" : "›"}</span>
              </button>
              {expandedStage === stageData.stage && (
                <div className="border-t border-gray-100">
                  {stageData.phases.map((ph) => (
                    <button key={ph.name} onClick={() => setModal(ph)}
                      className="w-full flex items-center px-5 py-2.5 border-b border-gray-50 hover:bg-[#f5f1ea] transition-colors text-left group">
                      <span className="w-2 h-2 rounded-full shrink-0 mr-3 ml-4" style={{ background: ph.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-700">{ph.name}</span>
                        {ph.desc && <span className="text-sm text-gray-400 ml-2">— {ph.desc}</span>}
                      </div>
                      
                      <span className="text-sm font-semibold text-gray-900 tabular-nums w-36 text-right">{$f(ph.total)}</span>
                      <span className="text-gray-300 group-hover:text-indigo-400 text-sm w-4 text-center transition-colors">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── BY VENDOR ── */}
      {viewMode === "vendor" && (
        <div className="space-y-3">
          {/* All vendors: Timothy + big 4, all same dot style, color from their category */}
          {[
            { key: "land",    name: "Timothy R Smith",        total: landAcqTotal,              color: WP_COLORS["Land Acquisition"],    tag: "Land Acquisition",
              phases: landAcqVendor.map(p => ({ phase: p.description || p.vendor, invoiced: p.amount_usd, status: "Complete", work_package: "Land Acquisition", stage: "Pre-Construction" })) },
            ...Object.entries(byVendor).sort((a,b) => b[1].total - a[1].total).map(([key, v]) => ({
              key, name: v.name, total: v.total,
              color: VENDOR_COLORS[key] || "#6b7280",
              tag: null,
              phases: v.phases,
            })),
          ].map(v => (
            <div key={v.key} className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
              <button onClick={() => setExpandedVendor(expandedVendor === v.key ? null : v.key)}
                className="w-full flex items-center px-5 py-2.5 hover:bg-[#faf8f5] transition-colors text-left">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">{v.name}</span>
                  {v.tag && <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{v.tag}</span>}
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums w-36 text-right mr-3">{$f(v.total)}</span>
                <span className="text-gray-300 text-sm w-4 text-center">{expandedVendor === v.key ? "▾" : "›"}</span>
              </button>
              {expandedVendor === v.key && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead><tr>
                      <TH>Phase / Contract</TH><TH>Timeline</TH><TH>Phase</TH><TH>Status</TH><TH right>Invoiced</TH>
                    </tr></thead>
                    <tbody>
                      {v.phases.filter(p => p.invoiced > 0 || p.budget > 0).map((p, i) => (
                        <TR key={i}>
                          <TD bold>{p.phase}</TD>
                          <TD>{p.stage && <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[p.stage]||"#9ca3af")+"18", color: STAGE_COLORS[p.stage]||"#9ca3af" }}>{p.stage}</span>}</TD>
                          <TD>{p.work_package && <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ background: (WP_COLORS[p.work_package]||"#9ca3af")+"18", color: WP_COLORS[p.work_package]||"#9ca3af" }}>{p.work_package}</span>}</TD>
                          <TD>{statusTag(p.status)}</TD>
                          <TD right bold>{$f(p.invoiced)}</TD>
                        </TR>
                      ))}
                    </tbody>
                    <tfoot><TR subtle><TD bold colSpan={4} muted>Total</TD><TD right bold>{$f(v.total)}</TD></TR></tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Other vendors — excluding intercompany */}
          {Object.keys(otherVendorMap).filter(k => !isExcluded(k)).length > 0 && (
            <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
              <button onClick={() => setExpandedVendor(expandedVendor === "other" ? null : "other")}
                className="w-full flex items-center px-5 py-2.5 hover:bg-[#faf8f5] transition-colors text-left">
                <span className="w-3 h-3 rounded-full shrink-0 mr-3 bg-gray-300" />
                <span className="flex-1 text-sm font-semibold text-gray-800">Other Vendors</span>
                
                <span className="text-sm font-bold text-gray-900 tabular-nums w-32 text-right mr-3">{$f(Object.entries(otherVendorMap).filter(([k])=>!isExcluded(k)).reduce((s,[,v])=>s+v.total,0))}</span>
                <span className="text-gray-300 text-sm w-4 text-center">{expandedVendor === "other" ? "▾" : "›"}</span>
              </button>
              {expandedVendor === "other" && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead><tr><TH>Vendor</TH><TH>Category</TH><TH right>Total</TH></tr></thead>
                    <tbody>
                      {Object.entries(otherVendorMap).filter(([k]) => !isExcluded(k)).sort((a,b) => b[1].total - a[1].total).map(([vendor, d]) => (
                        <TR key={vendor} onClick={() => setModal({ name: vendor, total: d.total, rows: d.payments })}>
                          <TD bold>{vendor}</TD>
                          <TD muted>{d.payments[0]?.category || "—"}</TD>
                          <TD right bold>{$f(d.total)}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Batched */}
          {batchedVendors.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm">
              <button onClick={() => setExpandedVendor(expandedVendor === "batched" ? null : "batched")}
                className="w-full flex items-center px-5 py-4 hover:bg-amber-50/40 transition-colors text-left">
                <span className="text-amber-400 text-sm mr-3">⚑</span>
                <span className="flex-1 text-sm font-semibold text-amber-800">Batched Payments — To Be Reconciled</span>
                <span className="text-sm font-bold text-amber-700 tabular-nums w-32 text-right mr-3">{$f(batchedTotal)}</span>
                <span className="text-amber-300 text-sm w-4 text-center">{expandedVendor === "batched" ? "▾" : "›"}</span>
              </button>
              {expandedVendor === "batched" && (
                <div className="border-t border-amber-100">
                  <table className="w-full">
                    <thead><tr><TH>Date</TH><TH>Description</TH><TH right>Amount</TH></tr></thead>
                    <tbody>
                      {batchedVendors.map((p,i) => (
                        <TR key={i}>
                          <TD muted>{p.payment_date}</TD>
                          <TD bold>{p.vendor}</TD>
                          <TD right bold>{$f(p.amount_usd)}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE MAPPING (admin / subtle) ── */}
      {viewMode === "mapping" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Phase tagging — assigns each vendor contract phase to a timeline and project phase.</p>
            <button onClick={async () => {
              try {
                const r = await apiFetch('/admin/migrate-phase-tags', { method: 'POST' });
                if (r.ok) { alert(`✓ Tags applied to ${r.updated} phases.`); load(); }
              } catch(e) { alert('Failed: ' + e.message); }
            }} className="ml-4 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg shrink-0 transition-colors">
              Apply Tags
            </button>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead><tr>
                <TH>Vendor</TH><TH>Contract Phase</TH><TH>Timeline</TH><TH>Phase</TH><TH right>Invoiced</TH><TH>Status</TH><TH>Edit</TH>
              </tr></thead>
              <tbody>
                {vendorPhaseMapping.map((vp, i) => {
                  const isEditing = editingPhase === vp.id;
                  const inp = "bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-400";
                  return (
                    <TR key={i}>
                      <TD bold>{vp.vendor_name}</TD>
                      <TD muted>{vp.phase}</TD>
                      <TD>
                        {isEditing ? (
                          <select value={editForm.stage || ""} onChange={e => setEditForm(f => ({...f, stage: e.target.value}))} className={inp}>
                            <option value="">—</option>
                            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          vp.stage ? <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[vp.stage]||"#9ca3af")+"18", color: STAGE_COLORS[vp.stage]||"#9ca3af" }}>{vp.stage}</span> : <span className="text-gray-300">—</span>
                        )}
                      </TD>
                      <TD>
                        {isEditing ? (
                          <select value={editForm.work_package || ""} onChange={e => setEditForm(f => ({...f, work_package: e.target.value}))} className={inp}>
                            <option value="">—</option>
                            {WORK_PACKAGES.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        ) : (
                          vp.work_package ? <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ background: (WP_COLORS[vp.work_package]||"#9ca3af")+"18", color: WP_COLORS[vp.work_package]||"#9ca3af" }}>{vp.work_package}</span> : <span className="text-gray-300">—</span>
                        )}
                      </TD>
                      <TD right bold>{$f(vp.invoiced)}</TD>
                      <TD>{statusTag(vp.status)}</TD>
                      <TD>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={() => savePhaseTag(vp.id)} disabled={saving}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded transition-colors disabled:opacity-50">
                              {saving ? "…" : "Save"}
                            </button>
                            <button onClick={() => setEditingPhase(null)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded transition-colors">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingPhase(vp.id); setEditForm({ stage: vp.stage || "", work_package: vp.work_package || "" }); }}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded transition-colors">Edit</button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── DRILL-DOWN MODAL ── */}
      {modal && (
        <Modal title={modal.name} subtitle={modal.desc || modal.description || "Payment detail"} onClose={() => setModal(null)} wide>
          <table className="w-full">
            <thead><tr>
              <TH>Date</TH><TH>Vendor</TH><TH>Description</TH><TH right>Amount</TH>
            </tr></thead>
            <tbody>
              {(modal.rows || []).map((p, i) => (
                <TR key={i}>
                  <TD muted className="whitespace-nowrap">{p.payment_date || "—"}</TD>
                  <TD bold>{p.vendor || "—"}</TD>
                  <TD muted>{p.description || "—"}</TD>
                  <TD right bold>{$f(p.amount_usd)}</TD>
                </TR>
              ))}
            </tbody>
            <tfoot>
              <TR subtle>
                <TD bold colSpan={3} muted>Total</TD>
                <TD right bold>{$f((modal.rows||[]).reduce((s,p) => s+(p.amount_usd||0), 0))}</TD>
              </TR>
            </tfoot>
          </table>
        </Modal>
      )}
    </div>
  );
}


// ─── PHASE 1.1 SHELL ──────────────────────────────────────────────────────────
function Phase11Shell({ initialSubTab = 'landing' }) {
  const {
    totalBudget, totalAwarded, taconicPaid, taconicPending,
    balanceToFinish, retainageHeld, revisedContractTotal,
    invoices, changeOrders, awards, lineItems,
  } = useAppData();
  const [subTab, setSubTab] = useState(initialSubTab || "landing");

  const SUB_TABS = [
    { id: "landing",        label: "Summary"           },
    { id: "budget",         label: "Control Budget"    },
    { id: "awards",         label: "Awards"            },
    { id: "cos",            label: "Change Orders"     },
    { id: "invoices",       label: "Invoices"          },
    { id: "lineitem",       label: "Line Item Billing" },
    { id: "reconcile",      label: "Reconcile"         },
    { id: "zoho-recon",     label: "Zoho Reconciliation"},
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-0 border-b border-[#e8e8e6] -mt-2">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={cx("px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-all whitespace-nowrap",
              subTab === t.id ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Landing */}
      {subTab === "landing" && (
        <div className="space-y-4">
          {/* KPI summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Revised Contract"    value={$f(revisedContractTotal)} sub={`Original $13,093,419 + ${$f(revisedContractTotal - 13093419.47)} COs`} />
            <Stat label="Paid to Date"        value={$f(taconicPaid)}          sub={pf(taconicPaid / revisedContractTotal) + " of revised contract"} accent />
            <Stat label="Balance to Finish"   value={$f(balanceToFinish)}      sub="Revised contract less completed to date" />
            <Stat label="Retainage Held"      value={$f(retainageHeld)}        sub="Released at substantial completion" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="GC Awarded"          value={$f(totalAwarded)}         sub={awards.length + " subcontract awards"} onClick={() => setSubTab("awards")} />
            <Stat label="Approved COs"        value={$f(changeOrders.reduce((s,c)=>s+parseFloat(c.approved_co),0))} sub={changeOrders.length + " change orders"} onClick={() => setSubTab("cos")} />
            <Stat label="Pending Payment"     value={$f(taconicPending)}       sub={invoices.filter(i=>!i.status?.startsWith("Paid")).length + " invoices outstanding"} accent onClick={() => setSubTab("invoices")} />
            <Stat label="% Complete"          value={pf(taconicPaid / revisedContractTotal)} sub="Based on paid to date" />
          </div>

          {/* Quick nav cards */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            {[
              { id:"budget",    icon:"⊟", label:"Control Budget",    desc:"51 line items · budget vs awarded" },
              { id:"awards",    icon:"◎", label:"Contract Awards",    desc:awards.length + " subcontract awards" },
              { id:"cos",       icon:"△", label:"Change Orders",      desc:changeOrders.length + " approved COs" },
              { id:"invoices",  icon:"≡", label:"Invoices",           desc:invoices.length + " pay applications" },
              { id:"lineitem",  icon:"⊞", label:"Line Item Billing",  desc:"Per-invoice cost breakdown" },
              { id:"reconcile", icon:"✓", label:"Reconcile",          desc:"Balance checks & data integrity" },
            ].map(card => (
              <button key={card.id} onClick={() => setSubTab(card.id)}
                className="bg-white border border-gray-100 rounded-lg p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                <div className="text-sm mb-3 text-gray-300 group-hover:text-indigo-400 transition-colors">{card.icon}</div>
                <div className="text-sm font-semibold text-gray-800 mb-1">{card.label}</div>
                <div className="text-sm text-gray-400">{card.desc}</div>
              </button>
            ))}
          </div>

          {/* Contract details — compact reference */}
          <div className="border border-[#ede9e3] rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[#ede9e3] bg-[#faf8f5]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contract Details</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#f0f0ee]">
              {[["GC","Taconic Builders Inc."],["Contract #","C25-104"],["Start","Jun 23, 2025"],["Est. Completion","April 2027"]].map(([k,v]) => (
                <div key={k} className="px-4 py-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{k}</div>
                  <div className="text-xs font-medium text-gray-700">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === "budget"    && <BudgetView setTab={(t) => setSubTab(t)} />}
      {subTab === "awards"    && <AwardsView />}
      {subTab === "cos"       && <COsView />}
      {subTab === "invoices"  && <InvoicesView />}
      {subTab === "lineitem"  && <LineItemView />}
      {subTab === "reconcile" && <ReconcileView setTab={(t) => setSubTab(t)} />}
      {subTab === "zoho-recon" && <ZohoReconcileView />}
    </div>
  );
}

// ─── DESIGN & ENGINEERING SHELL ───────────────────────────────────────────────
function DesignEngShell() {
  const { vendors } = useAppData();
  const [subTab, setSubTab] = useState("landing");

  const VENDOR_TABS = [
    { id: "landing", label: "Summary" },
    { id: "arch",    label: "ArchitectureFirm"  },
    { id: "reed",    label: "Reed Hilderbrand"  },
    { id: "ivan",    label: "Ivan Zdrahal PE"   },
  ];

  const vendorSummary = ["arch","reed","ivan"].map(key => {
    const v = vendors[key];
    const totalInvoiced = v?.invoices.reduce((s,i) => s+(i.amount||0), 0) || 0;
    const totalBudget   = v?.phases.reduce((s,p) => s+(p.budget||0), 0) || 0;
    const totalPhaseInvoiced = v?.phases.reduce((s,p) => s+(p.invoiced||0), 0) || 0;
    return { key, name: v?.full_name || v?.name, role: v?.role, color: v?.color,
             invoiced: totalPhaseInvoiced, budget: totalBudget };
  });

  const grandInvoiced = vendorSummary.reduce((s,v) => s+v.invoiced, 0);

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-0 border-b border-[#e8e8e6] -mt-2">
        {VENDOR_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={cx("px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-all whitespace-nowrap",
              subTab === t.id ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Landing */}
      {subTab === "landing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {vendorSummary.map(v => (
              <button key={v.key} onClick={() => setSubTab(v.key)}
                className="bg-white border border-gray-100 rounded-lg p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all shadow-sm group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{v.role}</span>
                </div>
                <div className="text-sm font-bold text-gray-900 mb-3 leading-tight">{v.name}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Invoiced to date</span>
                    <span className="font-bold text-gray-900">{$f(v.invoiced)}</span>
                  </div>
                  {v.budget > 0 && (
                    <>
                      <BarFill value={v.invoiced} max={v.budget} color={v.color} />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Budget</span>
                        <span className="text-gray-500">{$f(v.budget)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 text-sm text-indigo-400 font-medium group-hover:text-indigo-600">View detail →</div>
              </button>
            ))}
          </div>

          {/* Summary table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Combined Summary</span>
            </div>
            <table className="w-full">
              <thead><tr><TH>Vendor</TH><TH>Role</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH className="w-32">Progress</TH></tr></thead>
              <tbody>
                {vendorSummary.map(v => {
                  const rem = v.budget > 0 ? v.budget - v.invoiced : null;
                  return (
                    <TR key={v.key} onClick={() => setSubTab(v.key)}>
                      <TD bold className="text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                          {v.name}
                        </div>
                      </TD>
                      <TD muted>{v.role}</TD>
                      <TD right muted>{v.budget > 0 ? $f(v.budget) : "T&M"}</TD>
                      <TD right bold className="text-gray-900">{$f(v.invoiced)}</TD>
                      <TD right className={rem == null ? "text-gray-400" : rem < 0 ? "text-red-500 font-bold" : "text-indigo-600 font-medium"}>
                        {rem == null ? "T&M" : $f(rem)}
                      </TD>
                      <TD>{v.budget > 0 && <BarFill value={v.invoiced} max={v.budget} color={v.color} />}</TD>
                    </TR>
                  );
                })}
              </tbody>
              <tfoot>
                <TR subtle>
                  <TD bold colSpan={3} muted>Total</TD>
                  <TD right bold className="text-gray-900">{$f(grandInvoiced)}</TD>
                  <TD colSpan={2} />
                </TR>
              </tfoot>
            </table>
          </Card>
        </div>
      )}

      {/* Individual vendor views — reuse VendorsView with pre-selected vendor */}
      {["arch","reed","ivan"].includes(subTab) && (
        <VendorsViewSingle vendorKey={subTab} />
      )}
    </div>
  );
}


// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
const INV_STATUS_COLORS = {
  "Submitted":    { bg: "#f0f9ff", text: "#0369a1", dot: "#0ea5e9" },
  "Under Review": { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  "Approved":     { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  "Zoho Matched": { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6" },
  "Paid":         { bg: "#f9fafb", text: "#374151", dot: "#9ca3af" },
};

function InvStatusTag({ status }) {
  const c = INV_STATUS_COLORS[status] || { bg:"#f3f4f6", text:"#6b7280", dot:"#9ca3af" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

// ─── INVOICE WORKFLOW COMPONENT ───────────────────────────────────────────────
function InvoiceWorkflow({ vendorKey }) {
  const { vendors } = useAppData();
  const vendor = vendors[vendorKey];
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "new" | "detail"
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  // New invoice form state
  const [form, setForm] = useState({
    invoice_num: "", invoice_date: "", period_start: "", period_end: "",
    total_amount: "", notes: "",
  });
  const [lines, setLines] = useState([]);

  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400";

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/submitted-invoices?vendor_key=${vendorKey}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch(e) { setInvoices([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorKey]);

  const addLine = () => setLines(l => [...l, { line_description:"", hours:"", rate:"", amount:"", vendor_phase_id:"", vendor_phase_name:"", notes:"" }]);
  const updateLine = (i, field, val) => setLines(l => l.map((row,idx) => idx===i ? {...row,[field]:val} : row));
  const removeLine = (i) => setLines(l => l.filter((_,idx) => idx!==i));

  // Auto-compute amount from hours × rate
  const handleLineChange = (i, field, val) => {
    updateLine(i, field, val);
    const line = lines[i];
    if (field === "hours" || field === "rate") {
      const h = parseFloat(field==="hours" ? val : line.hours) || 0;
      const r = parseFloat(field==="rate" ? val : line.rate) || 0;
      if (h > 0 && r > 0) updateLine(i, "amount", String((h*r).toFixed(2)));
    }
  };

  const linesTotal = lines.reduce((s,l) => s+parseFloat(l.amount||0), 0);

  const saveInvoice = async () => {
    if (!form.invoice_num || !form.invoice_date || lines.length === 0 || saving) return;
    setSaving(true);
    try {
      await apiFetch("/submitted-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_key: vendorKey,
          invoice_num: form.invoice_num,
          invoice_date: form.invoice_date,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          total_amount: linesTotal,
          notes: form.notes || null,
          lines: lines.map((l,i) => ({
            line_description: l.line_description,
            hours: parseFloat(l.hours)||null,
            rate: parseFloat(l.rate)||null,
            amount: parseFloat(l.amount)||0,
            vendor_phase_id: l.vendor_phase_id ? parseInt(l.vendor_phase_id) : null,
            vendor_phase_name: l.vendor_phase_name || null,
            notes: l.notes || null,
            sort_order: i,
          })),
        }),
      });
      setForm({ invoice_num:"", invoice_date:"", period_start:"", period_end:"", total_amount:"", notes:"" });
      setLines([]);
      setView("list");
      await load();
    } catch(e) { alert("Error saving invoice: " + e.message); }
    setSaving(false);
  };

  const approve = async (id) => {
    await apiFetch(`/submitted-invoices/${id}/approve`, { method:"POST" });
    await load();
    if (selected?.id === id) setSelected(invoices.find(i=>i.id===id));
  };

  const unapprove = async (id) => {
    await apiFetch(`/submitted-invoices/${id}/unapprove`, { method:"POST" });
    await load();
  };

  const markZohoMatch = async (inv) => {
    const billId = prompt("Enter Zoho Bill ID:");
    if (!billId) return;
    await apiFetch(`/submitted-invoices/${inv.id}/zoho-match`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ zoho_bill_id: billId, zoho_match_amount: inv.total_amount }),
    });
    await load();
  };

  const markPaid = async (inv) => {
    const amt = prompt("Enter paid amount:", String(inv.total_amount));
    if (!amt) return;
    await apiFetch(`/submitted-invoices/${inv.id}/pay`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ paid_amount: parseFloat(amt), paid_at: new Date().toISOString() }),
    });
    await load();
  };

  const deleteInv = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    await apiFetch(`/submitted-invoices/${id}`, { method:"DELETE" });
    if (selected?.id === id) { setSelected(null); setView("list"); }
    await load();
  };

  const updatePhaseMapping = async (lineId, phaseId, phaseName) => {
    await apiFetch(`/submitted-invoice-lines/${lineId}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ vendor_phase_id: parseInt(phaseId), vendor_phase_name: phaseName }),
    });
    await load();
    // Refresh selected invoice lines
    if (selected) {
      const updated = await apiFetch(`/submitted-invoices?vendor_key=${vendorKey}`);
      const updatedInv = updated.find(i => i.id === selected.id);
      if (updatedInv) setSelected(updatedInv);
    }
  };

  if (!vendor) return null;

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Upload and review invoices · map to budget phases · approve · reconcile to Zoho</p>
        </div>
        <button onClick={() => { setView("new"); setLines([]); }}
          className="px-4 py-2 bg-[#1c2b3a] hover:bg-[#243447] text-white text-sm font-bold rounded-lg transition-colors">
          + New Invoice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          No invoices yet — click "+ New Invoice" to add one
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr><TH>Invoice #</TH><TH>Date</TH><TH>Period</TH><TH>Lines</TH><TH right>Total</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <TR key={inv.id} onClick={() => { setSelected(inv); setView("detail"); }}>
                  <TD mono bold className="text-indigo-600">{inv.invoice_num}</TD>
                  <TD muted>{inv.invoice_date}</TD>
                  <TD muted className="text-sm">{inv.period_start && inv.period_end ? `${inv.period_start} – ${inv.period_end}` : inv.period_start || "—"}</TD>
                  <TD muted>{inv.lines?.length || 0} line{inv.lines?.length !== 1 ? "s" : ""}</TD>
                  <TD right bold className="text-gray-900">{$f(inv.total_amount)}</TD>
                  <TD><InvStatusTag status={inv.status} /></TD>
                  <TD onClick={e=>e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                      {inv.status === "Submitted" && (
                        <button onClick={() => { setSelected(inv); setView("detail"); }} className="text-sm px-2 py-1 border border-gray-200 rounded text-gray-500 hover:border-indigo-300 hover:text-indigo-600">Review</button>
                      )}
                      {inv.status === "Under Review" && (
                        <button onClick={() => approve(inv.id)} className="text-sm px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded font-semibold">Approve</button>
                      )}
                      {inv.status === "Approved" && (
                        <button onClick={() => markZohoMatch(inv)} className="text-sm px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded font-semibold">Match Zoho</button>
                      )}
                      {inv.status === "Zoho Matched" && (
                        <button onClick={() => markPaid(inv)} className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold">Mark Paid</button>
                      )}
                      <button onClick={() => deleteInv(inv.id)} className="text-sm px-2 py-1 text-gray-300 hover:text-red-500 transition-colors">✕</button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
            <tfoot>
              <TR subtle>
                <TD bold colSpan={4} muted>Total</TD>
                <TD right bold className="text-gray-900">{$f(invoices.reduce((s,i)=>s+i.total_amount,0))}</TD>
                <TD colSpan={2} />
              </TR>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Summary by status */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {["Submitted","Under Review","Approved","Paid"].map(s => {
            const count = invoices.filter(i=>i.status===s||i.status==="Zoho Matched"&&s==="Approved").length;
            const total = invoices.filter(i=>i.status===s||(i.status==="Zoho Matched"&&s==="Approved")).reduce((sum,i)=>sum+i.total_amount,0);
            const c = INV_STATUS_COLORS[s];
            return (
              <div key={s} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{background:c.dot}} />
                  <span className="text-sm font-semibold" style={{color:c.text}}>{s}</span>
                </div>
                <div className="text-sm font-bold text-gray-900">{$f(total)}</div>
                <div className="text-sm text-gray-400">{count} invoice{count!==1?"s":""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── NEW INVOICE FORM ──────────────────────────────────────────────────────
  if (view === "new") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setView("list")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
        <span className="text-sm font-bold text-gray-900">New Invoice — {vendor.full_name}</span>
      </div>

      <Card className="p-5 space-y-4">
        <SectionTitle>Invoice Details</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><label className="block text-sm text-gray-400 mb-1">Invoice #*</label>
            <input value={form.invoice_num} onChange={e=>setForm(f=>({...f,invoice_num:e.target.value}))} placeholder="e.g. CFA-44" className={inp}/></div>
          <div><label className="block text-sm text-gray-400 mb-1">Invoice Date*</label>
            <input type="date" value={form.invoice_date} onChange={e=>setForm(f=>({...f,invoice_date:e.target.value}))} className={inp}/></div>
          <div><label className="block text-sm text-gray-400 mb-1">Period Start</label>
            <input type="date" value={form.period_start} onChange={e=>setForm(f=>({...f,period_start:e.target.value}))} className={inp}/></div>
          <div><label className="block text-sm text-gray-400 mb-1">Period End</label>
            <input type="date" value={form.period_end} onChange={e=>setForm(f=>({...f,period_end:e.target.value}))} className={inp}/></div>
          <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Guest cabin CD's, OAC meetings…" className={inp}/></div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Line Items</SectionTitle>
          <button onClick={addLine} className="text-sm px-3 py-1.5 bg-[#1c2b3a] text-white rounded-lg font-semibold">+ Add Line</button>
        </div>
        {lines.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            Add line items from the invoice — one row per service/phase
          </div>
        )}
        {lines.map((line, i) => {
          const phase = vendor.phases.find(p => p.id === parseInt(line.vendor_phase_id));
          const remaining = phase ? (phase.budget ? phase.budget - (phase.invoiced||0) : null) : null;
          const isOver = remaining !== null && parseFloat(line.amount||0) > remaining;
          return (
            <div key={i} className={`border rounded-lg p-4 space-y-3 ${isOver ? "border-red-300 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Line {i+1}</span>
                <button onClick={()=>removeLine(i)} className="text-sm text-gray-300 hover:text-red-500">✕ Remove</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description*</label>
                  <input value={line.line_description} onChange={e=>handleLineChange(i,"line_description",e.target.value)}
                    placeholder="e.g. Design – Guest Cabin" className={inp}/>
                </div>
                <div><label className="block text-sm text-gray-400 mb-1">Hours</label>
                  <input type="number" value={line.hours} onChange={e=>handleLineChange(i,"hours",e.target.value)} placeholder="0" className={inp}/></div>
                <div><label className="block text-sm text-gray-400 mb-1">Rate</label>
                  <input type="number" value={line.rate} onChange={e=>handleLineChange(i,"rate",e.target.value)} placeholder="0.00" className={inp}/></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount*</label>
                  <input type="number" value={line.amount} onChange={e=>handleLineChange(i,"amount",e.target.value)} placeholder="0.00" className={`${inp} font-bold`}/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Map to Budget Phase*</label>
                  <select value={line.vendor_phase_id} onChange={e=>{
                    const ph = vendor.phases.find(p=>String(p.id)===e.target.value);
                    updateLine(i,"vendor_phase_id",e.target.value);
                    updateLine(i,"vendor_phase_name",ph?.phase||"");
                  }} className={inp}>
                    <option value="">— Select budget phase —</option>
                    {vendor.phases.map(p=>(
                      <option key={p.id} value={p.id}>
                        {p.phase} {p.budget ? `(${$f(p.budget - (p.invoiced||0))} remaining)` : "(T&M)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Budget check */}
              {phase && (
                <div className={`text-sm rounded-lg px-3 py-2 flex items-center justify-between ${isOver ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  <span>{phase.phase}</span>
                  <span className="font-semibold">
                    {isOver ? `⚠ Over budget by ${$f(parseFloat(line.amount||0) - remaining)}` : `${$f(remaining)} remaining`}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input value={line.notes} onChange={e=>updateLine(i,"notes",e.target.value)} placeholder="Optional notes…" className={inp}/>
              </div>
            </div>
          );
        })}
        {lines.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-400">Lines total</span>
            <span className={`text-sm font-bold ${form.total_amount && Math.abs(linesTotal - parseFloat(form.total_amount||0)) > 0.5 ? "text-red-600" : "text-gray-900"}`}>{$f(linesTotal)}</span>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <button onClick={saveInvoice}
          disabled={!form.invoice_num||!form.invoice_date||lines.length===0||saving}
          className={cx("px-6 py-2.5 text-sm font-bold rounded-lg transition-colors",
            form.invoice_num&&form.invoice_date&&lines.length>0&&!saving ? "bg-[#1c2b3a] hover:bg-[#243447] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
          {saving ? "Saving…" : "Submit Invoice →"}
        </button>
        <button onClick={()=>setView("list")} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </div>
  );

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const inv = invoices.find(i=>i.id===selected.id) || selected;
    const linesTotal2 = inv.lines?.reduce((s,l)=>s+l.amount,0)||0;
    const allMapped = inv.lines?.every(l=>l.vendor_phase_id) && inv.lines?.length > 0;
    const anyOverBudget = inv.lines?.some(l=>l.is_over_budget);
    const canApprove = allMapped && !anyOverBudget && inv.status !== "Approved" && inv.status !== "Zoho Matched" && inv.status !== "Paid";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>setView("list")} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
            <span className="text-sm font-bold text-gray-900">Invoice {inv.invoice_num}</span>
            <InvStatusTag status={inv.status} />
          </div>
          <div className="flex gap-2">
            {(inv.status==="Submitted"||inv.status==="Under Review") && canApprove && (
              <button onClick={()=>approve(inv.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg">✓ Approve Invoice</button>
            )}
            {inv.status==="Approved" && (
              <button onClick={async () => {
                try {
                  const r = await apiFetch('/zoho/match', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ vendor_key: vendorKey, invoice_num: inv.invoice_num, total_amount: inv.total_amount, invoice_date: inv.invoice_date })
                  });
                  if (r.matches?.length > 0) {
                    const m = r.matches[0];
                    if (confirm('Found Zoho match: Bill #' + m.bill_number + ' | Date: ' + m.date + ' | Amount: $' + m.total.toLocaleString() + '\n\nConfirm match?')) {
                      await apiFetch('/submitted-invoices/' + inv.id + '/zoho-match', {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ zoho_bill_id: m.bill_id, zoho_match_amount: m.total })
                      });
                      await load();
                    }
                  } else {
                    const billId = prompt('No automatic match found.\nEnter Zoho Bill ID manually:');
                    if (billId) {
                      await apiFetch('/submitted-invoices/' + inv.id + '/zoho-match', {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ zoho_bill_id: billId, zoho_match_amount: inv.total_amount })
                      });
                      await load();
                    }
                  }
                } catch(e) { alert('Match error: ' + e.message); }
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg">
                Match to Zoho →
              </button>
            )}
            {inv.status==="Zoho Matched" && (
              <button onClick={()=>markPaid(inv)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg">Mark as Paid</button>
            )}
            {(inv.status==="Approved"||inv.status==="Under Review") && (
              <button onClick={()=>unapprove(inv.id)} className="px-3 py-2 border border-gray-200 text-sm font-semibold rounded-lg text-gray-500 hover:text-gray-700">Send Back</button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {!allMapped && inv.lines?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-amber-500">⚑</span>
            <p className="text-sm font-semibold text-amber-700">{inv.lines.filter(l=>!l.vendor_phase_id).length} line item{inv.lines.filter(l=>!l.vendor_phase_id).length!==1?"s":""} not yet mapped to a budget phase — required before approval</p>
          </div>
        )}
        {anyOverBudget && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-red-500">⚠</span>
            <p className="text-sm font-semibold text-red-700">One or more line items exceed the remaining budget for their phase — review before approving</p>
          </div>
        )}
        {inv.status === "Zoho Matched" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-500">✓</span>
              <div>
                <p className="text-sm font-semibold text-blue-700">Matched to Zoho</p>
                <p className="text-sm text-blue-600">Bill ID: {inv.zoho_bill_id} · {$f(inv.zoho_match_amount)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice header info */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-50">
            {[["Vendor", vendor.full_name],["Invoice #", inv.invoice_num],["Date", inv.invoice_date],["Period", inv.period_start&&inv.period_end?`${inv.period_start} – ${inv.period_end}`:"—"]].map(([k,v])=>(
              <div key={k} className="px-4 py-3">
                <p className="text-sm text-gray-400 mb-0.5">{k}</p>
                <p className="text-sm font-semibold text-gray-900">{v}</p>
              </div>
            ))}
          </div>
          {inv.notes && <div className="px-4 py-2 border-t border-gray-50 bg-gray-50"><p className="text-sm text-gray-500 italic">{inv.notes}</p></div>}
        </Card>

        {/* Line items */}
        <Card className="overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[#e8e8e6]">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Line Items — Budget Check</span>
          </div>
          <table className="w-full">
            <thead><tr><TH>Description</TH><TH>Hours</TH><TH>Rate</TH><TH right>Amount</TH><TH>Budget Phase</TH><TH right>Phase Remaining</TH><TH>Budget Status</TH></tr></thead>
            <tbody>
              {(inv.lines||[]).map((line, i) => (
                <tr key={line.id} className={`border-b border-gray-50 ${line.is_over_budget?"bg-red-50":""}`}>
                  <TD bold className="text-gray-800">{line.line_description}</TD>
                  <TD muted>{line.hours||"—"}</TD>
                  <TD muted>{line.rate?$f(line.rate):"—"}</TD>
                  <TD right bold className="text-gray-900">{$f(line.amount)}</TD>
                  <TD>
                    {inv.status==="Submitted"||inv.status==="Under Review" ? (
                      <select
                        value={line.vendor_phase_id||""}
                        onChange={e=>{
                          const ph = vendor.phases.find(p=>String(p.id)===e.target.value);
                          updatePhaseMapping(line.id, e.target.value, ph?.phase||"");
                        }}
                        className="bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-400 w-48"
                        onClick={e=>e.stopPropagation()}>
                        <option value="">— Map to phase —</option>
                        {vendor.phases.map(p=>(
                          <option key={p.id} value={p.id}>{p.phase}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-medium text-indigo-600">{line.vendor_phase_name||"—"}</span>
                    )}
                  </TD>
                  <TD right className={line.is_over_budget?"text-red-600 font-bold":"text-gray-500"}>
                    {line.budget_remaining!=null?$f(line.budget_remaining):"T&M"}
                  </TD>
                  <TD>
                    {line.vendor_phase_id ? (
                      line.is_over_budget
                        ? <Tag text="⚠ Over Budget" color="red" />
                        : <Tag text="✓ Within Budget" color="green" />
                    ) : <Tag text="Unmapped" color="amber" />}
                  </TD>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <TR subtle>
                <TD bold colSpan={3} muted>Invoice Total</TD>
                <TD right bold className="text-gray-900">{$f(linesTotal2)}</TD>
                <TD colSpan={3} />
              </TR>
            </tfoot>
          </table>
        </Card>

        {/* Approval checklist */}
        <Card className="p-5">
          <SectionTitle>Approval Checklist</SectionTitle>
          <div className="space-y-2 mt-2">
            {[
              [inv.lines?.length > 0, "Invoice has line items"],
              [allMapped, "All line items mapped to budget phases"],
              [!anyOverBudget, "No line items exceed phase budget"],
              [inv.status !== "Submitted", "Invoice reviewed"],
            ].map(([ok, label], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold ${ok?"bg-emerald-100 text-emerald-600":"bg-gray-100 text-gray-400"}`}>{ok?"✓":"·"}</span>
                <span className={`text-sm ${ok?"text-gray-700":"text-gray-400"}`}>{label}</span>
              </div>
            ))}
          </div>
          {canApprove && (
            <button onClick={()=>approve(inv.id)} className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors">
              ✓ Approve Invoice — {$f(linesTotal2)}
            </button>
          )}
          {!canApprove && inv.status==="Submitted" && (
            <div className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Complete the checklist above before approving
            </div>
          )}
        </Card>
      </div>
    );
  }

  return null;
}


// ─── VENDORS VIEW SINGLE ──────────────────────────────────────────────────────
// Extracted from VendorsView to show a single vendor
function VendorsViewSingle({ vendorKey }) {
  const { vendors, refresh } = useAppData();
  const [subTab, setSubTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [phaseView, setPhaseView] = useState("table");
  const [addingInv, setAddingInv] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState({ invNum:"", date:"", desc:"", amount:"", status:"Pending" });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const vendor = vendors[vendorKey];
  if (!vendor) return null;

  const totalInvoiced = vendor.invoices.reduce((s,i) => s+(i.amount||0), 0);
  const totalBudgeted = vendor.phases.reduce((s,p) => s+(p.budget||0), 0);
  const rem = totalBudgeted > 0 ? totalBudgeted - totalInvoiced : null;
  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400";

  const saveNewInv = async () => {
    if (!addForm.invNum || !addForm.amount || saving) return;
    setSaving(true);
    await apiFetch(`/vendors/${vendorKey}/invoices`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ invNum:addForm.invNum, date:addForm.date, desc:addForm.desc, amount:parseFloat(addForm.amount.replace(/[^0-9.]/g,""))||0, status:addForm.status })
    });
    await refresh(); setAddForm({ invNum:"", date:"", desc:"", amount:"", status:"Pending" }); setAddingInv(false); setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingId || saving) return; setSaving(true);
    await apiFetch(`/vendors/invoices/${editingId}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ invNum:editForm.inv_num, date:editForm.inv_date, desc:editForm.description, amount:parseFloat(editForm.amount)||0, status:editForm.status })
    });
    await refresh(); setEditingId(null); setSaving(false);
  };

  const deleteInv = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    await apiFetch(`/vendors/invoices/${id}`, { method:'DELETE' });
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{vendor.full_name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{vendor.role}</p>
        </div>
        <Tag text="Active" color="amber" />
      </div>

      <div className="flex border-b border-gray-200">
        {[["invoices","Invoices"],["phases","Budget Phases"],["overview","Overview"]].map(([id,lbl]) => (
          <button key={id} onClick={() => { setSubTab(id); setModal(null); setAddingInv(false); setEditingId(null); }}
            className={cx("px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
              subTab===id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600")}>
            {lbl}
          </button>
        ))}
      </div>

      {subTab==="overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total Invoiced" value={$f(vendor.phases.reduce((s,p)=>s+(p.invoiced||0),0))} sub="All budget phases" accent onClick={() => setSubTab("phases")} />
            {rem != null ? <Stat label="Remaining Budget" value={$f(rem)} sub="Against fixed fees" onClick={() => setSubTab("phases")} /> : <Stat label="Billing Type" value="T&M" sub="Billed monthly" />}
            <Stat label="Invoices on File" value={String(vendor.invoices.length)} sub="Tracked invoices" onClick={() => setSubTab("invoices")} />
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Budget Phases</SectionTitle>
              <div className="flex gap-1 -mt-4">
                {[["table","Table"],["cards","Cards"],["timeline","List"]].map(([v,l]) => (
                  <button key={v} onClick={() => setPhaseView(v)} className={cx("px-2.5 py-1 text-sm rounded-lg font-medium", phaseView===v ? "bg-[#1c2b3a] text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700")}>{l}</button>
                ))}
              </div>
            </div>
            {phaseView==="table" && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><TH>Phase</TH><TH>Stage</TH><TH>Work Package</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {vendor.phases.map((p,i) => {
                    const b=p.budget||0; const inv2=p.invoiced||0; const r=b>0?b-inv2:null;
                    return (
                      <TR key={i} onClick={() => { setSubTab("phases"); setModal(p); }}>
                        <TD bold className="text-gray-800">{p.phase}</TD>
                        <TD>{p.stage && <span className="px-2 py-0.5 rounded text-sm font-medium bg-indigo-50 text-indigo-600">{p.stage}</span>}</TD>
                        <TD>{p.work_package && <span className="px-2 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-500">{p.work_package}</span>}</TD>
                        <TD right muted>{b>0?$f(b):"T&M"}</TD>
                        <TD right bold className="text-gray-900">{$f(inv2)}</TD>
                        <TD right className={r==null?"text-gray-400":r<0?"text-red-500 font-bold":r>0?"text-indigo-600 font-medium":"text-gray-300"}>{r==null?"T&M":r>0?$f(r):r<0?`-${$f(-r)}`:"—"}</TD>
                        <TD>{statusTag(p.status)}</TD>
                      </TR>
                    );
                  })}
                </tbody>
                <tfoot>
                  <TR subtle>
                    <TD bold colSpan={4} muted>Total</TD>
                    <TD right bold className="text-gray-900">{$f(vendor.phases.reduce((s,p)=>s+(p.invoiced||0),0))}</TD>
                    <TD right bold className="text-indigo-600">{rem!=null?$f(rem):"T&M"}</TD>
                    <TD />
                  </TR>
                </tfoot>
              </table>
            )}
            {phaseView==="cards" && (
              <div className="grid md:grid-cols-2 gap-2">
                {vendor.phases.map((p,i) => {
                  const b=p.budget||0; const inv2=p.invoiced||0;
                  return (
                    <button key={i} onClick={()=>{setSubTab("phases");setModal(p);}} className="text-left bg-gray-50 hover:bg-indigo-50 rounded-lg p-3 border border-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1"><span className="text-sm font-semibold text-gray-800 leading-tight">{p.phase}</span>{statusTag(p.status)}</div>
                      {p.stage && <span className="text-sm text-indigo-500 font-medium">{p.stage} · {p.work_package}</span>}
                      {b>0&&<BarFill value={inv2} max={b} color={vendor.color}/>}
                      <div className="flex justify-between mt-2"><span className="text-sm text-gray-400">{b>0?$f(b)+" budget":"T&M"}</span><span className="text-sm font-bold text-gray-800">{$f(inv2)}</span></div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {subTab==="phases" && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr><TH>Phase</TH><TH>Stage</TH><TH>Work Package</TH><TH>Description</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
            <tbody>
              {vendor.phases.map((p,i) => {
                const bP=p.budget||0; const invP=p.invoiced||0; const remP=bP>0?bP-invP:null;
                return (
                  <TR key={i} onClick={()=>setModal(p)}>
                    <TD bold className="text-gray-800 whitespace-nowrap">{p.phase}</TD>
                    <TD>{p.stage && <span className="px-2 py-0.5 rounded text-sm font-medium bg-indigo-50 text-indigo-600">{p.stage}</span>}</TD>
                    <TD>{p.work_package && <span className="px-2 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-500">{p.work_package}</span>}</TD>
                    <TD muted className="max-w-xs">{p.description}</TD>
                    <TD right muted>{bP>0?$f(bP):"T&M"}</TD>
                    <TD right bold className="text-gray-900">{$f(invP)}</TD>
                    <TD right className={remP==null?"text-gray-400":remP<0?"text-red-500 font-bold":remP>0?"text-indigo-600 font-medium":"text-gray-300"}>{remP==null?"T&M":remP>0?$f(remP):remP<0?`-${$f(-remP)}`:"—"}</TD>
                    <TD>{statusTag(p.status)}</TD>
                  </TR>
                );
              })}
            </tbody>
            <tfoot>
              <TR subtle>
                <TD bold colSpan={5} muted>Total</TD>
                <TD right bold className="text-gray-900">{$f(vendor.phases.reduce((s,p)=>s+(p.invoiced||0),0))}</TD>
                <TD right bold className="text-indigo-600">{rem!=null?$f(rem):"T&M"}</TD>
                <TD />
              </TR>
            </tfoot>
          </table>
        </Card>
      )}

      {subTab==="invoices" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setAddingInv(v=>!v); setEditingId(null); }}
              className={cx("px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors", addingInv ? "bg-gray-200 text-gray-600" : "bg-[#1c2b3a] text-white")}>
              {addingInv?"Cancel":"+ Add Invoice"}
            </button>
          </div>
          {addingInv && (
            <Card className="p-4">
              <SectionTitle>New Invoice — {vendor.name}</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div><label className="block text-sm text-gray-400 mb-1">Invoice #</label><input value={addForm.invNum} onChange={e=>setAddForm(f=>({...f,invNum:e.target.value}))} placeholder="e.g. INV-001" className={inp}/></div>
                <div><label className="block text-sm text-gray-400 mb-1">Date</label><input value={addForm.date} onChange={e=>setAddForm(f=>({...f,date:e.target.value}))} placeholder="MM/DD/YYYY" className={inp}/></div>
                <div><label className="block text-sm text-gray-400 mb-1">Amount ($)</label><input value={addForm.amount} onChange={e=>setAddForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" className={inp}/></div>
                <div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Description</label><input value={addForm.desc} onChange={e=>setAddForm(f=>({...f,desc:e.target.value}))} placeholder="Invoice description…" className={inp}/></div>
                <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={addForm.status} onChange={e=>setAddForm(f=>({...f,status:e.target.value}))} className={inp}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveNewInv} disabled={!addForm.invNum||!addForm.amount||saving} className={cx("px-4 py-2 text-sm font-bold rounded-lg", addForm.invNum&&addForm.amount&&!saving?"bg-[#1c2b3a] text-white":"bg-gray-100 text-gray-400 cursor-not-allowed")}>{saving?"Saving…":"Save Invoice"}</button>
                <button onClick={()=>setAddingInv(false)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-500">Cancel</button>
              </div>
            </Card>
          )}
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead><tr><TH>Invoice #</TH><TH>Date</TH><TH>Description</TH><TH right>Amount</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {vendor.invoices.map((vinv) => {
                  const isEditing = editingId === vinv.id;
                  return isEditing ? (
                    <tr key={vinv.id} className="bg-indigo-50 border-b border-gray-100">
                      <TD><input value={editForm.inv_num||""} onChange={e=>setEditForm(f=>({...f,inv_num:e.target.value}))} className={inp+" w-24"}/></TD>
                      <TD><input value={editForm.inv_date||""} onChange={e=>setEditForm(f=>({...f,inv_date:e.target.value}))} className={inp+" w-24"}/></TD>
                      <TD><input value={editForm.description||""} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} className={inp+" w-48"}/></TD>
                      <TD right><input value={editForm.amount||""} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} className={inp+" w-24 text-right"}/></TD>
                      <TD><select value={editForm.status||"Pending"} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} className={inp+" w-24"}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></TD>
                      <TD><div className="flex gap-1"><button onClick={saveEdit} className="text-sm px-2 py-1 bg-[#1c2b3a] text-white rounded">{saving?"…":"Save"}</button><button onClick={()=>setEditingId(null)} className="text-sm px-2 py-1 bg-gray-100 text-gray-500 rounded">Cancel</button></div></TD>
                    </tr>
                  ) : (
                    <TR key={vinv.id} onClick={() => setModal({_inv:true,...vinv})}>
                      <TD mono className="text-indigo-600 font-bold">{vinv.inv_num}</TD>
                      <TD muted>{vinv.inv_date}</TD>
                      <TD className="text-gray-600">{vinv.description}</TD>
                      <TD right bold className="text-gray-900">{$f(vinv.amount)}</TD>
                      <TD>{statusTag(vinv.status)}</TD>
                      <TD onClick={e=>e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={()=>{setEditingId(vinv.id);setEditForm({...vinv});}} className="text-sm px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700">Edit</button>
                          <button onClick={()=>deleteInv(vinv.id)} className="text-sm px-2 py-1 text-gray-300 hover:text-red-500">✕</button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
              <tfoot>
                <TR subtle><TD bold colSpan={3} muted>Total</TD><TD right bold className="text-gray-900">{$f(vendor.invoices.reduce((s,i)=>s+(i.amount||0),0))}</TD><TD colSpan={2}/></TR>
              </tfoot>
            </table>
          </Card>
        </div>
      )}

      {modal && !modal._inv && (
        <Modal title={modal.phase} subtitle={vendor.full_name} onClose={() => setModal(null)}>
          <KVGrid rows={[["Phase",modal.phase],["Stage",modal.stage||"—"],["Work Package",modal.work_package||"—"],["Status",modal.status],["Budget",modal.budget>0?$f(modal.budget):"T&M"],["Invoiced",$f(modal.invoiced)],["Remaining",modal.budget>0?$f(modal.budget-modal.invoiced):"T&M"],["Description",modal.description]]} />
        </Modal>
      )}
      {modal?._inv && (
        <Modal title={`Invoice ${modal.inv_num}`} subtitle={`${vendor.name} · ${modal.inv_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[["Invoice #",modal.inv_num],["Date",modal.inv_date],["Description",modal.description],["Amount",$f(modal.amount)],["Status",modal.status]]} />
        </Modal>
      )}
    </div>
  );
}


// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",   label: "Overview",              icon: "◈" },
  { id: "totalspend",  label: "Total Spend",           icon: "∑" },
  { id: "demolition",  label: "Demolition",            icon: "◈" },
  { id: "road",        label: "Road Construction",     icon: "◷" },
  { id: "phase11",     label: "Phase 1.1",             icon: "◉" },
  { id: "designeng",   label: "Design & Engineering",  icon: "⬡" },
  { id: "uploads",     label: "Documents",             icon: "⊕" },
];

const PAGE_TITLES = {
  dashboard:   { title: "PROJECT OVERVIEW",         sub: "Camp Forestmere" },
  totalspend:  { title: "TOTAL SPEND",              sub: "Inception to date · All phases · USD" },
  phase11:     { title: "PHASE 1.1 — CONSTRUCTION", sub: "Taconic Builders · C25-104 · Jun 2025 – Apr 2027" },
  "phase11:landing":  { title: "PHASE 1.1 — CONSTRUCTION", sub: "Taconic Builders · C25-104 · Jun 2025 – Apr 2027" },
  "phase11:budget":   { title: "PHASE 1.1 — CONSTRUCTION", sub: "Control Budget" },
  "phase11:awards":   { title: "PHASE 1.1 — CONSTRUCTION", sub: "Awards" },
  "phase11:cos":      { title: "PHASE 1.1 — CONSTRUCTION", sub: "Change Orders" },
  "phase11:invoices": { title: "PHASE 1.1 — CONSTRUCTION", sub: "Invoices" },
  "phase11:lineitem": { title: "PHASE 1.1 — CONSTRUCTION", sub: "Line Item Billing" },
  "phase11:reconcile":{ title: "PHASE 1.1 — CONSTRUCTION", sub: "Reconcile" },
  "phase11:zoho-recon":{ title: "PHASE 1.1 — CONSTRUCTION", sub: "Zoho Reconciliation" },
  designeng:   { title: "DESIGN & ENGINEERING",     sub: "ArchitectureFirm · Reed Hilderbrand · Ivan Zdrahal PE" },
  road:        { title: "Road Construction",            sub: "Taconic Builders · C23-101 · Jan 2024 – Jun 2024 · Complete" },
  demolition:  { title: "Demolition",                   sub: "Taconic Builders / Mayville Enterprises · C25-102 · Jan 2025 – May 2025 · Complete" },
  uploads:     { title: "DOCUMENTS",               sub: "Upload & parse invoices, COs, award letters" },
};

function AppShell() {
  const { documents } = useAppData();
  
  // Persist active tab in URL hash so refresh keeps you on the same page
  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["dashboard","totalspend","phase11","designeng","road","demolition","uploads"];
    if (hash.startsWith("phase11:")) return hash;
    return validTabs.includes(hash) ? hash : "dashboard";
  };
  const [tab, setTabState] = useState(getInitialTab);
  
  const setTab = (t) => {
    setTabState(t);
    window.location.hash = t;
  };

  const page = PAGE_TITLES[tab] || { title: tab, sub: "" };

  return (
    <div style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif", background: "#f7f5f0", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        button { font-family: inherit; }
        input, select, textarea { font-family: inherit; }
      `}</style>

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 196,
        background: "#ffffff", borderRight: "1px solid #ede9e3",
        display: "flex", flexDirection: "column", zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0ece6", marginBottom: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#1a1a1a", letterSpacing: "0.02em", lineHeight: 1 }}>Camp Forestmere</div>
          <div style={{ fontWeight: 400, fontSize: 10, color: "#9ca3af", marginTop: 4, letterSpacing: "0.01em" }}>Construction</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
          {NAV.map(n => {
            const active = tab === n.id || tab.startsWith(n.id + ":");
            const docsCount = n.id === "uploads" && documents.length > 0 ? documents.length : null;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  width: "100%", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 10px", borderRadius: 6, marginBottom: 1,
                  background: active ? "#1a1a1a" : "transparent",
                  color: active ? "#ffffff" : "#6b7280",
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  border: "none", cursor: "pointer",
                  transition: "all 0.1s",
                  borderRadius: 6,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#f7f5f0"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
              >
                <span style={{ fontSize: 11, width: 16, textAlign: "center", flexShrink: 0, opacity: 0.5 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {docsCount && (
                  <span style={{
                    background: active ? "rgba(255,255,255,0.2)" : "#f0ece6",
                    color: active ? "#e5e7eb" : "#9ca3af",
                    borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 500,
                  }}>{docsCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f0ece6" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400, letterSpacing: "0.01em" }}>JXM / Camp Forestmere Corp.</div>
          <div style={{ fontSize: 10, color: "#b5b0a8", marginTop: 2 }}>Paul Smiths, NY</div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <div style={{ marginLeft: 196, minHeight: "100vh" }}>

        {/* Page header */}
        <div style={{
          background: "#ffffff", borderBottom: "1px solid #e8eaed",
          padding: "14px 32px 12px", position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 13, fontWeight: 500, color: "#111827", margin: 0, letterSpacing: "0.06em" }}>
                {page.title}
              </h1>
              <p style={{ fontSize: 12, color: "#b0b7c3", margin: "2px 0 0", fontWeight: 400 }}>
                {page.sub}
              </p>
            </div>

          </div>
        </div>

        {/* Page content */}
        <main style={{ padding: "20px 28px 32px", maxWidth: 1360 }}>
          {tab === "dashboard"   && <Dashboard setTab={setTab} />}
          {tab === "totalspend"  && <TotalSpendView />}
          {(tab === "phase11" || tab.startsWith("phase11:")) && <Phase11Shell initialSubTab={tab.startsWith("phase11:") ? tab.split(":")[1] : "landing"} />}
          {tab === "designeng"   && <DesignEngShell />}
          {tab === "road"        && <PriorPhaseShell phaseId="road" />}
          {tab === "demolition"  && <PriorPhaseShell phaseId="demolition" />}
          {tab === "uploads"     && <DocumentsView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
