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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Loading Camp Forestmere...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <p className="text-red-500 font-semibold mb-2">Failed to connect to database</p>
        <p className="text-xs text-zinc-400 mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500">Retry</button>
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
  const taconicPending = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + parseFloat(i.amt_due), 0);

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
    green:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber:  "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
    red:    "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
    blue:   "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",
    muted:  "bg-zinc-100   text-zinc-500   dark:bg-zinc-800      dark:text-zinc-500",
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

const TH = ({ children, right, className = "" }) => (
  <th className={cx("px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 whitespace-nowrap", right ? "text-right" : "text-left", className)}>{children}</th>
);
const TD = ({ children, right, mono, muted, bold, colSpan, className = "" }) => (
  <td colSpan={colSpan} className={cx("px-3 py-2.5 text-xs", right && "text-right tabular-nums", mono && "font-mono", muted && "text-zinc-400 dark:text-zinc-500", bold && "font-semibold", className)}>{children}</td>
);
const TR = ({ children, onClick, subtle }) => (
  <tr onClick={onClick} className={cx("border-b border-zinc-50 dark:border-zinc-600/50 transition-colors", onClick && "cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10", subtle && "bg-zinc-50/50 dark:bg-zinc-800/40")}>{children}</tr>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
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

  const priorDemoPaid = priorPhases.find(p => p.id === "demolition")?.total_paid || 335189.43;
  const priorRoadPaid = priorPhases.find(p => p.id === "road")?.total_paid || 457500;

  const spendRows = [
    { name: "Taconic Builders (GC Phase 1.1)", paid: taconicPaid,   color: "#d97706" },
    { name: "Architecturefirm",               paid: afPaid,        color: "#60a5fa" },
    { name: "Reed Hilderbrand",               paid: rhPaid,        color: "#34d399" },
    { name: "Ivan Zdrahal PE",                paid: izPaid,        color: "#a78bfa" },
    { name: "Demolition (C25-102)",           paid: priorDemoPaid, color: "#f87171" },
    { name: "Road Construction",              paid: priorRoadPaid, color: "#fb923c" },
  ];

  return (
    <div className="space-y-5">
      {reconSummary?.failed > 0 && (
        <button onClick={() => setTab("reconcile")} className="w-full text-left flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
          <span className="text-red-500 mt-0.5">✕</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Reconciliation Errors Detected</p>
            <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5">{reconSummary.failed} check{reconSummary.failed > 1 ? "s" : ""} failing — click to review in Reconcile tab</p>
          </div>
          <span className="text-red-400 text-sm mt-0.5">→</span>
        </button>
      )}
      {reconSummary?.failed === 0 && reconSummary?.total > 0 && (
        <button onClick={() => setTab("reconcile")} className="w-full text-left flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-3 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All {reconSummary.total} Reconciliation Checks Passing</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">Books are balanced — click to view details</p>
          </div>
          <span className="text-emerald-400 text-sm mt-0.5">→</span>
        </button>
      )}
      {pendingInvs.length > 0 && (
        <button onClick={() => setTab("invoices")} className="w-full text-left flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
          <span className="text-amber-500 mt-0.5">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Payment Action Required</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
              {pendingInvs.length} invoice{pendingInvs.length > 1 ? "s" : ""} pending: {pendingInvs.map(i => i.inv_num).join(", ")} — total {$f(taconicPending)}
            </p>
          </div>
          <span className="text-amber-400 text-sm mt-0.5">→</span>
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Grand Total Paid" value={$f(grandTotalPaid)} sub="All vendors & phases" accent onClick={() => setModal("spend")} />
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
              const awd = awards.filter(a => budget.find(b => b.code === a.code)?.cat === cat).reduce((s, a) => s + parseFloat(a.current_amount), 0);
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

      <Card className="p-5">
        <SectionTitle>Project Details</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["Project", "Camp Forestmere"], ["Owner", "JXM / Camp Forestmere Corp."],
            ["Location", "Paul Smiths, NY 12970"], ["General Contractor", "Taconic Builders Inc."],
            ["GC Contract Start", "Jun 23, 2025"], ["GC Duration", "22 months"],
            ["Est. GC Completion", "April 2027"], ["PM", "Joseph Hamilton"],
            ["Architect", "Architecturefirm"], ["Landscape Arch.", "Reed Hilderbrand"],
            ["Civil Engineer", "Ivan Zdrahal PE"],
          ].map(([k, v]) => (
            <div key={k} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5">
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">{k}</div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{v}</div>
            </div>
          ))}
        </div>
      </Card>

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
              {budget.filter(b => b.cat === modal.cat).map(b => {
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

// ─── CONTROL BUDGET ───────────────────────────────────────────────────────────
function BudgetView() {
  const { budget, awards, awardedByCode } = useAppData();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const cats = ["All", ...Array.from(new Set(budget.map(b => b.cat)))];
  const rows = budget.filter(b => (cat === "All" || b.cat === cat) && (b.name.toLowerCase().includes(q.toLowerCase()) || b.code.includes(q)));

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
              const vari = parseFloat(b.budget) - awd;
              const ap = parseFloat(b.budget) > 0 ? awd / parseFloat(b.budget) : 0;
              return (
                <TR key={b.code} onClick={() => setModal(b)}>
                  <TD mono muted>{b.code}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200">{b.name}</TD>
                  <TD right muted>{$f(b.budget)}</TD>
                  <TD right bold className={awd > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"}>{awd > 0 ? $f(awd) : "—"}</TD>
                  <TD right className={awd > 0 ? (vari < 0 ? "text-red-500 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-medium") : "text-zinc-300 dark:text-zinc-700"}>{awd > 0 ? $f(vari) : "—"}</TD>
                  <TD>{awd > 0 && <div className="flex items-center gap-2"><BarFill value={awd} max={parseFloat(b.budget)} /><span className="text-zinc-400 text-xs w-10">{pf(ap)}</span></div>}</TD>
                  <TD>{awd === 0 ? <Tag text="Not Awarded" /> : ap > 1.05 ? <Tag text="Over Budget" color="red" /> : <Tag text="Awarded" color="green" />}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD bold colSpan={2} className="text-zinc-600 dark:text-zinc-400">Total — {rows.length} items</TD>
              <TD right bold muted>{$f(rows.reduce((s, b) => s + parseFloat(b.budget), 0))}</TD>
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
            ["Variance", $f(parseFloat(modal.budget) - (awardedByCode[modal.code] || 0))],
            ["% Awarded", awardedByCode[modal.code] ? pf(awardedByCode[modal.code] / parseFloat(modal.budget)) : "—"],
          ]} />
          {awards.filter(a => a.code === modal.code).length > 0 && (
            <>
              <SectionTitle>Awards for this line</SectionTitle>
              <table className="w-full text-xs">
                <thead><tr><TH>ID</TH><TH>Vendor</TH><TH right>Award</TH><TH right>COs</TH><TH right>Current</TH></tr></thead>
                <tbody>
                  {awards.filter(a => a.code === modal.code).map(a => (
                    <TR key={a.id}>
                      <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                      <TD className="text-zinc-700 dark:text-zinc-300">{a.vendor}</TD>
                      <TD right muted>{$f(a.award_amount)}</TD>
                      <TD right className={parseFloat(a.co_amount) > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-300 dark:text-zinc-700"}>{parseFloat(a.co_amount) > 0 ? `+${$f(a.co_amount)}` : "—"}</TD>
                      <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current_amount)}</TD>
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
              const bAmt = parseFloat(budget.find(b => b.code === a.code)?.budget);
              const vari = bAmt != null ? bAmt - parseFloat(a.current_amount) : null;
              return (
                <TR key={a.id} onClick={() => setModal({ type: "award", award: a })}>
                  <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                  <TD muted>{a.award_date}</TD>
                  <TD bold className="text-zinc-800 dark:text-zinc-200 max-w-[160px] truncate">{a.vendor}</TD>
                  <TD muted className="max-w-[120px] truncate">{a.division}</TD>
                  <TD right muted>{$f(a.award_amount)}</TD>
                  <TD right className={parseFloat(a.co_amount) > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300 dark:text-zinc-700"}>{parseFloat(a.co_amount) > 0 ? `+${$f(a.co_amount)}` : "—"}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current_amount)}</TD>
                  <TD right muted>{bAmt ? $f(bAmt) : "—"}</TD>
                  <TD right className={vari != null ? (vari < 0 ? "text-red-500 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-medium") : "text-zinc-300 dark:text-zinc-700"}>{vari != null ? $f(vari) : "—"}</TD>
                </TR>
              );
            })}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={4} bold muted>Total ({rows.length})</TD>
              <TD right muted bold>{$f(rows.reduce((s, a) => s + parseFloat(a.award_amount), 0))}</TD>
              <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(rows.reduce((s, a) => s + parseFloat(a.co_amount), 0))}</TD>
              <TD right bold className="text-zinc-900 dark:text-white">{$f(rows.reduce((s, a) => s + parseFloat(a.current_amount), 0))}</TD>
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
                  <TD mono className="text-amber-600 dark:text-amber-400">{a.id}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{a.division}</TD>
                  <TD muted className="max-w-xs">{a.description}</TD>
                  <TD right muted>{$f(a.award_amount)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(a.current_amount)}</TD>
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
function COsView() {
  const { changeOrders } = useAppData();
  const [modal, setModal] = useState(null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total COs" value={String(changeOrders.length)} sub="All approved" onClick={() => setModal("list")} />
        <Stat label="Net CO Amount" value={$f(changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0))} sub="Before fees" accent onClick={() => setModal("list")} />
        <Stat label="Total incl. Fees" value={$f(changeOrders.reduce((s, c) => s + parseFloat(c.total), 0))} sub="13.5% fee + 3% ins." onClick={() => setModal("list")} />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr><TH>CO #</TH><TH>Date</TH><TH>Division</TH><TH right>Orig. Budget</TH><TH right>CO Amount</TH><TH right>Fees</TH><TH right>Total w/ Fees</TH><TH right>Revised Budget</TH><TH>Notes</TH></tr></thead>
          <tbody>
            {changeOrders.map(co => (
              <TR key={co.no} onClick={() => setModal(co)}>
                <TD mono className="text-amber-600 dark:text-amber-400 font-bold">{co.no}</TD>
                <TD muted>{co.co_date}</TD>
                <TD bold className="text-zinc-800 dark:text-zinc-200">{co.div}</TD>
                <TD right muted>{$f(co.orig_budget)}</TD>
                <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(co.approved_co)}</TD>
                <TD right muted>{$f(co.fees)}</TD>
                <TD right bold className="text-zinc-800 dark:text-zinc-200">+{$f(co.total)}</TD>
                <TD right className="text-zinc-700 dark:text-zinc-300">{$f(co.revised_budget)}</TD>
                <TD muted className="italic max-w-xs">{co.notes || "—"}</TD>
              </TR>
            ))}
          </tbody>
          <tfoot>
            <TR subtle>
              <TD colSpan={4} bold muted>Totals</TD>
              <TD right className="text-amber-600 dark:text-amber-400 font-bold">+{$f(changeOrders.reduce((s, c) => s + parseFloat(c.approved_co), 0))}</TD>
              <TD right muted bold>{$f(changeOrders.reduce((s, c) => s + parseFloat(c.fees), 0))}</TD>
              <TD right bold className="text-zinc-900 dark:text-white">+{$f(changeOrders.reduce((s, c) => s + parseFloat(c.total), 0))}</TD>
              <TD colSpan={2} />
            </TR>
          </tfoot>
        </table>
      </Card>
      {modal && typeof modal === "object" && modal.no && (
        <Modal title={`${modal.no} — ${modal.div}`} subtitle={`Approved ${modal.co_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["CO Number", modal.no], ["Date", modal.co_date], ["Division", modal.div],
            ["Original Budget", $f(modal.orig_budget)], ["CO Amount", `+${$f(modal.approved_co)}`],
            ["GC Fee (13.5%)", $f(parseFloat(modal.approved_co) * 0.135)], ["Insurance (3%)", $f(parseFloat(modal.approved_co) * 0.03)],
            ["Total incl. Fees", `+${$f(modal.total)}`], ["Revised Budget", $f(modal.revised_budget)],
            ["Notes", modal.notes || "—"],
          ]} />
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
  const [payForm, setPayForm] = useState({ actualPaid: "", creditApplied: "", paidDate: "" });
  const [creditData, setCreditData] = useState(null);

  useEffect(() => {
    apiFetch('/credit-balance').then(d => setCreditData(d)).catch(() => {});
  }, [invoices]);

  const openMarkPaid = (inv) => {
    setMarkPaidModal(inv);
    setPayForm({
      actualPaid: String(inv.approved),
      creditApplied: "0",
      paidDate: new Date().toLocaleDateString("en-US"),
    });
    setModal(null);
  };

  const submitMarkPaid = async () => {
    const actualPaid = parseFloat(payForm.actualPaid) || 0;
    const creditApplied = parseFloat(payForm.creditApplied) || 0;
    await apiFetch(`/invoices/${markPaidModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Paid',
        paidDate: payForm.paidDate,
        notes: markPaidModal.notes,
        actualPaid: actualPaid || null,
        creditApplied: creditApplied || null,
      })
    });
    await refresh();
    setMarkPaidModal(null);
  };

  const retainageHeld = invoices.reduce((s, i) => s + Math.abs(parseFloat(i.retainage || 0)), 0);
  const inp = "w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-400";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Gross Invoiced" value={$f(invoices.reduce((s, i) => s + parseFloat(i.job_total), 0))} sub="Before retainage & deposits" onClick={() => setModal("all")} />
        <Stat label="Total Paid" value={$f(taconicPaid)} sub={invoices.filter(i => i.status === "Paid").length + " invoices paid"} onClick={() => setModal("paid")} />
        <Stat label="Retainage Held" value={$f(retainageHeld)} sub="Released at close" onClick={() => setModal("retainage")} />
        <Stat label="Pending" value={$f(taconicPending)} accent sub={invoices.filter(i => i.status !== "Paid").length + " invoices outstanding"} onClick={() => setModal("pending")} />
      </div>

      {/* Credit balance banner */}
      {creditData && creditData.creditBalance !== 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-blue-500 mt-0.5 text-lg">↩</span>
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              Credit Balance: {$f(creditData.creditBalance)}
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-0.5">
              Overpayment from PAY-006 (#1880) — being applied against future invoices
            </p>
            <div className="flex gap-3 mt-1.5 text-xs text-blue-500 dark:text-blue-400">
              {creditData.ledger?.map((l, i) => (
                <span key={i}>{l.inv}: {l.amount > 0 ? "+" : ""}{$f(l.amount)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invoices.map(inv => {
          const hasOverpay = parseFloat(inv.actual_paid || 0) > parseFloat(inv.approved || 0);
          const usedCredit = parseFloat(inv.credit_applied || 0) > 0;
          return (
            <Card key={inv.id} className="overflow-hidden hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer" onClick={() => setModal(inv)}>
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-xs text-amber-600 dark:text-amber-400 w-20 shrink-0">{inv.id}</span>
                  <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 w-28 shrink-0">{inv.inv_num}</span>
                  <span className="text-xs text-zinc-400 truncate">{inv.description}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{$f(inv.approved)}</span>
                  {statusTag(inv.status)}
                  {hasOverpay && <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/50 rounded-full px-2 py-0.5">⚠ Overpaid</span>}
                  {usedCredit && <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full px-2 py-0.5">↩ Credit</span>}
                  {inv.notes && !hasOverpay && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 rounded-full px-2 py-0.5">⚑ Note</span>}
                  <span className="text-zinc-300 dark:text-zinc-700">›</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && typeof modal === "object" && modal.id && (
        <Modal title={`${modal.inv_num} — ${modal.description}`} subtitle={`${modal.id} · Requested ${modal.req_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Invoice Number", modal.inv_num], ["Request Date", modal.req_date],
            ["Paid Date", modal.paid_date || "—"], ["Status", modal.status],
            ["Job Total", $f(modal.job_total)], ["GC Fees", $f(modal.fees)],
            ["Deposit Applied", $f(modal.deposit_applied)], ["Retainage Held", $f(Math.abs(parseFloat(modal.retainage || 0)))],
            ["Amount Due", $f(modal.amt_due)], ["Approved Amount", $f(modal.approved)],
            parseFloat(modal.actual_paid || 0) > 0 ? ["Actual Wire Sent", $f(modal.actual_paid)] : null,
            parseFloat(modal.credit_applied || 0) > 0 ? ["Credit Applied", $f(modal.credit_applied)] : null,
          ]} />
          {modal.notes && (
            <div className={`border rounded-lg px-4 py-3 ${parseFloat(modal.actual_paid || 0) > parseFloat(modal.approved || 0) ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40"}`}>
              <p className={`text-xs ${parseFloat(modal.actual_paid || 0) > parseFloat(modal.approved || 0) ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>{modal.notes}</p>
            </div>
          )}
          {modal.status !== "Paid" && (
            <button onClick={() => openMarkPaid(modal)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">
              Mark as Paid
            </button>
          )}
        </Modal>
      )}
      {modal === "retainage" && (
        <Modal title="Retainage Held" subtitle="Per Invoice #1956" onClose={() => setModal(null)}>
          <KVGrid rows={[["Total Retainage", "$217,342.38"], ["Completed Work", "$217,342.38"], ["Stored Materials", "$0.00"], ["Release Trigger", "Substantial Completion"], ["Estimated Release", "April 2027"]]} />
        </Modal>
      )}
      {(modal === "all" || modal === "paid" || modal === "pending") && (
        <Modal title={modal === "all" ? "All Invoices" : modal === "paid" ? "Paid Invoices" : "Pending Invoices"} onClose={() => setModal(null)} wide>
          <table className="w-full text-xs">
            <thead><tr><TH>Invoice</TH><TH>Description</TH><TH right>Job Total</TH><TH right>Approved</TH><TH right>Wire Sent</TH><TH>Status</TH></tr></thead>
            <tbody>
              {invoices.filter(i => modal === "all" || (modal === "paid" ? i.status === "Paid" : i.status !== "Paid")).map(i => (
                <TR key={i.id}>
                  <TD mono className="text-amber-600 dark:text-amber-400">{i.inv_num}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{i.description}</TD>
                  <TD right muted>{$f(i.job_total)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(i.approved)}</TD>
                  <TD right className={parseFloat(i.actual_paid||0) > parseFloat(i.approved||0) ? "text-red-500 font-bold" : parseFloat(i.credit_applied||0) > 0 ? "text-blue-500" : "text-zinc-400"}>
                    {parseFloat(i.actual_paid||0) > 0 ? $f(i.actual_paid) : parseFloat(i.credit_applied||0) > 0 ? "↩ Credit" : "—"}
                  </TD>
                  <TD>{statusTag(i.status)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Mark as Paid modal with wire / credit fields */}
      {markPaidModal && (
        <Modal title={`Mark as Paid — ${markPaidModal.inv_num}`} subtitle={`Approved amount: ${$f(markPaidModal.approved)}`} onClose={() => setMarkPaidModal(null)}>
          <div className="space-y-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5 text-xs text-zinc-500">
              {creditData?.creditBalance > 0 && (
                <p className="text-blue-600 dark:text-blue-400 font-semibold mb-1">↩ Available credit: {$f(creditData.creditBalance)}</p>
              )}
              Enter how this invoice was settled — wire sent, credit applied, or a combination of both.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Actual Wire Sent ($)</label>
                <input value={payForm.actualPaid} onChange={e => setPayForm(f => ({...f, actualPaid: e.target.value}))} placeholder="0.00" className={inp} />
                <p className="text-xs text-zinc-400 mt-0.5">Leave 0 if fully covered by credit</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Credit Applied ($)</label>
                <input value={payForm.creditApplied} onChange={e => setPayForm(f => ({...f, creditApplied: e.target.value}))} placeholder="0.00" className={inp} />
                <p className="text-xs text-zinc-400 mt-0.5">From overpayment balance</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Payment Date</label>
              <input value={payForm.paidDate} onChange={e => setPayForm(f => ({...f, paidDate: e.target.value}))} placeholder="MM/DD/YYYY" className={inp} />
            </div>
            {/* Validation */}
            {(() => {
              const wire = parseFloat(payForm.actualPaid) || 0;
              const credit = parseFloat(payForm.creditApplied) || 0;
              const total = wire + credit;
              const approved = parseFloat(markPaidModal.approved) || 0;
              const diff = total - approved;
              return (
                <div className={`rounded-lg px-3 py-2 text-xs font-medium ${Math.abs(diff) < 1 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"}`}>
                  Wire + Credit = {$f(total)} vs Approved {$f(approved)} →
                  {Math.abs(diff) < 1 ? " ✓ Balanced" : diff > 0 ? ` +${$f(diff)} overpayment` : ` ${$f(diff)} shortfall`}
                </div>
              );
            })()}
            <button onClick={submitMarkPaid} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">
              Confirm Payment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── LINE ITEM BILLING ────────────────────────────────────────────────────────
function LineItemView() {
  const { lineItems, INV_NUMS } = useAppData();
  const [sel, setSel] = useState("All");
  const [modal, setModal] = useState(null);
  const rows = lineItems.filter(li => sel === "All" || (li.inv[sel] != null && li.inv[sel] > 0));

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
          <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
          {[
            { label: "Road Construction", date: "Jan–Mid 2024", color: "#fb923c", amount: "$457,500", phase: priorPhases.find(p => p.id === "road") },
            { label: "Demolition",        date: "Jan–May 2025", color: "#f87171", amount: `${$f(priorPhases.find(p => p.id === "demolition")?.total_paid)} paid`, phase: priorPhases.find(p => p.id === "demolition") },
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
      {priorPhases.map(phase => (
        <Card key={phase.id} className="overflow-hidden cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors" onClick={() => setModal(phase)}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{phase.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{phase.job_num} · {phase.gc} · {phase.start_date}–{phase.end_date}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-zinc-900 dark:text-white">{$f(phase.total_paid)}</p>
                <p className="text-xs text-zinc-400">Total paid</p>
              </div>
              <Tag text="Complete" color="green" />
              <span className="text-zinc-300 dark:text-zinc-600">›</span>
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
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400 italic">{modal.scope}</div>
          <SectionTitle>Line Items</SectionTitle>
          <table className="w-full text-xs">
            <thead><tr><TH>Code</TH><TH>Description</TH><TH right>Budget</TH><TH right>Paid</TH></tr></thead>
            <tbody>
              {modal.lineItems.map(li => (
                <TR key={li.code}>
                  <TD mono muted>{li.code}</TD>
                  <TD className="text-zinc-700 dark:text-zinc-300">{li.description}</TD>
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
                  <span className="text-zinc-500 flex-1">{co.description}</span>
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
              {priorPhases.map(p => (
                <TR key={p.id}>
                  <TD bold className="text-zinc-800 dark:text-zinc-200">{p.name}</TD>
                  <TD muted>{p.subcontractor}</TD>
                  <TD right muted>{$f(p.final_contract)}</TD>
                  <TD right bold className="text-zinc-900 dark:text-white">{$f(p.total_paid)}</TD>
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
  const [addForm, setAddForm] = useState({ invNum: "", date: "", desc: "", amount: "", status: "Pending" });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const vendor = vendors[vendorKey];
  const totalInvoiced = (v) => v.phases.reduce((s, p) => s + (p.invoiced || 0), 0);
  const totalBudgeted = (v) => v.phases.reduce((s, p) => s + (p.budget || 0), 0);
  const vendorCards = ["ivan", "reed", "arch"].map(k => ({
    key: k, label: vendors[k].name, sub: vendors[k].role, total: totalInvoiced(vendors[k])
  }));

  const inv = totalInvoiced(vendor);
  const bud = totalBudgeted(vendor);
  const rem = bud > 0 ? bud - inv : null;
  const inp = "w-full bg-white dark:bg-zinc-600 border border-zinc-200 dark:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-amber-400";

  const saveNewInv = async () => {
    if (!addForm.invNum || !addForm.amount || saving) return;
    setSaving(true);
    await apiFetch(`/vendors/${vendorKey}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invNum: addForm.invNum, date: addForm.date, desc: addForm.desc, amount: parseFloat(addForm.amount.replace(/[^0-9.]/g, "")) || 0, status: addForm.status })
    });
    await refresh();
    setAddForm({ invNum: "", date: "", desc: "", amount: "", status: "Pending" });
    setAddingInv(false);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingId || saving) return;
    setSaving(true);
    await apiFetch(`/vendors/invoices/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    await refresh();
    setEditingId(null);
    setSaving(false);
  };

  const deleteInv = async (id) => {
    await apiFetch(`/vendors/invoices/${id}`, { method: 'DELETE' });
    await refresh();
  };

  return (
    <div className="flex gap-6 min-h-[600px]">
      <aside className="w-48 shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-400 mb-3 px-1">Vendors</p>
        <div className="space-y-1">
          {vendorCards.map(v => (
            <button key={v.key} onClick={() => { setVendorKey(v.key); setSubTab("overview"); setModal(null); setAddingInv(false); setEditingId(null); }}
              className={cx("w-full text-left px-3 py-3 rounded-xl transition-all border", vendorKey === v.key ? "bg-white dark:bg-zinc-600 border-zinc-200 dark:border-zinc-500 shadow-sm" : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-600/50")}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: vendors[v.key].color }} />
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">{vendor.full_name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{vendor.role}</p>
          </div>
          <Tag text="Active" color="amber" />
        </div>
        <div className="flex border-b border-zinc-200 dark:border-zinc-600 mb-5">
          {["overview", "phases", "invoices"].map(t => (
            <button key={t} onClick={() => { setSubTab(t); setModal(null); setAddingInv(false); setEditingId(null); }}
              className={cx("px-4 py-2.5 text-xs font-semibold capitalize transition-all border-b-2 -mb-px", subTab === t ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
              {t}
              {t === "invoices" && <span className="ml-1 text-zinc-400">({vendor.invoices.length})</span>}
            </button>
          ))}
        </div>

        {subTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Invoiced" value={$f(inv)} sub="All phases" accent onClick={() => setSubTab("invoices")} />
              {rem != null ? <Stat label="Remaining Budget" value={$f(rem)} sub="Against fixed fees" onClick={() => setSubTab("phases")} /> : <Stat label="Billing Type" value="T&M" sub="Billed monthly as incurred" />}
              <Stat label="Invoices on File" value={String(vendor.invoices.length)} sub="Tracked invoices" onClick={() => setSubTab("invoices")} />
            </div>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Phase Status</SectionTitle>
                <div className="flex gap-1 -mt-4">
                  {[["table","⊞ Table"],["cards","▦ Cards"],["timeline","↕ List"]].map(([v,l]) => (
                    <button key={v} onClick={() => setPhaseView(v)} className={cx("px-2.5 py-1 text-xs rounded-lg transition-all font-medium", phaseView === v ? "bg-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200")}>{l}</button>
                  ))}
                </div>
              </div>
              {phaseView === "table" && (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-zinc-100 dark:border-zinc-600"><TH>Phase</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
                  <tbody>
                    {vendor.phases.map((p, i) => {
                      const b = p.budget || 0; const inv2 = p.invoiced || 0; const r = b > 0 ? b - inv2 : null;
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
              )}
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
                        {b > 0 && <BarFill value={inv2} max={b} color={vendor.color} />}
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-zinc-400">{b > 0 ? $f(b) + " budget" : "T&M"}</span>
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{$f(inv2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {phaseView === "timeline" && (
                <div className="relative pl-5">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-600" />
                  {vendor.phases.map((p, i) => {
                    const dotColor = p.status === "Complete" ? "#10b981" : p.status === "Not Started" ? "#a1a1aa" : vendor.color;
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
                          {p.description && <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.description}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {subTab === "phases" && (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead><tr><TH>Phase</TH><TH>Description</TH><TH right>Budget</TH><TH right>Invoiced</TH><TH right>Remaining</TH><TH>Status</TH></tr></thead>
              <tbody>
                {vendor.phases.map((p, i) => {
                  const bP = p.budget || 0; const invP = p.invoiced || 0; const remP = bP > 0 ? bP - invP : null;
                  return (
                    <TR key={i} onClick={() => setModal(p)}>
                      <TD bold className="text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{p.phase}</TD>
                      <TD muted className="max-w-xs">{p.description}</TD>
                      <TD right muted>{bP > 0 ? $f(bP) : "T&M"}</TD>
                      <TD right bold className="text-zinc-900 dark:text-white">{$f(invP)}</TD>
                      <TD right className={remP == null ? "text-zinc-400" : remP < 0 ? "text-red-500 dark:text-red-400 font-bold" : remP > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-300 dark:text-zinc-700"}>{remP == null ? "T&M" : remP > 0 ? $f(remP) : remP < 0 ? `-${$f(-remP)}` : "—"}</TD>
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

        {subTab === "invoices" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => { setAddingInv(v => !v); setEditingId(null); }} className={cx("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors", addingInv ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300" : "bg-amber-600 text-white hover:bg-amber-500")}>
                {addingInv ? "Cancel" : "+ Add Invoice"}
              </button>
            </div>
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
                  <button onClick={saveNewInv} disabled={!addForm.invNum || !addForm.amount || saving} className={cx("px-4 py-2 text-xs font-bold rounded-lg transition-colors", addForm.invNum && addForm.amount && !saving ? "bg-amber-600 text-white hover:bg-amber-500" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed")}>
                    {saving ? "Saving…" : "Save Invoice"}
                  </button>
                  <button onClick={() => setAddingInv(false)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Cancel</button>
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
                      <tr key={vinv.id} className="bg-amber-50 dark:bg-amber-900/10 border-b border-zinc-100 dark:border-zinc-600">
                        <TD><input value={editForm.inv_num || ""} onChange={e => setEditForm(f => ({...f, invNum: e.target.value, inv_num: e.target.value}))} className={inp + " w-24"} /></TD>
                        <TD><input value={editForm.inv_date || ""} onChange={e => setEditForm(f => ({...f, date: e.target.value, inv_date: e.target.value}))} className={inp + " w-24"} /></TD>
                        <TD><input value={editForm.description || ""} onChange={e => setEditForm(f => ({...f, desc: e.target.value, description: e.target.value}))} className={inp + " w-48"} /></TD>
                        <TD right><input value={editForm.amount || ""} onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} className={inp + " w-24 text-right"} /></TD>
                        <TD><select value={editForm.status || "Pending"} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className={inp + " w-24"}>
                          {["Pending","Paid","In Review"].map(s => <option key={s}>{s}</option>)}
                        </select></TD>
                        <TD>
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="text-xs px-2 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded-lg hover:text-zinc-700 dark:hover:text-zinc-200">Cancel</button>
                          </div>
                        </TD>
                      </tr>
                    ) : (
                      <TR key={vinv.id} onClick={() => setModal({ _inv: true, ...vinv })}>
                        <TD mono className="text-amber-600 dark:text-amber-400 font-bold">{vinv.inv_num}</TD>
                        <TD muted>{vinv.inv_date}</TD>
                        <TD className="text-zinc-700 dark:text-zinc-300">{vinv.description}</TD>
                        <TD right bold className="text-zinc-900 dark:text-white">{$f(vinv.amount)}</TD>
                        <TD>{statusTag(vinv.status)}</TD>
                        <TD onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingId(vinv.id); setEditForm({...vinv}); }} className="text-xs px-2 py-1 border border-zinc-200 dark:border-zinc-600 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 transition-colors">Edit</button>
                            <button onClick={() => deleteInv(vinv.id)} className="text-xs px-2 py-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors">✕</button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
                <tfoot>
                  <TR subtle>
                    <TD bold colSpan={3} muted>Total</TD>
                    <TD right bold className="text-zinc-900 dark:text-white">{$f(vendor.invoices.reduce((s, i) => s + (i.amount || 0), 0))}</TD>
                    <TD colSpan={2} />
                  </TR>
                </tfoot>
              </table>
            </Card>
          </div>
        )}
      </div>

      {modal && !modal._inv && (
        <Modal title={modal.phase} subtitle={vendor.full_name} onClose={() => setModal(null)}>
          <KVGrid rows={[
            ["Phase", modal.phase], ["Status", modal.status],
            ["Budget", modal.budget > 0 ? $f(modal.budget) : "T&M"],
            ["Invoiced", $f(modal.invoiced)],
            ["Remaining", modal.budget > 0 ? $f(modal.budget - modal.invoiced) : "T&M"],
            ["Description", modal.description],
          ]} />
        </Modal>
      )}
      {modal?._inv && (
        <Modal title={`Invoice ${modal.inv_num}`} subtitle={`${vendor.name} · ${modal.inv_date}`} onClose={() => setModal(null)}>
          <KVGrid rows={[["Invoice Number", modal.inv_num], ["Date", modal.inv_date], ["Description", modal.description], ["Amount", $f(modal.amount)], ["Status", modal.status]]} />
        </Modal>
      )}
    </div>
  );
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
function UploadsView() {
  const { invoices, awards, changeOrders, vendors, documents, refresh } = useAppData();
  const [form, setForm] = useState({ type: "Invoice", vendor: "", linkedId: "", note: "" });
  const [pending, setPending] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const TACONIC_LINKS = invoices.map(i => ({ id: i.id, label: `${i.id} · ${i.inv_num}` }));
  const AWARD_LINKS   = awards.map(a => ({ id: a.id, label: `${a.id} · ${a.vendor}` }));
  const CO_LINKS      = changeOrders.map(c => ({ id: c.no, label: `${c.no} · ${c.div}` }));
  const vendorInvLinks = {
    ivan: vendors.ivan?.invoices.map(i => ({ id: i.inv_num, label: `${i.inv_num} – ${i.description}` })) || [],
    reed: vendors.reed?.invoices.map(i => ({ id: i.inv_num, label: `${i.inv_num} – ${i.description}` })) || [],
    arch: vendors.arch?.invoices.map(i => ({ id: i.inv_num, label: `${i.inv_num} – ${i.description}` })) || [],
  };

  const getLinks = () => {
    if (form.type === "Award Letter") return AWARD_LINKS;
    if (form.type === "Change Order") return CO_LINKS;
    if (form.type === "Invoice") {
      if (form.vendor === "taconic") return TACONIC_LINKS;
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

  const save = async () => {
    if (!pending || uploading) return;
    setUploading(true);
    const vendorLabel = form.vendor === "taconic" ? "Taconic Builders" : form.vendor ? vendors[form.vendor]?.name : "";
    const fd = new FormData();
    fd.append("file", pending);
    fd.append("name", pending.name);
    fd.append("type", form.type);
    fd.append("vendor_key", form.vendor || "");
    fd.append("vendor_label", vendorLabel || "");
    fd.append("linked_id", form.linkedId || "");
    fd.append("note", form.note || "");
    await fetch(API + '/documents', { method: 'POST', body: fd });
    await refresh();
    setPending(null);
    setForm({ type: "Invoice", vendor: "", linkedId: "", note: "" });
    setUploading(false);
  };

  const deleteDoc = async (id) => {
    await apiFetch(`/documents/${id}`, { method: 'DELETE' });
    await refresh();
  };

  const openFile = (doc) => {
    window.open(API + `/documents/${doc.id}/file`, '_blank');
  };

  const byType = documents.reduce((acc, u) => { (acc[u.type] = acc[u.type] || []).push(u); return acc; }, {});
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
            <div><label className="text-xs text-zinc-500 block mb-1">Document Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, vendor: "", linkedId: "" }))} className={inp}>
                {["Invoice", "Award Letter", "Change Order", "Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {form.type === "Invoice" && (
              <div><label className="text-xs text-zinc-500 block mb-1">Vendor</label>
                <select value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value, linkedId: "" }))} className={inp}>
                  <option value="">— Select vendor —</option>
                  <option value="taconic">Taconic Builders (GC)</option>
                  <option value="ivan">Ivan Zdrahal PE</option>
                  <option value="reed">Reed Hilderbrand</option>
                  <option value="arch">Architecturefirm</option>
                </select>
              </div>
            )}
            {links.length > 0 && (
              <div><label className="text-xs text-zinc-500 block mb-1">Link to Invoice / Record</label>
                <select value={form.linkedId} onChange={e => setForm(f => ({ ...f, linkedId: e.target.value }))} className={inp}>
                  <option value="">— Select —</option>
                  {links.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            )}
            <div><label className="text-xs text-zinc-500 block mb-1">Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Add a note…" className={inp} />
            </div>
            <button onClick={save} disabled={!pending || uploading} className={cx("w-full py-2.5 rounded-lg text-xs font-bold transition-colors", pending && !uploading ? "bg-amber-600 text-white hover:bg-amber-500 shadow-sm" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed")}>
              {uploading ? "Uploading…" : "Save Document"}
            </button>
          </div>
        </div>
      </Card>

      {documents.length === 0
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
                      {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ""} · {new Date(doc.uploaded_at).toLocaleDateString("en-US")}
                      {doc.vendor_label && ` · ${doc.vendor_label}`}
                      {doc.linked_id && ` · ↳ ${doc.linked_id}`}
                      {doc.note && ` · ${doc.note}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => openFile(doc)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-600 rounded-lg px-2.5 py-1 hover:border-zinc-400 transition-colors">View</button>
                  <button onClick={() => deleteDoc(doc.id)} className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors px-1.5 py-1">✕</button>
                </div>
              </div>
            ))}
          </Card>
        ))
      }
    </div>
  );
}

// ─── RECONCILE VIEW ───────────────────────────────────────────────────────────
function ReconcileView() {
  const { invoices, changeOrders, lineItems, budget, refresh } = useAppData();
  const [recon, setRecon]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issues');

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
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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

  const [navigateTo, setNavigateTo] = useState(null);

  return (
    <div className="space-y-5">

      {/* Header scorecard */}
      <div className={`rounded-xl p-5 border ${issues.length === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${issues.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                {issues.length === 0 ? '✓ Books Balanced' : `${issues.length} Item${issues.length > 1 ? 's' : ''} Need Attention`}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {passing.length} of {checks.length} checks passing
              {invoicesWithNoLineItems.length > 0 && ` · ${invoicesWithNoLineItems.length} invoice${invoicesWithNoLineItems.length > 1 ? 's' : ''} missing line item detail`}
            </p>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
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
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-600">
        {[
          { id: 'issues',   label: `Issues${issues.length > 0 ? ` (${issues.length})` : ''}` },
          { id: 'missing',  label: `Missing Data${invoicesWithNoLineItems.length > 0 ? ` (${invoicesWithNoLineItems.length})` : ''}` },
          { id: 'passing',  label: `All Checks (${checks.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all ${activeTab === t.id ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
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
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">No issues found</p>
              <p className="text-xs text-zinc-400 mt-1">All reconciliation checks are passing</p>
            </Card>
          ) : issues.filter(c => c.severity !== 'info').map(c => {
            const action = actionMap[c.id];
            if (!action || !action.plain) return null;
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className={`px-4 py-3 border-b ${c.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`}>{c.severity === 'error' ? '✕' : '⚠'}</span>
                      <span className={`text-xs font-bold ${c.severity === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{c.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400">Gap: </span>
                      <span className={`text-xs font-bold font-mono ${c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                        {c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* What it means */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">What this means</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{action.plain}</p>
                  </div>
                  {/* Numbers */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-zinc-400 mb-0.5">Expected</p>
                      <p className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">{c.expected != null ? $f(c.expected) : '—'}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-zinc-400 mb-0.5">In App</p>
                      <p className={`text-sm font-bold font-mono ${c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`}>{c.actual != null ? $f(c.actual) : '—'}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-zinc-400 mb-0.5">Difference</p>
                      <p className={`text-sm font-bold font-mono ${c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`}>{c.diff != null ? ((c.diff >= 0 ? '+' : '') + $f(c.diff)) : '—'}</p>
                    </div>
                  </div>
                  {/* How to fix */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg px-3 py-2.5">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">How to fix this</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{action.fix}</p>
                  </div>
                  {action.tab && (
                    <button
                      onClick={() => setActiveTab('_nav_' + action.tab)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors"
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
          <Card className="p-4">
            <SectionTitle>Invoices Without Line Item Detail</SectionTitle>
            <p className="text-xs text-zinc-400 mb-4">
              These invoices are in the system but have no line items uploaded yet.
              Without line items, the Completed to Date and per-invoice reconciliation checks can't run.
            </p>
            {invoicesWithNoLineItems.length === 0 ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ All invoices have line item detail</p>
            ) : (
              <div className="space-y-2">
                {invoicesWithNoLineItems.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2.5">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{inv.id} — {inv.inv_num}</span>
                      <p className="text-xs text-zinc-400 mt-0.5">{inv.description} · Approved {$f(inv.approved)}</p>
                    </div>
                    <Tag text="Upload PDF to add" color="amber" />
                  </div>
                ))}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2.5 mt-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">To fix: Go to Documents tab → upload the Taconic invoice PDF → approve the line items</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle>Change Orders Without Supporting Documents</SectionTitle>
            <p className="text-xs text-zinc-400 mb-3">COs in the system that don't yet have a signed CO PDF attached.</p>
            <div className="space-y-2">
              {changeOrders.filter(co => !co.has_document).map(co => (
                <div key={co.no} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2.5">
                  <div>
                    <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">{co.no}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-2">{co.div}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{$f(co.approved_co)}</span>
                </div>
              ))}
              {changeOrders.filter(co => !co.has_document).length === 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ All COs have documents attached</p>
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
                  <TD bold className="text-zinc-800 dark:text-zinc-200 max-w-xs">
                    <div>{c.label}</div>
                    <div className="text-zinc-400 font-normal text-xs mt-0.5">{c.description}</div>
                  </TD>
                  <TD right muted>{c.expected != null ? $f(c.expected) : '—'}</TD>
                  <TD right bold className={c.pass ? 'text-emerald-600 dark:text-emerald-400' : c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}>
                    {c.actual != null ? $f(c.actual) : '—'}
                  </TD>
                  <TD right className={Math.abs(c.diff||0) < 1 ? 'text-zinc-300 dark:text-zinc-700' : c.diff > 0 ? 'text-amber-500' : 'text-red-500'}>
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
  { id: "uploads",   label: "Documents"         },
  { id: "reconcile", label: "✓ Reconcile"        },
];

function AppShell() {
  const { documents } = useAppData();
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(false);

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", dark);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors duration-200" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 3px; }
        .dark ::-webkit-scrollbar-thumb { background: #71717a; }
      `}</style>

      <header className="sticky top-0 z-20 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-600 shadow-sm dark:shadow-none">
        <div className="max-w-screen-xl mx-auto px-6 pt-4 pb-0 flex items-end justify-between">
          <div className="pb-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Camp Forestmere</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Active Construction</span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">JXM / Camp Forestmere Corp. · Paul Smiths, NY · Updated Mar 2026</p>
          </div>
          <div className="pb-3 flex items-center gap-3">
            {documents.length > 0 && <span className="text-xs text-zinc-400">{documents.length} doc{documents.length > 1 ? "s" : ""}</span>}
            <button
              onClick={() => setDark(d => !d)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors shadow-sm"
            >
              {dark ? "☀ Light mode" : "◑ Dark mode"}
            </button>
          </div>
        </div>
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
              {t.id === "uploads" && documents.length > 0 && <span className="ml-1 text-amber-500">·{documents.length}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab === "dashboard" && <Dashboard setTab={setTab} />}
        {tab === "budget"    && <BudgetView />}
        {tab === "awards"    && <AwardsView />}
        {tab === "invoices"  && <InvoicesView />}
        {tab === "lineitem"  && <LineItemView />}
        {tab === "cos"       && <COsView />}
        {tab === "cashflow"  && <CashFlowView />}
        {tab === "prior"     && <PriorPhasesView />}
        {tab === "vendors"   && <VendorsView />}
        {tab === "uploads"   && <SmartUploadView />}
        {tab === "reconcile" && <ReconcileView />}
      </main>
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
