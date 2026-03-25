import { useState, useRef } from "react";

const API = '/api';
const $f = (n) => n == null || n === "" ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";



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

  const [inv, setInv] = useState({
    payId:"", invNum:"", reqDate:"", periodTo:"",
    jobTotal:"", fees:"", deposit:"", retainage:"",
    amtDue:"", approved:"", paidDate:"", status:"Pending Payment",
    wire:"", credit:"", notes:"",
    lines:[],
  });

  const [co, setCo] = useState({ no:"", date:"", code:"", div:"", origBudget:"", amount:"", notes:"" });
  const [vend, setVend] = useState({ vendorKey:"ivan", invNum:"", date:"", desc:"", amount:"", status:"Pending" });

  const si = (k) => (e) => setInv(f => ({...f, [k]: e.target.value}));
  const sc = (k) => (e) => setCo(f => ({...f, [k]: e.target.value}));
  const sv = (k) => (e) => setVend(f => ({...f, [k]: e.target.value}));

  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    setError(null);
    setPendingFile(file);
    setPdfUrl(URL.createObjectURL(file));
    if (docType === "taconic_invoice") { setStage("form"); parseInvoice(file); }
    else if (docType === "change_order") { setStage("form"); parseCO(file); }
    else setStage("form");
  };

  const parseInvoice = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(API + '/parse-document', { method:"POST", body:fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
        const p = data.parsed;
        const h = p.header || {};
        const rawLines = p.lineItemsBilled || [];
        const lines = rawLines
          .filter(l => parseFloat(l.currentBill) > 0)
          .map(l => ({ code: l.code||"", name: l.name||"", bill: String(l.currentBill||"") }));
        setInv(f => ({
          ...f,
          invNum: h.invNum ? String(h.invNum) : f.invNum,
          reqDate: h.invoiceDate || f.reqDate,
          periodTo: h.periodTo || f.periodTo,
          fees: p.fees ? String(((p.fees.gcFee||0)+(p.fees.insurance||0)).toFixed(2)) : f.fees,
          deposit: p.fees?.depositApplied ? String(Math.abs(p.fees.depositApplied)) : f.deposit,
          retainage: p.fees?.retainageThisPeriod ? String(Math.abs(p.fees.retainageThisPeriod)) : f.retainage,
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

  // Balance check - $10 wire fee is normal
  const calc = (parseFloat(inv.jobTotal)||0) + (parseFloat(inv.fees)||0) - (parseFloat(inv.deposit)||0) - (parseFloat(inv.retainage)||0);
  const appr = parseFloat(inv.approved) || 0;
  const diff = Math.abs(calc - appr);
  const balanced = diff < 1;
  const wireFee = diff >= 9.5 && diff <= 10.5;

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
          approvedCO:amt, fees:amt*0.135, total:amt*1.165, revisedBudget:(parseFloat(co.origBudget)||0)+amt*1.165,
          notes:co.notes, date:co.date })
      });
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file",pendingFile); fd.append("name",pendingFile.name);
        fd.append("type","Change Order"); fd.append("vendor_key","taconic");
        fd.append("linked_id",co.no); fd.append("note",`Supporting document for ${co.no}`);
        await fetch(API + '/documents', { method:'POST', body:fd });
      }
      setDoneMsg(`${co.no} saved.`); setStage("done");
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const saveVendor = async () => {
    if (!vend.invNum || !vend.amount) { setError("Invoice # and Amount required."); return; }
    setSaving(true); setError(null);
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
    setStage("upload"); setPendingFile(null); setPdfUrl(null); setError(null); setDoneMsg("");
    setInv({ payId:"",invNum:"",reqDate:"",periodTo:"",jobTotal:"",fees:"",deposit:"",retainage:"",amtDue:"",approved:"",paidDate:"",status:"Pending Payment",wire:"",credit:"",notes:"",lines:[] });
    setCo({ no:"",date:"",code:"",div:"",origBudget:"",amount:"",notes:"" });
    setVend({ vendorKey:"ivan",invNum:"",date:"",desc:"",amount:"",status:"Pending" });
  };

  // Layout: split screen when PDF loaded, single column otherwise
  const Wrap = ({ children }) => pdfUrl && stage==="form" ? (
    <div className="flex gap-5 items-start">
      <div className="flex-1 min-w-0 space-y-5">{children}</div>
      <div className="w-[44%] shrink-0 sticky top-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 truncate">{pendingFile?.name}</p>
            <span className="text-xs text-gray-300 shrink-0 ml-2">{pendingFile?(pendingFile.size/1024).toFixed(0)+"KB":""}</span>
          </div>
          <iframe src={pdfUrl} className="w-full" style={{height:"calc(100vh - 160px)"}} title="PDF Preview"/>
        </div>
      </div>
    </div>
  ) : <div className="space-y-5 max-w-2xl">{children}</div>;

  const Form = ({ children }) => <div className="space-y-5">{children}</div>;

  const Card = ({ title, children }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
      {title && <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">{title}</h3>}
      {children}
    </div>
  );

  const FileBanner = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">📄</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
          {parsing && <p className="text-xs text-indigo-500 mt-0.5 animate-pulse">Parsing PDF...</p>}
          {!parsing && (inv.invNum || co.no) && <p className="text-xs text-emerald-600 mt-0.5">✓ Data extracted from PDF</p>}
        </div>
      </div>
      <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 ml-4 shrink-0">Change file</button>
    </div>
  );

  const Btns = ({ onSave, disabled }) => (
    <div className="flex gap-3">
      <button onClick={reset} className="px-5 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
      <button onClick={onSave} disabled={disabled || saving}
        className="flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors"
        style={{ background: disabled||saving?"#e5e7eb":"#111827", color: disabled||saving?"#9ca3af":"#fff" }}>
        {saving ? "Saving..." : "Save →"}
      </button>
    </div>
  );

  // ── UPLOAD ──────────────────────────────────────────────────────────────
  if (stage === "upload") return (
    <div className="space-y-5 max-w-2xl">
      <Card title="Upload Document">
        <p className="text-xs text-gray-400 -mt-3 mb-5">Taconic invoices and Change Orders auto-parse from PDF.</p>
        <div className="flex gap-2 mb-5 flex-wrap">
          {[["taconic_invoice","Taconic Invoice"],["change_order","Change Order"],["vendor_invoice","Vendor Invoice"],["award_letter","Award Letter"]].map(([id,lb]) => (
            <button key={id} onClick={()=>setDocType(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{background:docType===id?"#111827":"#f3f4f6",color:docType===id?"#fff":"#6b7280"}}>{lb}</button>
          ))}
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
          style={{borderColor:dragOver?"#6366f1":"#e5e7eb",background:dragOver?"#eef2ff":"#fafafa"}}
          onClick={()=>fileRef.current?.click()}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
          <div className="text-3xl mb-3">📄</div>
          <p className="text-sm font-semibold text-gray-700">Drop PDF here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">{docType==="taconic_invoice"?"AI extracts all fields and line items":docType==="change_order"?"AI extracts CO details":"PDF stored in Documents"}</p>
        </div>
      </Card>
    </div>
  );

  // ── TACONIC INVOICE FORM ────────────────────────────────────────────────
  if (stage === "form" && docType === "taconic_invoice") return (
    <Wrap>
      <Form>
        <FileBanner/>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}

        <Card title="Invoice Header">
          <div className="grid grid-cols-2 gap-4">
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Payment ID <span className="text-red-400">*</span></label>
      <input value={inv.payId} onChange={si("payId")} placeholder="PAY-008" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Invoice # <span className="text-red-400">*</span></label>
      <input value={inv.invNum} onChange={si("invNum")} placeholder="1976" className={inp}/>
    </div>
            <F label="Request Date" value={inv.reqDate} onChange={si("reqDate")} suggest="02/09/2026"/>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Period To</label>
      <input value={inv.periodTo} onChange={si("periodTo")} placeholder="January 31, 2026" className={inp}/>
    </div>
          </div>
        </Card>

        <Card title="Amounts">
          <div className="grid grid-cols-2 gap-4">
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Job Total (Contract Works)</label>
      <input value={inv.jobTotal} onChange={si("jobTotal")} placeholder="286510.66" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">GC Fee + Insurance</label>
      <input value={inv.fees} onChange={si("fees")} placeholder="48434.63" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Deposit Applied</label>
      <input value={inv.deposit} onChange={si("deposit")} placeholder="121719.15" className={inp}/>
      <p className="text-xs text-gray-300 mt-1">{"Enter positive"}</p>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Retainage This Period</label>
      <input value={inv.retainage} onChange={si("retainage")} placeholder="30465.49" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Amount Due</label>
      <input value={inv.amtDue} onChange={si("amtDue")} placeholder="182760.65" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Approved Amount <span className="text-red-400">*</span></label>
      <input value={inv.approved} onChange={si("approved")} placeholder="182770.65" className={inp}/>
    </div>
          </div>
          {inv.approved && inv.jobTotal && (
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-xs font-medium border ${balanced||wireFee?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>
              {balanced?"✓ Amounts balance correctly":wireFee?`✓ Balanced — $${diff.toFixed(2)} wire fee included`:`⚠ Calculated: ${$f(calc)} vs Approved: ${$f(appr)} — ${$f(diff)} difference`}
            </div>
          )}
        </Card>

        <Card title="Payment">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select value={inv.status} onChange={si("status")} className={inp}>
                {["Pending Payment","Paid"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {inv.status==="Paid"&&<F label="Date Paid" value={inv.paidDate} onChange={si("paidDate")} suggest="MM/DD/YYYY"/>}
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Actual Wire ($)</label>
      <input value={inv.wire} onChange={si("wire")} placeholder="0 if credit" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Credit Applied ($)</label>
      <input value={inv.credit} onChange={si("credit")} placeholder="0.00" className={inp}/>
    </div>
            <div className="col-span-2">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
      <input value={inv.notes} onChange={si("notes")} placeholder="Optional..." className={inp}/>
    </div>
          </div>
        </Card>

        <Card title="Line Items Billed This Period">
          <div className="flex items-center justify-between -mt-3 mb-4">
            <p className="text-xs text-gray-300">Completed to date auto-calculated</p>
            <button onClick={()=>setInv(f=>({...f,lines:[...f.lines,{code:"",name:"",bill:""}]}))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">+ Add Line</button>
          </div>
          {parsing&&<div className="text-center py-4 text-xs text-indigo-500 animate-pulse">Extracting line items from PDF...</div>}
          {!parsing && inv.lines.length===0&&<div className="text-center py-4 text-xs text-gray-300">No line items found — add manually or check PDF has a billing schedule</div>}
          <div className="space-y-2">
            {inv.lines.map((li,i)=>(
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="col-span-2">
                  {i===0&&<label className="block text-xs text-gray-400 mb-1">CSI Code</label>}
                  <input value={li.code} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],code:e.target.value};setInv(f=>({...f,lines:l}));}} className={inp}/>
                </div>
                <div className="col-span-5">
                  {i===0&&<label className="block text-xs text-gray-400 mb-1">Description</label>}
                  <input value={li.name} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],name:e.target.value};setInv(f=>({...f,lines:l}));}} className={inp}/>
                </div>
                <div className="col-span-4">
                  {i===0&&<label className="block text-xs text-gray-400 mb-1">This Period ($)</label>}
                  <input value={li.bill} onChange={e=>{const l=[...inv.lines];l[i]={...l[i],bill:e.target.value};setInv(f=>({...f,lines:l}));}} className={inp}/>
                </div>
                <div className="col-span-1">
                  {i===0&&<div className="mb-1 h-4"/>}
                  <button onClick={()=>setInv(f=>({...f,lines:f.lines.filter((_,idx)=>idx!==i)}))}
                    className="w-full py-2 text-xs text-gray-300 hover:text-red-400 rounded-lg border border-gray-100 hover:border-red-200 transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Btns onSave={saveTaconic} disabled={!inv.payId||!inv.invNum||!inv.approved}/>
      </Form>
    </Wrap>
  );

  // ── CHANGE ORDER FORM ───────────────────────────────────────────────────
  if (stage === "form" && docType === "change_order") return (
    <Wrap>
      <Form>
        <FileBanner/>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <Card title="Change Order Details">
          <div className="grid grid-cols-2 gap-4">
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">CO # <span className="text-red-400">*</span></label>
      <input value={co.no} onChange={sc("no")} placeholder="CO-019" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
      <input value={co.date} onChange={sc("date")} placeholder="Mar 25, 2026" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">CSI Code</label>
      <input value={co.code} onChange={sc("code")} placeholder="06-100" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Division</label>
      <input value={co.div} onChange={sc("div")} placeholder="Rough Carpentry" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Original Budget</label>
      <input value={co.origBudget} onChange={sc("origBudget")} placeholder="139000" className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">CO Amount <span className="text-red-400">*</span></label>
      <input value={co.amount} onChange={sc("amount")} placeholder="15000" className={inp}/>
    </div>
            <F label="Description / Notes" col2 value={co.notes} onChange={sc("notes")} suggest="Scope change description..."/>
          </div>
          {co.amount && (
            <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500">
              Fees auto-calculated: 13.5% GC + 3% insurance = Total +{$f((parseFloat(co.amount)||0)*1.165)}
            </div>
          )}
        </Card>
        <Btns onSave={saveCO} disabled={!co.no||!co.amount}/>
      </Form>
    </Wrap>
  );

  // ── VENDOR INVOICE FORM ─────────────────────────────────────────────────
  if (stage === "form" && docType === "vendor_invoice") return (
    <Wrap>
      <Form>
        <FileBanner/>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <Card title="Vendor Invoice">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Vendor</label>
              <select value={vend.vendorKey} onChange={sv("vendorKey")} className={inp}>
                <option value="ivan">Ivan Zdrahal PE</option>
                <option value="reed">Reed Hilderbrand</option>
                <option value="arch">Architecturefirm</option>
              </select>
            </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Invoice # <span className="text-red-400">*</span></label>
      <input value={vend.invNum} onChange={sv("invNum")} placeholder="103443" className={inp}/>
    </div>
            <F label="Date" value={vend.date} onChange={sv("date")} suggest="01/05/2026"/>
            <div className="col-span-2">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
      <input value={vend.desc} onChange={sv("desc")} placeholder="CM Phase C..." className={inp}/>
    </div>
            <div className="">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Amount ($) <span className="text-red-400">*</span></label>
      <input value={vend.amount} onChange={sv("amount")} placeholder="2655.00" className={inp}/>
    </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select value={vend.status} onChange={sv("status")} className={inp}>
                {["Pending","Paid","In Review"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </Card>
        <Btns onSave={saveVendor} disabled={!vend.invNum||!vend.amount}/>
      </Form>
    </Wrap>
  );

  // ── STORE ONLY ──────────────────────────────────────────────────────────
  if (stage === "form") return (
    <Wrap>
      <Form>
        <FileBanner/>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <Card><p className="text-sm text-gray-500">Ready to store as Award Letter — PDF saved to Documents.</p></Card>
        <Btns onSave={async()=>{setSaving(true);const fd=new FormData();fd.append("file",pendingFile);fd.append("name",pendingFile.name);fd.append("type","Award Letter");fd.append("vendor_key","");fd.append("linked_id","");await fetch(API+'/documents',{method:'POST',body:fd});setDoneMsg(`${pendingFile.name} stored.`);setStage("done");setSaving(false);}} disabled={false}/>
      </Form>
    </Wrap>
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
