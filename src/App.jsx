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

  useEffect(() => { refresh(); }, []);

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
        <p className="text-xs text-gray-400 mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800">Retry</button>
      </div>
    </div>
  );

  if (!raw) return null;

  // ─── COMPUTED VALUES ────────────────────────────────────────────────────────
  const { budget, awards, changeOrders, invoices, lineItems, vendors, priorPhases, cashFlow, documents } = raw;

  const awardedByCode = {};
  awards.forEach(a => { awardedByCode[a.code] = (awardedByCode[a.code] || 0) + parseFloat(a.current_amount); });

  const totalBudget   = budget.reduce((s, b) => s + parseFloat(b.budget), 0);
  const totalAwarded  = awards.reduce((s, a) => s + parseFloat(a.current_amount), 0);
  const totalCOs      = changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0);
  const taconicPaid   = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + parseFloat(i.approved), 0);
  const taconicPending = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + parseFloat(i.approved) - parseFloat(i.credit_applied||0), 0);

  const izPaid  = vendors.ivan?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const rhPaid  = vendors.reed?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const afPaid  = vendors.arch?.phases.reduce((s, p) => s + (p.invoiced || 0), 0) || 0;
  const priorPaid = priorPhases.reduce((s, p) => s + parseFloat(p.total_paid), 0);
  const grandTotalPaid = taconicPaid + izPaid + rhPaid + afPaid + priorPaid;

  const INV_NUMS = invoices.map(i => i.inv_num);

  const value = {
    budget, awards, changeOrders, invoices, lineItems, vendors, priorPhases, cashFlow, documents,
    awardedByCode, totalBudget, totalAwarded, totalCOs, taconicPaid, taconicPending,
    izPaid, rhPaid, afPaid, priorPaid, grandTotalPaid, INV_NUMS,
    refresh,
  };

  // Expose data globally for SmartUploadView
  window.__appData = value;

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const $f = (n) => n == null ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pf = (n) => (Number(n) * 100).toFixed(1) + "%";

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const cx = (...a) => a.filter(Boolean).join(" ");

const Tag = ({ text, color = "muted" }) => {
  const map = {
    green:  "bg-emerald-100 text-emerald-700",
    amber:  "bg-indigo-100  text-indigo-700",
    red:    "bg-red-100    text-red-700",
    blue:   "bg-blue-100   text-blue-700",
    muted:  "bg-gray-100   text-gray-400",
  };
  return <span className={cx("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", map[color])}>{text}</span>;
};

const statusTag = (s) => {
  if (s === "Complete")        return <Tag text="Complete"       color="green" />;
  if (s === "In Progress")     return <Tag text="In Progress"    color="amber" />;
  if (s === "Ongoing")         return <Tag text="Ongoing"        color="blue"  />;
  if (s === "Pending")         return <Tag text="Pending"        color="amber" />;
  if (s === "Paid")            return <Tag text="Paid"           color="green" />;
  if (s === "Pending Payment") return <Tag text="Pending Payment" color="amber" />;
  return <Tag text={s} />;
};

const BarFill = ({ value, max, color }) => {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max * 1.02;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: over ? "#ef4444" : (color || "#4f46e5") }} />
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-xs font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

