import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/inbox/ConversationList";
import ChatArea from "@/components/inbox/ChatArea";
import LeadPanel from "@/components/inbox/LeadPanel";
import NewChatModal from "@/components/inbox/NewChatModal.jsx";
import WaBanner from "@/components/inbox/WaBanner.jsx";
import {
  X, Upload, ChevronDown, FileText, CheckCircle,
  XCircle, Loader2, Users, AlertTriangle, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = "92" + digits.slice(1);
  return digits;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  }).filter(r => r.some(c => c));
  return { headers, rows };
}

function extractVariableCount(bodyText) {
  if (!bodyText) return 0;
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return Math.max(...matches.map(m => parseInt(m.replace(/\D/g, ""), 10)), 0);
}

function buildPreview(bodyText, variables) {
  if (!bodyText) return "";
  let p = bodyText;
  variables.forEach((val, i) => {
    p = p.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), val ? `[${val}]` : `{{${i + 1}}}`);
  });
  return p;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Template picker (reused from NewChatModal style) ─────────────────────────

function TemplatePicker({ templates, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const approved = templates.filter(t => t.status === "APPROVED");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-left hover:bg-[#e9edef] transition-colors"
      >
        {selected ? (
          <div className="min-w-0">
            <span className="font-medium text-[#111b21] block truncate">{selected.display_name || selected.template_name}</span>
            <span className="text-[11px] text-[#667781]">{selected.category} · {selected.language_code}</span>
          </div>
        ) : (
          <span className="text-[#667781]">{approved.length === 0 ? "No approved templates" : "Select a template…"}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-[#667781] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && approved.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-[#e9edef] rounded-xl shadow-xl max-h-44 overflow-y-auto">
          {approved.map(t => (
            <button key={t.id} type="button"
              onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#f0f2f5] transition-colors border-b border-[#f0f2f5] last:border-0 ${selected?.id === t.id ? "bg-[#f0f2f5]" : ""}`}
            >
              <p className="text-sm font-medium text-[#111b21] truncate">{t.display_name || t.template_name}</p>
              <p className="text-[11px] text-[#667781] mt-0.5">{t.category} · {t.language_code}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BULK SEND MODAL ───────────────────────────────────────────────────────────

const STEPS = ["template", "upload", "map", "preview", "sending", "done"];

function BulkSendModal({ onClose, currentUser }) {
  const [step, setStep] = useState("template");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // CSV state
  const [csvData, setCsvData] = useState(null); // { headers, rows }
  const [phoneCol, setPhoneCol] = useState("");
  const [varCols, setVarCols] = useState([]); // array of column names, one per variable

  // Sending state
  const [results, setResults] = useState([]); // { phone, name, status, error }
  const [sendingIndex, setSendingIndex] = useState(0);
  const abortRef = useRef(false);

  const varCount = extractVariableCount(selectedTemplate?.body_text);

  // Load approved templates
  useEffect(() => {
    base44.entities.MessageTemplate
      .filter({ owner_user_id: currentUser?.id })
      .then(rows => setTemplates(rows || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [currentUser?.id]);

  // Reset var columns when template or phoneCol changes
  useEffect(() => {
    setVarCols(Array(varCount).fill(""));
  }, [selectedTemplate, varCount]);

  // ── CSV upload ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.headers.length === 0) return;
      setCsvData(parsed);
      setPhoneCol("");
      setVarCols(Array(varCount).fill(""));
    };
    reader.readAsText(file);
  };

  // ── Build rows for sending ──
  const buildSendRows = () => {
    if (!csvData || !phoneCol) return [];
    const phoneIdx = csvData.headers.indexOf(phoneCol);
    return csvData.rows.map(row => {
      const phone = normalizePhone(row[phoneIdx] || "");
      const variables = varCols.map(col => {
        const idx = csvData.headers.indexOf(col);
        return idx >= 0 ? (row[idx] || "").trim() : "";
      });
      const nameIdx = csvData.headers.findIndex(h =>
        h.toLowerCase().includes("name")
      );
      const name = nameIdx >= 0 ? row[nameIdx] : phone;
      return { phone, name, variables };
    }).filter(r => r.phone.length >= 7);
  };

  const sendRows = step === "preview" || step === "sending" || step === "done"
    ? buildSendRows()
    : [];

  // ── Sending logic ──
  const runBulkSend = async () => {
    abortRef.current = false;
    const rows = buildSendRows();
    setResults(rows.map(r => ({ ...r, status: "pending", error: null })));
    setStep("sending");

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break;
      setSendingIndex(i);
      const row = rows[i];

      try {
        const res = await base44.functions.invoke("sendWhatsAppMessage", {
          user_id: currentUser?.id,
          phone: row.phone,
          template_name: selectedTemplate.template_name,
          language_code: selectedTemplate.language_code || "en",
          template_variables: varCount > 0 ? row.variables : [],
        });

        const data = res?.data;
        const status = data?.success ? "sent" : "failed";
        const error = data?.success ? null : (data?.error || "Failed");

        // Create/update conversation record silently
        if (data?.success) {
          try {
            const existing = await base44.entities.Conversation.filter({
              customer_phone: row.phone,
              owner_user_id: currentUser?.id,
            });
            const preview = buildPreview(selectedTemplate.body_text, row.variables);
            if (!existing.length) {
              const conv = await base44.entities.Conversation.create({
                owner_user_id: currentUser?.id,
                customer_phone: row.phone,
                customer_name: row.name || row.phone,
                last_message: preview,
                last_message_time: new Date().toISOString(),
                unread_count: 0,
                status: "contacted",
                handling_mode: "human",
              });
              await base44.entities.Message.create({
                conversation_id: conv.id,
                sender: "agent",
                message_type: "text",
                content: preview,
                timestamp: new Date().toISOString(),
                status: "sent",
                whatsapp_message_id: data.whatsapp_message_id || null,
                agent_name: currentUser?.full_name || "Agent",
              });
            } else {
              const conv = existing[0];
              await base44.entities.Conversation.update(conv.id, {
                last_message: preview,
                last_message_time: new Date().toISOString(),
              });
              await base44.entities.Message.create({
                conversation_id: conv.id,
                sender: "agent",
                message_type: "text",
                content: preview,
                timestamp: new Date().toISOString(),
                status: "sent",
                whatsapp_message_id: data.whatsapp_message_id || null,
                agent_name: currentUser?.full_name || "Agent",
              });
            }
          } catch (_) { /* non-critical */ }
        }

        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status, error } : r));
      } catch (err) {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "failed", error: err.message } : r));
      }

      // 600ms delay between sends to stay within Meta rate limits
      if (i < rows.length - 1) await sleep(600);
    }

    setSendingIndex(rows.length);
    setStep("done");
  };

  const sentCount = results.filter(r => r.status === "sent").length;
  const failedCount = results.filter(r => r.status === "failed").length;

  // ── Column selector ──
  function ColSelect({ value, onChange, placeholder, exclude = [] }) {
    if (!csvData) return null;
    return (
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] outline-none appearance-none"
        >
          <option value="">{placeholder}</option>
          {csvData.headers.filter(h => !exclude.includes(h) || h === value).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[#667781] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    );
  }

  const canProceedMap = phoneCol && (varCount === 0 || varCols.every(v => v));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header */}
        <div className="bg-[#128c7e] px-5 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-base">Bulk Send Template</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Step indicator */}
        {!["sending", "done"].includes(step) && (
          <div className="px-5 pt-3 pb-0 shrink-0">
            <div className="flex items-center gap-1">
              {["Template", "Upload CSV", "Map Columns", "Preview"].map((label, i) => {
                const stepKey = ["template", "upload", "map", "preview"][i];
                const isCurrent = step === stepKey;
                const isPast = STEPS.indexOf(step) > STEPS.indexOf(stepKey);
                return (
                  <div key={label} className="flex items-center gap-1 flex-1">
                    <div className={`flex items-center gap-1 ${i > 0 ? "flex-1" : ""}`}>
                      {i > 0 && <div className={`h-px flex-1 ${isPast || isCurrent ? "bg-[#128c7e]" : "bg-[#e9edef]"}`} />}
                      <div className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isCurrent ? "bg-[#128c7e] text-white" :
                        isPast ? "bg-[#25d366] text-white" : "bg-[#e9edef] text-[#667781]"
                      }`}>{isPast ? "✓" : i + 1}</div>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${isCurrent ? "text-[#128c7e]" : isPast ? "text-[#25d366]" : "text-[#667781]"}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">

          {/* STEP: template */}
          {step === "template" && (
            <>
              <p className="text-sm text-[#667781]">Choose an approved template to send in bulk.</p>
              {templatesLoading ? (
                <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5">
                  <Loader2 className="w-4 h-4 text-[#128c7e] animate-spin" />
                  <span className="text-sm text-[#667781]">Loading templates…</span>
                </div>
              ) : (
                <TemplatePicker templates={templates} selected={selectedTemplate} onSelect={setSelectedTemplate} />
              )}
              {selectedTemplate && (
                <div className="rounded-xl overflow-hidden border border-[#e9edef]">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2f5] border-b border-[#e9edef]">
                    <Eye className="w-3 h-3 text-[#667781]" />
                    <span className="text-[11px] font-semibold text-[#667781] uppercase tracking-wide">Preview</span>
                  </div>
                  <div className="bg-[#e5ddd5] px-3 py-3">
                    <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%]">
                      {selectedTemplate.header_type === "TEXT" && selectedTemplate.header_text && (
                        <p className="text-sm font-semibold text-[#111b21] mb-1">{selectedTemplate.header_text}</p>
                      )}
                      <p className="text-sm text-[#111b21] whitespace-pre-wrap leading-relaxed">{selectedTemplate.body_text}</p>
                      {selectedTemplate.footer_text && (
                        <p className="text-[11px] text-[#667781] mt-1">{selectedTemplate.footer_text}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {varCount > 0 && selectedTemplate && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700">
                    This template has <strong>{varCount} variable{varCount > 1 ? "s" : ""}</strong>. You will map them from CSV columns in the next steps.
                  </p>
                </div>
              )}
            </>
          )}

          {/* STEP: upload */}
          {step === "upload" && (
            <>
              <p className="text-sm text-[#667781]">Upload a CSV file with phone numbers{varCount > 0 ? " and variable data" : ""}.</p>
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#e9edef] rounded-xl p-8 cursor-pointer hover:border-[#128c7e] hover:bg-[#f0f2f5]/50 transition-all">
                <Upload className="w-8 h-8 text-[#128c7e]" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#111b21]">Click to upload CSV</p>
                  <p className="text-xs text-[#667781] mt-0.5">First row must be headers</p>
                </div>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              </label>
              {csvData && (
                <div className="bg-[#f0f2f5] rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#128c7e] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111b21]">CSV loaded</p>
                    <p className="text-xs text-[#667781]">{csvData.rows.length} rows · {csvData.headers.length} columns: {csvData.headers.join(", ")}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP: map */}
          {step === "map" && csvData && (
            <>
              <p className="text-sm text-[#667781]">Map your CSV columns to the phone number{varCount > 0 ? " and template variables" : ""}.</p>
              <div>
                <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                  Phone Number Column <span className="text-red-500">*</span>
                </label>
                <ColSelect
                  value={phoneCol}
                  onChange={setPhoneCol}
                  placeholder="Select phone column…"
                />
                <p className="text-[11px] text-[#667781] mt-1">Numbers without country code starting with 0 will be converted to +92 automatically.</p>
              </div>
              {varCount > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#111b21] block">Template Variables</label>
                  {Array.from({ length: varCount }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono bg-[#e9edef] text-[#128c7e] px-1.5 py-0.5 rounded shrink-0">
                        {`{{${i + 1}}}`}
                      </span>
                      <ColSelect
                        value={varCols[i] || ""}
                        onChange={v => {
                          const updated = [...varCols];
                          updated[i] = v;
                          setVarCols(updated);
                        }}
                        placeholder={`Select column for variable ${i + 1}…`}
                        exclude={[phoneCol, ...varCols.filter((_, j) => j !== i)]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* STEP: preview */}
          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#667781]">
                  Ready to send to <strong className="text-[#111b21]">{sendRows.length} contacts</strong>.
                </p>
                <span className="text-xs bg-[#128c7e]/10 text-[#128c7e] font-semibold px-2 py-0.5 rounded-full">
                  {selectedTemplate.display_name || selectedTemplate.template_name}
                </span>
              </div>

              {/* Sample preview of first 3 rows */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#111b21] block">Sample (first 3 contacts)</label>
                {sendRows.slice(0, 3).map((row, i) => (
                  <div key={i} className="bg-[#f0f2f5] rounded-xl px-3 py-2.5">
                    <p className="text-xs font-semibold text-[#111b21]">+{row.phone} {row.name !== row.phone ? `· ${row.name}` : ""}</p>
                    <p className="text-xs text-[#667781] mt-0.5 whitespace-pre-wrap">
                      {buildPreview(selectedTemplate.body_text, row.variables)}
                    </p>
                  </div>
                ))}
                {sendRows.length > 3 && (
                  <p className="text-xs text-[#667781] text-center">...and {sendRows.length - 3} more</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700">
                  Messages will be sent one by one with a 600ms delay between each. Do not close this window until sending is complete.
                </p>
              </div>
            </>
          )}

          {/* STEP: sending */}
          {step === "sending" && (
            <>
              <div className="text-center py-2">
                <Loader2 className="w-8 h-8 text-[#128c7e] animate-spin mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#111b21]">
                  Sending {Math.min(sendingIndex + 1, results.length)} of {results.length}…
                </p>
                <p className="text-xs text-[#667781] mt-0.5">Keep this window open</p>
              </div>
              <div className="w-full bg-[#f0f2f5] rounded-full h-2">
                <div
                  className="bg-[#128c7e] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${results.length ? (sendingIndex / results.length) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#f0f2f5]">
                    {r.status === "pending" && i === sendingIndex && <Loader2 className="w-3.5 h-3.5 text-[#128c7e] animate-spin shrink-0" />}
                    {r.status === "pending" && i !== sendingIndex && <div className="w-3.5 h-3.5 rounded-full border-2 border-[#e9edef] shrink-0" />}
                    {r.status === "sent" && <CheckCircle className="w-3.5 h-3.5 text-[#25d366] shrink-0" />}
                    {r.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className="text-xs text-[#111b21] truncate flex-1">+{r.phone}</span>
                    {r.error && <span className="text-[10px] text-red-500 truncate max-w-[120px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP: done */}
          {step === "done" && (
            <>
              <div className="text-center py-3">
                {failedCount === 0 ? (
                  <CheckCircle className="w-12 h-12 text-[#25d366] mx-auto mb-2" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                )}
                <p className="text-base font-semibold text-[#111b21]">Bulk Send Complete</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <span className="text-sm text-[#25d366] font-semibold">{sentCount} sent</span>
                  {failedCount > 0 && <span className="text-sm text-red-500 font-semibold">{failedCount} failed</span>}
                </div>
              </div>
              {failedCount > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <label className="text-xs font-semibold text-[#111b21] block">Failed contacts</label>
                  {results.filter(r => r.status === "failed").map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-50">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-xs text-[#111b21] truncate flex-1">+{r.phone}</span>
                      <span className="text-[10px] text-red-500 truncate max-w-[140px]">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned footer */}
        <div className="px-5 py-4 border-t border-[#f0f2f5] shrink-0 rounded-b-2xl bg-white flex gap-2">
          {step === "template" && (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
              <Button
                onClick={() => setStep("upload")}
                disabled={!selectedTemplate}
                className="flex-1 bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl disabled:opacity-50"
              >
                Next: Upload CSV
              </Button>
            </>
          )}
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => setStep("template")} className="flex-1 rounded-xl">Back</Button>
              <Button
                onClick={() => setStep("map")}
                disabled={!csvData}
                className="flex-1 bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl disabled:opacity-50"
              >
                Next: Map Columns
              </Button>
            </>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1 rounded-xl">Back</Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!canProceedMap}
                className="flex-1 bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl disabled:opacity-50"
              >
                Preview ({buildSendRows().length} contacts)
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")} className="flex-1 rounded-xl">Back</Button>
              <Button
                onClick={runBulkSend}
                disabled={sendRows.length === 0}
                className="flex-1 bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl disabled:opacity-50"
              >
                Send to {sendRows.length} contacts
              </Button>
            </>
          )}
          {step === "sending" && (
            <Button
              variant="outline"
              onClick={() => { abortRef.current = true; }}
              className="flex-1 rounded-xl text-red-500 border-red-200 hover:bg-red-50"
            >
              Stop Sending
            </Button>
          )}
          {step === "done" && (
            <Button onClick={onClose} className="flex-1 bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── INBOX PAGE ────────────────────────────────────────────────────────────────

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [waConfig, setWaConfig] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [listWidth, setListWidth] = useState(280);
  const isResizing = useRef(false);
  const navigate = useNavigate();
  const convUnsubRef = useRef(null);

  const startResize = useCallback((e) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = listWidth;
    const onMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(480, Math.max(200, startWidth + e.clientX - startX));
      setListWidth(newWidth);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [listWidth]);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    base44.entities.UserWAConfig.filter({ user_id: currentUser.id, is_active: true })
      .then(async configs => {
        if (!configs.length) { navigate("/setup"); return; }
        setWaConfig(configs[0]);

        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");

        const data = await base44.entities.Conversation.filter(
          { owner_user_id: currentUser.id }, "-last_message_time", 100
        );
        const sorted = [...data].sort((a, b) =>
          new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
        );
        setConversations(sorted);
        setLoading(false);

        if (urlId) {
          const found = data.find(c => c.id === urlId);
          if (found) { setSelected(found); setActiveView("chat"); }
        }

        convUnsubRef.current = base44.entities.Conversation.subscribe((event) => {
          if (event.data?.owner_user_id !== currentUser.id) return;
          if (event.type === "create") {
            setConversations(prev => {
              if (prev.some(c => c.id === event.data.id)) return prev;
              return [event.data, ...prev];
            });
          } else if (event.type === "update") {
            setConversations(prev =>
              prev.map(c => c.id === event.data.id ? event.data : c)
                .sort((a, b) =>
                  new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
                )
            );
            setSelected(prev => prev?.id === event.data.id ? event.data : prev);
          } else if (event.type === "delete") {
            setConversations(prev => prev.filter(c => c.id !== event.data.id));
            setSelected(prev => prev?.id === event.data.id ? null : prev);
          }
        });
      });

    return () => {
      if (convUnsubRef.current) convUnsubRef.current();
    };
  }, [currentUser, navigate]);

  const handleSelect = (conv) => {
    setSelected(conv);
    setActiveView("chat");
    if (conv.unread_count > 0) {
      base44.entities.Conversation.update(conv.id, { unread_count: 0 });
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleUpdate = (updated) => {
    setSelected(updated);
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleHandoverChange = (mode) => {
    if (!selected) return;
    const updated = {
      ...selected,
      handling_mode: mode === "paused" ? selected.handling_mode : mode,
      ai_paused: mode === "paused",
    };
    handleUpdate(updated);
  };

  const handleConversationUpdate = (updated) => {
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const handleNewConversation = (conv) => {
    setConversations(prev => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
    setSelected(conv);
    setActiveView("chat");
  };

  const handleBack = () => {
    setActiveView("list");
    setShowDetails(false);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <WaBanner config={waConfig} />
        <div className="flex-1 overflow-hidden flex">
          <div
            className={`h-full border-r border-[#e9edef] bg-white shrink-0 relative md:block ${activeView === "list" ? "block" : "hidden md:block"}`}
            style={{ width: listWidth }}
          >
            <div
              className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10 transition-colors"
              onMouseDown={startResize}
            />
            <ConversationList
              conversations={conversations}
              selectedId={selected?.id}
              onSelect={handleSelect}
              onNewChat={() => setShowNewChat(true)}
              onBulkSend={() => setShowBulkSend(true)}
              loading={loading}
            />
          </div>

          <div className={`h-full flex flex-1 min-w-0 overflow-hidden md:flex ${activeView === "chat" ? "flex w-full" : "hidden"}`}>
            <ChatArea
              conversation={selected}
              onHandoverChange={handleHandoverChange}
              onShowDetails={() => setShowDetails(true)}
              currentUser={currentUser}
              onBack={handleBack}
              onConversationUpdate={handleConversationUpdate}
            />
            {showDetails && (
              <LeadPanel
                conversation={selected}
                onUpdate={handleUpdate}
                onClose={() => setShowDetails(false)}
              />
            )}
          </div>
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onConversationCreated={handleNewConversation}
          currentUser={currentUser}
        />
      )}

      {showBulkSend && (
        <BulkSendModal
          onClose={() => setShowBulkSend(false)}
          currentUser={currentUser}
        />
      )}
    </AppLayout>
  );
}