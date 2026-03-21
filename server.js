import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ── Persistent data ────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const STATE_FILE = join(DATA_DIR, "forestmere-state.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

let state = { uploads: [], archive: [], vendorInvoices: {}, invoiceOverrides: {}, savedAt: null };
try {
  if (existsSync(STATE_FILE)) {
    state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    console.log(`Loaded forestmere state: ${(state.uploads || []).length} uploads, saved at ${state.savedAt}`);
  }
} catch (e) { console.warn("Could not load state:", e.message); }

function saveState() {
  try { writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) { console.warn("Save failed:", e.message); }
}

app.use(express.json({ limit: "50mb" }));

// ── GET /api/state — load full state ──────────────────────────────────────────
app.get("/api/state", (req, res) => {
  res.json({
    ...state,
    hasData: (state.uploads || []).length > 0 || Object.keys(state.vendorInvoices || {}).length > 0,
  });
});

// ── POST /api/state — save full state ─────────────────────────────────────────
app.post("/api/state", (req, res) => {
  const { uploads, archive, vendorInvoices, invoiceOverrides } = req.body;
  state = {
    uploads: uploads || [],
    archive: archive || [],
    vendorInvoices: vendorInvoices || {},
    invoiceOverrides: invoiceOverrides || {},
    savedAt: new Date().toISOString(),
  };
  saveState();
  res.json({ ok: true, savedAt: state.savedAt, uploadCount: state.uploads.length });
});

// ── Serve static frontend ──────────────────────────────────────────────────────
app.use(express.static(join(__dirname, "dist")));
app.get("{*path}", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Forestmere server running on port ${PORT}`);
});
