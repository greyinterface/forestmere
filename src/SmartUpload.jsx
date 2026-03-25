import { useState, useRef } from "react";

const API = '/api';
const $f = (n) => n == null || n === "" ? "—" : "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";
const card = "bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6";
const sectionTitle = "text-xs font-bold uppercase tracking-widest text-gray-400 mb-5";

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
    wire:"", credit:"", notes:"", lines:[],
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
    setStage("form");
    if (docType === "taconic_invoice") parseInvoice(file);
    else if (docType === "change_order") parseCO(file);
  };

  const parseInvoice = async (file) => {
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(API + '/parse-document', { method:"POST", body:fd });
      const data = await res.json();
      if (data.ok && data.parsed) {
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
    setInv({ payId:"",invNum:"",reqDate:"",periodTo:"",jobTotal:"",fees:"",deposit:"",retainage:"",
      amtDue:"",approved:"",paidDate:"",status:"Pending Payment",wire:"",credit:"",notes:"",lines:[] });
    setCo({ no:"",date:"",code:"",div:"",origBudget:"",amount:"",notes:"" });
    setVend({ vendorKey:"ivan",invNum:"",date:"",desc:"",amount:"",status:"Pending" });
  };

  // ── UPLOAD ──────────────────────────────────────────────────────────────
  if (stage === "upload") return (
    <div className="space-y-5 max-w-2xl">
      <div className={card}>
        <h2 className="text-sm font-bold text-gray-900 mb-1">Upload Document</h2>
        <p className="text-xs text-gray-400 mb-5">Taconic invoices and Change Orders auto-parse from PDF.</p>
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
          <p className="text-xs text-gray-400 mt-1">{docType==="taconic_invoice"||docType==="change_order"?"AI extracts all fields automatically":"PDF stored in Documents"}</p>
        </div>
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

        {/* Header */}
        <div className={card}>
          <p className={sectionTitle}>Invoice Header</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Payment ID <span className="text-red-400">*</span></label>
                {!inv.payId && <button type="button" tabIndex={-1} onClick={()=>setInv(f=>({...f,payId:"PAY-008"}))} className="text-xs text-indigo-400 hover:text-indigo-600">↵ PAY-008</button>}
              </div>
              <input value={inv.payId} onChange={si("payId")} placeholder="PAY-008" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Invoice # <span className="text-red-400">*</span></label>
                {!inv.invNum && <button type="button" tabIndex={-1} onClick={()=>setInv(f=>({...f,invNum:"1976"}))} className="text-xs text-indigo-400 hover:text-indigo-600">↵ 1976</button>}
              </div>
              <input value={inv.invNum} onChange={si("invNum")} placeholder="1976" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Request Date</label>
                {!inv.reqDate && <button type="button" tabIndex={-1} onClick={()=>setInv(f=>({...f,reqDate:"02/09/2026"}))} className="text-xs text-indigo-400 hover:text-indigo-600">↵ 02/09/2026</button>}
              </div>
              <input value={inv.reqDate} onChange={si("reqDate")} placeholder="02/09/2026" className={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={lbl}>Period To</label>
                {!inv.periodTo && <button type="button" tabIndex={-1} onClick={()=>setInv(f=>({...f,periodTo:"January 31, 2026"}))} className="text-xs text-indigo-400 hover:text-indigo-600">↵ Jan 31, 2026</button>}
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
              {label:"Job Total", k:"jobTotal", s:"286510.66"},
              {label:"GC Fee + Insurance", k:"fees", s:"48434.63"},
              {label:"Deposit Applied", k:"deposit", s:"121719.15", hint:"Enter positive"},
              {label:"Retainage This Period", k:"retainage", s:"30465.49"},
              {label:"Amount Due", k:"amtDue", s:"182760.65"},
              {label:"Approved Amount", k:"approved", s:"182770.65", req:true},
            ].map(({label,k,s,hint,req})=>(
              <div key={k}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl}>{label}{req && <span className="text-red-400 ml-0.5">*</span>}</label>
                  {!inv[k] && <button type="button" tabIndex={-1} onClick={()=>setInv(f=>({...f,[k]:s}))} className="text-xs text-indigo-400 hover:text-indigo-600">↵ {s}</button>}
                </div>
                <input value={inv[k]} onChange={si(k)} placeholder={s} className={inp}/>
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
          <button onClick={saveTaconic} disabled={saving||!inv.payId||!inv.invNum||!inv.approved} className="flex-1 py-3 text-sm font-bold rounded-xl text-white" style={{background:saving||!inv.payId||!inv.invNum||!inv.approved?"#e5e7eb":"#111827",color:saving||!inv.payId||!inv.invNum||!inv.approved?"#9ca3af":"#fff"}}>{saving?"Saving...":"Save Invoice + Line Items →"}</button>
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
          <div className="flex items-center gap-3"><span>📄</span><p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p></div>
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
          <p className="text-sm font-semibold text-gray-800">{pendingFile?.name}</p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">{error}</div>}
        <div className={card}><p className="text-sm text-gray-500">Ready to store as Award Letter — saved to Documents tab.</p></div>
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
