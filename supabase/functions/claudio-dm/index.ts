// claudio-dm — in-CRM Claudio: replies to DMs in the Messages UI, CRM-aware.
// Auth: server callers use ?token=<claudio_dm_token>; the CRM frontend uses the logged-in
// user's JWT (Authorization: Bearer) and may only trigger a reply to THEIR OWN DM thread.
//
// v17 (2026-06-29): READS / SMART LOOKUPS — look_up_job + find_jobs (customer status, docs, files, timeline).
// v18 (2026-06-29): WHOLE-CRM KNOWLEDGE — appointments (calendar), leads (FB/IG), kpis (funnel + pipeline).
// v19 (2026-06-29): MONEY OUT. spending tool — "how much have I paid <name>" / total expenses over a window.
// Sums BOTH job expenses (deal_expenses.vendor) AND sub payments (deal_sub_payments → deal_subs.contractor_name),
// matched by name fragment so spelling variants (Ricardo García / Ricardo Garcia) total together. Money-restricted
// (can_see_money). No name = overall spend + top recipients. Edge-computed, no migration.
// (Earlier: v10 ops tier, v11 web, v12 PDFs, v13 job-completeness set_deal_value/create_deal/mark_doc, v14 reports,
//  v15 human job labels, v16 HDM expert. Ops writes route through claudio_action; identity server-pinned + logged.)
import { createClient } from "jsr:@supabase/supabase-js@2";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
const NAME = "Claudio 🤖";
const DEALER = "bfdaec29-68bb-4b91-9ade-2a34b45a02c2";
// Claudio's own profile id — used to attribute the timeline note when he sends an email.
const CLAUDIO_ID = "78de958c-aa36-455e-9d4d-f1cf1647f714";
// Union of every real pipeline stage across deal types (from app_settings.milestones). The old
// list was landscape-only and omitted the actual solar ladder, so Claudio couldn't move a solar
// job to its real stages. claudio_action validates the chosen stage against the deal's own type.
const STAGES = ["Quote Sent", "Quote Accepted", "Contract Sent", "Contract Signed", "HDM / Financing Signed", "Welcome Call Done", "Deposit Received", "Site Survey & Plans", "Interconnection", "Permits", "Landscape Scheduled", "Landscape In Progress", "Landscape Completed", "Install Scheduled", "Scheduled", "In Progress", "Installed", "City Inspection", "Inspection", "Completed", "PTO", "Funded", "Paid"];

async function cfg(key: string): Promise<string | undefined> {
  const { data } = await admin.from("email_config").select("value").eq("key", key).maybeSingle();
  return data?.value || undefined;
}
async function claudioId(): Promise<string | undefined> {
  const { data } = await admin.from("profiles").select("id").eq("name", NAME).maybeSingle();
  return data?.id || undefined;
}

async function hdmKbText(): Promise<string> {
  const { data } = await admin.from("hdm_kb").select("title_en,milestone,is_killer,body_en").eq("active", true).order("sort_order");
  if (!data || !data.length) return "";
  return data.map((c: any) => `### ${c.title_en}${c.is_killer ? " [TOP REJECTION CAUSE]" : ""}${c.milestone ? ` (${c.milestone})` : ""}\n${c.body_en}`).join("\n\n");
}

const ACTION_TOOLS = [
  { name: "create_task", description: "Create a to-do task, optionally assigned to a teammate and/or attached to a job. For a dated follow-up on a job use set_followup instead.",
    input_schema: { type: "object", properties: {
      title: { type: "string" }, assignee: { type: "string", description: "teammate's name; omit = the asker" },
      job: { type: "string", description: "job code or customer name" }, due_date: { type: "string", description: "ISO YYYY-MM-DD" },
      priority: { type: "string", enum: ["low", "normal", "high"] } }, required: ["title"] } },
  { name: "add_job_note", description: "Add a note to a job's timeline.",
    input_schema: { type: "object", properties: { job: { type: "string", description: "job code or customer name" }, note: { type: "string" } }, required: ["job", "note"] } },
  { name: "set_followup", description: "Schedule a dated follow-up (follow-up task), optionally on a job and/or assigned to a teammate.",
    input_schema: { type: "object", properties: { title: { type: "string" }, due_date: { type: "string", description: "ISO YYYY-MM-DD" }, assignee: { type: "string" }, job: { type: "string" } }, required: ["title"] } },
  { name: "move_job_stage", description: "Move a job to a different pipeline stage. Use for 'move/advance/set this job to <stage>'.",
    input_schema: { type: "object", properties: { job: { type: "string", description: "job code or customer name" }, stage: { type: "string", enum: STAGES } }, required: ["job", "stage"] } },
  { name: "log_expense", description: "Record an expense against a job (sub bid, material, permit, labor, etc.).",
    input_schema: { type: "object", properties: { job: { type: "string", description: "job code or customer name" }, amount: { type: "number" }, vendor: { type: "string" }, category: { type: "string", description: "e.g. sub_bid, material, permit, labor" }, note: { type: "string" } }, required: ["job", "amount"] } },
  { name: "run_report", description: "Pull a quick operational/financial report. old_jobs = active jobs older than N days still open; by_stage = job counts (+$) per stage; sales = NEW sales this week/month/quarter (count + $, broken down by division) — use for 'how are sales this week/month'; money_in = the cash picture (new sales last 7d & 30d, open pipeline $, funded $, paid $) — use for 'what money is coming in / how much have we sold / cash'.",
    input_schema: { type: "object", properties: { type: { type: "string", enum: ["old_jobs", "by_stage", "sales", "money_in"] }, days: { type: "number", description: "old_jobs age threshold (default 30); also a custom lookback window for sales" }, period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "for sales: this calendar week (default), month, quarter, or year" } }, required: ["type"] } },
  { name: "set_deal_value", description: "Set or update a job's money — its total sale price (and optionally the customer's down payment). ALWAYS do this whenever you learn or are told a job's price or contract total, so the dollar figure on the job is never left at $0 or stale.",
    input_schema: { type: "object", properties: {
      job: { type: "string", description: "job code or customer name" },
      sale_price: { type: "number", description: "total contract / sale price in dollars" },
      down_payment: { type: "number", description: "optional customer down payment in dollars" } }, required: ["job", "sale_price"] } },
  { name: "create_deal", description: "Create a new job/deal for a customer who does not have one yet — e.g. once their paperwork (contract, finance) is in. Defaults to a solar job at the 'Contract Signed' stage. It will NOT make a duplicate if the customer already has a job.",
    input_schema: { type: "object", properties: {
      customer: { type: "string", description: "customer / contact name" },
      type: { type: "string", enum: ["solar", "landscape", "construction", "solar_landscape"], description: "defaults to solar" },
      sale_price: { type: "number" }, lender: { type: "string" },
      milestone: { type: "string", enum: STAGES } }, required: ["customer"] } },
  { name: "mark_doc", description: "Tick (or untick) a document on a job's sale checklist: our signed contract, the finance/lender contract, the HDM contract (solar), or the completion form. ALWAYS do this when told one of these documents is signed or received, so the job's checkmarks reflect reality.",
    input_schema: { type: "object", properties: {
      job: { type: "string", description: "job code or customer name" },
      doc: { type: "string", enum: ["our_contract", "finance_contract", "hdm", "completion"], description: "which document" },
      signed: { type: "boolean", description: "true = received/signed (default), false = uncheck" } }, required: ["job", "doc"] } },
  { name: "send_email", description: "Send an email from Southwest Energy (construction@southwestenergy.us) on the team's behalf — e.g. a customer update, a note to a vendor/lender, or a follow-up. Use ONLY on a clear request to email someone; write the full message yourself unless they dictate it. If it's about a specific job, pass `job` so the email is logged to that job's timeline. Confirm what you sent in one short line.",
    input_schema: { type: "object", properties: {
      to: { type: "string", description: "recipient email address" },
      subject: { type: "string" },
      body: { type: "string", description: "the full email message in plain text; blank lines separate paragraphs" },
      job: { type: "string", description: "optional job code or customer name to log the email against" } }, required: ["to", "subject", "body"] } },
];
const ACTION_NAMES = new Set(["create_task", "add_job_note", "set_followup", "move_job_stage", "log_expense", "run_report", "set_deal_value", "create_deal", "mark_doc", "send_email"]);

