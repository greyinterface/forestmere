import { useState, useRef } from "react";

const API = '/api';
const $f = (n) => n == null || n === "" ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 2 });

// Input that auto-fills placeholder on click
function SmartInput({ value, onChange, placeholder, className, type="text" }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={onChange}
      onClick={e => { if (!e.target.value && placeholder) onChange({ target: { value: placeholder } }); }}
    />
  );
}

const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";

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
  const fileRef = useRef();

  const [invForm, setInvForm] = useState({
    payId: "", invNum: "", reqDate: "", periodTo: "",
    jobTotal: "", fees: "", depositApplied: "", retainageHeld: "",
    amtDue: "", approved: "", paidDate: "", status: "Pending Payment",
    actualPaid: "", creditApplied: "", notes: "",
    lineItems: [],
  });

  const [coForm, setCoForm] = useState({
    no: "", date: "", code: "", div: "", origBudget: "", approvedCO: "", notes: "",
  });

  const [vendorForm, setVendorForm] = useState({
    vendorKey: "ivan", invNum: "", date: "", desc: "", amount: "", status: "Pending",
  });

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setError(null);
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Auto-parse for taconic invoice and change orders
    if (docType === "taconic_invoice") {
      parseInvoice(file);
    } else if (docType === "change_order") {
      parseCO(file);
    } else {
      setStage("form");
    }
  };

  const parseInvoice = async (file) => {
    setParsing(true);
    setStage("form");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "taconic_invoice");
      const res = await fetch(API + '/parse-document', { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        const h = p.header || {};
        // Pre-populate all line items billed this period
        const lineItems = (p.lineItemsBilled || [])
          .filter(li => li.currentBill > 0)
          .map(li => ({ code: li.code || "", name: li.name || "", currentBill: String(li.currentBill || "") }));

        setInvForm(f => ({
          ...f,
          invNum: h.invNum ? String(h.invNum) : f.invNum,
          reqDate: h.invoiceDate || f.reqDate,
          periodTo: h.periodTo || f.periodTo,
          jobTotal: h.completedToDate ? "" : f.jobTotal,
          fees: p.fees ? String((p.fees.gcFee||0) + (p.fees.insurance||0)) : f.fees,
          depositApplied: p.fees?.depositApplied ? String(Math.abs(p.fees.depositApplied)) : f.depositApplied,
          retainageHeld: p.fees?.retainageThisPeriod ? String(Math.abs(p.fees.retainageThisPeriod)) : f.retainageHeld,
          amtDue: h.currentAmountDue ? String(h.currentAmountDue) : f.amtDue,
          approved: h.currentAmountDue ? String(h.currentAmountDue) : f.approved,
          lineItems: lineItems.length > 0 ? lineItems : f.lineItems,
        }));
      }
    } catch(e) {
      // Parse failed - just show form for manual entry
    }
    setParsing(false);
  };

  const parseCO = async (file) => {
    setParsing(true);
    setStage("form");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "change_order");
      const res = await fetch(API + '/parse-co', { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        setCoForm(f => ({
          ...f,
          no: p.coNumber || f.no,
          date: p.date || f.date,
          code: p.csiCode || f.code,
          div: p.division || f.div,
          origBudget: p.originalBudget ? String(p.originalBudget) : f.origBudget,
          approvedCO: p.coAmount ? String(p.coAmount) : f.approvedCO,
          notes: p.description || f.notes,
        }));
      }
    } catch(e) {}
    setParsing(false);
  };

  const addLineItem = () => setInvForm(f => ({ ...f, lineItems: [...f.lineItems, { code: "", name: "", currentBill: "" }] }));
  const removeLineItem = (i) => setInvForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));
  const updateLineItem = (i, field, val) => setInvForm(f => { const li = [...f.lineItems]; li[i] = { ...li[i], [field]: val }; return { ...f, lineItems: li }; });

  // Balance check - $10 wire fee is expected/normal
  const taconicCalc = () => (parseFloat(invForm.jobTotal)||0) + (parseFloat(invForm.fees)||0) - (parseFloat(invForm.depositApplied)||0) - (parseFloat(invForm.retainageHeld)||0);
  const approved = parseFloat(invForm.approved) || 0;
  const calcDiff = taconicCalc() - approved;
  const isBalanced = Math.abs(calcDiff) < 1;
  const isWireFee = Math.abs(calcDiff) >= 9.5 && Math.abs(calcDiff) <= 10.5;

  const saveTaconicInvoice = async () => {
    if (!invForm.payId || !invForm.invNum || !invForm.approved) { setError("Payment ID, Invoice #, and Approved Amount are required."); return; }
    setSaving(true); setError(null);
    try {
      const fmtInv = invForm.invNum.startsWith("#") ? invForm.invNum : `#${invForm.invNum}`;
      await fetch(API + '/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invForm.payId, reqDate: invForm.reqDate, invNum: fmtInv,
          desc: `Period to: ${invForm.periodTo}`, jobTotal: parseFloat(invForm.jobTotal)||0,
          fees: parseFloat(invForm.fees)||0, depositApplied: -(parseFloat(invForm.depositApplied)||0),
          retainage: -(parseFloat(invForm.retainageHeld)||0), amtDue: parseFloat(invForm.amtDue)||0,
          approved: parseFloat(invForm.approved)||0, paidDate: invForm.paidDate||null,
          status: invForm.status, notes: invForm.notes||null,
          actualPaid: parseFloat(invForm.actualPaid)||null, creditApplied: parseFloat(invForm.creditApplied)||null })
      });

      // Save line items - auto-calculate completed to date and % from budget
      const validLi = invForm.lineItems.filter(li => li.code && li.currentBill);
      if (validLi.length > 0) {
        await fetch(API + '/approve-items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: validLi.map(li => ({ type: 'line_item_billing', data: {
            code: li.code, name: li.name, currentBill: parseFloat(li.currentBill),
            // Completed to date and % complete auto-calculated server-side
            completedToDate: null, pctComplete: null,
            invNum: fmtInv } })) })
        });
      }

      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile); fd.append("name", pendingFile.name);
        fd.append("type", "Invoice"); fd.append("vendor_key", "taconic");
        fd.append("vendor_label", "Taconic Builders"); fd.append("linked_id", invForm.payId);
        fd.append("note", `${fmtInv} · Period: ${invForm.periodTo}`);
        await fetch(API + '/documents', { method: 'POST', body: fd });
      }
      setDoneMsg(`${invForm.payId} (${fmtInv}) saved — ${validLi.length} line item${validLi.length !== 1 ? "s" : ""} recorded.`);
      setStage("done");
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const saveCO = async () => {
    if (!coForm.no || !coForm.approvedCO) { setError("CO # and Amount required."); return; }
    setSaving(true); setError(null);
    try {
      const amt = parseFloat(coForm.approvedCO) || 0;
      const fees = amt * 0.135; const ins = amt * 0.03;
      await fetch(API + '/change-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no: coForm.no, code: coForm.code, div: coForm.div,
          origBudget: parseFloat(coForm.origBudget)||0, approvedCO: amt, fees,
          total: amt+fees+ins, revisedBudget: (parseFloat(coForm.origBudget)||0)+amt+fees+ins,
          notes: coForm.notes, date: coForm.date })
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile); fd.append("name", pendingFile.name);
        fd.append("type", "Change Order"); fd.append("vendor_key", "taconic");
        fd.append("linked_id", coForm.no);
        fd.append("note", `Supporting document for ${coForm.no}`);
        await fetch(API + '/documents', { method: 'POST', body: fd });
      }
      setDoneMsg(`${coForm.no} saved and PDF stored.`);
      setStage("done");
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const saveVendorInvoice = async () => {
    if (!vendorForm.invNum || !vendorForm.amount) { setError("Invoice # and Amount required."); return; }
    setSaving(true); setError(null);
    try {
      await fetch(API + `/vendors/${vendorForm.vendorKey}/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invNum: vendorForm.invNum, date: vendorForm.date, desc: vendorForm.desc, amount: parseFloat(vendorForm.amount)||0, status: vendorForm.status })
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile); fd.append("name", pendingFile.name);
        fd.append("type", "Invoice"); fd.append("vendor_key", vendorForm.vendorKey); fd.append("linked_id", vendorForm.invNum);
        await fetch(API + '/documents', { method: 'POST', body: fd });
      }
      setDoneMsg(`Invoice ${vendorForm.invNum} saved.`); setStage("done");
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const storeOnly = async (type) => {
    setSaving(true);
    const fd = new FormData();
    fd.append("file", pendingFile); fd.append("name", pendingFile.name);
    fd.append("type", type); fd.append("vendor_key", ""); fd.append("linked_id", "");
    await fetch(API + '/documents', { method: 'POST', body: fd });
    setDoneMsg(`${pendingFile.name} stored.`); setStage("done"); setSaving(false);
  };

  const reset = () => {
    setStage("upload"); setPendingFile(null); setPdfUrl(null); setError(null); setDoneMsg("");
    setInvForm({ payId:"", invNum:"", reqDate:"", periodTo:"", jobTotal:"", fees:"", depositApplied:"", retainageHeld:"", amtDue:"", approved:"", paidDate:"", status:"Pending Payment", actualPaid:"", creditApplied:"", notes:"", lineItems:[] });
    setCoForm({ no:"", date:"", code:"", div:"", origBudget:"", approvedCO:"", notes:"" });
    setVendorForm({ vendorKey:"ivan", invNum:"", date:"", desc:"", amount:"", status:"Pending" });
  };

  // ══ LAYOUT WRAPPER: split screen when PDF loaded ══════════════════════════
  const SplitLayout = ({ children }) => (
    pdfUrl && stage === "form" ? (
      <div className="flex gap-5 items-start">
        {/* Form - left side */}
        <div className="flex-1 min-w-0 space-y-5">{children}</div>
        {/* PDF Preview - right side, sticky */}
        <div className="w-[45%] shrink-0 sticky top-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 truncate">{pendingFile?.name}</p>
              <span className="text-xs text-gray-400">{pendingFile ? (pendingFile.size/1024).toFixed(0)+"KB" : ""}</span>
            </div>
            <iframe src={pdfUrl} className="w-full" style={{ height: "calc(100vh - 180px)" }} title="Invoice Preview" />
          </div>
        </div>
      </div>
    ) : <div className="space-y-5 max-w-2xl">{children}</div>
  );

  const FormWrapper = ({ children }) => (
    pdfUrl && stage === "form" ? <div className="space-y-5">{children}</div> : <div className="space-y-5 max-w-3xl">{children}</div>
  );

  // ══ STAGE: UPLOAD ════════════════════════════════════════════════════════
  if (stage === "upload") return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Upload Document</h2>
        <p className="text-xs text-gray-400 mb-5">Upload a PDF — Taconic invoices and Change Orders auto-parse.</p>
        <div className="flex gap-2 mb-5">
          {[["taconic_invoice","Taconic Invoice"],["change_order","Change Order"],["vendor_invoice","Vendor Invoice"],["award_letter","Award Letter"]].map(([id,lbl2]) => (
            <button key={id} onClick={() => setDocType(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: docType===id?"#111827":"#f3f4f6", color: docType===id?"#fff":"#6b7280" }}>{lbl2}</button>
          ))}
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragOver?"#6366f1":"#e5e7eb", background: dragOver?"#eef2ff":"#fafafa" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <div className="text-3xl mb-3">📄</div>
          <p className="text-sm font-semibold text-gray-700">Drop PDF here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">
            {docType === "taconic_invoice" ? "AI will parse and pre-fill all fields" :
             docType === "change_order" ? "AI will parse and pre-fill CO details" :
             "PDF stored in Documents tab"}
          </p>
        </div>
      </div>
    </div>
  );

  // ══ STAGE: FORM — Taconic Invoice ════════════════════════════════════════
  if (stage === "form" && docType === "taconic_invoice") return (
    <SplitLayout>
      <FormWrapper>
        {/* File banner */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              {parsing && <p className="text-xs text-indigo-500 mt-0.5">⟳ Parsing invoice data...</p>}
              {!parsing && invForm.invNum && <p className="text-xs text-emerald-600 mt-0.5">✓ Auto-filled from PDF</p>}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}

        {/* Invoice Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Invoice Header</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Payment ID <span className="text-red-400">*</span></label>
              <SmartInput value={invForm.payId} onChange={e=>setInvForm(f=>({...f,payId:e.target.value}))} placeholder="PAY-008" className={inp}/></div>
            <div><label className={lbl}>Invoice # <span className="text-red-400">*</span></label>
              <SmartInput value={invForm.invNum} onChange={e=>setInvForm(f=>({...f,invNum:e.target.value}))} placeholder="1976" className={inp}/></div>
            <div><label className={lbl}>Request Date</label>
              <SmartInput value={invForm.reqDate} onChange={e=>setInvForm(f=>({...f,reqDate:e.target.value}))} placeholder="02/09/2026" className={inp}/></div>
            <div><label className={lbl}>Period To</label>
              <SmartInput value={invForm.periodTo} onChange={e=>setInvForm(f=>({...f,periodTo:e.target.value}))} placeholder="January 31, 2026" className={inp}/></div>
          </div>
        </div>

        {/* Amounts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Amounts</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Job Total (Contract Works)</label>
              <SmartInput value={invForm.jobTotal} onChange={e=>setInvForm(f=>({...f,jobTotal:e.target.value}))} placeholder="286510.66" className={inp}/></div>
            <div><label className={lbl}>GC Fee + Insurance</label>
              <SmartInput value={invForm.fees} onChange={e=>setInvForm(f=>({...f,fees:e.target.value}))} placeholder="48434.63" className={inp}/></div>
            <div><label className={lbl}>Deposit Applied</label>
              <SmartInput value={invForm.depositApplied} onChange={e=>setInvForm(f=>({...f,depositApplied:e.target.value}))} placeholder="121719.15" className={inp}/>
              <p className="text-xs text-gray-300 mt-1">Enter positive</p></div>
            <div><label className={lbl}>Retainage This Period</label>
              <SmartInput value={invForm.retainageHeld} onChange={e=>setInvForm(f=>({...f,retainageHeld:e.target.value}))} placeholder="30465.49" className={inp}/></div>
            <div><label className={lbl}>Amount Due</label>
              <SmartInput value={invForm.amtDue} onChange={e=>setInvForm(f=>({...f,amtDue:e.target.value}))} placeholder="182760.65" className={inp}/></div>
            <div><label className={lbl}>Approved Amount <span className="text-red-400">*</span></label>
              <SmartInput value={invForm.approved} onChange={e=>setInvForm(f=>({...f,approved:e.target.value}))} placeholder="182770.65" className={inp}/></div>
          </div>
          {/* Balance check - $10 wire fee is expected */}
          {invForm.approved && invForm.jobTotal && (
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-xs font-medium border ${
              isBalanced ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
              isWireFee ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
              "bg-amber-50 border-amber-200 text-amber-700"}`}>
              {isBalanced ? "✓ Amounts balance correctly" :
               isWireFee ? `✓ Balanced — $${Math.abs(calcDiff).toFixed(2)} wire fee included` :
               `⚠ Calculated: ${$f(taconicCalc())} vs Approved: ${$f(approved)} — ${$f(Math.abs(calcDiff))} difference`}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Payment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Status</label>
              <select value={invForm.status} onChange={e=>setInvForm(f=>({...f,status:e.target.value}))} className={inp}>
                {["Pending Payment","Paid"].map(s=><option key={s}>{s}</option>)}
              </select></div>
            {invForm.status==="Paid"&&<div><label className={lbl}>Date Paid</label>
              <SmartInput value={invForm.paidDate} onChange={e=>setInvForm(f=>({...f,paidDate:e.target.value}))} placeholder="MM/DD/YYYY" className={inp}/></div>}
            <div><label className={lbl}>Actual Wire ($)</label>
              <SmartInput value={invForm.actualPaid} onChange={e=>setInvForm(f=>({...f,actualPaid:e.target.value}))} placeholder="0 if covered by credit" className={inp}/></div>
            <div><label className={lbl}>Credit Applied ($)</label>
              <SmartInput value={invForm.creditApplied} onChange={e=>setInvForm(f=>({...f,creditApplied:e.target.value}))} placeholder="0.00" className={inp}/></div>
            <div className="col-span-2"><label className={lbl}>Notes</label>
              <SmartInput value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))} placeholder="Optional..." className={inp}/></div>
          </div>
        </div>

        {/* Line Items - auto-populated, no completed/% columns */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Line Items Billed This Period</h3>
              <p className="text-xs text-gray-300 mt-1">Only lines with a non-zero current bill · completed to date auto-calculated</p>
            </div>
            <button onClick={addLineItem} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">+ Add Line</button>
          </div>
          {parsing && (
            <div className="text-center py-4 text-xs text-indigo-500">⟳ Loading line items from PDF...</div>
          )}
          {!parsing && invForm.lineItems.length === 0 && (
            <div className="text-center py-4 text-xs text-gray-300">No line items yet — add manually or upload a parseable PDF</div>
          )}
          <div className="space-y-2">
            {invForm.lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">CSI Code</label>
                  <SmartInput value={li.code} onChange={e=>updateLineItem(i,"code",e.target.value)} placeholder="01-001" className={inp}/></div>
                <div className="col-span-5"><label className="block text-xs text-gray-400 mb-1">Description</label>
                  <SmartInput value={li.name} onChange={e=>updateLineItem(i,"name",e.target.value)} placeholder="Project Staffing" className={inp}/></div>
                <div className="col-span-4"><label className="block text-xs text-gray-400 mb-1">This Period ($)</label>
                  <SmartInput value={li.currentBill} onChange={e=>updateLineItem(i,"currentBill",e.target.value)} placeholder="22420.00" className={inp}/></div>
                <div className="col-span-1"><button onClick={()=>removeLineItem(i)} className="w-full py-2 text-xs text-gray-300 hover:text-red-400 rounded-lg border border-gray-200 hover:border-red-200">✕</button></div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={saveTaconicInvoice} disabled={saving||!invForm.payId||!invForm.invNum||!invForm.approved}
            className="flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors"
            style={{ background: saving||!invForm.payId||!invForm.invNum||!invForm.approved?"#e5e7eb":"#111827", color: saving||!invForm.payId||!invForm.invNum||!invForm.approved?"#9ca3af":"#fff" }}>
            {saving?"Saving...":"Save Invoice + Line Items →"}
          </button>
        </div>
      </FormWrapper>
    </SplitLayout>
  );

  // ══ STAGE: FORM — Change Order ═══════════════════════════════════════════
  if (stage === "form" && docType === "change_order") return (
    <SplitLayout>
      <FormWrapper>
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
              {parsing && <p className="text-xs text-indigo-500 mt-0.5">⟳ Parsing change order data...</p>}
              {!parsing && coForm.no && <p className="text-xs text-emerald-600 mt-0.5">✓ Auto-filled from PDF</p>}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}

        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Change Order Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>CO # <span className="text-red-400">*</span></label>
              <SmartInput value={coForm.no} onChange={e=>setCoForm(f=>({...f,no:e.target.value}))} placeholder="CO-019" className={inp}/></div>
            <div><label className={lbl}>Date</label>
              <SmartInput value={coForm.date} onChange={e=>setCoForm(f=>({...f,date:e.target.value}))} placeholder="Mar 25, 2026" className={inp}/></div>
            <div><label className={lbl}>CSI Code</label>
              <SmartInput value={coForm.code} onChange={e=>setCoForm(f=>({...f,code:e.target.value}))} placeholder="06-100" className={inp}/></div>
            <div><label className={lbl}>Division</label>
              <SmartInput value={coForm.div} onChange={e=>setCoForm(f=>({...f,div:e.target.value}))} placeholder="Rough Carpentry" className={inp}/></div>
            <div><label className={lbl}>Original Budget</label>
              <SmartInput value={coForm.origBudget} onChange={e=>setCoForm(f=>({...f,origBudget:e.target.value}))} placeholder="139000" className={inp}/></div>
            <div><label className={lbl}>CO Amount <span className="text-red-400">*</span></label>
              <SmartInput value={coForm.approvedCO} onChange={e=>setCoForm(f=>({...f,approvedCO:e.target.value}))} placeholder="15000" className={inp}/></div>
            <div className="col-span-2"><label className={lbl}>Description / Notes</label>
              <SmartInput value={coForm.notes} onChange={e=>setCoForm(f=>({...f,notes:e.target.value}))} placeholder="Scope change description..." className={inp}/></div>
          </div>
          {coForm.approvedCO && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500">
              Fees auto-calculated: 13.5% GC fee (${((parseFloat(coForm.approvedCO)||0)*0.135).toLocaleString("en-US",{maximumFractionDigits:0})}) + 3% insurance (${((parseFloat(coForm.approvedCO)||0)*0.03).toLocaleString("en-US",{maximumFractionDigits:0})}) = Total +${((parseFloat(coForm.approvedCO)||0)*1.165).toLocaleString("en-US",{maximumFractionDigits:0})}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={saveCO} disabled={saving||!coForm.no||!coForm.approvedCO}
            className="flex-1 py-3 text-sm font-bold rounded-xl text-white"
            style={{ background: saving||!coForm.no||!coForm.approvedCO?"#e5e7eb":"#111827", color: saving||!coForm.no||!coForm.approvedCO?"#9ca3af":"#fff" }}>
            {saving?"Saving...":"Save Change Order →"}
          </button>
        </div>
      </FormWrapper>
    </SplitLayout>
  );

  // ══ STAGE: FORM — Vendor Invoice ═════════════════════════════════════════
  if (stage === "form" && docType === "vendor_invoice") return (
    <SplitLayout>
      <FormWrapper>
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Vendor Invoice</h3>
          <div><label className={lbl}>Vendor</label>
            <select value={vendorForm.vendorKey} onChange={e=>setVendorForm(f=>({...f,vendorKey:e.target.value}))} className={inp}>
              <option value="ivan">Ivan Zdrahal PE</option>
              <option value="reed">Reed Hilderbrand</option>
              <option value="arch">Architecturefirm</option>
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Invoice # <span className="text-red-400">*</span></label>
              <SmartInput value={vendorForm.invNum} onChange={e=>setVendorForm(f=>({...f,invNum:e.target.value}))} placeholder="103443" className={inp}/></div>
            <div><label className={lbl}>Date</label>
              <SmartInput value={vendorForm.date} onChange={e=>setVendorForm(f=>({...f,date:e.target.value}))} placeholder="01/05/2026" className={inp}/></div>
            <div className="col-span-2"><label className={lbl}>Description</label>
              <SmartInput value={vendorForm.desc} onChange={e=>setVendorForm(f=>({...f,desc:e.target.value}))} placeholder="CM Phase C..." className={inp}/></div>
            <div><label className={lbl}>Amount ($) <span className="text-red-400">*</span></label>
              <SmartInput value={vendorForm.amount} onChange={e=>setVendorForm(f=>({...f,amount:e.target.value}))} placeholder="2655.00" className={inp}/></div>
            <div><label className={lbl}>Status</label>
              <select value={vendorForm.status} onChange={e=>setVendorForm(f=>({...f,status:e.target.value}))} className={inp}>
                {["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={saveVendorInvoice} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{ background: saving?"#e5e7eb":"#111827" }}>{saving?"Saving...":"Save Vendor Invoice →"}</button>
        </div>
      </FormWrapper>
    </SplitLayout>
  );

  // ══ STAGE: FORM — Other ══════════════════════════════════════════════════
  if (stage === "form") return (
    <SplitLayout>
      <FormWrapper>
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-500">Ready to store as {docType==="award_letter"?"Award Letter":"document"} — PDF will be saved to Documents.</div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className="flex gap-3">
          <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={()=>storeOnly("Award Letter")} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{ background:"#111827" }}>{saving?"Saving...":"Store Document →"}</button>
        </div>
      </FormWrapper>
    </SplitLayout>
  );

  // ══ STAGE: DONE ══════════════════════════════════════════════════════════
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
