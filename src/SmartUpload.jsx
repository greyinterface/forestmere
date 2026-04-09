import { useState, useRef } from "react";

const API = '/api';
const $f = (n) => n == null || n === "" ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";
const card = "bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6";
const sectionTitle = "text-xs font-bold uppercase tracking-widest text-gray-400 mb-5";


// ─── LINE ITEMS SECTION ───────────────────────────────────────────────────────
// Loads all budget line items from the app, lets user enter current period amount
// No AI/API needed - works entirely from local data
function LineItemsSection({ lines, parsing, onChange, inp, sectionTitle, card }) {
  const [budgetLines, setBudgetLines] = useState([]);
  const [filter, setFilter] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    // Load line items from the API
    fetch('/api/data').then(r=>r.json()).then(d => {
      if (d.lineItems) setBudgetLines(d.lineItems);
    }).catch(()=>{});
  }, []);

  const addLine = (li) => {
    // Check not already added
    if (lines.find(l => l.code === li.code)) return;
    onChange([...lines, { code: li.code, name: li.name, bill: "", suggested: false }]);
    setShowPicker(false);
    setFilter("");
  };

  const addBlankLine = () => {
    onChange([...lines, { code: "", name: "", bill: "", suggested: false }]);
  };

  const removeLine = (i) => {
    onChange(lines.filter((_,idx) => idx !== i));
  };

  const updateLine = (i, field, val) => {
    const l = [...lines];
    l[i] = {...l[i], [field]: val};
    onChange(l);
  };

  const filtered = budgetLines.filter(li =>
    !filter ||
    li.code.toLowerCase().includes(filter.toLowerCase()) ||
    (li.name||"").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-1">
        <p className={sectionTitle}>Line Items Billed This Period</p>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(v=>!v)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
            + From Budget
          </button>
          <button onClick={addBlankLine}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            + Manual
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-300 mb-4">
        Click <strong className="text-gray-500">+ From Budget</strong> to pick a line item, enter current period amount · completed to date auto-calculated
      </p>

      {/* Budget line picker */}
      {showPicker && (
        <div className="mb-4 border border-indigo-200 rounded-xl overflow-hidden">
          <div className="p-3 bg-indigo-50 border-b border-indigo-100">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search by code or name..."
              className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.slice(0,30).map(li => (
              <button key={li.code} onClick={() => addLine(li)}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 border-b border-gray-50 flex items-center justify-between transition-colors"
                style={{opacity: lines.find(l=>l.code===li.code) ? 0.4 : 1}}>
                <span><strong className="text-gray-700">{li.code}</strong> <span className="text-gray-500 ml-2">{li.name}</span></span>
                {lines.find(l=>l.code===li.code) && <span className="text-gray-300 text-xs">already added</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-xs text-gray-300">No matching line items</p>}
          </div>
        </div>
      )}

      {parsing && <p className="text-center text-xs text-indigo-500 animate-pulse py-4">Extracting from PDF...</p>}
      {!parsing && lines.length === 0 && (
        <p className="text-center text-xs text-gray-300 py-4">No line items added yet — use + From Budget to select</p>
      )}

      {lines.length > 0 && (
        <>
          <div className="grid grid-cols-12 gap-2 mb-1 px-1">
            <div className="col-span-2"><span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Code</span></div>
            <div className="col-span-5"><span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Description</span></div>
            <div className="col-span-4"><span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">This Period ($)</span></div>
          </div>
          <div className="space-y-2">
            {lines.map((li, i) => (
              <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border ${li.suggested ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100"}`}>
                <div className="col-span-2">
                  <input value={li.code} onChange={e=>updateLine(i,"code",e.target.value)} className={inp + " text-xs"} placeholder="01-001"/>
                </div>
                <div className="col-span-5">
                  <input value={li.name} onChange={e=>updateLine(i,"name",e.target.value)} className={inp + " text-xs"} placeholder="Description"/>
                </div>
                <div className="col-span-4">
                  <input value={li.bill} onChange={e=>updateLine(i,"bill",e.target.value)} className={inp + " text-xs"} placeholder="0.00" autoFocus={li.bill===""&&li.code!==""} />
                </div>
                <div className="col-span-1">
                  <button onClick={()=>removeLine(i)} className="w-full py-2 text-xs text-gray-300 hover:text-red-400 rounded-lg border border-gray-100 transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
          {lines.filter(l=>l.suggested).length > 0 && (
            <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <p className="text-xs text-indigo-600">{lines.filter(l=>l.suggested).length} lines parsed from PDF</p>
              <button onClick={()=>onChange(lines.map(l=>({...l,suggested:false})))} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">Accept All ✓</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SmartUploadView() {
  const [stage, setStage] = useState("upload");
  const [docType, setDocType] = useState("taconic_invoice");
  const [pendingFile, setPendingFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [error, setError] = useState(null);
  const [parseMsg, setParseMsg] = useState(null);
  const fileRef = useRef();

  const [inv, setInv] = useState({
    payId:"", invNum:"", reqDate:"", periodTo:"",
    jobTotal:"", fees:"", deposit:"", retainage:"",
    amtDue:"", approved:"", paidDate:"", status:"Pending Payment",
    wire:"", credit:"", notes:"", lines:[],
  });
  const [co, setCo] = useState({ no:"", date:"", code:"", div:"", origBudget:"", amount:"", notes:"" });
  const [parsedAward, setParsedAward] = useState(null);
  const [vend, setVend] = useState({ vendorKey:"ivan", invNum:"", date:"", desc:"", amount:"", status:"Pending" });
  const [prior, setPrior] = useState({ phase:"road", invNum:"", date:"", vendor:"", description:"", amount:"", notes:"" });
  const sp = (k) => (e) => setPrior(f => ({...f, [k]: e.target.value}));
  const [linkedPhase, setLinkedPhase] = useState("phase11"); // applies to all doc types
  const [stage2, setStage2] = useState("form"); // "form" | "preview" | "saving"

  const si = (k) => (e) => setInv(f => ({...f, [k]: e.target.value}));
  const sc = (k) => (e) => setCo(f => ({...f, [k]: e.target.value}));
  const sv = (k) => (e) => setVend(f => ({...f, [k]: e.target.value}));

  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setError(null);
    setPendingFile(file);
    setPdfUrl(URL.createObjectURL(file));
    setStage("form");
    if (docType === "taconic_invoice") parseInvoice(file);
    else if (docType === "change_order") parseCO(file);
    else if (docType === "vendor_invoice") parseVendor(file);
    else if (docType === "award_letter") parseAward(file);
  };

  const parseInvoice = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("doc_type", "taconic_invoice");
      const res = await fetch(API + '/parse-document', { method:"POST", body:fd });
      if (!res.ok) {
        setParsing(false);
        setParseMsg("Could not parse PDF automatically — enter the fields manually from the PDF on the right.");
        return;
      }
      const data = await res.json();
      if (!data.ok || !data.parsed) {
        setParsing(false);
        setParseMsg("Could not auto-parse — fill in the fields manually using the PDF on the right.");
        return;
      }
      if (data.ok && data.parsed) {
        setParseMsg(null);
        const p = data.parsed; const h = p.header || {};
        const lines = (p.lineItemsBilled || [])
          .filter(l => parseFloat(l.currentBill) > 0)
          .map(l => ({ code: l.code||"", name: l.name||"", bill: String(l.currentBill||""), _suggested: true }));
        setInv(f => ({
          ...f,
          invNum: h.invNum ? String(h.invNum) : f.invNum,
          reqDate: h.invoiceDate || f.reqDate,
          periodTo: h.periodTo || f.periodTo,
          jobTotal: h.completedToDate ? String(h.completedToDate) : f.jobTotal,
          jobTotal: p.fees?.jobTotal ? String(p.fees.jobTotal) : f.jobTotal,
          fees: p.fees ? String(((p.fees.gcFee||0)+(p.fees.insurance||0)).toFixed(2)) : f.fees,
          deposit: p.fees?.depositApplied ? String(p.fees.depositApplied) : f.deposit,
          retainage: p.fees?.retainageThisPeriod ? String(p.fees.retainageThisPeriod) : f.retainage,
          amtDue: h.currentAmountDue ? String(h.currentAmountDue) : f.amtDue,
          approved: h.currentAmountDue ? String(h.currentAmountDue) : f.approved,
          lines: lines.length > 0 ? lines : f.lines,
        }));
      }
    } catch(e) {}
    setParsing(false);
  };

  const parseCO = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(API + '/parse-co', { method:"POST", body:fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        setCo(f => ({ ...f,
          no: p.coNumber||f.no, date: p.date||f.date, code: p.csiCode||f.code,
          div: p.division||f.div, origBudget: p.originalBudget?String(p.originalBudget):f.origBudget,
          amount: p.coAmount?String(p.coAmount):f.amount, notes: p.description||f.notes,
        }));
      }
    } catch(e) {}
    setParsing(false);
  };

  const parseVendor = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("doc_type", "vendor_invoice");
      const res = await fetch(API + '/parse-document', { method:"POST", body:fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        setVend(f => ({
          ...f,
          invNum: p.invNum || f.invNum,
          date: p.date || f.date,
          desc: p.description || f.desc,
          amount: p.total ? String(p.total) : p.amount ? String(p.amount) : f.amount,
        }));
      }
    } catch(e) {}
    setParsing(false);
  };

  const parseAward = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("doc_type", "award_letter");
      const res = await fetch(API + '/parse-document', { method:"POST", body:fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        // Store parsed award data for display
        setParsedAward(p);
      }
    } catch(e) {}
    setParsing(false);
  };

  const calc = (parseFloat(inv.jobTotal)||0) + (parseFloat(inv.fees)||0) - (parseFloat(inv.deposit)||0) - (parseFloat(inv.retainage)||0);
  const appr = parseFloat(inv.approved) || 0;
  const diff = Math.abs(calc - appr);

  const saveTaconic = async () => {
    if (!inv.payId || !inv.invNum || !inv.approved) { setError("Payment ID, Invoice #, and Approved Amount required."); return; }
    setSaving(true); setError(null);
    try {
      const fmtInv = inv.invNum.startsWith("#") ? inv.invNum : `#${inv.invNum}`;
      await fetch(API + '/invoices', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id:inv.payId, reqDate:inv.reqDate, invNum:fmtInv,
          desc:`Period to: ${inv.periodTo}`, jobTotal:parseFloat(inv.jobTotal)||0,
          fees:parseFloat(inv.fees)||0, depositApplied:-(parseFloat(inv.deposit)||0),
          retainage:-(parseFloat(inv.retainage)||0), amtDue:parseFloat(inv.amtDue)||0,
          approved:parseFloat(inv.approved)||0, paidDate:inv.paidDate||null, status:inv.status,
          notes:inv.notes||null, actualPaid:parseFloat(inv.wire)||null, creditApplied:parseFloat(inv.credit)||null })
      });
      const validLines = inv.lines.filter(l => l.code && l.bill);
      if (validLines.length > 0) {
        await fetch(API + '/approve-items', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ items: validLines.map(l => ({ type:'line_item_billing',
            data:{ code:l.code, name:l.name, currentBill:parseFloat(l.bill), invNum:fmtInv } })) })
        });
      }
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file",pendingFile); fd.append("name",pendingFile.name);
        fd.append("type","Invoice"); fd.append("vendor_key","taconic");
        fd.append("vendor_label","Taconic Builders"); fd.append("linked_id",inv.payId);
        fd.append("phase", linkedPhase);
        fd.append("note",`${fmtInv} · Period: ${inv.periodTo}`);
        await fetch(API + '/documents', { method:'POST', body:fd });
      }
      setDoneMsg(`${inv.payId} (${fmtInv}) saved — ${validLines.length} line item${validLines.length!==1?"s":""} recorded.`);
      setStage("done");
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const saveCO = async () => {
    if (!co.no || !co.amount) { setError("CO # and Amount required."); return; }
    setSaving(true); setError(null);
    try {
      const amt = parseFloat(co.amount)||0;
      await fetch(API + '/change-orders', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ no:co.no, code:co.code, div:co.div, origBudget:parseFloat(co.origBudget)||0,
          approvedCO:amt, fees:amt*0.135, total:amt*1.165,
          revisedBudget:(parseFloat(co.origBudget)||0)+amt*1.165, notes:co.notes, date:co.date })
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file",pendingFile); fd.append("name",pendingFile.name);
        fd.append("type","Change Order"); fd.append("vendor_key","taconic");
        fd.append("linked_id",co.no);
        fd.append("phase", linkedPhase); fd.append("note",`Supporting document for ${co.no}`);
        await fetch(API + '/documents', { method:'POST', body:fd });
      }
      setDoneMsg(`${co.no} saved.`); setStage("done");
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const savePriorInvoice = async () => {
    if (!prior.invNum || !prior.amount || !prior.date) { setError("Invoice #, Date, and Amount are required."); return; }
    setSaving(true); setError(null);
    try {
      const reconKey = prior.phase === "road" ? "prior_phases_road" : "prior_phases_demo";
      const workPkg  = prior.phase === "road" ? "Road Construction" : "Demolition";
      const vendor   = prior.vendor || (prior.phase === "road" ? "Luck Builders Inc." : "Mayville Enterprises Inc.");
      await fetch(API + '/historical-payments', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          stage: 'Construction', work_package: workPkg,
          payment_date: prior.date, vendor, category: 'Construction',
          description: prior.description || prior.invNum,
          amount_usd: parseFloat(prior.amount) || 0,
          source: 'invoice', notes: prior.notes || null,
          is_batched: false, reconciled_to: reconKey,
        }),
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile); fd.append("name", pendingFile.name);
        fd.append("type", "Invoice"); fd.append("vendor_key", "taconic");
        fd.append("vendor_label", workPkg); fd.append("note", prior.invNum);
        await fetch(API + '/documents', { method: 'POST', body: fd });
      }
      setDoneMsg(`${prior.invNum} saved to ${workPkg}.`);
      setStage("done");
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const saveVendor = async () => {
    if (!vend.invNum || !vend.amount) { setError("Invoice # and Amount required."); return; }
    try {
      await fetch(API + `/vendors/${vend.vendorKey}/invoices`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ invNum:vend.invNum, date:vend.date, desc:vend.desc, amount:parseFloat(vend.amount)||0, status:vend.status })
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file",pendingFile); fd.append("name",pendingFile.name);
        fd.append("type","Invoice"); fd.append("vendor_key",vend.vendorKey); fd.append("linked_id",vend.invNum);
        await fetch(API + '/documents', { method:'POST', body:fd });
      }
      setDoneMsg(`Invoice ${vend.invNum} saved.`); setStage("done");
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const reset = () => {
    setStage("upload"); setWizardStep(1); setPendingFile(null); setPdfUrl(null); setError(null); setDoneMsg("");
    setParseMsg(null);
    setInv({ payId:"",invNum:"",reqDate:"",periodTo:"",jobTotal:"",fees:"",deposit:"",retainage:"",
      amtDue:"",approved:"",paidDate:"",status:"Pending Payment",wire:"",credit:"",notes:"",lines:[] });
    setCo({ no:"",date:"",code:"",div:"",origBudget:"",amount:"",notes:"" });
    setVend({ vendorKey:"ivan",invNum:"",date:"",desc:"",amount:"",status:"Pending" });
  };


  // ── WIZARD CONFIG ──────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1); // 1=doctype 2=phase 3=upload

  const DOC_TYPES = [
    { id: "taconic_invoice", label: "Invoice",       icon: "≡",  sub: "Pay application or invoice" },
    { id: "change_order",    label: "Change Order",  icon: "△",  sub: "Scope or cost change" },
    { id: "award_letter",    label: "Award Letter",  icon: "◎",  sub: "Subcontract award" },
    { id: "other",           label: "Other",         icon: "⊕",  sub: "General document" },
  ];

  const PHASES = [
    { id: "phase11",    label: "Phase 1.1",           sub: "C25-104 · Taconic" },
    { id: "demolition", label: "Demolition",           sub: "C25-102" },
    { id: "road",       label: "Road Construction",    sub: "C23-101" },
    { id: "designeng",  label: "Design & Engineering", sub: "Arch · Reed · Ivan" },
    { id: "general",    label: "Other / General",      sub: "Project-wide" },
  ];

  const PhaseSelector = () => null; // kept for compat, wizard handles phase selection now

  const WizardStep = ({ n, label, active, done }) => (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{background: done ? "#10b981" : active ? "#111827" : "#e5e7eb", color: done||active ? "#fff" : "#9ca3af"}}>
        {done ? "✓" : n}
      </div>
      <span className="text-xs font-medium" style={{color: active ? "#111827" : done ? "#10b981" : "#9ca3af"}}>{label}</span>
    </div>
  );

  // ── UPLOAD ──────────────────────────────────────────────────────────────
  if (stage === "upload") return (
    <div className="max-w-xl space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-3 px-1">
        <WizardStep n={1} label="Document type" active={wizardStep===1} done={wizardStep>1} />
        <div className="flex-1 h-px bg-gray-200" />
        <WizardStep n={2} label="Phase" active={wizardStep===2} done={wizardStep>2} />
        <div className="flex-1 h-px bg-gray-200" />
        <WizardStep n={3} label="Upload & parse" active={wizardStep===3} done={false} />
      </div>

      <div className="bg-white border border-[#ede9e3] rounded-lg overflow-hidden">
        {/* Step 1: Document type */}
        {wizardStep === 1 && (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">What type of document?</p>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map(dt => (
                  <button key={dt.id} onClick={() => { setDocType(dt.id === "other" ? "vendor_invoice" : dt.id); setWizardStep(2); }}
                    className="flex items-start gap-3 px-4 py-3.5 rounded-lg border border-[#ede9e3] hover:border-gray-400 hover:bg-[#faf8f5] transition-all text-left">
                    <span className="text-base text-gray-400 mt-0.5 shrink-0">{dt.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{dt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{dt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Phase */}
        {wizardStep === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setWizardStep(1)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Which phase does this belong to?</p>
            <div className="space-y-2">
              {PHASES.map(ph => (
                <button key={ph.id} onClick={() => { setLinkedPhase(ph.id); setWizardStep(3); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#ede9e3] hover:border-gray-400 hover:bg-[#faf8f5] transition-all text-left">
                  <span className="text-sm font-semibold text-gray-800">{ph.label}</span>
                  <span className="text-xs text-gray-400">{ph.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {wizardStep === 3 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setWizardStep(2)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-[#faf8f5] rounded-lg border border-[#ede9e3] text-xs">
              <span className="text-gray-400">Type:</span>
              <span className="font-medium text-gray-700">{DOC_TYPES.find(d => d.id === docType || (d.id === "other" && docType === "vendor_invoice"))?.label || docType}</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400">Phase:</span>
              <span className="font-medium text-gray-700">{PHASES.find(p => p.id === linkedPhase)?.label}</span>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
            <div className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
              style={{borderColor:dragOver?"#111827":"#d1d5db",background:dragOver?"#f9f9f7":"#fafaf8"}}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
              <div className="text-2xl mb-2 text-gray-300">+</div>
              <p className="text-sm font-semibold text-gray-700">Drop PDF here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Fields auto-extracted on upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── FORM LAYOUT ──────────────────────────────────────────────────────────
  const formContent = () => {
    if (docType === "taconic_invoice") return (
      <div className="space-y-5">
        {/* File banner */}
        <div className={card + " !p-4 flex items-center justify-between"}>
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              {parsing && <p className="text-xs text-indigo-500 mt-0.5 animate-pulse">Parsing invoice data...</p>}
              {!parsing && inv.invNum && <p className="text-xs text-emerald-600 mt-0.5">✓ Data extracted from PDF</p>}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        {parseMsg && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">⚠ {parseMsg}</div>}

        <PhaseSelector />

        {/* Header */}
        <div className={card}>
          <p className={sectionTitle}>Invoice Header</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Payment ID <span className="text-red-400">*</span></label>

              </div>
              <input value={inv.payId} onChange={si("payId")} placeholder="e.g. PAY-009" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Invoice # <span className="text-red-400">*</span></label>

              </div>
              <input value={inv.invNum} onChange={si("invNum")} placeholder="Invoice number" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Request Date</label>

              </div>
              <input value={inv.reqDate} onChange={si("reqDate")} placeholder="02/09/2026" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Period To</label>

              </div>
              <input value={inv.periodTo} onChange={si("periodTo")} placeholder="January 31, 2026" className={inp}/>
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div className={card}>
          <p className={sectionTitle}>Amounts</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:"Job Total", k:"jobTotal", hint:null, req:false},
              {label:"GC Fee + Insurance", k:"fees", hint:null, req:false},
              {label:"Deposit Applied", k:"deposit", hint:"Enter positive", req:false},
              {label:"Retainage This Period", k:"retainage", hint:null, req:false},
              {label:"Amount Due", k:"amtDue", hint:null, req:false},
              {label:"Approved Amount", k:"approved", hint:null, req:true},
            ].map(({label,k,hint,req})=>(
              <div key={k}>
                <label className={lbl}>{label}{req && <span className="text-red-400 ml-0.5">*</span>}</label>
                <input value={inv[k]} onChange={si(k)} placeholder="0.00" className={inp}/>
                {hint && <p className="text-xs text-gray-300 mt-1">{hint}</p>}
              </div>
            ))}
          </div>
          {inv.approved && inv.jobTotal && (
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-xs font-medium border ${diff<1?"bg-emerald-50 border-emerald-200 text-emerald-700":diff>=9.5&&diff<=10.5?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>
              {diff<1?"✓ Amounts balance":diff>=9.5&&diff<=10.5?`✓ Balanced — $${diff.toFixed(2)} wire fee included`:`⚠ Calculated ${$f(calc)} vs Approved ${$f(appr)} — ${$f(diff)} difference`}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className={card}>
          <p className={sectionTitle}>Payment</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Status</label><select value={inv.status} onChange={si("status")} className={inp}>{["Pending Payment","Paid"].map(s=><option key={s}>{s}</option>)}</select></div>
            {inv.status==="Paid"&&<div><label className={lbl}>Date Paid</label><input value={inv.paidDate} onChange={si("paidDate")} placeholder="MM/DD/YYYY" className={inp}/></div>}
            <div>
              <label className={lbl}>Wire Sent ($) — leave 0 if paid via credit</label>
              <input value={inv.wire} onChange={si("wire")} placeholder="0" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Credit Applied ($) — from credit on account</label>
              <input value={inv.credit} onChange={si("credit")} placeholder="0.00" className={inp}/>
            </div>
            <div className="col-span-2"><label className={lbl}>Notes</label><input value={inv.notes} onChange={si("notes")} placeholder="Optional..." className={inp}/></div>
          </div>
        </div>

        {/* Line Items */}
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={sectionTitle}>Line Items Billed This Period</p>
              <p className="text-xs text-gray-300 -mt-4 mb-3">Parsed from invoice continuation sheet · completed to date auto-calculated</p>
            </div>
            <button onClick={()=>setInv(f=>({...f,lines:[...f.lines,{code:"",name:"",bill:"",_suggested:false}]}))} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">+ Add Line</button>
          </div>
          {parsing && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-600 font-medium animate-pulse mb-3">
              ⟳ Extracting all line items from continuation sheet...
            </div>
          )}
          {!parsing && inv.lines.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-400 mb-3">
              No line items parsed — PDF may not have a readable continuation sheet. Add manually using "+ Add Line".
            </div>
          )}
          {/* Column headers */}
          {inv.lines.length > 0 && (
            <div className="grid grid-cols-12 gap-2 mb-1 px-1">
              <div className="col-span-2"><span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Code</span></div>
              <div className="col-span-5"><span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Description</span></div>
              <div className="col-span-4"><span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">This Period ($)</span></div>
              <div className="col-span-1"/>
            </div>
          )}
          <div className="space-y-2">
            {inv.lines.map((li,i)=>(
              <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border ${li._suggested ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100"}`}>
                <div className="col-span-2">
                  {li._suggested && !li._codeEdited ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-indigo-700 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg flex-1 truncate">{li.code}</span>
                      <button type="button" onClick={()=>{const l=[...inv.lines];l[i]={...l[i],_codeEdited:true};setInv(f=>({...f,lines:l}));}} className="text-xs text-gray-300 hover:text-indigo-500 shrink-0">✎</button>
                    </div>
                  ) : (
                    <input value={li.code} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],code:e.target.value,_codeEdited:true};setInv(f=>({...f,lines:l}));}} className={inp}/>
                  )}
                </div>
                <div className="col-span-5">
                  {li._suggested && !li._nameEdited ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-indigo-700 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg flex-1 truncate" title={li.name}>{li.name}</span>
                      <button type="button" onClick={()=>{const l=[...inv.lines];l[i]={...l[i],_nameEdited:true};setInv(f=>({...f,lines:l}));}} className="text-xs text-gray-300 hover:text-indigo-500 shrink-0">✎</button>
                    </div>
                  ) : (
                    <input value={li.name} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],name:e.target.value,_nameEdited:true};setInv(f=>({...f,lines:l}));}} className={inp}/>
                  )}
                </div>
                <div className="col-span-4">
                  {li._suggested && !li._billEdited ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-indigo-700 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg flex-1">{li.bill}</span>
                      <button type="button" onClick={()=>{const l=[...inv.lines];l[i]={...l[i],_billEdited:true};setInv(f=>({...f,lines:l}));}} className="text-xs text-gray-300 hover:text-indigo-500 shrink-0">✎</button>
                    </div>
                  ) : (
                    <input value={li.bill} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],bill:e.target.value,_billEdited:true};setInv(f=>({...f,lines:l}));}} className={inp}/>
                  )}
                </div>
                <div className="col-span-1">
                  <button onClick={()=>setInv(f=>({...f,lines:f.lines.filter((_,idx)=>idx!==i)}))} className="w-full py-2 text-xs text-gray-300 hover:text-red-400 rounded-lg border border-gray-100 hover:border-red-200 transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
          {inv.lines.filter(l=>l._suggested).length > 0 && (
            <p className="text-xs text-indigo-400 mt-2">✎ Click to edit any field · indigo = parsed from PDF</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={() => setStage2("preview")} disabled={!inv.payId||!inv.invNum||!inv.approved} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{background:!inv.payId||!inv.invNum||!inv.approved?"#e5e7eb":"#111827",color:!inv.payId||!inv.invNum||!inv.approved?"#9ca3af":"#fff"}}>Review & Save →</button>
        </div>

        {/* ── PREVIEW MODAL ── */}
        {stage2 === "preview" && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Confirm Save</p>
                <p className="text-xs text-gray-400 mt-0.5">Review before saving to the database</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  ["Phase", PHASES.find(p => p.id === linkedPhase)?.label || linkedPhase],
                  ["Payment ID", inv.payId],
                  ["Invoice #", inv.invNum],
                  ["Period To", inv.periodTo],
                  ["Approved Amount", inv.approved ? "$" + Number(inv.approved).toLocaleString() : "—"],
                  ["Status", inv.status],
                  ["Line Items", inv.lines.filter(l => l.code && l.bill).length + " items"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{k}</span>
                    <span className="text-sm font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 flex gap-3 border-t border-gray-100">
                <button onClick={() => setStage2("form")} className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">← Edit</button>
                <button onClick={() => { setStage2("form"); saveTaconic(); }} disabled={saving} className="flex-1 py-2.5 text-sm font-bold rounded-lg text-white transition-colors" style={{background: saving ? "#9ca3af" : "#111827"}}>
                  {saving ? "Saving…" : "Confirm & Save →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (docType === "prior_invoice") return (
      <div className="space-y-5">
        <div className={card + " !p-4 flex items-center justify-between"}>
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Road Construction or Demolition invoice</p>
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}

        <div className={card}>
          <p className={sectionTitle}>Phase</p>
          <div className="grid grid-cols-2 gap-3">
            {[["road","Road Construction (C23-101)"],["demolition","Demolition (C25-102)"]].map(([id,lb]) => (
              <button key={id} onClick={() => setPrior(f => ({...f, phase: id}))}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${prior.phase === id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                {lb}
              </button>
            ))}
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Invoice Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Invoice # <span className="text-red-400">*</span></label>
              <input value={prior.invNum} onChange={sp("invNum")} placeholder="e.g. INV-001" className={inp} />
            </div>
            <div>
              <label className={lbl}>Date <span className="text-red-400">*</span></label>
              <input value={prior.date} onChange={sp("date")} placeholder="YYYY-MM-DD" className={inp} />
            </div>
            <div>
              <label className={lbl}>Vendor</label>
              <input value={prior.vendor} onChange={sp("vendor")} placeholder={prior.phase === "road" ? "Luck Builders Inc." : "Mayville Enterprises Inc."} className={inp} />
            </div>
            <div>
              <label className={lbl}>Amount (USD) <span className="text-red-400">*</span></label>
              <input value={prior.amount} onChange={sp("amount")} placeholder="0.00" className={inp} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Description</label>
              <input value={prior.description} onChange={sp("description")} placeholder="Invoice description..." className={inp} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Notes</label>
              <input value={prior.notes} onChange={sp("notes")} placeholder="Optional notes..." className={inp} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={savePriorInvoice} disabled={saving || !prior.invNum || !prior.date || !prior.amount}
            className="flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors"
            style={{background: saving||!prior.invNum||!prior.date||!prior.amount ? "#e5e7eb" : "#111827", color: saving||!prior.invNum||!prior.date||!prior.amount ? "#9ca3af" : "#fff"}}>
            {saving ? "Saving..." : "Save Invoice →"}
          </button>
        </div>
      </div>
    );

    if (docType === "change_order") return (
      <div className="space-y-5">
        <div className={card + " !p-4 flex items-center justify-between"}>
          <div className="flex items-center gap-3"><span>📄</span><div><p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>{parsing&&<p className="text-xs text-indigo-500 animate-pulse">Parsing...</p>}</div></div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <PhaseSelector />
        <div className={card}>
          <p className={sectionTitle}>Change Order Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>CO # *</label><input value={co.no} onChange={sc("no")} placeholder="CO-019" className={inp}/></div>
            <div><label className={lbl}>Date</label><input value={co.date} onChange={sc("date")} placeholder="Mar 25, 2026" className={inp}/></div>
            <div><label className={lbl}>CSI Code</label><input value={co.code} onChange={sc("code")} placeholder="06-100" className={inp}/></div>
            <div><label className={lbl}>Division</label><input value={co.div} onChange={sc("div")} placeholder="Rough Carpentry" className={inp}/></div>
            <div><label className={lbl}>Original Budget</label><input value={co.origBudget} onChange={sc("origBudget")} placeholder="139000" className={inp}/></div>
            <div><label className={lbl}>CO Amount *</label><input value={co.amount} onChange={sc("amount")} placeholder="15000" className={inp}/></div>
            <div className="col-span-2"><label className={lbl}>Notes</label><input value={co.notes} onChange={sc("notes")} placeholder="Scope description..." className={inp}/></div>
          </div>
          {co.amount && <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">Fees auto-calculated: 13.5% GC + 3% ins = Total +{$f((parseFloat(co.amount)||0)*1.165)}</div>}
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={saveCO} disabled={saving||!co.no||!co.amount} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{background:saving||!co.no||!co.amount?"#e5e7eb":"#111827"}}>{saving?"Saving...":"Save CO →"}</button>
        </div>
      </div>
    );

    if (docType === "vendor_invoice") return (
      <div className="space-y-5">
        <div className={card + " !p-4 flex items-center justify-between"}>
          <div className="flex items-center gap-3">
            <span>📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              {parsing && <p className="text-xs text-indigo-500 mt-0.5 animate-pulse">Parsing invoice data...</p>}
              {!parsing && vend.invNum && <p className="text-xs text-emerald-600 mt-0.5">✓ Data extracted from PDF</p>}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className={card}>
          <p className={sectionTitle}>Vendor Invoice</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className={lbl}>Vendor</label><select value={vend.vendorKey} onChange={sv("vendorKey")} className={inp}><option value="ivan">Ivan Zdrahal PE</option><option value="reed">Reed Hilderbrand</option><option value="arch">Architecturefirm</option></select></div>
            <div><label className={lbl}>Invoice # *</label><input value={vend.invNum} onChange={sv("invNum")} placeholder="103443" className={inp}/></div>
            <div><label className={lbl}>Date</label><input value={vend.date} onChange={sv("date")} placeholder="01/05/2026" className={inp}/></div>
            <div className="col-span-2"><label className={lbl}>Description</label><input value={vend.desc} onChange={sv("desc")} placeholder="CM Phase C..." className={inp}/></div>
            <div><label className={lbl}>Amount ($) *</label><input value={vend.amount} onChange={sv("amount")} placeholder="2655.00" className={inp}/></div>
            <div><label className={lbl}>Status</label><select value={vend.status} onChange={sv("status")} className={inp}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={saveVendor} disabled={saving||!vend.invNum||!vend.amount} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{background:saving||!vend.invNum||!vend.amount?"#e5e7eb":"#111827"}}>{saving?"Saving...":"Save →"}</button>
        </div>
      </div>
    );

    // Award letter / other
    return (
      <div className="space-y-5">
        <div className={card + " !p-4 flex items-center justify-between"}>
          <div className="flex items-center gap-3">
            <span>📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              {parsing && <p className="text-xs text-indigo-500 mt-0.5 animate-pulse">Parsing award letter...</p>}
              {!parsing && parsedAward && <p className="text-xs text-emerald-600 mt-0.5">✓ Data extracted from PDF</p>}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        {parsedAward && (
          <div className={card}>
            <p className={sectionTitle}>Parsed Award Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[["Vendor", parsedAward.vendor],["Contract #", parsedAward.contractNumber],["Award Date", parsedAward.awardDate],["CSI Code", parsedAward.csiCode],["Division", parsedAward.division],["Award Amount", parsedAward.awardAmount ? "$"+Number(parsedAward.awardAmount).toLocaleString() : ""],["Notes", parsedAward.notes]].filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!parsedAward && !parsing && <div className={card}><p className="text-sm text-gray-500">Ready to store as Award Letter — saved to Documents tab.</p></div>}
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={async()=>{setSaving(true);const fd=new FormData();fd.append("file",pendingFile);fd.append("name",pendingFile.name);fd.append("type","Award Letter");fd.append("vendor_key","");fd.append("linked_id","");await fetch(API+'/documents',{method:'POST',body:fd});setDoneMsg(`${pendingFile.name} stored.`);setStage("done");setSaving(false);}} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{background:"#111827"}}>{saving?"Saving...":"Store Document →"}</button>
        </div>
      </div>
    );
  };

  // ── FORM STAGE ──────────────────────────────────────────────────────────
  if (stage === "form") return (
    <div className={pdfUrl ? "flex gap-5 items-start" : ""}>
      <div className={pdfUrl ? "flex-1 min-w-0" : "max-w-2xl"}>
        {formContent()}
      </div>
      {pdfUrl && (
        <div className="w-[44%] shrink-0 sticky top-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 truncate">{pendingFile?.name}</p>
              <span className="text-xs text-gray-300 ml-2 shrink-0">{pendingFile?(pendingFile.size/1024).toFixed(0)+"KB":""}</span>
            </div>
            <iframe src={pdfUrl} className="w-full" style={{height:"calc(100vh - 160px)"}} title="PDF Preview"/>
          </div>
        </div>
      )}
    </div>
  );

  // ── DONE ────────────────────────────────────────────────────────────────
  if (stage === "done") return (
    <div className="max-w-xl">
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-bold text-gray-900">Saved successfully</p>
        <p className="text-sm text-gray-400 mt-1 mb-6">{doneMsg}</p>
        <button onClick={reset} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">Upload Another</button>
      </div>
    </div>
  );

  return null;
}
