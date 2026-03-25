// ─── SMART UPLOAD VIEW ────────────────────────────────────────────────────────
// Drop this component into App.jsx and replace UploadsView with SmartUploadView
// Also add the classic UploadsView below for the stored documents library

import { useState, useRef, useContext } from "react";

// Status config
const STATUS = {
  supported:  { icon: "✅", label: "Supported",           color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  tentative:  { icon: "⚠️", label: "Tentative — CO Needed", color: "text-indigo-600",   bg: "bg-indigo-50 border-indigo-200"   },
  conflict:   { icon: "❌", label: "Conflict",             color: "text-red-500",        bg: "bg-red-50 border-red-200"           },
  duplicate:  { icon: "🔄", label: "Already in System",   color: "text-gray-400",                          bg: "bg-zinc-50 border-gray-200"          },
};

export function SmartUploadView() {
  // Pull data from context for reconciliation
  const { budget, awards, changeOrders, invoices, lineItems, documents, refresh } = window.__appData || {};

  const [stage, setStage] = useState("upload"); // upload | parsing | review | done
  const [pendingFile, setPendingFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [reviewItems, setReviewItems] = useState([]);
  const [approving, setApproving] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [doneResults, setDoneResults] = useState(null);
  const fileRef = useRef();

  // ── RECONCILE parsed data against DB ──────────────────────────────────────
  const buildReviewItems = (p) => {
    const items = [];
    const nextPayId = `PAY-${String((invoices?.length || 7) + 1).padStart(3, "0")}`;
    const invNumFormatted = `#${p.header?.invNum}`;

    // 1. Invoice header
    const alreadyExists = invoices?.find(i => i.inv_num === invNumFormatted);
    items.push({
      id: "header",
      type: "invoice_header",
      section: "Invoice Header",
      label: `Invoice ${invNumFormatted}`,
      details: `Date: ${p.header?.invoiceDate} · Period to: ${p.header?.periodTo} · Amount Due: $${(p.header?.currentAmountDue || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      extraDetails: [
        `Application #${p.header?.applicationNum}`,
        `Revised Contract: $${(p.header?.revisedContract || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        `Completed to Date: $${(p.header?.completedToDate || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        `Balance to Finish: $${(p.header?.balanceToFinish || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        `Total Retainage: $${(p.header?.totalRetainage || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      ],
      status: alreadyExists ? "duplicate" : "supported",
      note: alreadyExists ? `Already in system as ${alreadyExists.id}` : null,
      approved: !alreadyExists,
      canToggle: !alreadyExists,
      data: {
        id: nextPayId,
        reqDate: p.header?.invoiceDate,
        invNum: invNumFormatted,
        description: `Period to: ${p.header?.periodTo}`,
        jobTotal: (p.lineItemsBilled || []).reduce((s, l) => s + (l.currentBill || 0), 0),
        fees: (p.fees?.gcFee || 0) + (p.fees?.insurance || 0),
        depositApplied: p.fees?.depositApplied || 0,
        retainage: p.fees?.retainageThisPeriod || 0,
        amtDue: p.header?.currentAmountDue || 0,
      }
    });

    // 2. Line items billed this period
    for (const li of (p.lineItemsBilled || [])) {
      if (!li.currentBill || li.currentBill === 0) continue;
      const inBudget = budget?.find(b => b.code === li.code);
      const inLineItems = lineItems?.find(l => l.code === li.code);
      const alreadyBilled = lineItems?.find(l => l.code === li.code && l.inv?.[invNumFormatted]);

      let status = "supported";
      let note = null;
      if (!inBudget) { status = "conflict"; note = "CSI code not found in control budget"; }
      else if (alreadyBilled) { status = "duplicate"; note = "Already billed on this invoice in system"; }

      items.push({
        id: `li_${li.code}`,
        type: "line_item_billing",
        section: "Line Item Billing",
        label: `${li.code} — ${li.name}`,
        details: `This period: $${(li.currentBill || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} · Completed to date: $${(li.completedToDate || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} (${li.pctComplete}%)`,
        extraDetails: [`Previously billed: $${(li.previousBilled || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
        status,
        note,
        approved: status === "supported",
        canToggle: status === "supported",
        data: { ...li, invNum: invNumFormatted }
      });
    }

    // 3. Change orders referenced
    for (const co of (p.changeOrdersReferenced || [])) {
      const existingCO = changeOrders?.find(c => c.no === co.no);
      const amt = co.amount || 0;
      items.push({
        id: `co_${co.no}`,
        type: "change_order_reference",
        section: "Change Orders Referenced",
        label: `${co.no} — ${co.description}`,
        details: `${amt < 0 ? "Deduction" : "Addition"}: ${amt < 0 ? "-" : "+"}$${Math.abs(amt).toLocaleString("en-US", { maximumFractionDigits: 0 })} · CSI: ${co.code}`,
        extraDetails: existingCO ? [`Reconciles with CO in system: revised budget $${(existingCO.revised_budget || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`] : [],
        status: existingCO ? "supported" : "tentative",
        note: !existingCO ? "Upload the signed Change Order document to unlock this line" : "Verified — CO exists in system",
        approved: false,   // COs from invoice never auto-approve
        canToggle: false,  // must upload CO separately
        data: co,
        locked: !existingCO,
      });
    }

    // 4. Subcontractor invoices
    for (const sub of (p.subcontractorInvoices || [])) {
      const award = awards?.find(a => a.code === sub.code && a.vendor?.toLowerCase().includes(sub.vendor?.split(" ")[0]?.toLowerCase()));
      items.push({
        id: `sub_${sub.invNum}`,
        type: "subcontractor_invoice",
        section: "Subcontractor Invoices",
        label: `${sub.vendor} — Invoice #${sub.invNum}`,
        details: `Amount: $${(sub.currentBill || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} · CSI: ${sub.code}`,
        extraDetails: award ? [`Award ${award.id} on file — current contract $${(award.current_amount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`] : [],
        status: award ? "supported" : "tentative",
        note: !award ? "No matching award found — verify subcontractor award is in system" : null,
        approved: false,
        canToggle: false, // informational only — subcontractor invoices are internal to Taconic
        data: sub,
        informational: true,
      });
    }

    setReviewItems(items);
  };

  // ── HANDLE FILE ───────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Please select a PDF file."); return; }
    setPendingFile(file);
    setStage("parsing");
    setParseError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "taconic_invoice");
      const res = await fetch("/api/parse-document", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Parse failed");
      setParsed(data.parsed);
      buildReviewItems(data.parsed);
      setStage("review");
    } catch (e) {
      setParseError(e.message);
      setStage("upload");
    }
  };

  // ── TOGGLE APPROVAL ───────────────────────────────────────────────────────
  const toggle = (id) => {
    setReviewItems(prev => prev.map(item =>
      item.id === id && item.canToggle ? { ...item, approved: !item.approved } : item
    ));
  };

  const approveAll = () => {
    setReviewItems(prev => prev.map(item =>
      item.canToggle ? { ...item, approved: true } : item
    ));
  };

  // ── SUBMIT APPROVALS ──────────────────────────────────────────────────────
  const submitApprovals = async () => {
    setApproving(true);
    try {
      // 1. Save PDF to documents table
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("name", pendingFile.name);
      fd.append("type", "Invoice");
      fd.append("vendor_key", "taconic");
      fd.append("vendor_label", "Taconic Builders");
      fd.append("linked_id", parsed?.header ? `#${parsed.header.invNum}` : "");
      fd.append("note", `App #${parsed?.header?.applicationNum || ""} · Period: ${parsed?.header?.periodTo || ""}`);
      await fetch("/api/documents", { method: "POST", body: fd });

      // 2. Write approved items to DB
      const toApprove = reviewItems.filter(i => i.approved && !i.informational);
      const res = await fetch("/api/approve-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toApprove })
      });
      const result = await res.json();
      await refresh();
      setDoneResults(result.results || []);
      setStage("done");
    } catch (e) {
      setParseError(e.message);
    }
    setApproving(false);
  };

  const reset = () => {
    setStage("upload");
    setPendingFile(null);
    setParsed(null);
    setReviewItems([]);
    setParseError(null);
    setDoneResults(null);
  };

  // ── GROUP items by section ────────────────────────────────────────────────
  const sections = reviewItems.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {});

  const supportedCount  = reviewItems.filter(i => i.status === "supported").length;
  const tentativeCount  = reviewItems.filter(i => i.status === "tentative").length;
  const conflictCount   = reviewItems.filter(i => i.status === "conflict").length;
  const approvedCount   = reviewItems.filter(i => i.approved).length;

  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400";

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE: UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === "upload") return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-indigo-600 font-bold text-sm">1</div>
          <div>
            <p className="font-semibold text-gray-900">Smart Invoice Upload</p>
            <p className="text-xs text-gray-400 mt-0.5">AI parses the PDF · Review changes · Approve to save</p>
          </div>
        </div>

        {parseError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-600">
            <strong>Parse failed:</strong> {parseError}
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <div className="text-4xl mb-3">📄</div>
          <p className="text-sm font-semibold text-gray-600">Drop Taconic invoice PDF here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse · PDF only</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[["🤖", "AI Reads PDF", "Claude extracts all line items, COs, and amounts automatically"],
            ["🔍", "Review Screen", "Every change is shown with ✅ Supported · ⚠️ Tentative · ❌ Conflict status"],
            ["✋", "You Approve", "Nothing writes to the database until you approve it line by line"]
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-zinc-50 rounded-lg p-3">
              <div className="text-lg mb-1">{icon}</div>
              <p className="text-xs font-semibold text-gray-600">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE: PARSING
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === "parsing") return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="font-semibold text-gray-800">Parsing invoice...</p>
      <p className="text-xs text-gray-400 mt-1">{pendingFile?.name}</p>
      <p className="text-xs text-gray-300 mt-3">Claude is reading all line items, change orders, and amounts</p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE: REVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === "review") return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold text-gray-900">Review: {pendingFile?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Invoice #{parsed?.header?.invNum} · Period to {parsed?.header?.periodTo}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">✅ {supportedCount} supported</span>
            {tentativeCount > 0 && <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">⚠️ {tentativeCount} tentative</span>}
            {conflictCount > 0 && <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">❌ {conflictCount} conflict</span>}
          </div>
        </div>

        {tentativeCount > 0 && (
          <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
            <strong>⚠️ {tentativeCount} item{tentativeCount > 1 ? "s" : ""} need supporting documents</strong> — upload the missing Change Order PDFs to unlock those lines. All other supported items can be approved now.
          </div>
        )}
      </div>

      {/* Review items by section */}
      {Object.entries(sections).map(([sectionName, items]) => (
        <div key={sectionName} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{sectionName}</span>
            <span className="text-xs text-gray-400">{items.length} item{items.length > 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {items.map(item => {
              const s = STATUS[item.status];
              return (
                <div key={item.id} className={`px-4 py-3 flex items-start gap-3 ${item.approved && !item.informational ? "bg-emerald-50/30" : ""}`}>
                  {/* Checkbox — only for approvable items */}
                  <div className="pt-0.5 shrink-0">
                    {item.canToggle ? (
                      <button
                        onClick={() => toggle(item.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.approved ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300 hover:border-indigo-400"}`}
                      >
                        {item.approved && <span className="text-white text-xs font-bold">✓</span>}
                      </button>
                    ) : item.informational ? (
                      <span className="text-gray-300 text-sm">ℹ️</span>
                    ) : (
                      <span className="w-5 h-5 flex items-center justify-center text-sm">{s.icon}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${s.bg} ${s.color}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.details}</p>
                    {item.extraDetails?.map((d, i) => (
                      <p key={i} className="text-xs text-gray-400 mt-0.5">{d}</p>
                    ))}
                    {item.note && (
                      <p className={`text-xs mt-1 font-medium ${item.locked ? "text-indigo-600" : item.status === "conflict" ? "text-red-500" : "text-gray-400"}`}>
                        {item.locked ? "🔒 " : ""}{item.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="text-xs text-gray-400">
          <strong className="text-gray-800">{approvedCount}</strong> item{approvedCount !== 1 ? "s" : ""} selected to approve
          {tentativeCount > 0 && <span className="text-indigo-600 ml-2">· {tentativeCount} locked pending CO upload</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={approveAll} className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-zinc-50 transition-colors">
            Select All Supported
          </button>
          <button onClick={reset} className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={submitApprovals}
            disabled={approvedCount === 0 || approving}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors ${approvedCount > 0 && !approving ? "bg-gray-900 hover:bg-gray-800 text-white shadow-sm" : "bg-zinc-100 text-gray-400 cursor-not-allowed"}`}
          >
            {approving ? "Saving..." : `Approve ${approvedCount} Item${approvedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE: DONE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === "done") return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <p className="font-bold text-gray-900 text-lg">Invoice saved successfully</p>
      <p className="text-xs text-gray-400 mt-1 mb-6">
        {doneResults?.filter(r => r.ok).length || 0} items written to database · PDF stored in Documents
        {tentativeCount > 0 && ` · ${tentativeCount} tentative items still pending CO upload`}
      </p>

      {doneResults?.some(r => !r.ok) && (
        <div className="text-left bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-600">
          <strong>Some items failed:</strong>
          {doneResults.filter(r => !r.ok).map((r, i) => <div key={i}>{r.type}: {r.error}</div>)}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors">
          Upload Another Document
        </button>
      </div>
    </div>
  );

  return null;
}
