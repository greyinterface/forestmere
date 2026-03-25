import { useState, useRef } from "react";

const API = '/api';
const $f = (n) => n == null || n === "" ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";

export function SmartUploadView() {
  const [stage, setStage] = useState("upload");
  const [docType, setDocType] = useState("taconic_invoice");
  const [pendingFile, setPendingFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const [invForm, setInvForm] = useState({
    payId: "", invNum: "", reqDate: "", periodTo: "",
    jobTotal: "", fees: "", depositApplied: "", retainageHeld: "",
    amtDue: "", approved: "", paidDate: "", status: "Pending Payment",
    actualPaid: "", creditApplied: "", notes: "",
    lineItems: [{ code: "", name: "", currentBill: "", completedToDate: "", pctComplete: "" }],
  });

  const [vendorForm, setVendorForm] = useState({
    vendorKey: "ivan", invNum: "", date: "", desc: "", amount: "", status: "Pending",
  });

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setError(null);
    setPendingFile(file);
    setStage("form");
  };

  const addLineItem = () => setInvForm(f => ({ ...f, lineItems: [...f.lineItems, { code: "", name: "", currentBill: "", completedToDate: "", pctComplete: "" }] }));
  const removeLineItem = (i) => setInvForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));
  const updateLineItem = (i, field, val) => setInvForm(f => { const li = [...f.lineItems]; li[i] = { ...li[i], [field]: val }; return { ...f, lineItems: li }; });

  const taconicCalc = () => (parseFloat(invForm.jobTotal)||0) + (parseFloat(invForm.fees)||0) - (parseFloat(invForm.depositApplied)||0) - (parseFloat(invForm.retainageHeld)||0);
  const liTotal = () => invForm.lineItems.reduce((s, li) => s + (parseFloat(li.currentBill) || 0), 0);
  const approved = parseFloat(invForm.approved) || 0;
  const calcDiff = Math.abs(taconicCalc() - approved);
  const liDiff = Math.abs(liTotal() - (parseFloat(invForm.jobTotal) || 0));

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
      const validLi = invForm.lineItems.filter(li => li.code && li.currentBill);
      if (validLi.length > 0) {
        await fetch(API + '/approve-items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: validLi.map(li => ({ type: 'line_item_billing', data: {
            code: li.code, name: li.name, currentBill: parseFloat(li.currentBill),
            completedToDate: parseFloat(li.completedToDate)||parseFloat(li.currentBill),
            pctComplete: parseFloat(li.pctComplete)||0, invNum: fmtInv } })) })
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

  const saveVendorInvoice = async () => {
    if (!vendorForm.invNum || !vendorForm.amount) { setError("Invoice # and Amount required."); return; }
    setSaving(true); setError(null);
    try {
      await fetch(API + `/vendors/${vendorForm.vendorKey}/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invNum: vendorForm.invNum, date: vendorForm.date, desc: vendorForm.desc, amount: parseFloat(vendorForm.amount)||0, status: vendorForm.status })
      });
      if (pendingFile) {
        const fd = new FormData(); fd.append("file", pendingFile); fd.append("name", pendingFile.name);
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
    setStage("upload"); setPendingFile(null); setError(null); setDoneMsg("");
    setInvForm({ payId:"", invNum:"", reqDate:"", periodTo:"", jobTotal:"", fees:"", depositApplied:"", retainageHeld:"", amtDue:"", approved:"", paidDate:"", status:"Pending Payment", actualPaid:"", creditApplied:"", notes:"", lineItems:[{ code:"", name:"", currentBill:"", completedToDate:"", pctComplete:"" }] });
    setVendorForm({ vendorKey:"ivan", invNum:"", date:"", desc:"", amount:"", status:"Pending" });
  };

  const FileBanner = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">📄</span>
        <div><p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
        <p className="text-xs text-gray-400">{pendingFile ? (pendingFile.size/1024).toFixed(0)+" KB" : ""}</p></div>
      </div>
      <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
    </div>
  );

  if (stage === "upload") return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Upload Document</h2>
        <p className="text-xs text-gray-400 mb-5">Upload a PDF then enter the key figures — stored directly in your database.</p>
        <div className="flex gap-2 mb-5">
          {[["taconic_invoice","Taconic Invoice"],["vendor_invoice","Vendor Invoice"],["change_order","Change Order"],["award_letter","Award Letter"]].map(([id,lbl2]) => (
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
          <p className="text-xs text-gray-400 mt-1">PDF only · Stored in your database</p>
        </div>
      </div>
    </div>
  );

  if (stage === "form" && docType === "taconic_invoice") return (
    <div className="space-y-5 max-w-3xl">
      <FileBanner />
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Invoice Header</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Payment ID <span className="text-red-400">*</span></label><input value={invForm.payId} onChange={e=>setInvForm(f=>({...f,payId:e.target.value}))} placeholder="PAY-008" className={inp}/></div>
          <div><label className={lbl}>Invoice # <span className="text-red-400">*</span></label><input value={invForm.invNum} onChange={e=>setInvForm(f=>({...f,invNum:e.target.value}))} placeholder="1976" className={inp}/></div>
          <div><label className={lbl}>Request Date</label><input value={invForm.reqDate} onChange={e=>setInvForm(f=>({...f,reqDate:e.target.value}))} placeholder="02/09/2026" className={inp}/></div>
          <div><label className={lbl}>Period To</label><input value={invForm.periodTo} onChange={e=>setInvForm(f=>({...f,periodTo:e.target.value}))} placeholder="January 31, 2026" className={inp}/></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Amounts</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Job Total (Contract Works)</label><input value={invForm.jobTotal} onChange={e=>setInvForm(f=>({...f,jobTotal:e.target.value}))} placeholder="286510.66" className={inp}/></div>
          <div><label className={lbl}>GC Fee + Insurance</label><input value={invForm.fees} onChange={e=>setInvForm(f=>({...f,fees:e.target.value}))} placeholder="48434.63" className={inp}/></div>
          <div><label className={lbl}>Deposit Applied</label><input value={invForm.depositApplied} onChange={e=>setInvForm(f=>({...f,depositApplied:e.target.value}))} placeholder="121719.15" className={inp}/><p className="text-xs text-gray-300 mt-1">Enter positive</p></div>
          <div><label className={lbl}>Retainage This Period</label><input value={invForm.retainageHeld} onChange={e=>setInvForm(f=>({...f,retainageHeld:e.target.value}))} placeholder="30465.49" className={inp}/></div>
          <div><label className={lbl}>Amount Due</label><input value={invForm.amtDue} onChange={e=>setInvForm(f=>({...f,amtDue:e.target.value}))} placeholder="182760.65" className={inp}/></div>
          <div><label className={lbl}>Approved Amount <span className="text-red-400">*</span></label><input value={invForm.approved} onChange={e=>setInvForm(f=>({...f,approved:e.target.value}))} placeholder="182760.65" className={inp}/></div>
        </div>
        {invForm.approved && invForm.jobTotal && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-xs font-medium border ${calcDiff<1?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>
            {calcDiff<1?"✓ Amounts balance correctly":`⚠ Calculated: ${$f(taconicCalc())} vs Approved: ${$f(approved)} — ${$f(calcDiff)} difference`}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Payment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Status</label><select value={invForm.status} onChange={e=>setInvForm(f=>({...f,status:e.target.value}))} className={inp}>{["Pending Payment","Paid"].map(s=><option key={s}>{s}</option>)}</select></div>
          {invForm.status==="Paid"&&<div><label className={lbl}>Date Paid</label><input value={invForm.paidDate} onChange={e=>setInvForm(f=>({...f,paidDate:e.target.value}))} placeholder="MM/DD/YYYY" className={inp}/></div>}
          <div><label className={lbl}>Actual Wire ($)</label><input value={invForm.actualPaid} onChange={e=>setInvForm(f=>({...f,actualPaid:e.target.value}))} placeholder="0 if covered by credit" className={inp}/></div>
          <div><label className={lbl}>Credit Applied ($)</label><input value={invForm.creditApplied} onChange={e=>setInvForm(f=>({...f,creditApplied:e.target.value}))} placeholder="From overpayment" className={inp}/></div>
          <div className="col-span-2"><label className={lbl}>Notes</label><input value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))} placeholder="Optional..." className={inp}/></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Line Items Billed This Period</h3><p className="text-xs text-gray-300 mt-1">Only enter lines with non-zero current bill</p></div>
          <button onClick={addLineItem} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">+ Add Line</button>
        </div>
        <div className="space-y-3">
          {invForm.lineItems.map((li,i)=>(
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="col-span-2"><label className={lbl}>CSI Code</label><input value={li.code} onChange={e=>updateLineItem(i,"code",e.target.value)} placeholder="01-001" className={inp}/></div>
              <div className="col-span-3"><label className={lbl}>Description</label><input value={li.name} onChange={e=>updateLineItem(i,"name",e.target.value)} placeholder="Project Staffing" className={inp}/></div>
              <div className="col-span-2"><label className={lbl}>This Period ($)</label><input value={li.currentBill} onChange={e=>updateLineItem(i,"currentBill",e.target.value)} placeholder="22420.00" className={inp}/></div>
              <div className="col-span-2"><label className={lbl}>Completed to Date</label><input value={li.completedToDate} onChange={e=>updateLineItem(i,"completedToDate",e.target.value)} placeholder="186786.64" className={inp}/></div>
              <div className="col-span-2"><label className={lbl}>% Complete</label><input value={li.pctComplete} onChange={e=>updateLineItem(i,"pctComplete",e.target.value)} placeholder="13.66" className={inp}/></div>
              <div className="col-span-1"><button onClick={()=>removeLineItem(i)} className="w-full py-2 text-xs text-gray-300 hover:text-red-400 rounded-lg border border-gray-200 hover:border-red-200">✕</button></div>
            </div>
          ))}
        </div>
        {invForm.lineItems.some(li=>li.currentBill)&&invForm.jobTotal&&(
          <div className={`mt-3 rounded-lg px-4 py-2 text-xs font-medium border ${liDiff<1?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-gray-50 border-gray-200 text-gray-500"}`}>
            Line items: {$f(liTotal())} vs Job total: {$f(parseFloat(invForm.jobTotal))}{liDiff>1?` — ${$f(liDiff)} diff (ok if not all lines entered yet)`:" ✓"}
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={saveTaconicInvoice} disabled={saving||!invForm.payId||!invForm.invNum||!invForm.approved}
          className="flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors"
          style={{ background: saving||!invForm.payId||!invForm.invNum||!invForm.approved?"#e5e7eb":"#111827", color: saving||!invForm.payId||!invForm.invNum||!invForm.approved?"#9ca3af":"#fff" }}>
          {saving?"Saving...":"Save Invoice + Line Items →"}
        </button>
      </div>
    </div>
  );

  if (stage === "form" && docType === "vendor_invoice") return (
    <div className="space-y-5 max-w-xl">
      <FileBanner />
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Vendor Invoice</h3>
        <div><label className={lbl}>Vendor</label><select value={vendorForm.vendorKey} onChange={e=>setVendorForm(f=>({...f,vendorKey:e.target.value}))} className={inp}><option value="ivan">Ivan Zdrahal PE</option><option value="reed">Reed Hilderbrand</option><option value="arch">Architecturefirm</option></select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Invoice # <span className="text-red-400">*</span></label><input value={vendorForm.invNum} onChange={e=>setVendorForm(f=>({...f,invNum:e.target.value}))} placeholder="103443" className={inp}/></div>
          <div><label className={lbl}>Date</label><input value={vendorForm.date} onChange={e=>setVendorForm(f=>({...f,date:e.target.value}))} placeholder="01/05/2026" className={inp}/></div>
          <div className="col-span-2"><label className={lbl}>Description</label><input value={vendorForm.desc} onChange={e=>setVendorForm(f=>({...f,desc:e.target.value}))} placeholder="CM Phase C..." className={inp}/></div>
          <div><label className={lbl}>Amount ($) <span className="text-red-400">*</span></label><input value={vendorForm.amount} onChange={e=>setVendorForm(f=>({...f,amount:e.target.value}))} placeholder="2655.00" className={inp}/></div>
          <div><label className={lbl}>Status</label><select value={vendorForm.status} onChange={e=>setVendorForm(f=>({...f,status:e.target.value}))} className={inp}>{["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={saveVendorInvoice} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{ background: saving?"#e5e7eb":"#111827" }}>{saving?"Saving...":"Save Vendor Invoice →"}</button>
      </div>
    </div>
  );

  if (stage === "form") return (
    <div className="space-y-5 max-w-xl">
      <FileBanner />
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-500">Ready to store as {docType==="change_order"?"Change Order":"Award Letter"} — PDF will be saved to Documents.</div>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={()=>storeOnly(docType==="change_order"?"Change Order":"Award Letter")} disabled={saving} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{ background:"#111827" }}>{saving?"Saving...":"Store Document →"}</button>
      </div>
    </div>
  );

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