const Stat = ({ label, value, sub, accent, onClick }) => (
  <div onClick={onClick} className={cx(
    "bg-white rounded-xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all select-none",
    onClick && "cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-gray-200 active:scale-[0.99]"
  )}>
    <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">{label}</div>
    <div className={cx("text-2xl font-bold tabular-nums tracking-tight", accent ? "text-indigo-600" : "text-gray-900")}>{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    {onClick && <div className="text-xs text-gray-400 mt-2 font-medium hover:text-gray-600">View detail →</div>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={cx("bg-white border border-gray-100 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]", className)}>{children}</div>
);

const TH = ({ children, right, className = "" }) => (
  <th className={cx("px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-[#f5f6f8] whitespace-nowrap", right ? "text-right" : "text-left", className)}>{children}</th>
);
const TD = ({ children, right, muted, bold, colSpan, className = "" }) => (
  <td colSpan={colSpan} className={cx("px-4 py-3 text-xs", right && "text-right tabular-nums", muted && "text-gray-400", bold && "font-semibold", className)}>{children}</td>
);
const TR = ({ children, onClick, subtle }) => (
  <tr onClick={onClick} className={cx("border-b border-gray-100 transition-colors", onClick && "cursor-pointer hover:bg-indigo-50", subtle && "bg-[#f5f6f8]/50")}>{children}</tr>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cx("bg-white border border-gray-200 rounded-2xl flex flex-col shadow-2xl w-full", wide ? "max-w-4xl" : "max-w-2xl")}
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
    <div className="grid grid-cols-2 gap-2">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="bg-[#f5f6f8] rounded-lg px-3 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5">{k}</div>
          <div className="text-xs font-semibold text-gray-800 break-words">{v ?? "—"}</div>
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
    grandTotalPaid, izPaid, rhPaid, afPaid, priorPhases
  } = useAppData();
  const [modal, setModal] = useState(null);
  const [reconSummary, setReconSummary] = useState(null);

  useEffect(() => {
    apiFetch('/reconciliation').then(r => {
      if (r.summary) setReconSummary(r.summary);
    }).catch(() => {});
  }, []);

  const pendingInvs = invoices.filter(i => i.status !== "Paid");
  const catBudget = {};
  budget.forEach(b => { catBudget[b.cat] = (catBudget[b.cat] || 0) + parseFloat(b.budget); });

  const spendRows = [
    { name: "Taconic Builders (GC)", paid: taconicPaid, color: "#4f46e5" },
    { name: "Architecturefirm",                paid: afPaid,      color: "#0891b2" },
    { name: "Reed Hilderbrand",                paid: rhPaid,      color: "#059669" },
    { name: "Ivan Zdrahal PE",                 paid: izPaid,      color: "#7c3aed" },
  ];
  const phase11GrandTotal = taconicPaid + izPaid + rhPaid + afPaid;

  return (
    <div className="space-y-5">
      {reconSummary?.failed > 0 && (
        <button onClick={() => setTab("reconcile")} className="w-full text-left flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 hover:bg-red-100 transition-colors">
          <span className="text-red-500 text-xs">✕</span>
          <p className="text-xs font-semibold text-red-700 flex-1">Reconciliation Errors Detected — {reconSummary.failed} check{reconSummary.failed > 1 ? "s" : ""} failing · click to review</p>
          <span className="text-red-400 text-xs">→</span>
        </button>
      )}
      {/* Prior phases notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <span className="text-amber-500 text-xs">*</span>
        <p className="text-xs text-amber-700">Prior Phases (Demolition + Road Construction) not yet included in totals — will be added in a future update.</p>
      </div>
      {reconSummary?.failed === 0 && reconSummary?.total > 0 && (
        <button onClick={() => setTab("reconcile")} className="w-full text-left flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 hover:bg-emerald-100 transition-colors">
          <span className="text-emerald-500 text-xs">✓</span>
          <p className="text-xs font-semibold text-emerald-700 flex-1">All {reconSummary.total} reconciliation checks passing — books balanced</p>
          <span className="text-emerald-400 text-xs">→</span>
        </button>
      )}
      {pendingInvs.length > 0 && (
        <button onClick={() => setTab("invoices")} className="w-full text-left flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 transition-colors">
          <span className="text-indigo-500 mt-0.5">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-700">Payment Action Required</p>
            <p className="text-xs text-indigo-600/70 mt-0.5">
              {pendingInvs.length} invoice{pendingInvs.length > 1 ? "s" : ""} pending: {pendingInvs.map(i => i.inv_num).join(", ")} — total {$f(taconicPending)}
            </p>
          </div>
          <span className="text-indigo-500 text-sm mt-0.5">→</span>
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Project Spend" value={$f(phase11GrandTotal)} sub="All vendors · excl. prior phases" accent onClick={() => setModal("spend")} />
        <Stat label="GC Control Budget" value={$f(totalBudget)} sub="Taconic Phase 1.1" onClick={() => setTab("budget")} />
        <Stat label="GC Awarded" value={$f(totalAwarded)} sub={pf(totalAwarded / totalBudget) + " of budget"} onClick={() => setTab("awards")} />
        <Stat label="GC Paid to Date" value={$f(taconicPaid)} sub={pf(taconicPaid / totalAwarded) + " of awarded"} onClick={() => setTab("invoices")} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Approved COs" value={$f(totalCOs)} sub={changeOrders.length + " change orders"} onClick={() => setTab("cos")} />
        <Stat label="Retainage Held" value="$217,342" sub="Released at substantial completion" onClick={() => setModal("retainage")} />
        <Stat label="GC Pending" value={$f(taconicPending)} accent sub={pendingInvs.length + " invoices outstanding"} onClick={() => setTab("invoices")} />
        <Stat label="GC Balance to Finish" value="$10.14M" sub="Remaining on GC contract" onClick={() => setTab("lineitem")} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionTitle>Spend by Vendor</SectionTitle>
          <div className="space-y-3">
            {spendRows.map(v => (
              <button key={v.name} onClick={() => setModal({ type: "spendDetail", row: v })} className="w-full flex items-center gap-3 text-xs text-left hover:bg-[#f5f6f8] rounded-lg px-1 py-1 transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                <span className="text-gray-500 w-44 shrink-0 truncate">{v.name}</span>
                <div className="flex-1"><BarFill value={v.paid} max={grandTotalPaid} color={v.color} /></div>
                <span className="text-gray-800 font-semibold tabular-nums w-24 text-right">{$f(v.paid)}</span>
              </button>
            ))}
            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
              <span className="text-xs font-semibold text-gray-400">Grand Total</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{$f(phase11GrandTotal)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Phase 1.1 Budget vs. Awarded by Category</SectionTitle>
          <div className="space-y-2">
            {Object.entries(catBudget).sort((a, b) => b[1] - a[1]).map(([cat, bud]) => {
              const awd = awards.filter(a => budget.find(b => b.code === a.code)?.cat === cat).reduce((s, a) => s + parseFloat(a.current_amount), 0);
              return (
                <button key={cat} onClick={() => setModal({ type: "catDetail", cat })} className="w-full flex items-center gap-3 text-xs text-left hover:bg-[#f5f6f8] rounded-lg px-1 py-1 transition-colors">
                  <span className="text-gray-400 w-20 shrink-0">{cat}</span>
                  <div className="flex-1"><BarFill value={awd} max={bud} /></div>
                  <span className="text-gray-400 tabular-nums w-20 text-right">{$f(bud)}</span>
                  <span className="text-gray-400 w-12 text-right">{awd > 0 ? pf(awd / bud) : "—"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Project Details</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-50">
          {/* Left column */}
          <div className="divide-y divide-gray-50">
            {[
              ["Project",            "Camp Forestmere"],
              ["Owner",              "JXM / Camp Forestmere Corp."],
              ["Location",           "Paul Smiths, NY 12970"],
              ["General Contractor", "Taconic Builders Inc."],
              ["Contract Start",     "Jun 23, 2025"],
              ["Contract Duration",  "22 months"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-gray-400">{k}</span>
                <span className="text-xs font-semibold text-gray-800 text-right ml-4">{v}</span>
              </div>
            ))}
          </div>
          {/* Right column */}
          <div className="divide-y divide-gray-50">
            {[
              ["Est. Completion",    "April 2027"],
              ["Project Manager",    "Joseph Hamilton"],
              ["Architect",          "Architecturefirm"],
              ["Landscape Arch.",    "Reed Hilderbrand"],
              ["Civil Engineer",     "Ivan Zdrahal PE"],
              ["Project #",          "C25-104"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-gray-400">{k}</span>
                <span className="text-xs font-semibold text-gray-800 text-right ml-4">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal === "spend" && (
        <Modal title="Total Project Spend" subtitle="All vendors · prior phases excluded (coming soon)" onClose={() => setModal(null)}>
          <table className="w-full text-xs">
            <thead><tr><TH>Vendor / Phase</TH><TH right>Paid to Date</TH><TH right>% of Total</TH></tr></thead>
            <tbody>
              {spendRows.map(v => (
                <TR key={v.name}><TD bold className="text-gray-800">{v.name}</TD><TD right bold>{$f(v.paid)}</TD><TD right muted>{phase11GrandTotal > 0 ? pf(v.paid / phase11GrandTotal) : "—"}</TD></TR>
              ))}
            </tbody>
            <tfoot><TR subtle><TD bold colSpan={1} className="text-gray-600">Phase 1.1 Total</TD><TD right bold className="text-gray-900">{$f(phase11GrandTotal)}</TD><TD right muted>100%</TD></TR></tfoot>
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
              {budget.filter(b => b.cat === modal.cat).map(b => {
                const awd = awardedByCode[b.code] || 0;
                return (
                  <TR key={b.code}>
                    <TD mono muted>{b.code}</TD>
                    <TD className="text-gray-600">{b.name}</TD>
                    <TD right muted>{$f(b.budget)}</TD>
                    <TD right bold className={awd ? "text-gray-900" : "text-gray-300"}>{awd ? $f(awd) : "—"}</TD>
                    <TD right className={awd ? (b.budget - awd < 0 ? "text-red-500 font-semibold" : "text-emerald-600") : "text-gray-300"}>{awd ? $f(b.budget - awd) : "—"}</TD>
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

// ─── CONTROL BUDGET ───────────────────────────────────────────────────────────
function BudgetView({ setTab }) {
  const { budget, awards, awardedByCode, changeOrders, totalBudget, totalAwarded } = useAppData();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const cats = ["All", ...Array.from(new Set(budget.map(b => b.cat)))];
  const rows = budget.filter(b => (cat === "All" || b.cat === cat) && (b.name.toLowerCase().includes(q.toLowerCase()) || b.code.includes(q)));

  // Contract summary figures (matching Taconic contract)
  const ORIGINAL_CONTRACT  = 13093419.47;
  const GC_FEE_PCT         = 0.135;
  const INSURANCE_PCT      = 0.03;
  const constructionBudget = budget.reduce((s,b) => s + parseFloat(b.budget), 0);
  // Back-calculate construction sub-total from contract
  const constructionSub    = 9376094.20;
  const generalConditions  = 1823957;
  const gcFee              = constructionBudget * GC_FEE_PCT / (1 + GC_FEE_PCT + INSURANCE_PCT);
  const insurance          = constructionBudget * INSURANCE_PCT / (1 + GC_FEE_PCT + INSURANCE_PCT);
  const totalCOs           = changeOrders.reduce((s,c) => s + parseFloat(c.approved_co||0), 0);
  const totalCOsWithFees   = changeOrders.reduce((s,c) => s + parseFloat(c.total||0), 0);
  const revisedContract    = ORIGINAL_CONTRACT + totalCOsWithFees;

  const inp = "bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400";

  return (
    <div className="space-y-5">
      {/* Contract Summary - always visible, all clickable */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Contract Summary</h3>
        </div>
        <table className="w-full">
          <tbody>
            {[
              { label: "Construction Trades",      amount: constructionSub,   note: "51 line items · click to view", action: () => { setCat("All"); setQ(""); document.getElementById("budget-line-items")?.scrollIntoView({behavior:"smooth"}); } },
              { label: "General Conditions",       amount: generalConditions, note: "01-000 · click to view",        action: () => setModal({type:"gc"}) },
              { label: "GC Fee (13.5%)",           amount: 1512006.87,        note: "On construction cost",          action: () => setModal({type:"fee"}) },
              { label: "Insurance (3.0%)",         amount: 381361.73,         note: "On construction cost",          action: () => setModal({type:"ins"}) },
              { label: "Original Contract Amount", amount: ORIGINAL_CONTRACT, note: "Signed Jun 23, 2025",           action: () => setModal({type:"orig"}), subtotal: true },
              { label: "Approved Change Orders",   amount: totalCOsWithFees,  note: `${changeOrders.length} COs · click to view`, action: () => setTab && setTab("cos"), accent: true },
              { label: "Revised Contract Amount",  amount: revisedContract,   note: "Current contract value",        action: () => setModal({type:"revised"}), subtotal: true },
            ].map((row, i) => (
              <tr key={i}
                onClick={row.action}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderTop: row.subtotal ? "2px solid #e5e7eb" : "1px solid #f3f4f6" }}
              >
                <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: row.subtotal ? 700 : 500, color: row.subtotal ? "#111827" : "#374151" }}>
                  {row.label}
                  <span className="ml-1 text-gray-300 text-xs">→</span>
                </td>
                <td className="px-5 py-3.5 text-right" style={{ fontSize: 12, color: "#9ca3af" }}>{row.note}</td>
                <td className="px-5 py-3.5 text-right" style={{ fontSize: 13, fontWeight: row.subtotal ? 700 : 600, color: row.accent ? "#4f46e5" : row.subtotal ? "#111827" : "#374151" }}>
                  {row.accent && totalCOsWithFees > 0 ? "+" : ""}{$f(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Line items detail */}
      <div id="budget-line-items" className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className={cx(inp, "w-44")} />
        <div className="flex flex-wrap gap-1">
          {cats.map(c => <button key={c} onClick={() => setCat(c)} className={cx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", cat === c ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-800")}>{c}</button>)}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>Code</TH><TH>Division</TH><TH right>Budget</TH><TH right>Awarded</TH><TH right>Variance</TH><TH className="w-32">% Awarded</TH><TH>Status</TH></tr></thead>
          <tbody>
            {rows.map(b => {
              const awd = awardedByCode[b.code] || 0;
              const vari = parseFloat(b.budget) - awd;
              const ap = parseFloat(b.budget) > 0 ? awd / parseFloat(b.budget) : 0;
              return (
                <TR key={b.code} onClick={() => setModal({type:"line",data:b})}>
                  <TD mono muted>{b.code}</TD>
                  <TD bold className="text-gray-800">{b.name}</TD>
                  <TD right muted>{$f(b.budget)}</TD>
                  <TD right bold className={awd > 0 ? "text-gray-900" : "text-gray-300"}>{awd > 0 ? $f(awd) : "—"}</TD>
                  <TD right className={awd > 0 ? (vari < 0 ? "text-red-500 font-semibold" : "text-emerald-600 font-medium") : "text-gray-300"}>{awd > 0 ? $f(vari) : "—"}</TD>
                  <TD>{awd > 0 && <div className="flex items-center gap-2"><BarFill value={awd} max={parseFloat(b.budget)} /><span className="text-gray-400 text-xs w-10">{pf(ap)}</span></div>}</TD>
                  <TD>{awd === 0 ? <Tag text="Not Awarded" /> : ap > 1.05 ? <Tag text="Over Budget" color="red" /> : <Tag text="Awarded" color="green" />}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD bold colSpan={2} className="text-gray-500">Total — {rows.length} items</TD>
              <TD right bold muted>{$f(rows.reduce((s, b) => s + parseFloat(b.budget), 0))}</TD>
              <TD right bold className="text-gray-900">{$f(rows.reduce((s, b) => s + (awardedByCode[b.code] || 0), 0))}</TD>
              <TD colSpan={3} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal?.type === "line" && modal.data && (
        <Modal title={`${modal.data.code} — ${modal.data.name}`} subtitle={`Category: ${modal.data.cat}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CSI Code", modal.data.code], ["Category", modal.data.cat],
            ["Control Budget", $f(modal.data.budget)], ["Awarded", $f(awardedByCode[modal.data.code] || 0)],
            ["Variance", $f(parseFloat(modal.data.budget) - (awardedByCode[modal.data.code] || 0))],
            ["% Awarded", awardedByCode[modal.data.code] ? pf(awardedByCode[modal.data.code] / parseFloat(modal.data.budget)) : "—"],
          ]} />
          {awards.filter(a => a.code === modal.data.code).length > 0 && (
            <>
              <SectionTitle>Awards for this line</SectionTitle>
              <table className="w-full text-xs">
                <thead><tr><TH>ID</TH><TH>Vendor</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH></tr></thead>
                <tbody>
                  {awards.filter(a => a.code === modal.data.code).map(a => (
                    <TR key={a.id}>
                      <TD mono className="text-indigo-600">{a.id}</TD>
                      <TD className="text-gray-600">{a.vendor}</TD>
                      <TD right muted>{$f(a.award_amount)}</TD>
                      <TD right className={parseFloat(a.co_amount) > 0 ? "text-indigo-600" : "text-gray-300"}>{parseFloat(a.co_amount) > 0 ? `+${$f(a.co_amount)}` : "—"}</TD>
                      <TD right bold className="text-gray-900">{$f(a.current_amount)}</TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
      {modal?.type === "revised" && (
        <Modal title="Revised Contract Amount" subtitle="Original contract + all approved change orders" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Original Contract", $f(ORIGINAL_CONTRACT)],
            ["Approved COs (net)", $f(totalCOs)],
            ["CO Fees & Insurance", $f(totalCOsWithFees - totalCOs)],
            ["Total COs incl. Fees", `+${$f(totalCOsWithFees)}`],
            ["Revised Contract", $f(revisedContract)],
          ]} />
        </Modal>
      )}
      {modal?.type === "orig" && (
        <Modal title="Original Contract Amount" subtitle="Taconic Builders · Signed Jun 23, 2025" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Construction Trades", $f(constructionSub)],
            ["General Conditions (01-000)", $f(generalConditions)],
            ["Subtotal (Trades + GC)", $f(constructionSub + generalConditions)],
            ["GC Fee (13.5%)", $f(1512006.87)],
            ["Insurance (3.0%)", $f(381361.73)],
            ["Original Contract Total", $f(ORIGINAL_CONTRACT)],
            ["Contract Date", "June 23, 2025"],
            ["Duration", "22 months"],
            ["Est. Completion", "April 2027"],
          ]} />
        </Modal>
      )}
      {modal?.type === "fee" && (
        <Modal title="GC Fee — 13.5%" subtitle="Applied to all construction trades and general conditions" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Fee Rate", "13.5%"],
            ["Applied To", "Construction trades + GC"],
            ["Base Amount", $f(constructionSub + generalConditions)],
            ["Fee Amount", $f(1512006.87)],
            ["Note", "Fee is fixed per signed contract — does not fluctuate with buyout savings unless negotiated via CO"],
          ]} />
        </Modal>
      )}
      {modal?.type === "ins" && (
        <Modal title="Insurance — 3.0%" subtitle="Builder's risk and liability insurance" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Insurance Rate", "3.0%"],
            ["Applied To", "Construction trades + GC"],
            ["Base Amount", $f(constructionSub + generalConditions)],
            ["Insurance Amount", $f(381361.73)],
            ["Note", "Fixed per signed contract"],
          ]} />
        </Modal>
      )}
      {modal?.type === "gc" && (
        <Modal title="General Conditions — 01-000" subtitle="Project overhead and site management" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CSI Code", "01-000"],
            ["Budget", $f(generalConditions)],
            ["% of Construction", "15.28%"],
            ["Includes", "Project staffing, site trailer, temp utilities, safety, insurance admin"],
            ["GC", "Taconic Builders Inc."],
          ]} />
          <SectionTitle>What this covers</SectionTitle>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Joseph Hamilton — Project Manager</p>
            <p>• Robert Noto — Site Supervisor</p>
            <p>• Liam Hanley — Assistant PM</p>
            <p>• Site trailer, porta-potties, storage containers</p>
            <p>• Verizon, utilities, snow removal, fuel</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── AWARDS ───────────────────────────────────────────────────────────────────
function AwardsView() {
  const { awards, budget } = useAppData();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const rows = awards.filter(a =>
    a.vendor.toLowerCase().includes(q.toLowerCase()) ||
    a.id.toLowerCase().includes(q.toLowerCase()) ||
    a.code.includes(q)
  );
  const vendorTotals = awards.reduce((acc, a) => { acc[a.vendor] = (acc[a.vendor] || 0) + parseFloat(a.current_amount); return acc; }, {});

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionTitle>Totals by Subcontractor</SectionTitle>
        <div className="grid md:grid-cols-2 gap-2">
          {Object.entries(vendorTotals).sort((a, b) => b[1] - a[1]).map(([v, t]) => (
            <button key={v} onClick={() => setModal({ type: "vendor", vendor: v })} className="flex justify-between items-center bg-[#f5f6f8] hover:bg-indigo-50 rounded-lg px-3 py-2.5 transition-colors text-left">
              <span className="text-xs font-medium text-gray-600 truncate">{v}</span>
              <span className="text-xs font-bold tabular-nums text-gray-900 ml-3 shrink-0">{$f(t)}</span>
            </button>
          ))}
        </div>
      </Card>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search vendor, ID, or code…" className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder-zinc-400 outline-none focus:border-indigo-400 w-60 shadow-sm" />
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>ID</TH><TH>Date</TH><TH>Vendor</TH><TH>Division</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH><TH right>Budget</TH><TH right>Variance</TH></tr></thead>
          <tbody>
            {rows.map(a => {
              const bAmt = parseFloat(budget.find(b => b.code === a.code)?.budget);
              const vari = bAmt != null ? bAmt - parseFloat(a.current_amount) : null;
              return (
                <TR key={a.id} onClick={() => setModal({ type: "award", award: a })}>
                  <TD mono className="text-indigo-600">{a.id}</TD>
                  <TD muted>{a.award_date}</TD>
                  <TD bold className="text-gray-800 max-w-[160px] truncate">{a.vendor}</TD>
                  <TD muted className="max-w-[120px] truncate">{a.division}</TD>
                  <TD right muted>{$f(a.award_amount)}</TD>
                  <TD right className={parseFloat(a.co_amount) > 0 ? "text-indigo-600 font-medium" : "text-gray-300"}>{parseFloat(a.co_amount) > 0 ? `+${$f(a.co_amount)}` : "—"}</TD>
                  <TD right bold className="text-gray-900">{$f(a.current_amount)}</TD>
                  <TD right muted>{bAmt ? $f(bAmt) : "—"}</TD>
                  <TD right className={vari != null ? (vari < 0 ? "text-red-500 font-semibold" : "text-emerald-600 font-medium") : "text-gray-300"}>{vari != null ? $f(vari) : "—"}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={4} bold muted>Total ({rows.length})</TD>
              <TD right muted bold>{$f(rows.reduce((s, a) => s + parseFloat(a.award_amount), 0))}</TD>
              <TD right className="text-indigo-600 font-bold">+{$f(rows.reduce((s, a) => s + parseFloat(a.co_amount), 0))}</TD>
              <TD right bold className="text-gray-900">{$f(rows.reduce((s, a) => s + parseFloat(a.current_amount), 0))}</TD>
              <TD colSpan={2} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal?.type === "award" && (
        <Modal title={`${modal.award.id} — ${modal.award.vendor}`} subtitle={modal.award.division} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Award ID", modal.award.id], ["Date", modal.award.award_date],
            ["Vendor", modal.award.vendor], ["Division", modal.award.division],
            ["CSI Code", modal.award.code], ["Description", modal.award.description],
            ["Original Award", $f(modal.award.award_amount)], ["Change Orders", parseFloat(modal.award.co_amount) > 0 ? `+${$f(modal.award.co_amount)}` : "—"],
            ["Current Contract", $f(modal.award.current_amount)],
            ["Budget Line", $f(budget.find(b => b.code === modal.award.code)?.budget)],
            ["Variance", $f((parseFloat(budget.find(b => b.code === modal.award.code)?.budget) || 0) - parseFloat(modal.award.current_amount))],
          ]} />
        </Modal>
      )}
      {modal?.type === "vendor" && (
        <Modal title={modal.vendor} subtitle={`${awards.filter(a => a.vendor === modal.vendor).length} awards`} onClose={() => setModal(null)} wide>
          <table className="w-full text-xs">
            <thead><tr><TH>ID</TH><TH>Division</TH><TH>Description</TH><TH right>Award</TH><TH right>Current</TH></tr></thead>
            <tbody>
              {awards.filter(a => a.vendor === modal.vendor).map(a => (
                <TR key={a.id}>
                  <TD mono className="text-indigo-600">{a.id}</TD>
                  <TD className="text-gray-600">{a.division}</TD>
                  <TD muted className="max-w-xs">{a.description}</TD>
                  <TD right muted>{$f(a.award_amount)}</TD>
                  <TD right bold className="text-gray-900">{$f(a.current_amount)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

// ─── CHANGE ORDERS ────────────────────────────────────────────────────────────
// ─── CO FILE UPLOAD (reusable, same as Documents tab) ────────────────────────
function COFileUpload({ coNo, onUploaded }) {
  const { refresh } = useAppData();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") return;
    setFile(f); setDone(false);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    fd.append("type", "Change Order");
    fd.append("vendor_key", "taconic");
    fd.append("vendor_label", "Taconic Builders");
    fd.append("linked_id", coNo || "");
    fd.append("note", coNo ? `Supporting document for ${coNo}` : "");
    await fetch("/api/documents", { method: "POST", body: fd });
    await refresh();
    setDone(true); setFile(null); setUploading(false);
    onUploaded && onUploaded();
  };

  if (done) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center justify-between">
      ✓ PDF saved to Documents
      <button onClick={() => setDone(false)} className="text-emerald-400 hover:text-emerald-600 ml-2">Upload another</button>
    </div>
  );

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm">📄</span>
          <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
          <button onClick={upload} disabled={uploading}
            className="px-3 py-1 text-xs font-bold rounded-lg text-white"
            style={{ background: uploading ? "#9ca3af" : "#111827" }}>
            {uploading ? "Saving..." : "Save →"}
          </button>
          <button onClick={() => setFile(null)} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragOver ? "#6366f1" : "#e5e7eb", background: dragOver ? "#eef2ff" : "#fafafa" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <p className="text-xs text-gray-400">Drop CO PDF here or click to browse</p>
          <p className="text-xs text-gray-300 mt-0.5">Saved to Documents tab automatically</p>
        </div>
      )}
    </div>
  );
}

function COsView() {
  const { changeOrders, refresh } = useAppData();
  const [modal, setModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ no:"", code:"", div:"", origBudget:"", approvedCO:"", notes:"", date:"" });

  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400";

  const openEdit = (co) => { setEditForm({ no:co.no, code:co.code, div:co.div, origBudget:co.orig_budget, approvedCO:co.approved_co, notes:co.notes||"", date:co.co_date }); setEditModal(co); };

  const saveEdit = async () => {
    if (saving) return; setSaving(true);
    const amt = parseFloat(editForm.approvedCO) || 0;
    const fees = amt * 0.135; const ins = amt * 0.03;
    await apiFetch(`/change-orders/${editModal.no}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ code:editForm.code, div:editForm.div, origBudget:parseFloat(editForm.origBudget)||0, approvedCO:amt, fees, total:amt+fees+ins, revisedBudget:(parseFloat(editForm.origBudget)||0)+amt+fees+ins, notes:editForm.notes, date:editForm.date })
    });
    await refresh(); setEditModal(null); setSaving(false);
  };

  const deleteCO = async (no) => {
    if (!confirm(`Delete ${no}?`)) return;
    await apiFetch(`/change-orders/${no}`, { method:'DELETE' });
    await refresh();
  };

  const saveAdd = async () => {
    if (saving || !addForm.no || !addForm.approvedCO) return; setSaving(true);
    const amt = parseFloat(addForm.approvedCO) || 0;
    const fees = amt * 0.135; const ins = amt * 0.03;
    await apiFetch('/change-orders', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ no:addForm.no, code:addForm.code, div:addForm.div, origBudget:parseFloat(addForm.origBudget)||0, approvedCO:amt, fees, total:amt+fees+ins, revisedBudget:(parseFloat(addForm.origBudget)||0)+amt+fees+ins, notes:addForm.notes, date:addForm.date })
    });
    await refresh(); setAddModal(false); setAddForm({ no:"", code:"", div:"", origBudget:"", approvedCO:"", notes:"", date:"" }); setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total COs" value={String(changeOrders.length)} sub="All approved" onClick={() => {}} />
        <Stat label="Net CO Amount" value={$f(changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0))} sub="Before fees" accent onClick={() => {}} />
        <Stat label="Total incl. Fees" value={$f(changeOrders.reduce((s, c) => s + parseFloat(c.total||0), 0))} sub="13.5% fee + 3% ins." onClick={() => {}} />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setAddModal(true)} className="px-4 py-2 text-xs font-bold rounded-lg text-white" style={{background:"#111827"}}>+ Add Change Order</button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>CO #</TH><TH>Date</TH><TH>CSI Code</TH><TH>Division</TH><TH right>Orig. Budget</TH><TH right>CO Amount</TH><TH right>Fees</TH><TH right>Total w/ Fees</TH><TH right>Revised Budget</TH><TH>Actions</TH></tr></thead>
          <tbody>
            {changeOrders.map(co => (
              <TR key={co.no} onClick={() => setModal(co)}>
                <TD mono className="text-indigo-600 font-bold">{co.no}</TD>
                <TD muted>{co.co_date}</TD>
                <TD mono muted>{co.code}</TD>
                <TD bold className="text-gray-800 max-w-[140px] truncate">{co.div}</TD>
                <TD right muted>{$f(co.orig_budget)}</TD>
                <TD right className={parseFloat(co.approved_co)<0?"text-emerald-600 font-bold":"text-indigo-600 font-bold"}>{parseFloat(co.approved_co)<0?$f(co.approved_co):`+${$f(co.approved_co)}`}</TD>
                <TD right muted>{$f(co.fees)}</TD>
                <TD right bold className="text-gray-800">{parseFloat(co.total)<0?$f(co.total):`+${$f(co.total)}`}</TD>
                <TD right className="text-gray-600">{$f(co.revised_budget)}</TD>
                <TD onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(co)} className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors">Edit</button>
                    <button onClick={() => deleteCO(co.no)} className="text-xs px-2 py-1 text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={5} bold muted>Totals</TD>
              <TD right className="text-indigo-600 font-bold">+{$f(changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0))}</TD>
              <TD right muted bold>{$f(changeOrders.reduce((s, c) => s + parseFloat(c.fees||0), 0))}</TD>
              <TD right bold className="text-gray-900">+{$f(changeOrders.reduce((s, c) => s + parseFloat(c.total||0), 0))}</TD>
              <TD colSpan={2} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {/* Detail modal */}
      {modal && typeof modal === "object" && modal.no && (
        <Modal title={`${modal.no} — ${modal.div}`} subtitle={`Approved ${modal.co_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CO Number", modal.no], ["Date", modal.co_date], ["CSI Code", modal.code], ["Division", modal.div],
            ["Original Budget", $f(modal.orig_budget)], ["CO Amount", `${parseFloat(modal.approved_co)<0?"":"+"}${$f(modal.approved_co)}`],
            ["GC Fee (13.5%)", $f(parseFloat(modal.approved_co) * 0.135)], ["Insurance (3%)", $f(parseFloat(modal.approved_co) * 0.03)],
            ["Total incl. Fees", `${parseFloat(modal.total)<0?"":"+"}${$f(modal.total)}`], ["Revised Budget", $f(modal.revised_budget)],
            ["Notes", modal.notes || "—"],
          ]} />
        </Modal>
      )}

      {/* Edit modal */}
      {editModal && (
        <Modal title={`Edit ${editModal.no}`} onClose={() => setEditModal(null)} wide>
          <div className="grid grid-cols-2 gap-3">
            {[["CO #","no"],["Date","date"],["CSI Code","code"],["Division","div"],["Original Budget","origBudget"],["CO Amount","approvedCO"],["Notes","notes"]].map(([lbl,key]) => (
              <div key={key} className={key==="div"||key==="notes"?"col-span-2":""}>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{lbl}</label>
                <input value={editForm[key]||""} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))} className={inp} />
              </div>
            ))}
          </div>
          {/* PDF Upload — same as Documents tab */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">Attach / Replace PDF</label>
            <COFileUpload coNo={editModal.no} onUploaded={() => {}} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400">
            Fees will auto-calculate: 13.5% GC fee + 3% insurance on CO amount.
          </div>
          <button onClick={saveEdit} disabled={saving} className="w-full py-2.5 text-sm font-bold rounded-lg text-white transition-colors" style={{background:"#111827"}}>{saving?"Saving...":"Save Changes"}</button>
        </Modal>
      )}

      {/* Add modal */}
      {addModal && (
        <Modal title="Add Change Order" onClose={() => setAddModal(false)} wide>
          <div className="grid grid-cols-2 gap-3">
            {[["CO #","no"],["Date","date"],["CSI Code","code"],["Division","div"],["Original Budget","origBudget"],["CO Amount","approvedCO"],["Notes","notes"]].map(([lbl,key]) => (
              <div key={key} className={key==="div"||key==="notes"?"col-span-2":""}>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">{lbl}</label>
                <input value={addForm[key]||""} onChange={e=>setAddForm(f=>({...f,[key]:e.target.value}))} className={inp} />
              </div>
            ))}
          </div>
          {/* PDF Upload — same as Documents tab */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">Attach PDF (optional)</label>
            <COFileUpload coNo={addForm.no} onUploaded={() => {}} />
          </div>
          <button onClick={saveAdd} disabled={saving||!addForm.no||!addForm.approvedCO} className="w-full py-2.5 text-sm font-bold rounded-lg text-white" style={{background:saving||!addForm.no||!addForm.approvedCO?"#e5e7eb":"#111827",color:saving||!addForm.no||!addForm.approvedCO?"#9ca3af":"#fff"}}>{saving?"Saving...":"Add Change Order"}</button>
        </Modal>
      )}
    </div>
  );
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
function InvoicesView() {
  const { invoices, taconicPaid, taconicPending, refresh } = useAppData();
  const [modal, setModal] = useState(null);
  const [markPaidModal, setMarkPaidModal] = useState(null);
  const [payForm, setPayForm] = useState({ actualPaid:"", creditApplied:"", paidDate:"" });
  const [creditData, setCreditData] = useState(null);

  useEffect(() => {
    apiFetch('/credit-balance').then(d => setCreditData(d)).catch(() => {});
  }, [invoices]);

  const openMarkPaid = (inv) => {
    setMarkPaidModal(inv);
    setPayForm({ actualPaid: String(inv.approved), creditApplied:"0", paidDate: new Date().toLocaleDateString("en-US") });
    setModal(null);
  };

  const submitMarkPaid = async () => {
    const wire = parseFloat(payForm.actualPaid)||0;
    const credit = parseFloat(payForm.creditApplied)||0;
    const approved = parseFloat(markPaidModal.approved)||0;
    const isFullyPaid = (wire + credit) >= approved - 1;
    await apiFetch(`/invoices/${markPaidModal.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        status: isFullyPaid ? 'Paid' : 'Pending Payment',
        paidDate: isFullyPaid ? payForm.paidDate : null,
        notes: markPaidModal.notes,
        actualPaid: wire || null,
        creditApplied: credit || null
      })
    });
    await refresh(); setMarkPaidModal(null);
  };

  const retainageHeld = invoices.reduce((s,i) => s + Math.abs(parseFloat(i.retainage||0)), 0);
  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400";

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Total Approved" value={$f(invoices.reduce((s,i)=>s+parseFloat(i.approved),0))} sub={`${invoices.length} invoices`} />
        <Stat label="Total Paid" value={$f(taconicPaid)} sub={`${invoices.filter(i=>i.status==="Paid").length} paid`} />
        <Stat label="Retainage Held" value={$f(retainageHeld)} sub="Released at completion" />
        <Stat label="Outstanding" value={$f(taconicPending)} accent sub={`${invoices.filter(i=>i.status!=="Paid").length} pending`} />
      </div>

      {creditData?.creditBalance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-blue-500">↩</span>
          <div>
            <p className="text-sm font-semibold text-blue-700">Credit Balance: {$f(creditData.creditBalance)}</p>
            <p className="text-xs text-blue-500 mt-0.5">Credit on account — being applied against outstanding invoices</p>
          </div>
        </div>
      )}

      {/* Invoice table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <TH>ID</TH><TH>Invoice #</TH><TH>Period</TH><TH right>Job Total</TH>
              <TH right>Fees</TH><TH right>Deposit</TH><TH right>Retainage</TH>
              <TH right>Approved</TH><TH right>Wire Sent</TH><TH>Paid Date</TH><TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const overpaid = parseFloat(inv.actual_paid||0) > parseFloat(inv.approved||0);
              const usedCredit = parseFloat(inv.credit_applied||0) > 0;
              return (
                <TR key={inv.id} onClick={() => setModal(inv)}>
                  <TD mono className="text-indigo-600 font-bold">{inv.id}</TD>
                  <TD mono bold className="text-gray-800">{inv.inv_num}</TD>
                  <TD muted className="max-w-[140px] truncate">{inv.description}</TD>
                  <TD right muted>{$f(inv.job_total)}</TD>
                  <TD right muted>{$f(inv.fees)}</TD>
                  <TD right className="text-gray-400">{inv.deposit_applied ? $f(Math.abs(parseFloat(inv.deposit_applied))) : "—"}</TD>
                  <TD right className="text-gray-400">{inv.retainage ? $f(Math.abs(parseFloat(inv.retainage))) : "—"}</TD>
                  <TD right bold className="text-gray-900">{$f(inv.approved)}</TD>
                  <TD right className={overpaid?"text-red-500 font-bold":usedCredit?"text-blue-500":"text-gray-300"}>
                    {overpaid ? $f(inv.actual_paid) : usedCredit ? "↩ Credit" : "—"}
                  </TD>
                  <TD muted>{inv.paid_date || "—"}</TD>
                  <TD>{statusTag(inv.status)}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD bold colSpan={3} muted>Totals</TD>
              <TD right bold muted>{$f(invoices.reduce((s,i)=>s+parseFloat(i.job_total),0))}</TD>
              <TD right bold muted>{$f(invoices.reduce((s,i)=>s+parseFloat(i.fees||0),0))}</TD>
              <TD right bold muted>{$f(invoices.reduce((s,i)=>s+Math.abs(parseFloat(i.deposit_applied||0)),0))}</TD>
              <TD right bold muted>{$f(invoices.reduce((s,i)=>s+Math.abs(parseFloat(i.retainage||0)),0))}</TD>
              <TD right bold className="text-gray-900">{$f(invoices.reduce((s,i)=>s+parseFloat(i.approved),0))}</TD>
              <TD colSpan={3} />
            </TR>
          </tfoot>
        </table>
      </Card>

      {/* Detail modal */}
      {modal && typeof modal === "object" && modal.id && (
        <Modal title={`${modal.inv_num} — ${modal.description}`} subtitle={`${modal.id} · Requested ${modal.req_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Invoice Number", modal.inv_num], ["Request Date", modal.req_date],
            ["Paid Date", modal.paid_date||"—"], ["Status", modal.status],
            ["Job Total", $f(modal.job_total)], ["GC Fees", $f(modal.fees)],
            ["Deposit Applied", modal.deposit_applied ? $f(Math.abs(parseFloat(modal.deposit_applied))) : "—"],
            ["Retainage Held", $f(Math.abs(parseFloat(modal.retainage||0)))],
            ["Amount Due", $f(modal.amt_due)], ["Approved Amount", $f(modal.approved)],
            parseFloat(modal.actual_paid||0) > 0 ? ["Actual Wire Sent", $f(modal.actual_paid)] : null,
            parseFloat(modal.credit_applied||0) > 0 ? ["Credit Applied", $f(modal.credit_applied)] : null,
          ]} />
          {modal.notes && (
            <div className={`border rounded-lg px-4 py-3 ${parseFloat(modal.actual_paid||0) > parseFloat(modal.approved||0) ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-xs text-gray-600">{modal.notes}</p>
            </div>
          )}
          <div className="flex gap-2">
            {modal.status !== "Paid" && (
              <button onClick={() => openMarkPaid(modal)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">Mark as Paid</button>
            )}
            <button onClick={() => { setMarkPaidModal(modal); setPayForm({ actualPaid: String(modal.actual_paid||modal.approved), creditApplied: String(modal.credit_applied||0), paidDate: modal.paid_date||new Date().toLocaleDateString("en-US") }); setModal(null); }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors">
              {modal.status === "Paid" ? "Edit Payment Info" : "Edit Payment"}
            </button>
            <button onClick={() => setModal(null)} className="px-4 py-2.5 border border-gray-200 text-gray-400 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors">Close</button>
          </div>
        </Modal>
      )}

      {markPaidModal && (
        <Modal title={`Mark as Paid — ${markPaidModal.inv_num}`} subtitle={`Approved: ${$f(markPaidModal.approved)}`} onClose={() => setMarkPaidModal(null)}>
          <div className="space-y-3">
            {creditData?.creditBalance > 0 && <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-600 font-semibold">↩ Available credit: {$f(creditData.creditBalance)}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Wire Sent ($)</label><input value={payForm.actualPaid} onChange={e=>setPayForm(f=>({...f,actualPaid:e.target.value}))} className={inp} /></div>
              <div><label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Credit Applied ($)</label><input value={payForm.creditApplied} onChange={e=>setPayForm(f=>({...f,creditApplied:e.target.value}))} className={inp} /></div>
              <div className="col-span-2"><label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Payment Date</label><input value={payForm.paidDate} onChange={e=>setPayForm(f=>({...f,paidDate:e.target.value}))} className={inp} /></div>
            </div>
            {(() => {
              const wire = parseFloat(payForm.actualPaid)||0;
              const credit = parseFloat(payForm.creditApplied)||0;
              const total = wire + credit;
              const approved = parseFloat(markPaidModal.approved)||0;
              const diff = total - approved;
              const outstanding = approved - total;
              const isBalanced = Math.abs(diff) < 1;
              const isPartial = outstanding > 1;
              const isOver = diff > 1;
              return (
                <div className={`rounded-lg px-3 py-2 text-xs font-medium border ${isBalanced?"bg-emerald-50 border-emerald-200 text-emerald-700":isOver?"bg-red-50 border-red-200 text-red-600":"bg-blue-50 border-blue-200 text-blue-700"}`}>
                  {isBalanced && "✓ Fully paid — balanced"}
                  {isPartial && `↩ Partial payment — ${$f(outstanding)} will remain outstanding`}
                  {isOver && `⚠ Wire + Credit exceeds approved by ${$f(diff)}`}
                </div>
              );
            })()}
            <button onClick={submitMarkPaid} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg">Confirm Payment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── LINE ITEM BILLING ────────────────────────────────────────────────────────
function LineItemView() {
  const { lineItems, INV_NUMS, refresh } = useAppData();
  const [sel, setSel] = useState("All");
  const [modal, setModal] = useState(null);
  const [editingBilling, setEditingBilling] = useState(null); // {code, invNum, amount}
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = sel === "All" ? lineItems : lineItems.filter(li => li.inv && li.inv[sel] != null && li.inv[sel] !== 0);
  const totalBudget = rows.reduce((s,li) => s + li.budget, 0);
  const totalCOs    = rows.reduce((s,li) => s + li.cos, 0);
  const totalDone   = rows.reduce((s,li) => s + li.done, 0);

  const saveBilling = async () => {
    if (!editingBilling || saving) return;
    setSaving(true);
    const { code, invNum } = editingBilling;
    const amount = parseFloat(editVal) || 0;
    if (amount === 0) {
      // Delete the billing
      await apiFetch(`/line-item-billings/${encodeURIComponent(code)}/${encodeURIComponent(invNum)}`, { method: 'DELETE' });
    } else {
      // Upsert
      await apiFetch('/line-item-billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, invNum, amount })
      });
    }
    await refresh();
    setEditingBilling(null);
    setSaving(false);
  };

  const inp = "bg-white border border-indigo-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 w-28 text-right";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Control Budget" value={$f(lineItems.reduce((s,l)=>s+l.budget,0))} sub={`${lineItems.length} line items`} />
        <Stat label="Completed to Date" value={$f(lineItems.reduce((s,l)=>s+l.done,0))} sub={pf(lineItems.reduce((s,l)=>s+l.done,0)/Math.max(lineItems.reduce((s,l)=>s+l.budget+l.cos,0),1)) + " of revised"} accent />
        <Stat label="Balance to Finish" value={$f(lineItems.reduce((s,l)=>s+(l.budget+l.cos-l.done),0))} sub="Remaining work" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Filter:</span>
          {["All", ...INV_NUMS].map(n => (
            <button key={n} onClick={() => setSel(n)}
              className={cx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                sel === n ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-800")}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-300">Click any amount to edit</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <TH>Code</TH><TH>Description</TH>
            <TH right>Budget</TH><TH right>COs</TH><TH right>Revised</TH>
            <TH right>Completed</TH><TH className="w-32">Progress</TH>
            <TH right>Balance</TH>
            {sel !== "All" && <TH right className="text-indigo-600">{sel}</TH>}
          </tr></thead>
          <tbody>
            {rows.map(li => {
              const rev = li.budget + li.cos;
              const bal = rev - li.done;
              const isEditing = editingBilling?.code === li.code && editingBilling?.invNum === sel;
              return (
                <TR key={li.code} onClick={() => setModal(li)}>
                  <TD muted>{li.code}</TD>
                  <TD bold className="text-gray-800">{li.name}</TD>
                  <TD right muted>{$f(li.budget)}</TD>
                  <TD right className={li.cos !== 0 ? (li.cos < 0 ? "text-emerald-600" : "text-indigo-600") : "text-gray-300"}>{li.cos !== 0 ? `${li.cos>0?"+":""}${$f(li.cos)}` : "—"}</TD>
                  <TD right muted>{$f(rev)}</TD>
                  <TD right bold className="text-gray-900">{$f(li.done)}</TD>
                  <TD><div className="flex items-center gap-2"><BarFill value={li.done} max={rev} /><span className="text-gray-400 text-xs w-10 shrink-0">{pf(li.pct)}</span></div></TD>
                  <TD right className={bal < 0 ? "text-red-500 font-bold" : "text-gray-400"}>{$f(bal)}</TD>
                  {sel !== "All" && (
                    <TD right onClick={e => { e.stopPropagation(); setEditingBilling({code:li.code, invNum:sel}); setEditVal(String(li.inv?.[sel] || "")); }}>
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                          <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                            className={inp} autoFocus
                            onKeyDown={e=>{if(e.key==="Enter")saveBilling();if(e.key==="Escape")setEditingBilling(null);}}/>
                          <button onClick={saveBilling} disabled={saving} className="text-xs px-1.5 py-1 bg-gray-900 text-white rounded">{saving?"…":"✓"}</button>
                          <button onClick={()=>setEditingBilling(null)} className="text-xs px-1.5 py-1 bg-gray-100 text-gray-500 rounded">✕</button>
                        </div>
                      ) : (
                        <span className={cx("cursor-pointer hover:text-indigo-600 transition-colors", li.inv?.[sel] ? "text-indigo-600 font-bold" : "text-gray-200 hover:text-gray-400")}>
                          {li.inv?.[sel] ? $f(li.inv[sel]) : "—"}
                        </span>
                      )}
                    </TD>
                  )}
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD bold colSpan={2} muted>Totals ({rows.length} items)</TD>
              <TD right bold muted>{$f(totalBudget)}</TD>
              <TD right bold className="text-indigo-600">{totalCOs !== 0 ? `+${$f(totalCOs)}` : "—"}</TD>
              <TD right bold muted>{$f(totalBudget + totalCOs)}</TD>
              <TD right bold className="text-gray-900">{$f(totalDone)}</TD>
              <TD /><TD right bold className="text-gray-500">{$f((totalBudget+totalCOs)-totalDone)}</TD>
              {sel !== "All" && <TD right bold className="text-indigo-600">{$f(rows.reduce((s,li)=>s+(li.inv?.[sel]||0),0))}</TD>}
            </TR>
          </tfoot>
        </table>
      </Card>

      {modal && (
        <Modal title={`${modal.code} — ${modal.name}`} subtitle="Line item billing detail" onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Control Budget", $f(modal.budget)],
            ["Approved COs", modal.cos !== 0 ? `${modal.cos>0?"+":""}${$f(modal.cos)}` : "—"],
            ["Revised Budget", $f(modal.budget + modal.cos)],
            ["Completed to Date", $f(modal.done)],
            ["% Complete", pf(modal.pct)],
            ["Balance to Finish", $f((modal.budget+modal.cos)-modal.done)],
          ]} />
          {modal.inv && Object.keys(modal.inv).length > 0 && (
            <>
              <SectionTitle>Breakdown by Invoice</SectionTitle>
              <table className="w-full text-xs">
                <thead><tr><TH>Invoice</TH><TH right>Amount Billed</TH></tr></thead>
                <tbody>
                  {Object.entries(modal.inv).filter(([,v])=>v&&v!==0).map(([invNum,amt])=>(
                    <TR key={invNum}><TD muted>{invNum}</TD><TD right bold className={parseFloat(amt)<0?"text-red-500":"text-gray-900"}>{$f(amt)}</TD></TR>
                  ))}
                  <TR subtle><TD bold muted>Total billed</TD><TD right bold className="text-gray-900">{$f(Object.values(modal.inv).filter(v=>v>0).reduce((s,v)=>s+v,0))}</TD></TR>
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── CASH FLOW ────────────────────────────────────────────────────────────────
function CashFlowView() {
  const { cashFlow } = useAppData();
  const [modal, setModal] = useState(null);
  const maxV = Math.max(...cashFlow.map(b => b.v));
  const carryoverItems = [
    ["01-001", "Project Staffing (22 months)",      296747,  656427, 953174],
    ["31-640", "Sheet Pile / Caissons",             416472,       0, 416472],
    ["31-200", "Excavations & Backfilling",         377267,       0, 377267],
    ["33-370", "Electrical Service",                314905,   78850, 393754],
    ["03-330", "Cast In Place Concrete",            264650,       0, 264650],
    ["06-200", "Ext. Finish Carpentry - Labor",     169071,  253607, 422678],
    ["32-010", "Paving (Hardscape)",                 89311,  357245, 446556],
    ["09-300", "Tile & Stone",                      245457,  163638, 409095],
  ];
  const annual = cashFlow.reduce((s, b) => s + b.v, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="2025 Carryover"      value="$4,541,872" sub="Unfinished 2025 work" accent onClick={() => setModal("carryover")} />
        <Stat label="2026 New Projected"  value="$3,902,018" sub="Newly scheduled work" onClick={() => setModal("monthly")} />
        <Stat label="Total 2026 Spend"    value="$8,443,889" sub="Carryover + new" onClick={() => setModal("monthly")} />
      </div>
      <Card className="p-5">
        <SectionTitle>2026 Monthly Projection</SectionTitle>
        <div className="flex items-end gap-1.5 h-36">
          {cashFlow.map(d => {
            const h = Math.round((d.v / maxV) * 100);
            return (
              <button key={d.m} onClick={() => setModal({ type: "month", ...d })} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-gray-400 group-hover:text-indigo-600 transition-colors leading-none" style={{ fontSize: "8px" }}>
                  {$f(d.v).replace("$", "").replace(",000", "k")}
                </span>
                <div className="w-full rounded-sm bg-gray-200 group-hover:bg-amber-400 transition-colors" style={{ height: `${h}%` }} />
                <span className="text-gray-400 leading-none" style={{ fontSize: "9px" }}>{d.m}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Top 2025 Carryover Items</span>
        </div>
        <table className="w-full">
          <thead><tr><TH>Code</TH><TH>Description</TH><TH right>2025 Carryover</TH><TH right>2026 New</TH><TH right>Grand Total</TH></tr></thead>
          <tbody>
            {carryoverItems.map(r => (
              <TR key={r[0]} onClick={() => setModal({ type: "carryoverItem", code: r[0], desc: r[1], carryover: r[2], new2026: r[3], total: r[4] })}>
                <TD mono muted>{r[0]}</TD>
                <TD bold className="text-gray-800">{r[1]}</TD>
                <TD right className="text-indigo-600 font-bold">{$f(r[2])}</TD>
                <TD right muted>{r[3] > 0 ? $f(r[3]) : "—"}</TD>
                <TD right bold className="text-gray-900">{$f(r[4])}</TD>
              </TR>
            ))}
          </tbody>
        </table>
      </Card>
      {modal?.type === "month" && (
        <Modal title={`${modal.m} 2026 — Projected Spend`} onClose={() => setModal(null)}>
          <KVGrid rows={[["Month", `${modal.m} 2026`], ["Projected Amount", $f(modal.v)], ["% of Annual Total", pf(modal.v / annual)]]} />
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

// ─── PRIOR PHASES ─────────────────────────────────────────────────────────────
function PriorPhasesView() {
  const { priorPhases } = useAppData();
  const [modal, setModal] = useState(null);
  const totalPriorPaid = priorPhases.reduce((s, p) => s + parseFloat(p.total_paid), 0);

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
          <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
          {[
            { label: "Road Construction", date: "Jan–Mid 2024", color: "#fb923c", amount: "$457,500", phase: priorPhases.find(p => p.id === "road") },
            { label: "Demolition",        date: "Jan–May 2025", color: "#f87171", amount: `${$f(priorPhases.find(p => p.id === "demolition")?.total_paid)} paid`, phase: priorPhases.find(p => p.id === "demolition") },
            { label: "Phase 1.1 (GC)",    date: "Jun 23, 2025", color: "#d97706", amount: "Ongoing" },
            { label: "Est. Completion",   date: "April 2027",   color: "#9ca3af", amount: "—" },
          ].map((item, i) => (
            <div key={i} onClick={() => item.phase && setModal(item.phase)} className={cx("flex items-start gap-4 mb-5 relative", item.phase && "cursor-pointer group")}>
              <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: item.color }} />
              <div>
                <p className={cx("text-xs font-semibold text-gray-800", item.phase && "group-hover:text-indigo-600 transition-colors")}>
                  {item.label}{item.phase && <span className="ml-1 opacity-50">→</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.date} · {item.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {priorPhases.map(phase => (
        <Card key={phase.id} className="overflow-hidden cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setModal(phase)}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{phase.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{phase.job_num} · {phase.gc} · {phase.start_date}–{phase.end_date}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-gray-900">{$f(phase.total_paid)}</p>
                <p className="text-xs text-gray-400">Total paid</p>
              </div>
              <Tag text="Complete" color="green" />
              <span className="text-gray-300">›</span>
            </div>
          </div>
        </Card>
      ))}
      {modal && typeof modal === "object" && modal.id && (
        <Modal title={modal.name} subtitle={`${modal.job_num} · ${modal.gc}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Job Number", modal.job_num], ["General Contractor", modal.gc],
            ["Subcontractor", modal.subcontractor], ["Dates", `${modal.start_date} – ${modal.end_date}`],
            ["Original Contract", $f(modal.original_contract)], ["Approved COs", $f(modal.approved_cos)],
            ["Final Contract", $f(modal.final_contract)], ["Total Paid", $f(modal.total_paid)],
          ]} />
          <div className="bg-[#f5f6f8] rounded-lg px-3 py-2.5 text-xs text-gray-500 italic">{modal.scope}</div>
          <SectionTitle>Line Items</SectionTitle>
          <table className="w-full text-xs">
            <thead><tr><TH>Code</TH><TH>Description</TH><TH right>Budget</TH><TH right>Paid</TH></tr></thead>
            <tbody>
              {modal.lineItems.map(li => (
                <TR key={li.code}>
                  <TD mono muted>{li.code}</TD>
                  <TD className="text-gray-600">{li.description}</TD>
                  <TD right muted>{$f(li.budget)}</TD>
                  <TD right bold className="text-gray-900">{$f(li.paid)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
          {modal.cos.length > 0 && (
            <>
              <SectionTitle>Change Orders</SectionTitle>
              {modal.cos.map(co => (
                <div key={co.no} className="flex justify-between items-center bg-[#f5f6f8] rounded-lg px-3 py-2.5 mb-1.5 text-xs">
                  <span className="text-indigo-600 mr-3 font-semibold">{co.no}</span>
                  <span className="text-gray-400 flex-1">{co.description}</span>
                  <span className={cx("tabular-nums font-bold ml-4", co.amount < 0 ? "text-emerald-600" : "text-indigo-600")}>
                    {co.amount < 0 ? `-${$f(-co.amount)}` : `+${$f(co.amount)}`}
                  </span>
                </div>
              ))}
            </>
          )}
          {modal.notes && <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">{modal.notes}</p>}
        </Modal>
      )}
      {modal === "summary" && (
        <Modal title="Prior Phases Summary" onClose={() => setModal(null)}>
          <table className="w-full text-xs">
            <thead><tr><TH>Phase</TH><TH>Subcontractor</TH><TH right>Final Contract</TH><TH right>Total Paid</TH><TH>Status</TH></tr></thead>
            <tbody>
              {priorPhases.map(p => (
                <TR key={p.id}>
                  <TD bold className="text-gray-800">{p.name}</TD>
                  <TD muted>{p.subcontractor}</TD>
                  <TD right muted>{$f(p.final_contract)}</TD>
                  <TD right bold className="text-gray-900">{$f(p.total_paid)}</TD>
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

// ─── VENDORS HUB ──────────────────────────────────────────────────────────────
function VendorsView() {
  const { vendors, refresh } = useAppData();
  const [vendorKey, setVendorKey] = useState("ivan");
  const [subTab, setSubTab] = useState("overview");
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
  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400";

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
              className={cx("w-full text-left px-3 py-3 rounded-xl transition-all border", vendorKey===v.key ? "bg-white border-gray-200 shadow-sm" : "border-transparent hover:bg-gray-50")}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: vendors[v.key].color }} />
                <span className={cx("text-xs font-semibold leading-tight", vendorKey===v.key ? "text-gray-900" : "text-gray-500")}>{v.label}</span>
              </div>
              <p className="text-xs font-bold tabular-nums text-gray-400 pl-4">{$f(v.total)}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="bg-[#f5f6f8] rounded-lg px-3 py-2.5">
            <div className="text-xs text-gray-400 mb-0.5">Combined</div>
            <div className="text-sm font-bold text-gray-900">{$f(vendorList.reduce((s,v)=>s+v.total,0))}</div>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{vendor.full_name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{vendor.role}</p>
          </div>
          <Tag text="Active" color="amber" />
        </div>

        <div className="flex border-b border-gray-200 mb-5">
          {[["overview","Overview"],["phases","Budget"],["invoices","Invoices"]].map(([id,lbl]) => (
            <button key={id} onClick={() => { setSubTab(id); setModal(null); setAddingInv(false); setEditingId(null); }}
              className={cx("px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px", subTab===id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {lbl}
              {id==="invoices" && <span className="ml-1 text-gray-300">({vendor.invoices.length})</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {subTab==="overview" && (
          <div className="space-y-5">
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
                    <button key={v} onClick={() => setPhaseView(v)} className={cx("px-2.5 py-1 text-xs rounded-lg font-medium", phaseView===v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700")}>{l}</button>
                  ))}
                </div>
              </div>
              {phaseView==="table" && (
                <table className="w-full text-xs">
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
                      <button key={i} onClick={()=>{setSubTab("phases");setModal(p);}} className="text-left bg-gray-50 hover:bg-indigo-50 rounded-xl p-3 border border-gray-100 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2"><span className="text-xs font-semibold text-gray-800 leading-tight">{p.phase}</span>{statusTag(p.status)}</div>
                        {b>0&&<BarFill value={inv2} max={b} color={vendor.color}/>}
                        <div className="flex justify-between mt-2"><span className="text-xs text-gray-400">{b>0?$f(b)+" budget":"T&M"}</span><span className="text-xs font-bold text-gray-800">{$f(inv2)}</span></div>
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
                            <span className="text-xs font-semibold text-gray-800 truncate">{p.phase}</span>
                            <div className="flex items-center gap-2 shrink-0">{statusTag(p.status)}<span className="text-xs font-bold tabular-nums text-gray-700">{$f(p.invoiced||0)}</span></div>
                          </div>
                          {p.description&&<p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>}
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
        {subTab==="invoices" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setAddingInv(v=>!v); setEditingId(null); }}
                className={cx("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors", addingInv ? "bg-gray-200 text-gray-600" : "bg-gray-900 text-white")}>
                {addingInv?"Cancel":"+ Add Invoice"}
              </button>
            </div>
            {addingInv && (
              <Card className="p-4">
                <SectionTitle>New Invoice — {vendor.name}</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div><label className="block text-xs text-gray-400 mb-1">Invoice #</label><input value={addForm.invNum} onChange={e=>setAddForm(f=>({...f,invNum:e.target.value}))} placeholder="e.g. INV-001" className={inp}/></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Date</label><input value={addForm.date} onChange={e=>setAddForm(f=>({...f,date:e.target.value}))} placeholder="MM/DD/YYYY" className={inp}/></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Amount ($)</label><input value={addForm.amount} onChange={e=>setAddForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" className={inp}/></div>
                  <div className="md:col-span-2"><label className="block text-xs text-gray-400 mb-1">Description</label><input value={addForm.desc} onChange={e=>setAddForm(f=>({...f,desc:e.target.value}))} placeholder="Invoice description…" className={inp}/></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Status</label><select value={addForm.status} onChange={e=>setAddForm(f=>({...f,status:e.target.value}))} className={inp}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveNewInv} disabled={!addForm.invNum||!addForm.amount||saving} className={cx("px-4 py-2 text-xs font-bold rounded-lg transition-colors", addForm.invNum&&addForm.amount&&!saving?"bg-gray-900 text-white":"bg-gray-100 text-gray-400 cursor-not-allowed")}>{saving?"Saving…":"Save Invoice"}</button>
                  <button onClick={()=>setAddingInv(false)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700">Cancel</button>
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
                        <TD><div className="flex gap-1"><button onClick={saveEdit} className="text-xs px-2 py-1 bg-gray-900 text-white rounded">{saving?"…":"Save"}</button><button onClick={()=>setEditingId(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">Cancel</button></div></TD>
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
                            <button onClick={()=>{setEditingId(vinv.id);setEditForm({...vinv});}} className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700 hover:border-gray-400">Edit</button>
                            <button onClick={()=>deleteInv(vinv.id)} className="text-xs px-2 py-1 text-gray-300 hover:text-red-500">✕</button>
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
    if (t === "Award Letter") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setView("upload")} className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${view==="upload" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          Upload Document
        </button>
        <button onClick={() => { setView("history"); loadDocs(); }} className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${view==="history" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          Document History {docs.length > 0 ? <span className="ml-1 text-gray-400">({docs.length})</span> : ""}
        </button>
      </div>

      {view === "upload" && <SmartUploadView onSaved={loadDocs} />}

      {view === "history" && (
        <div className="space-y-3">
          {docs.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
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
                      <TD><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor(doc.type)}`}>{doc.type}</span></TD>
                      <TD muted>{doc.linked_id || "—"}</TD>
                      <TD muted>{doc.vendor_label || doc.vendor_key || "—"}</TD>
                      <TD muted className="max-w-[160px] truncate">{doc.note || "—"}</TD>
                      <TD muted>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-US") : "—"}</TD>
                      <TD>
                        <div className="flex gap-1">
                          <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer"
                            className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors">
                            View
                          </a>
                          {doc.type === "Invoice" && doc.linked_id && (
                            <button onClick={() => rollbackInvoice(doc)}
                              className="text-xs px-2 py-1 border border-amber-200 rounded text-amber-500 hover:text-amber-700 hover:border-amber-400 transition-colors">
                              Rollback
                            </button>
                          )}
                          <button onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id}
                            className="text-xs px-2 py-1 text-gray-300 hover:text-red-500 transition-colors">
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
    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-gray-400 text-sm mb-3">Could not load reconciliation data.</p>
      <button onClick={load} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg">Retry</button>
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
    <div className="space-y-5">

      {/* Header scorecard */}
      <div className={`rounded-xl p-5 border ${issues.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${issues.length === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                {issues.length === 0 ? '✓ Books Balanced' : `${issues.length} Item${issues.length > 1 ? 's' : ''} Need Attention`}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {passing.length} of {checks.length} checks passing
              {invoicesWithNoLineItems.length > 0 && ` · ${invoicesWithNoLineItems.length} invoice${invoicesWithNoLineItems.length > 1 ? 's' : ''} missing line item detail`}
            </p>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-400 hover:text-gray-800 transition-colors">
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
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${activeTab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ISSUES TAB */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold text-emerald-600">No issues found</p>
              <p className="text-xs text-gray-400 mt-1">All reconciliation checks are passing</p>
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
                      <span className={`text-xs font-bold ${c.severity === 'error' ? 'text-red-700' : 'text-indigo-700'}`}>{c.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Gap: </span>
                      <span className={`text-xs font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>
                        {c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* What it means */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">What this means</p>
                    <p className="text-sm text-gray-600">{action.plain}</p>
                  </div>
                  {/* Numbers */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Expected</p>
                      <p className="text-sm font-bold text-gray-600">{c.expected != null ? $f(c.expected) : '—'}</p>
                    </div>
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">In App</p>
                      <p className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>{c.actual != null ? $f(c.actual) : '—'}</p>
                    </div>
                    <div className="bg-[#f5f6f8] rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-0.5">Difference</p>
                      <p className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>{c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}</p>
                    </div>
                  </div>
                  {/* How to fix */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs font-semibold text-blue-600 mb-0.5">How to fix this</p>
                    <p className="text-xs text-blue-700">{action.fix}</p>
                  </div>
                  {action.tab && (
                    <button
                      onClick={() => { if (setTab) setTab(action.tab); }}
                      className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors"
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Fix All Billing Data</p>
                <p className="text-xs text-blue-500 mt-0.5">Reseeds all 67 line item billings from Excel data (PAY-001 to PAY-007) — including Fee, Insurance, Deposit rows. Run this once after deploy.</p>
              </div>
              <button onClick={runReseed} disabled={reseeding}
                className="ml-4 px-4 py-2 text-xs font-bold rounded-lg text-white shrink-0"
                style={{ background: reseeding ? "#93c5fd" : "#1d4ed8" }}>
                {reseeding ? "Running..." : "Fix Billing Data →"}
              </button>
            </div>
          )}
          {reseedDone && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 font-semibold">✓ Data fix applied — line items updated.</div>
          )}
          <Card className="p-4">
            <SectionTitle>Invoices Without Line Item Detail</SectionTitle>
            <p className="text-xs text-gray-400 mb-4">
              These invoices are in the system but have no line items uploaded yet.
              Without line items, the Completed to Date and per-invoice reconciliation checks can't run.
            </p>
            {invoicesWithNoLineItems.length === 0 ? (
              <p className="text-xs text-emerald-600 font-semibold">✓ All invoices have line item detail</p>
            ) : (
              <div className="space-y-2">
                {invoicesWithNoLineItems.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                    <div>
                      <span className="text-xs font-bold text-gray-800">{inv.id} — {inv.inv_num}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{inv.description} · Approved {$f(inv.approved)}</p>
                    </div>
                    <Tag text="Upload PDF to add" color="amber" />
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mt-2">
                  <p className="text-xs text-blue-700 font-semibold">To fix: Go to Documents tab → upload the Taconic invoice PDF → approve the line items</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle>Change Orders Without Supporting Documents</SectionTitle>
            <p className="text-xs text-gray-400 mb-3">COs in the system that don't yet have a signed CO PDF attached.</p>
            <div className="space-y-2">
              {changeOrders.filter(co => !co.has_document).map(co => (
                <div key={co.no} className="flex items-center justify-between bg-[#f5f6f8] rounded-lg px-3 py-2.5">
                  <div>
                    <span className="text-xs font-bold text-indigo-600">{co.no}</span>
                    <span className="text-xs text-gray-500 ml-2">{co.div}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{$f(co.approved_co)}</span>
                </div>
              ))}
              {changeOrders.filter(co => !co.has_document).length === 0 && (
                <p className="text-xs text-emerald-600 font-semibold">✓ All COs have documents attached</p>
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
                    <div className="text-gray-400 font-normal text-xs mt-0.5">{c.description}</div>
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


// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Overview",         icon: "◈" },
  { id: "budget",    label: "Control Budget",   icon: "⊟" },
  { id: "awards",    label: "Awards",           icon: "◎" },
  { id: "cos",       label: "Change Orders",    icon: "△" },
  { id: "vendors",   label: "Vendors",          icon: "⬡" },
  { id: "invoices",  label: "Invoices",         icon: "≡" },
  { id: "lineitem",  label: "Line Item Billing",icon: "⊞" },
  { id: "uploads",   label: "Documents",        icon: "⊕" },
  { id: "reconcile", label: "Reconcile",        icon: "✓" },
];

const PAGE_TITLES = {
  dashboard:  { title: "Project Overview",      sub: "Camp Forestmere · JXM / Camp Forestmere Corp." },
  budget:     { title: "Control Budget",        sub: "51 line items · Phase 1.1" },
  awards:     { title: "Contract Awards",       sub: "20 awards · Subcontractors" },
  cos:        { title: "Change Orders",         sub: "Approved scope changes" },
  vendors:    { title: "Vendor Budgets",        sub: "Architecturefirm · Reed Hilderbrand · Ivan Zdrahal" },
  invoices:   { title: "Invoice Tracker",       sub: "Taconic Builders · Payment history" },
  lineitem:   { title: "Line Item Billing",     sub: "Per-invoice breakdown" },
  uploads:    { title: "Documents",             sub: "Upload & parse invoices, COs, award letters" },
  reconcile:  { title: "Reconciliation",        sub: "Balance checks & data integrity" },
};

function AppShell() {
  const { documents } = useAppData();
  
  // Persist active tab in URL hash so refresh keeps you on the same page
  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["dashboard","budget","awards","cos","vendors","invoices","lineitem","uploads","reconcile"];
    return validTabs.includes(hash) ? hash : "dashboard";
  };
  const [tab, setTabState] = useState(getInitialTab);
  
  const setTab = (t) => {
    setTabState(t);
    window.location.hash = t;
  };

  const page = PAGE_TITLES[tab] || { title: tab, sub: "" };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f5f6f8", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 200,
        background: "#ffffff", borderRight: "1px solid #e8eaed",
        display: "flex", flexDirection: "column", zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #f3f4f6", marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", letterSpacing: "-0.2px", lineHeight: 1 }}>Camp Forestmere</div>
          <div style={{ fontWeight: 400, fontSize: 11, color: "#9ca3af", marginTop: 4, letterSpacing: "0.01em" }}>Construction Dashboard</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
          {NAV.map(n => {
            const active = tab === n.id;
            const docsCount = n.id === "uploads" && documents.length > 0 ? documents.length : null;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  width: "100%", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                  background: active ? "#111827" : "transparent",
                  color: active ? "#ffffff" : "#6b7280",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  border: "none", cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#111827"; }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: "center", flexShrink: 0 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {docsCount && (
                  <span style={{
                    background: active ? "rgba(255,255,255,0.25)" : "#e5e7eb",
                    color: active ? "#fff" : "#6b7280",
                    borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600,
                  }}>{docsCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e8eaed" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>JXM / Camp Forestmere Corp.</div>
          <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 1 }}>Paul Smiths, NY · Mar 2026</div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <div style={{ marginLeft: 200, minHeight: "100vh" }}>

        {/* Page header */}
        <div style={{
          background: "#ffffff", borderBottom: "1px solid #e8eaed",
          padding: "20px 32px 18px", position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.4px" }}>
                {page.title}
              </h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0", fontWeight: 500 }}>
                {page.sub}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                color: "#15803d", borderRadius: 20, padding: "4px 12px",
                fontSize: 12, fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Phase 1.1 Active
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ padding: "28px 32px", maxWidth: 1280 }}>
          {tab === "dashboard" && <Dashboard setTab={setTab} />}
          {tab === "budget"    && <BudgetView setTab={setTab} />}
          {tab === "awards"    && <AwardsView />}
          {tab === "invoices"  && <InvoicesView />}
          {tab === "lineitem"  && <LineItemView />}
          {tab === "cos"       && <COsView />}
          {tab === "vendors"   && <VendorsView />}
          {tab === "uploads"   && <DocumentsView />}
          {tab === "reconcile" && <ReconcileView setTab={setTab} />}
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