// ---- READ tools (available to EVERYONE; scoped per-role at execution) ----
const READ_TOOLS = [
  { name: "look_up_job", description: "Look up ONE customer's job and report everything about it: the current stage and what's next, the money (sale price / down / financed — shown only if this person is allowed to see money), lender, the DOCUMENT CHECKLIST (our contract, finance contract, HDM, completion — and which are still MISSING), the UPLOADED FILES, and the RECENT ACTIVITY timeline (what's happened, e.g. whether the site survey was sent). Use this whenever someone asks how a customer/job is doing, what stage they're at, whether their documents/paperwork are uploaded, or what's been done on it. Identify the job by customer name, street address, and/or job code.",
    input_schema: { type: "object", properties: { job: { type: "string", description: "customer name, street address, and/or job code (e.g. 'Mr. Perez 123 Main St')" } }, required: ["job"] } },
  { name: "find_jobs", description: "List or search jobs when there isn't one specific customer — e.g. 'what deals do I have', 'jobs at Permits', 'anything stuck', or a partial name/address that may match several. Returns a short list (customer · street · stage). Use look_up_job for the full detail on one.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "optional name or address fragment to match" }, milestone: { type: "string", description: "filter to a pipeline stage", enum: STAGES }, stuck_days: { type: "integer", description: "only jobs not updated in this many days" } } } },
  { name: "appointments", description: "See the calendar / appointments. Use for 'what appointments do we have', 'my schedule', 'how many appointments this week', 'how did our appointments go'. range: 'upcoming' (default — scheduled from now on), 'today', 'week' (next 7 days), or 'recent' (the last N days that already happened, with how each went — quoted/won/no-show). A rep sees only their own appointments; office staff see everyone's.",
    input_schema: { type: "object", properties: { range: { type: "string", enum: ["upcoming", "today", "week", "recent"] }, days: { type: "integer", description: "for range=recent, how many days back (default 14)" } } } },
];
const READ_NAMES = new Set(["look_up_job", "find_jobs", "appointments"]);

// ---- STAFF-only READ tools (admin/ops — company analytics; spending also requires can_see_money) ----
const STAFF_READ_TOOLS = [
  { name: "leads", description: "Marketing leads from Facebook / Instagram (synced via GoHighLevel). Use for 'how many leads', 'how many from Facebook', 'lead status'. Returns totals by source (Facebook vs Instagram), how many booked an appointment, and how many converted. NOTE: lead dates reflect when they synced into the CRM, so the TOTAL by source is the reliable figure, not day-by-day.",
    input_schema: { type: "object", properties: { days: { type: "integer", description: "optional: only leads from the last N days" } } } },
  { name: "kpis", description: "Business KPIs / the sales funnel for a period AND the current pipeline: leads (by source), appointments (set / ran / won / no-show), new closings (signed deals) + $, plus the live pipeline by stage with funded & paid. Use for 'KPIs', 'how's the funnel', 'how many closings', 'the numbers this month'. Dollar figures only show for users allowed to see money. period: 'week' (default), 'month', 'quarter', 'year'.",
    input_schema: { type: "object", properties: { period: { type: "string", enum: ["week", "month", "quarter", "year"] } } } },
  { name: "spending", description: "What we've PAID OUT — total to a vendor / subcontractor (or overall) over a time window. Sums BOTH job expenses AND sub payments, and matches the name loosely so spelling variants total together. Use for 'how much have I paid <name>', 'what did we pay <vendor> this week', 'total expenses last 2 weeks'. Give a name to total just that person/company; omit it for overall spend + the top recipients. Money-restricted (only users allowed to see money).",
    input_schema: { type: "object", properties: { vendor: { type: "string", description: "person or company name to total, e.g. 'Ricardo' (matched loosely; omit for overall spending)" }, days: { type: "integer", description: "lookback window in days (default 14 = about 2 weeks)" } } } },
  { name: "read_emails", description: "READ the company mailboxes yourself — you CAN see what actually arrived (you no longer need it pasted in). Returns date · from · subject · snippet. Use when someone asks you to check the inbox, see if a lender/customer/city emailed, or whether an HDM/finance/contract 'signed' notice came in — then ACT on it (mark_doc, move_job_stage, set_deal_value, send_email). ALWAYS pass a q to narrow it (a customer name, street, 'hdm', 'signed', 'epe', 'permit'). Optional: days (default 21), direction ('inbound' default / 'outbound' / 'all'), limit (default 30). Office (admin/ops) only.",
    input_schema: { type: "object", properties: { q: { type: "string", description: "search term — customer name, street, lender, or a keyword like 'signed'/'hdm'/'permit' (strongly recommended)" }, days: { type: "integer" }, direction: { type: "string", enum: ["inbound", "outbound", "all"] }, limit: { type: "integer" } } } },
];
const STAFF_READ_NAMES = new Set(["leads", "kpis", "spending", "read_emails"]);

const WEB_TOOLS = [
  { type: "web_search_20260209", name: "web_search", max_uses: 5 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
];
const CREATE_PDF_TOOL = { name: "create_pdf",
  description: "Generate a PDF and attach it to your reply so the person can download it (a quote summary, job report, simple letter, expense summary, etc.). Put the FULL document text in `body`; use blank lines between paragraphs. Use only when they ask for a PDF or a downloadable document.",
  input_schema: { type: "object", properties: {
    title: { type: "string", description: "Document title / heading shown at the top." },
    body: { type: "string", description: "The full document text. Plain text; blank lines separate paragraphs." },
    filename: { type: "string", description: "Optional file name, e.g. Garcia-quote.pdf" } }, required: ["title", "body"] } };

const ACTION_SYSTEM_SUFFIX = `

ACTIONS: When this person clearly asks, you can: create a task, add a note to a job, set a follow-up, move a job to a different stage, log an expense against a job, pull quick reports (old/aging jobs, jobs by stage), set a job's money (total sale price + optional down payment), create a new job for a customer, tick documents on a job's checklist (our contract, finance contract, HDM, completion form), and SEND AN EMAIL from Southwest Energy on the team's behalf (send_email — a customer update, a vendor/lender note, a follow-up). Use the tools only on a clear request; confirm in one short line after.

EMAIL CARE: only send an email when they clearly ask you to email someone. Get the recipient right (ask if you're unsure of the address), write it professionally in the customer's language, and if it's about a specific job, pass the job so it's logged there. After sending, tell them exactly who you emailed and the subject. When moving a job's stage, use the EXACT stage name from that job's own ladder (look it up first if unsure) — stage names differ by job type.

MOVE STAGES CORRECTLY: solar jobs run Quote Sent → Contract Sent → Contract Signed → HDM / Financing Signed → Welcome Call Done → Site Survey & Plans → Interconnection → Install Scheduled → Installed → City Inspection → PTO → Funded. Landscape/construction use their own shorter ladders. Never guess a stage that isn't on the job's ladder.

KEEP EVERY JOB COMPLETE — when you handle a customer's paperwork or sale, do the WHOLE job, not half of it:
- Whenever you learn a job's price or contract total, set it with set_deal_value so the dollar amount on the job is never left at $0 or stale.
- Whenever you're told a document is signed or received (our contract, the finance/lender contract, the HDM contract, the completion form), tick it with mark_doc so the job's checkmarks match reality.
- If a customer has their paperwork in but has NO job yet, create the job with create_deal — then set its price and tick its documents.
Treat money, documents, and the job record as ONE unit: after you act, the job should show the right amount AND the right checkmarks.

You CANNOT change settings, roles, permissions, secrets, the code, or the database; you cannot move money or approve payouts — if asked for any of those, say that's not something you can do. Permissions are re-checked on every action — only what this person is allowed to do goes through, and everything is logged.`;

async function claudioCanAct(askerId: string): Promise<boolean> {
  if (!askerId) return false;
  const { data } = await admin.from("profiles").select("role,active").eq("id", askerId).maybeSingle();
  return !!data && data.active !== false && (data.role === "admin" || data.role === "ops");
}

async function askerCtx(askerId: string): Promise<{ active: boolean; staff: boolean; money: boolean }> {
  if (!askerId) return { active: false, staff: false, money: false };
  const { data } = await admin.from("profiles").select("role,can_see_money,active").eq("id", askerId).maybeSingle();
  const active = !!data && data.active !== false;
  return { active, staff: active && (data?.role === "admin" || data?.role === "ops"), money: active && data?.can_see_money === true };
}

async function resolveAssignee(name?: string): Promise<{ id?: string; name?: string; ambiguous?: string[] }> {
  if (!name || !name.trim()) return {};
  const q = name.trim();
  const { data } = await admin.from("profiles").select("id,name,active").ilike("name", `%${q}%`).limit(8);
  const hits = (data || []).filter((p: any) => p.active !== false && p.name !== NAME);
  if (hits.length === 1) return { id: hits[0].id, name: hits[0].name };
  if (hits.length === 0) return {};
  const exact = hits.find((p: any) => (p.name || "").toLowerCase() === q.toLowerCase());
  if (exact) return { id: exact.id, name: exact.name };
  return { ambiguous: hits.map((p: any) => p.name) };
}

async function resolveClient(query?: string): Promise<{ id?: string; name?: string; ambiguous?: string[] }> {
  if (!query || !query.trim()) return {};
  const q = query.trim();
  const { data } = await admin.from("clients").select("id,name").is("archived_at", null).ilike("name", `%${q}%`).limit(8);
  const hits = data || [];
  if (hits.length === 1) return { id: hits[0].id, name: hits[0].name };
  if (!hits.length) return {};
  const exact = hits.find((c: any) => (c.name || "").toLowerCase() === q.toLowerCase());
  if (exact) return { id: exact.id, name: exact.name };
  return { ambiguous: hits.map((c: any) => c.name) };
}

async function jobLabel(d: any): Promise<string> {
  let nm = "job", street = "";
  if (d.client_id) { const { data: c } = await admin.from("clients").select("name").eq("id", d.client_id).maybeSingle(); nm = c?.name || nm; }
  let addr: string | null = null;
  if (d.property_id) { const { data: p } = await admin.from("properties").select("address").eq("id", d.property_id).maybeSingle(); addr = p?.address || null; }
  if (!addr && d.client_id) { const { data: p } = await admin.from("properties").select("address").eq("client_id", d.client_id).limit(1).maybeSingle(); addr = p?.address || null; }
  if (addr) street = String(addr).split(",")[0].trim();
  return street ? `${nm} · ${street}` : `${nm}${d.deal_code ? ` (${d.deal_code})` : ""}`;
}
async function resolveJob(query?: string): Promise<{ id?: string; label?: string; ambiguous?: string[] }> {
  if (!query || !query.trim()) return {};
  const q = query.trim();
  let { data: byCode } = await admin.from("deals").select("id,deal_code,client_id,property_id").ilike("deal_code", `%${q}%`).limit(6);
  let hits: any[] = byCode || [];
  if (!hits.length) {
    const { data: cs } = await admin.from("clients").select("id").ilike("name", `%${q}%`).limit(10);
    const ids = (cs || []).map((c: any) => c.id);
    if (ids.length) { const { data: ds } = await admin.from("deals").select("id,deal_code,client_id,property_id").in("client_id", ids).limit(6); hits = ds || []; }
  }
  if (hits.length === 1) return { id: hits[0].id, label: await jobLabel(hits[0]) };
  if (!hits.length) return {};
  const labels: string[] = [];
  for (const d of hits) labels.push(await jobLabel(d));
  return { ambiguous: labels };
}

async function resolveJobRead(query?: string, ownerId?: string): Promise<{ id?: string; label?: string; ambiguous?: string[] }> {
  if (!query || !query.trim()) return {};
  const q = query.trim();
  const base = () => { let b = admin.from("deals").select("id,deal_code,client_id,property_id").is("archived_at", null); if (ownerId) b = b.eq("rep_id", ownerId); return b; };
  const map = new Map<string, any>();
  const addDealsForClients = async (names: string[]) => {
    for (const nm of names) {
      const { data: cs } = await admin.from("clients").select("id").ilike("name", `%${nm}%`).limit(20);
      const ids = (cs || []).map((c: any) => c.id);
      if (ids.length) { const { data: ds } = await base().in("client_id", ids).limit(12); (ds || []).forEach((d: any) => map.set(d.id, d)); }
    }
  };
  const addDealsForAddress = async (frags: string[]) => {
    for (const fr of frags) {
      const { data: ps } = await admin.from("properties").select("id").ilike("address", `%${fr}%`).limit(20);
      const ids = (ps || []).map((p: any) => p.id);
      if (ids.length) { const { data: ds } = await base().in("property_id", ids).limit(12); (ds || []).forEach((d: any) => map.set(d.id, d)); }
    }
  };
  const { data: byCode } = await base().ilike("deal_code", `%${q}%`).limit(8);
  (byCode || []).forEach((d: any) => map.set(d.id, d));
  await addDealsForClients([q]);
  await addDealsForAddress([q]);
  if (!map.size) {
    const words = q.split(/[\s,]+/).filter((w) => w.length >= 3);
    const alpha = words.filter((w) => /^[A-Za-z.''-]+$/.test(w));
    const withNum = words.filter((w) => /\d/.test(w));
    if (alpha.length) await addDealsForClients(alpha);
    if (withNum.length) await addDealsForAddress(withNum);
  }
  const hits = [...map.values()];
  if (hits.length === 1) return { id: hits[0].id, label: await jobLabel(hits[0]) };
  if (!hits.length) return {};
  const labels: string[] = [];
  for (const d of hits.slice(0, 8)) labels.push(await jobLabel(d));
  return { ambiguous: labels };
}

const money = (n: any) => "$" + Number(n).toLocaleString("en-US");
const NL = String.fromCharCode(10);

function san(s: any): string {
  const m: Record<number, string> = { 8216: "'", 8217: "'", 8220: '"', 8221: '"', 8211: "-", 8212: "-", 8226: "*", 8230: "..." };
  let out = "";
  for (const ch of String(s ?? "")) {
    const c = ch.codePointAt(0) || 0;
    if (m[c] !== undefined) out += m[c];
    else if (c === 9 || c === 10 || (c >= 32 && c <= 255)) out += ch;
  }
  return out;
}
function wrapText(text: string, font: any, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const word of String(text).split(" ").filter((w: string) => w.length)) {
    if (!out.length) { out.push(word); continue; }
    const trial = out[out.length - 1] + " " + word;
    if (font.widthOfTextAtSize(trial, size) > maxW) out.push(word);
    else out[out.length - 1] = trial;
  }
  return out.length ? out : [""];
}
async function makePdf(title: string, body: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("https://esm.sh/pdf-lib@1.17.1");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const PW = 612, PH = 792, M = 56, maxW = PW - M * 2;
  let page = doc.addPage([PW, PH]);
  let y = PH - M;
  const newPage = () => { page = doc.addPage([PW, PH]); y = PH - M; };
  const dateStr = new Date().toISOString().slice(0, 10);
  page.drawText("Southwest Energy Group", { x: M, y, size: 11, font: bold, color: rgb(0.42, 0.30, 1) });
  page.drawText(dateStr, { x: PW - M - font.widthOfTextAtSize(dateStr, 10), y, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  for (const line of wrapText(title, bold, 18, maxW)) { if (y < M) newPage(); page.drawText(line, { x: M, y, size: 18, font: bold }); y -= 24; }
  y -= 10;
  for (const para of body.split(String.fromCharCode(10))) {
    const lines = para.trim() === "" ? [""] : wrapText(para, font, 11, maxW);
    for (const ln of lines) { if (y < M) newPage(); if (ln) page.drawText(ln, { x: M, y, size: 11, font }); y -= 16; }
  }
  return await doc.save();
}
async function makePdfAttachment(folder: string, input: any): Promise<{ att?: any; error?: string }> {
  try {
    const title = san(input?.title || "Document");
    const body = san(input?.body || "");
    let name = String(input?.filename || title.slice(0, 40) || "document").replace(/[^A-Za-z0-9._ -]/g, "").trim() || "document";
    if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
    const bytes = await makePdf(title, body);
    const path = folder + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + ".pdf";
    const { error } = await admin.storage.from("chat-files").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (error) return { error: error.message };
    return { att: { attachment_path: path, attachment_name: name, attachment_type: "application/pdf" } };
  } catch (e) { return { error: (e as Error).message }; }
}

// Execute one READ tool -> string tool_result. askerId is the VERIFIED sender.
async function runReadTool(askerId: string, toolName: string, input: any): Promise<string> {
  try {
    const ctx = await askerCtx(askerId);
    const owner = ctx.staff ? undefined : askerId; // reps see only their own

    if (toolName === "find_jobs") {
      let q = admin.from("deals").select("deal_code,milestone,status,updated_at,sale_price,client_id,property_id").is("archived_at", null).order("updated_at", { ascending: false }).limit(60);
      if (owner) q = q.eq("rep_id", owner);
      if (input?.milestone) q = q.eq("milestone", input.milestone);
      if (input?.stuck_days) q = q.lt("updated_at", new Date(Date.now() - input.stuck_days * 864e5).toISOString());
      const { data: ds } = await q;
      let rows = ds || [];
      if (input?.query) {
        const needle = String(input.query).toLowerCase();
        const cIds = [...new Set(rows.map((r: any) => r.client_id).filter(Boolean))];
        const pIds = [...new Set(rows.map((r: any) => r.property_id).filter(Boolean))];
        const { data: cs } = cIds.length ? await admin.from("clients").select("id,name").in("id", cIds) : { data: [] as any[] };
        const { data: ps } = pIds.length ? await admin.from("properties").select("id,address").in("id", pIds) : { data: [] as any[] };
        const cName = new Map((cs || []).map((c: any) => [c.id, c.name || ""]));
        const pAddr = new Map((ps || []).map((p: any) => [p.id, p.address || ""]));
        rows = rows.filter((r: any) => (cName.get(r.client_id) || "").toLowerCase().includes(needle) || (pAddr.get(r.property_id) || "").toLowerCase().includes(needle));
      }
      if (!rows.length) return owner ? "I don't see any of your jobs matching that." : "No jobs match that.";
      const out: string[] = [];
      for (const r of rows.slice(0, 25)) {
        const lbl = await jobLabel(r);
        out.push(`• ${lbl} — ${r.milestone || "?"}${ctx.money && r.sale_price ? ` · ${money(r.sale_price)}` : ""}`);
      }
      return `${rows.length} job${rows.length === 1 ? "" : "s"}${owner ? " (yours)" : ""}${rows.length > 25 ? " — first 25" : ""}:` + NL + out.join(NL);
    }

    if (toolName === "look_up_job") {
      const jb = await resolveJobRead(input?.job, owner);
      if (jb.ambiguous) return `A few jobs match "${input?.job}": ${jb.ambiguous.join(", ")}. Which one?`;
      if (!jb.id) return owner
        ? `I couldn't find one of YOUR jobs matching "${input?.job}". (You can only look up jobs you're the rep on — ask an admin for anyone else.)`
        : `I couldn't find a job matching "${input?.job}". Try the customer's name, street address, or job code.`;
      const { data: d } = await admin.from("deals").select("*").eq("id", jb.id).maybeSingle();
      if (!d) return "I found the job but couldn't load it. Try once more.";
      const { data: cl } = await admin.from("clients").select("name,phone,email").eq("id", d.client_id).maybeSingle();
      let addr = "";
      if (d.property_id) { const { data: p } = await admin.from("properties").select("address").eq("id", d.property_id).maybeSingle(); addr = p?.address || ""; }
      const { data: ev } = await admin.from("deal_events").select("event,detail,at").eq("deal_id", d.id).order("at", { ascending: false }).limit(8);
      const { data: files } = await admin.from("crm_files").select("file_name,kind,created_at").eq("deal_id", d.id).order("created_at", { ascending: false }).limit(40);

      const nm = cl?.name || d.deal_code || "Customer";
      const L: string[] = [];
      L.push(`${nm}${addr ? ` · ${String(addr).split(",")[0]}` : ""} — ${d.deal_code}`);
      L.push(`Stage: ${d.milestone || "?"}${d.status && d.status !== "active" ? ` (${d.status})` : ""}${d.type ? ` · ${d.type}` : ""}${d.lender ? ` · ${d.lender}` : ""}`);
      if (d.next_action) L.push(`Next: ${d.next_action}${d.next_action_at ? ` (by ${String(d.next_action_at).slice(0, 10)})` : ""}`);
      if (ctx.money) {
        const m: string[] = [];
        if (d.sale_price) m.push(`price ${money(d.sale_price)}`);
        if (d.down_payment) m.push(`down ${money(d.down_payment)}`);
        if (d.financed_amount) m.push(`financed ${money(d.financed_amount)}`);
        if (m.length) L.push(`Money: ${m.join(", ")}`);
      }
      const ck = (d.checklist || {}) as Record<string, boolean>;
      const docDefs: [string, string][] = [["our_contract", "Our contract"], ["finance_contract", "Finance contract"]];
      if (d.is_hdm || /hdm/i.test(d.lender || "") || d.type === "solar" || d.type === "solar_landscape") docDefs.push(["hdm", "HDM contract"]);
      docDefs.push(["completion", "Completion form"]);
      const haveDocs = docDefs.filter(([k]) => ck[k]).map(([, lab]) => lab);
      const missDocs = docDefs.filter(([k]) => !ck[k]).map(([, lab]) => lab);
      L.push(`Documents: ${haveDocs.length ? "✓ " + haveDocs.join(", ") : "none checked off yet"}${missDocs.length ? `  |  still MISSING: ${missDocs.join(", ")}` : "  |  all key docs in ✓"}`);
      if (files && files.length) {
        const names = files.slice(0, 8).map((f: any) => f.file_name).filter(Boolean);
        L.push(`Files (${files.length}): ${names.join(", ")}${files.length > names.length ? ", …" : ""}`);
      } else {
        L.push("Files: none uploaded yet.");
      }
      if (ev && ev.length) {
        L.push("Recent activity:");
        for (const e of ev) L.push(`  • ${String(e.at || "").slice(0, 10)} — ${String(e.detail || e.event || "").slice(0, 160)}`);
      }
      if (cl?.phone) L.push(`Phone: ${cl.phone}`);
      return L.join(NL);
    }

    if (toolName === "appointments") {
      const nowIso = new Date().toISOString();
      const range = input?.range || "upcoming";
      let q = admin.from("appointments").select("title,type,status,starts_at,location,outcome,assigned_to,assignee_ids,client_id,created_by");
      if (owner) q = q.or(`assigned_to.eq.${owner},created_by.eq.${owner},assignee_ids.cs.{${owner}}`);
      if (range === "recent") {
        const days = input?.days || 14;
        q = q.gte("starts_at", new Date(Date.now() - days * 864e5).toISOString()).lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(80);
      } else if (range === "today") {
        const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(); e.setHours(23, 59, 59, 999);
        q = q.gte("starts_at", s.toISOString()).lte("starts_at", e.toISOString()).order("starts_at", { ascending: true }).limit(80);
      } else if (range === "week") {
        q = q.gte("starts_at", nowIso).lte("starts_at", new Date(Date.now() + 7 * 864e5).toISOString()).order("starts_at", { ascending: true }).limit(80);
      } else {
        q = q.gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(40);
      }
      const { data: ap } = await q;
      const rows = ap || [];
      if (!rows.length) return owner ? "You have nothing on the calendar for that." : "Nothing on the calendar for that.";
      const who = [...new Set(rows.flatMap((a: any) => [a.assigned_to, ...(a.assignee_ids || [])]).filter(Boolean))];
      const cIds = [...new Set(rows.map((a: any) => a.client_id).filter(Boolean))];
      const { data: profs } = who.length ? await admin.from("profiles").select("id,name").in("id", who) : { data: [] as any[] };
      const { data: cls } = cIds.length ? await admin.from("clients").select("id,name").in("id", cIds) : { data: [] as any[] };
      const pName = new Map((profs || []).map((p: any) => [p.id, p.name || ""]));
      const cName = new Map((cls || []).map((c: any) => [c.id, c.name || ""]));
      const whenStr = (s: string) => { try { return new Date(s).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return String(s).slice(0, 16); } };
      const L: string[] = [];
      if (range === "recent") {
        const done = rows.filter((a: any) => a.status === "done");
        const oc: Record<string, number> = {};
        done.forEach((a: any) => { const k = a.outcome || "no outcome"; oc[k] = (oc[k] || 0) + 1; });
        L.push(`${rows.length} appointment${rows.length === 1 ? "" : "s"} in the last ${input?.days || 14} days${owner ? " (yours)" : ""} — ${done.length} ran. Outcomes: ${Object.entries(oc).map(([k, v]) => `${v} ${k}`).join(", ") || "—"}.`);
      } else {
        L.push(`${rows.length} upcoming appointment${rows.length === 1 ? "" : "s"}${owner ? " (yours)" : ""}:`);
      }
      for (const a of rows.slice(0, 25)) {
        const cust = a.client_id ? cName.get(a.client_id) : "";
        const reps = [...new Set([a.assigned_to, ...(a.assignee_ids || [])].filter(Boolean).map((id: string) => pName.get(id)).filter(Boolean))];
        L.push(`• ${whenStr(a.starts_at)} — ${a.title || a.type || "appointment"}${cust ? ` · ${cust}` : ""}${reps.length ? ` · ${reps.join(", ")}` : ""}${a.location ? ` · ${a.location}` : ""}${a.status === "done" && a.outcome ? ` · ${a.outcome}` : ""}`);
      }
      return L.join(NL);
    }

    if (toolName === "read_emails") {
      if (!ctx.staff) return "The shared inbox is for the office team — I can't read email for you here.";
      const days = Math.min(input?.days || 21, 90);
      const lim = Math.min(input?.limit || 30, 60);
      const dir = String(input?.direction || "inbound").toLowerCase();
      const needle = (input?.q || "").toString().toLowerCase().trim();
      const fetchN = needle ? 300 : Math.min(lim * 3, 300);
      let q = admin.from("email_messages").select("internal_date,direction,from_email,to_emails,subject,snippet").gte("internal_date", new Date(Date.now() - days * 864e5).toISOString()).order("internal_date", { ascending: false }).limit(fetchN);
      if (dir === "inbound" || dir === "outbound") q = q.eq("direction", dir);
      const { data: em, error } = await q;
      if (error) return `I couldn't read the inbox (${error.message}).`;
      let rows = em || [];
      if (needle) rows = rows.filter((r: any) => ((r.from_email || "") + " " + (r.subject || "") + " " + (r.snippet || "") + " " + ((r.to_emails || []).join(" "))).toLowerCase().includes(needle));
      rows = rows.slice(0, lim);
      if (!rows.length) return needle ? `No emails in the last ${days} days matched "${input.q}".` : `No emails in the last ${days} days.`;
      return `Emails${needle ? ` matching "${input.q}"` : ""} (last ${days}d, showing ${rows.length}):` + NL + rows.map((r: any) => `• ${(r.internal_date || "").slice(0, 16)} · ${r.direction === "outbound" ? "→ " : "from "}${r.from_email || "?"} · ${r.subject || "(no subject)"}${r.snippet ? ` — ${String(r.snippet).slice(0, 160)}` : ""}`).join(NL);
    }

    if (toolName === "leads") {
      if (!ctx.staff) return "Lead numbers are for the office team — I can't pull those for you here.";
      let q = admin.from("fb_leads").select("source,channel,status,appointment_id").limit(5000);
      if (input?.days) q = q.gte("created_at", new Date(Date.now() - input.days * 864e5).toISOString());
      const { data: ld } = await q;
      const rows = ld || [];
      const isFb = (r: any) => /facebook/i.test(r.source || "") || /facebook/i.test(r.channel || "");
      const isIg = (r: any) => /instagram/i.test(r.source || "") || /instagram/i.test(r.channel || "");
      const fb = rows.filter(isFb).length, ig = rows.filter(isIg).length;
      const booked = rows.filter((r: any) => r.appointment_id).length;
      const conv = rows.filter((r: any) => (r.status || "").toLowerCase() === "converted").length;
      return `Leads${input?.days ? ` (last ${input.days}d)` : ""}: ${rows.length} total.` + NL +
        `• Facebook: ${fb}` + NL + `• Instagram: ${ig}` + NL +
        `• Booked an appointment: ${booked}` + NL + `• Marked converted: ${conv}` + NL +
        `(Lead dates reflect the GoHighLevel sync, so the totals by source are the reliable figure.)`;
    }

    if (toolName === "kpis") {
      if (!ctx.staff) return "KPIs are for the office team — I can't pull those for you here.";
      const period = input?.period || "week";
      const days = ({ week: 7, month: 30, quarter: 90, year: 365 } as Record<string, number>)[period] || 7;
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const QUOTE = ["Quote", "Quote Sent", "Quote Accepted", "Lead"];
      const [lr, ar, dr, allr] = await Promise.all([
        admin.from("fb_leads").select("source,channel").gte("created_at", since).limit(5000),
        admin.from("appointments").select("status,outcome").gte("starts_at", since).limit(2000),
        admin.from("deals").select("milestone,status,sale_price,created_at").is("archived_at", null).gte("created_at", since).limit(2000),
        admin.from("deals").select("milestone,status,sale_price").is("archived_at", null).limit(2000),
      ]);
      const ld = lr.data || [], appts = ar.data || [], dl = dr.data || [], live = allr.data || [];
      const leads = ld.length;
      const fbLeads = ld.filter((r: any) => /facebook/i.test(r.source || "") || /facebook/i.test(r.channel || "")).length;
      const igLeads = ld.filter((r: any) => /instagram/i.test(r.source || "") || /instagram/i.test(r.channel || "")).length;
      const apptRan = appts.filter((a: any) => a.status === "done").length;
      const apptWon = appts.filter((a: any) => (a.outcome || "") === "won").length;
      const apptNo = appts.filter((a: any) => (a.outcome || "") === "noshow").length;
      const created = dl.filter((d: any) => (d.status || "") !== "lost");
      const closings = created.filter((d: any) => !QUOTE.includes(d.milestone));
      const closeSum = closings.reduce((s: number, d: any) => s + (+d.sale_price || 0), 0);
      let openPipe = 0, fundedCount = 0, paidCount = 0;
      live.forEach((d: any) => {
        if (d.milestone === "Funded") fundedCount++;
        if (d.milestone === "Paid") paidCount++;
        if (d.milestone !== "Paid" && (d.status || "") !== "lost") openPipe += (+d.sale_price || 0);
      });
      const L: string[] = [];
      L.push(`KPIs — last ${days} days (${period}):`);
      L.push(`• Leads in: ${leads} (Facebook ${fbLeads}, Instagram ${igLeads})`);
      L.push(`• Appointments: ${appts.length} on the calendar — ${apptRan} ran, ${apptWon} won, ${apptNo} no-show`);
      L.push(`• New closings (signed): ${closings.length}${ctx.money ? ` — ${money(closeSum)}` : ""}`);
      if (appts.length) L.push(`• Appt→close: ${Math.round(closings.length / appts.length * 100)}%`);
      L.push(`Live pipeline (open): ${live.length} deals${ctx.money ? `, open $${Math.round(openPipe).toLocaleString("en-US")}` : ""} · Funded ${fundedCount} · Paid ${paidCount}.`);
      L.push(`(Rolling ${days}-day window. Lead dates reflect the CRM sync; for exact new-sales $ ask for the sales report.)`);
      return L.join(NL);
    }

    if (toolName === "spending") {
      if (!ctx.money) return "What we've paid out is money-restricted — I can't pull that for you here.";
      const days = input?.days || 14;
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const sinceDate = since.slice(0, 10);
      const vendor = String(input?.vendor || "").trim();

      let eq = admin.from("deal_expenses").select("vendor,amount,category,note,created_at,deal_id").gte("created_at", since).limit(3000);
      if (vendor) eq = eq.ilike("vendor", `%${vendor}%`);
      const { data: exp } = await eq;
      const expRows = exp || [];

      const subMap = new Map<string, string>();
      const subIds: string[] = [];
      const subQ = admin.from("deal_subs").select("id,contractor_name");
      const { data: subs } = vendor ? await subQ.ilike("contractor_name", `%${vendor}%`).limit(300) : await subQ.limit(1000);
      (subs || []).forEach((s: any) => { subMap.set(s.id, s.contractor_name || "sub"); subIds.push(s.id); });
      let payRows: any[] = [];
      if (!vendor || subIds.length) {
        let sq = admin.from("deal_sub_payments").select("sub_id,amount,method,note,paid_at,created_at,deal_id").gte("paid_at", sinceDate).limit(3000);
        if (vendor) sq = sq.in("sub_id", subIds);
        const { data: pays } = await sq;
        payRows = pays || [];
      }

      if (!expRows.length && !payRows.length) {
        return vendor
          ? `I don't see anything paid to "${vendor}" in the last ${days} days (checked job expenses and sub payments).`
          : `No spending logged in the last ${days} days.`;
      }

      const expSum = expRows.reduce((s: number, r: any) => s + (+r.amount || 0), 0);
      const paySum = payRows.reduce((s: number, r: any) => s + (+r.amount || 0), 0);
      const total = expSum + paySum;

      const dealIds = [...new Set([...expRows, ...payRows].map((r: any) => r.deal_id).filter(Boolean))];
      const labelMap = new Map<string, string>();
      if (dealIds.length) {
        const { data: ds } = await admin.from("deals").select("id,deal_code,client_id,property_id").in("id", dealIds);
        for (const d of (ds || [])) labelMap.set(d.id, await jobLabel(d));
      }

      const L: string[] = [];
      L.push(vendor ? `Paid to "${vendor}" — last ${days} days: ${money(total)}` : `Spending — last ${days} days: ${money(total)}`);
      if (expSum) L.push(`• Job expenses: ${money(expSum)} (${expRows.length})`);
      if (paySum) L.push(`• Sub payments: ${money(paySum)} (${payRows.length})`);

      const items = [
        ...expRows.map((r: any) => ({ when: String(r.created_at || "").slice(0, 10), amt: +r.amount || 0, who: r.vendor || "?", kind: r.category || "expense", deal: r.deal_id })),
        ...payRows.map((r: any) => ({ when: String(r.paid_at || r.created_at || "").slice(0, 10), amt: +r.amount || 0, who: subMap.get(r.sub_id) || "sub", kind: `sub pay${r.method ? ` (${r.method})` : ""}`, deal: r.deal_id })),
      ].sort((a, b) => (a.when < b.when ? 1 : -1));
      L.push(`Recent (${Math.min(items.length, 12)} of ${items.length}):`);
      for (const it of items.slice(0, 12)) L.push(`  • ${it.when} — ${money(it.amt)} — ${it.who}${it.deal && labelMap.get(it.deal) ? ` · ${labelMap.get(it.deal)}` : ""} · ${it.kind}`);

      if (!vendor) {
        const byVendor: Record<string, number> = {};
        expRows.forEach((r: any) => { const k = (r.vendor || "?").trim() || "?"; byVendor[k] = (byVendor[k] || 0) + (+r.amount || 0); });
        payRows.forEach((r: any) => { const k = subMap.get(r.sub_id) || "sub"; byVendor[k] = (byVendor[k] || 0) + (+r.amount || 0); });
        const top = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (top.length) { L.push("Top recipients:"); top.forEach(([k, v]) => L.push(`  • ${k}: ${money(v)}`)); }
      }
      return L.join(NL);
    }

    return "Unknown lookup.";
  } catch (e) {
    return `I couldn't pull that up (${(e as Error).message}).`;
  }
}

// Execute one tool call -> string tool_result. askerId is the VERIFIED sender.
async function runClaudioTool(askerId: string, toolName: string, input: any): Promise<string> {
  try {
    if (toolName === "run_report") {
      const rArgs: Record<string, unknown> = {};
      if (input?.days) rArgs.days = input.days;
      if (input?.period) rArgs.period = input.period;
      const { data, error } = await admin.rpc("claudio_report", { p_asker: askerId, p_type: input?.type, p_args: rArgs });
      if (error) return `Couldn't run that report (${error.message}).`;
      if (data?.denied) return `You're not able to run that report (${data.reason}).`;
      if (!data?.ok) return `Couldn't run that report (${data?.reason || "unknown"}).`;
      if (data.type === "old_jobs") {
        if (!data.rows.length) return `No active jobs older than ${data.days} days.`;
        return `Old jobs (>${data.days}d) — ${data.count}:` + NL + data.rows.map((r: any) =>
          `• ${r.customer || "?"}${r.addr ? ` · ${r.addr}` : ` (${r.code || "job"})`} — ${r.stage || "?"}, ${r.age_days}d${r.amount != null ? ` — ${money(r.amount)}` : ""}`).join(NL);
      }
      if (data.type === "by_stage") {
        return `Jobs by stage:` + NL + data.rows.map((r: any) => `• ${r.stage || "?"}: ${r.jobs}${r.total != null ? ` — ${money(r.total)}` : ""}`).join(NL);
      }
      if (data.type === "sales") {
        const by = (data.by_type || []).filter((r: any) => r.jobs).map((r: any) => `• ${r.type}: ${r.jobs} — ${money(r.total)}`).join(NL);
        return `Sales (${data.period}): ${data.count} deal${data.count === 1 ? "" : "s"} — ${money(data.total)}.` + (by ? NL + by : "");
      }
      if (data.type === "money_in") {
        const f = (o: any) => `${o?.count || 0} — ${money(o?.total || 0)}`;
        return `Money coming in:` + NL +
          `• New sales (last 7d): ${f(data.new_sales_7d)}` + NL +
          `• New sales (last 30d): ${f(data.new_sales_30d)}` + NL +
          `• Open pipeline (not yet paid): ${f(data.open_pipeline)}` + NL +
          `• Funded (lender paid): ${f(data.funded)}` + NL +
          `• Paid: ${f(data.paid)}`;
      }
      return JSON.stringify(data);
    }

    if (toolName === "create_deal") {
      const cl = await resolveClient(input?.customer);
      if (cl.ambiguous) return `A few contacts match "${input?.customer}": ${cl.ambiguous.join(", ")}. Which one? I didn't create anything.`;
      if (!cl.id) return `I couldn't find a contact named "${input?.customer || ""}", so I didn't create a job. Want me to add the contact first?`;
      const { data: existing } = await admin.from("deals").select("id,deal_code,milestone").eq("client_id", cl.id).is("archived_at", null).limit(1);
      if (existing && existing.length) {
        const e = existing[0];
        return `${cl.name} already has a job (${e.deal_code || String(e.id).slice(0, 8)}, ${e.milestone}). I didn't make a duplicate — tell me if you want me to update that one (price, stage, or documents).`;
      }
      const args: Record<string, unknown> = { client_id: cl.id, type: input?.type, sale_price: input?.sale_price, lender: input?.lender, milestone: input?.milestone };
      Object.keys(args).forEach((k) => args[k] === undefined && delete args[k]);
      const { data, error } = await admin.rpc("claudio_action", { p_asker: askerId, p_action: "create_deal", p_args: args });
      if (error) return `That didn't go through (${error.message}). No job created.`;
      if (data?.denied) return `I can't do that for you (${data.reason}). No job created.`;
      if (!data?.ok) return `Something went wrong, so I didn't create the job.`;
      return `Done — created a ${input?.type || "solar"} job for ${cl.name} (${data.deal_code}). I can set its price, stage, or tick its documents next.`;
    }

    if (toolName === "send_email") {
      const to = String(input?.to || "").trim();
      const subject = String(input?.subject || "").trim();
      const bodyText = String(input?.body || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return `"${to}" doesn't look like a valid email address, so I didn't send anything.`;
      if (!subject || !bodyText) return `I need both a subject and a message to send an email.`;
      let dealId: string | undefined; let jobName = "";
      if (input?.job) {
        const jb = await resolveJob(input.job);
        if (jb.ambiguous) return `A few jobs match "${input.job}": ${jb.ambiguous.join(", ")}. Which one? I didn't send anything.`;
        if (jb.id) { dealId = jb.id; jobName = jb.label || ""; }
      }
      const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
      const bodyHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">` +
        bodyText.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") + `</div>`;
      let sent = false; let err = "";
      try {
        const { data: sec } = await admin.rpc("app_followup_secret");
        const ftok = sec?.fn_token || "";
        if (!ftok) err = "no send token";
        else {
          const payload: any = { to, from: "construction@southwestenergy.us", from_name: "Southwest Energy", subject, body_html: bodyHtml };
          if (dealId) payload.deal_id = dealId;
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/followup-send?token=${encodeURIComponent(ftok)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          sent = r.ok; if (!r.ok) err = `HTTP ${r.status}`;
        }
      } catch (e) { err = String(e); }
      // Every Claudio-sent email is logged to the job timeline (when tied to a job) for accountability.
      if (dealId) await admin.from("deal_events").insert({ deal_id: dealId, event: "note", detail: `Email ${sent ? "sent to" : "FAILED to"} ${to} — "${subject}"${sent ? "" : ` (${err})`} — sent via Claudio by request`, by_id: CLAUDIO_ID });
      if (!sent) return `I couldn't send that email (${err}). Nothing went out.`;
      return `Sent — emailed ${to}${jobName ? ` (${jobName})` : ""}: "${subject}".`;
    }

    let assigned_to: string | undefined;
    if ((toolName === "create_task" || toolName === "set_followup") && input?.assignee) {
      const a = await resolveAssignee(input.assignee);
      if (a.ambiguous) return `Which one did you mean — ${a.ambiguous.join(", ")}? I didn't act yet.`;
      if (!a.id) return `I couldn't find a teammate named "${input.assignee}", so I didn't do it. Assign it to you instead?`;
      assigned_to = a.id;
    }
    let deal_id: string | undefined;
    if (input?.job) {
      const jb = await resolveJob(input.job);
      if (jb.ambiguous) return `A few jobs match "${input.job}": ${jb.ambiguous.join(", ")}. Which one? I didn't act yet.`;
      if (!jb.id) return `I couldn't find a job matching "${input.job}", so I didn't act. Give me the job code or exact customer name?`;
      deal_id = jb.id;
    }

    let action: string;
    let args: Record<string, unknown>;
    if (toolName === "create_task") {
      action = "create_task";
      args = { title: input?.title, assigned_to, deal_id, priority: input?.priority, due_at: input?.due_date ? `${input.due_date}T12:00:00` : undefined };
    } else if (toolName === "set_followup") {
      action = "set_followup";
      args = { title: input?.title, assigned_to, deal_id, due_at: input?.due_date ? `${input.due_date}T12:00:00` : undefined };
    } else if (toolName === "add_job_note") {
      if (!deal_id) return `Which job should I add that note to? Give me the job code or customer name.`;
      action = "add_job_note"; args = { deal_id, detail: input?.note };
    } else if (toolName === "move_job_stage") {
      if (!deal_id) return `Which job should I move? Give me the job code or customer name.`;
      action = "move_job_stage"; args = { deal_id, milestone: input?.stage };
    } else if (toolName === "log_expense") {
      if (!deal_id) return `Which job is this expense for? Give me the job code or customer name.`;
      action = "log_expense"; args = { deal_id, amount: input?.amount, vendor: input?.vendor, category: input?.category, note: input?.note };
    } else if (toolName === "set_deal_value") {
      if (!deal_id) return `Which job's price should I set? Give me the job code or customer name.`;
      action = "set_deal_value"; args = { deal_id, sale_price: input?.sale_price, down_payment: input?.down_payment };
    } else if (toolName === "mark_doc") {
      if (!deal_id) return `Which job's document should I check off? Give me the job code or customer name.`;
      action = "mark_doc"; args = { deal_id, doc: input?.doc, signed: input?.signed };
    } else {
      return `Unknown action.`;
    }
    Object.keys(args).forEach((k) => args[k] === undefined && delete args[k]);

    const { data, error } = await admin.rpc("claudio_action", { p_asker: askerId, p_action: action, p_args: args });
    if (error) return `That didn't go through (${error.message}). I didn't make any change.`;
    if (data?.denied) return `I can't do that for you (${data.reason}). No change made.`;
    if (!data?.ok) return `Something went wrong, so I didn't make the change.`;
    if (action === "create_task") return `Done — created the task${data.assigned_to ? ` for ${data.assigned_to}` : ""}.`;
    if (action === "set_followup") return `Done — follow-up set${data.assigned_to ? ` for ${data.assigned_to}` : ""}${input?.due_date ? ` on ${input.due_date}` : ""}.`;
    if (action === "add_job_note") return `Done — added the note to the job timeline.`;
    if (action === "move_job_stage") return `Done — moved the job to ${data.to}${data.from ? ` (was ${data.from})` : ""}.`;
    if (action === "log_expense") return `Done — logged a ${money(data.amount)} expense on the job.`;
    if (action === "set_deal_value") return `Done — set the job total to ${money(data.sale_price)}.`;
    if (action === "mark_doc") {
      const labels: Record<string, string> = { our_contract: "our signed contract", finance_contract: "the finance contract", hdm: "the HDM contract", completion: "the completion form", bill: "the utility bill" };
      return `Done — marked ${labels[data.doc] || data.doc} ${data.value === false ? "unchecked" : "received/signed"} on the job.`;
    }
    return `Done.`;
  } catch (e) {
    return `That didn't go through (${(e as Error).message}). I didn't make any change.`;
  }
}

async function snapshot(sender: string): Promise<string> {
  const { data: prof } = await admin.from("profiles").select("role,can_see_money").eq("id", sender).maybeSingle();
  const isMoney = !!(prof && prof.can_see_money === true);
  const { data: tasks } = await admin.from("tasks").select("title,due_at,priority").eq("done", false).eq("assigned_to", sender).order("due_at", { ascending: true }).limit(30);
  const { data: appts } = await admin.from("appointments").select("title,starts_at,location").or(`assigned_to.eq.${sender},assignee_ids.cs.{${sender}}`).gte("starts_at", new Date(Date.now() - 432e5).toISOString()).order("starts_at", { ascending: true }).limit(12);
  let dealsLine: string;
  if (isMoney) {
    const { data: deals } = await admin.from("deals").select("milestone,sale_price").limit(200);
    let pipe = 0; const stages: Record<string, number> = {};
    (deals || []).forEach((d: any) => { pipe += (+d.sale_price || 0); stages[d.milestone] = (stages[d.milestone] || 0) + 1; });
    dealsLine = `Company deals: ${deals?.length || 0}, pipeline $${Math.round(pipe).toLocaleString("en-US")}. Stages: ${JSON.stringify(stages)}.`;
  } else {
    const { count } = await admin.from("deals").select("id", { count: "exact", head: true }).eq("rep_id", sender);
    dealsLine = `Your assigned deals: ${count || 0}. (Not authorized for company-wide pipeline or financial totals.)`;
  }
  return `${dealsLine} THIS USER'S OWN open tasks: ${JSON.stringify((tasks || []).map((t: any) => ({ task: t.title, due: t.due_at, priority: t.priority })))}. THIS USER'S OWN upcoming appointments: ${JSON.stringify((appts || []).map((a: any) => ({ t: a.title, when: a.starts_at, where: a.location })))}`;
}

async function reply(sender: string, text: string) {
  const cid = await claudioId();
  if (!cid) return;
  const { data: hist } = await admin.from("dm_messages")
    .select("sender_id,text,created_at")
    .or(`and(sender_id.eq.${sender},recipient_id.eq.${cid}),and(sender_id.eq.${cid},recipient_id.eq.${sender})`)
    .order("created_at", { ascending: false }).limit(12);
  const msgs: any[] = (hist || []).reverse().map((m: any) => ({ role: m.sender_id === cid ? "assistant" : "user", content: m.text || "" })).filter((m: any) => m.content);
  if (!msgs.length || msgs[msgs.length - 1].content !== text) msgs.push({ role: "user", content: text });
  const snap = await snapshot(sender);
  const hdmKb = await hdmKbText();
  const key = await cfg("anthropic_key");
  const model = (await cfg("claudio_model")) || "claude-sonnet-4-6";  // set email_config.claudio_model to switch models (e.g. a cheaper Haiku) with no redeploy
  const canAct = await claudioCanAct(sender);
  const staticSys = `You are Claudio, the AI ops assistant for Southwest Energy (solar / landscape / construction, El Paso TX). You're chatting privately with ONE team member inside the company CRM. Reply in plain, warm, concise English — or Spanish if they write Spanish. PRIVACY — STRICT: the SNAPSHOT's tasks and appointments belong ONLY to the person you are talking to (their OWN). For 'my tasks / what do I have today / my schedule' answer from those. You do NOT have any other teammate's personal tasks or schedule — if they ask what another person has to do, say you can only see their own here; never guess or reveal someone else's tasks. Company-wide deal counts and pipeline/financial totals appear in the SNAPSHOT ONLY for users authorized to see finances — if they are not in the snapshot, tell the person you do not have company financials available for them; never estimate or invent them. Only state numbers present in the snapshot or returned by a tool. LOOKUPS: You can pull up any customer's job and answer real questions about it — use look_up_job for ONE customer (their current stage and what's next, the document checklist and what's still MISSING, the uploaded files, the recent activity history like whether the site survey was sent, and the money figures IF this person is allowed to see money), find_jobs to search or list jobs, appointments for the calendar (what's coming up, today, this week, or how past appointments went — ran / quoted / won / no-show), leads for marketing leads (how many total, how many from Facebook vs Instagram — OFFICE admin/ops only), kpis for the funnel + live pipeline (leads, appointments, closings + $, funded/paid, conversion — OFFICE admin/ops only), and spending for what we've PAID OUT — totals to a vendor or subcontractor (e.g. 'how much have I paid Ricardo', total expenses over a window; it sums both job expenses and sub payments and matches the name loosely — MONEY-restricted), and read_emails to READ the company inbox yourself (office only) — you CAN see what actually arrived; when someone asks you to check the inbox or whether a lender/customer/city emailed (e.g. an HDM/finance/contract 'signed' notice), call read_emails with a q (name/street/keyword), then ACT on what you find (mark_doc, move_job_stage, set_deal_value, send a reply). Do NOT say you can't access email — you can, via read_emails. ALWAYS call the right tool when asked about a customer, the calendar/appointments, leads, closings, what we paid someone, what arrived in the inbox, or any company number — pull the live data, never answer from memory or guess. Access is enforced for you: a sales rep can only look up their OWN jobs and appointments, leads/KPIs are office-only, spending is money-only, and money figures only come back for authorized users — so just use the tool and report exactly what it returns; if it says it can't find it or you're not allowed, relay that plainly. WEB: You can search the web and read web links (web_search / web_fetch) when up-to-date outside information would help — search when the answer depends on current facts (prices, codes, weather, addresses, news), and cite what you find. DOCS: You can also make a PDF (create_pdf) — a quote, report, letter, or summary — and it attaches to your reply for the person to download; use it only when they ask for a PDF or a downloadable doc. HDM EXPERT: You are an expert on HDM Renewable Finance, our solar lender, AND a sharp solar sales coach. When asked ANYTHING about HDM — the NTP / M1 / In-Service / M2 milestones, required documents, the install/COR photos crews must take, FEOC / Domestic-Content / AVL / SKU rules, why a deal could get rejected, timelines, how to fix a rejection, OR how to handle a customer's sales OBJECTION — answer from the HDM KNOWLEDGE BASE below, in the person's language (English or Spanish). Be specific and practical, call out the items marked [TOP REJECTION CAUSE] when relevant, and for objections give the rep a tight, ready-to-say response. If the answer truly isn't in the knowledge base, say you're not certain and point them to the HDM Academy page in the CRM (and to email underwriting@hdmcap.com for a definitive underwriting call). Use the CURRENT SNAPSHOT block below for this user's OWN tasks/appointments and (only if authorized) company pipeline totals — never invent numbers.${hdmKb ? "\n\nHDM KNOWLEDGE BASE:\n" + hdmKb : ""}` + (canAct ? ACTION_SYSTEM_SUFFIX : ` If they ask you to DO something in the CRM beyond chatting, lookups, and web lookups (create a task, move a job, log an expense), tell them that's not something you can do for them.`);
  const dynSys = `CURRENT SNAPSHOT (ONLY this user's own data; company-wide pipeline appears only if they're authorized for finances):\n${snap}`;

  const apiKey = key || "";
  const callAnthropic = async (messages: any[]) => {
    const tools = canAct ? [...WEB_TOOLS, CREATE_PDF_TOOL, ...READ_TOOLS, ...STAFF_READ_TOOLS, ...ACTION_TOOLS] : [...WEB_TOOLS, CREATE_PDF_TOOL, ...READ_TOOLS];
    // Prompt caching: the static system (instructions + HDM KB) and the tool schemas repeat on
    // every message and every tool-loop round. Cache them so full input is billed ~once per 5 min
    // instead of every call — the per-user snapshot stays uncached because it changes each turn.
    if (tools.length) (tools[tools.length - 1] as any).cache_control = { type: "ephemeral" };
    const body: any = {
      model, max_tokens: 1024,
      system: [{ type: "text", text: staticSys, cache_control: { type: "ephemeral" } }, { type: "text", text: dynSys }],
      tools, messages,
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  };

  const convo: any[] = msgs.slice();
  let out = "…";
  let pendingAttachment: any = null;
  const execNames = new Set<string>([...READ_NAMES, "create_pdf", ...(canAct ? [...STAFF_READ_NAMES, ...ACTION_NAMES] : [])]);
  for (let round = 0; round < 6; round++) {
    const j = await callAnthropic(convo);
    if (!j || j.error) { out = "…"; break; }
    const content: any[] = j.content || [];
    if (j.stop_reason === "pause_turn") { convo.push({ role: "assistant", content }); continue; }
    const toolUses = content.filter((b: any) => b.type === "tool_use" && execNames.has(b.name));
    if (j.stop_reason === "tool_use" && toolUses.length) {
      const results: any[] = [];
      for (const tu of toolUses) {
        let r: string;
        if (tu.name === "create_pdf") {
          const made = await makePdfAttachment(cid, tu.input);
          if (made.error) r = `I couldn't make that PDF (${made.error}). Nothing attached.`;
          else { pendingAttachment = made.att; r = `Done — "${made.att.attachment_name}" is ready and attached to this reply to download.`; }
        } else if (READ_NAMES.has(tu.name) || STAFF_READ_NAMES.has(tu.name)) {
          r = await runReadTool(sender, tu.name, tu.input);
        } else {
          r = await runClaudioTool(sender, tu.name, tu.input);
        }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: r });
      }
      convo.push({ role: "assistant", content });
      convo.push({ role: "user", content: results });
      continue;
    }
    out = content.map((b: any) => b.text || "").join("").trim() || "…";
    break;
  }

  const row: any = { sender_id: cid, recipient_id: sender, text: out };
  if (pendingAttachment) Object.assign(row, pendingAttachment);
  await admin.from("dm_messages").insert(row);
  await admin.from("notifications").insert({ user_id: sender, text: out.slice(0, 180), by_name: NAME, type: "general", url: "/crm.html" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const tok = await cfg("claudio_dm_token");
  const initArg = url.searchParams.get("init");
  if (initArg) {
    if (!tok || initArg !== tok) return J({ error: "unauthorized" }, 401);
    let cid = await claudioId();
    if (!cid) {
      const email = "claudio.bot@southwestenergy.us";
      const pw = crypto.randomUUID() + "Aa1!";
      const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
      let uid = u?.user?.id;
      if (!uid) { const { data: list } = await admin.auth.admin.listUsers(); uid = (list?.users || []).find((x: any) => x.email === email)?.id; }
      if (!uid) return J({ error: "could not create or find claudio auth user" }, 500);
      cid = uid;
      const { error: pe } = await admin.from("profiles").upsert({ id: cid, name: NAME, role: "ops", dealer_id: DEALER, active: true, title: "AI Ops Assistant" });
      if (pe) return J({ error: "profile upsert failed: " + pe.message }, 500);
    }
    return J({ ok: true, claudio_id: cid });
  }
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({} as any));
    const text = b.text || "";
    let sender = b.sender_id;
    const authH = req.headers.get("Authorization") || "";
    const jwt = authH.startsWith("Bearer ") ? authH.slice(7) : "";
    const tokenOk = !!tok && url.searchParams.get("token") === tok;
    if (!tokenOk) {
      if (!jwt) return J({ error: "unauthorized" }, 401);
      const { data: u, error: ue } = await admin.auth.getUser(jwt);
      const uid = u?.user?.id;
      if (ue || !uid) return J({ error: "unauthorized" }, 401);
      if (sender && String(sender) !== String(uid)) return J({ error: "forbidden" }, 403);
      sender = uid;
    }
    if (!sender || !text) return J({ error: "missing sender_id/text" }, 400);
    try { await reply(sender, text); } catch (e) { return J({ error: String(e) }, 500); }
    return J({ ok: true });
  }
  return J({ ok: true, fn: "claudio-dm" });
});
