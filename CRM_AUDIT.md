# Comprehensive Audit — Production CRM (`crm.html`)

**Date:** 2026-07-02
**Target:** the single-file Southwest Energy solar CRM (`crm.html`, ~15,830 lines — vanilla JS + Supabase + n8n + SignWell).
**Method:** full read of the file in four slices by parallel reviewers, cross-checked against the live Supabase project (`msrgkxzbjqthwagrlwur`) schema, RLS, and security advisors.

Legend: **[FIXED]** applied in this pass · **[OPEN]** needs a code/infra change · **[VERIFY]** depends on server-side (RLS / edge function) config to confirm severity.

---

## Changelog — code fixes applied in `crm.html` (2026-07-02, second pass)

Client-side, self-contained, verified to parse cleanly (headless load, 0 syntax errors). Deploy the updated `crm.html` for these to take effect.

**Security**
- Added `escJs()` (JS-string-safe encoder) and upgraded **99 attribute interpolations** from `esc()` → `escAttr()`, plus every confirmed inline `onclick` handler built from names/emails/paths (attachment filename, notification URL, chat attachments, ref chips, HDM cards, dealer agreement link, finance-plan bank, etc.). Unit-tested against 6 XSS payloads — all neutralized.
- Email body iframe: removed `allow-popups-to-escape-sandbox` (mail links can no longer open unsandboxed) and added a "never add allow-scripts" guard comment.

**Money integrity**
- Contract preview no longer permanently mutates a deal's `sale_price` — the bump is reverted when the rep closes the preview without sending.
- Payout approval is now an atomic compare-and-swap (`pending→approved`), so two admins can't both post the ledger (no double payment); the write error is surfaced.
- `oblMarkPaid` records the payment before advancing/archiving the bill and bails on failure (no more silent roll-forward with no ledger row).
- Saved-presentation save/delete now abort on a failed read instead of overwriting the whole array (fixes the "all presentations wiped" bug).
- Quote totals rounded to whole cents at the source; negative/zero amounts rejected in sub-payments and expenses.
- Printed proposal: no more "$-87 less than your current bill" (only shown when actually lower) and no "NaNW" when a package has no fixed panel count.

**Correctness / flow**
- **Create Job → Go to Job:** the contact page shows "Go to job" (opens it) once a job exists, "View jobs (n)" for several, and "New job" only when there are none; `createDeal` also confirms before making a *second* active job for a contact.
- `taskEditSave` keeps a free-text crew assignee instead of wiping it; the edit dropdown now lists the crew roster.
- `saveExpense` requires a job (no more raw UUID error on empty `deal_id`).
- Dashboard cold-quote nudge actually fires (query returned no rows before).
- `emailSend` reads its fields scoped to the compose modal, so an open inline reply can't hijack the recipient/body.
- Null-guards on `advanceDeal` / `artemisDesign` (no crash when a deal isn't cached).

**Timezone**
- Task/lead/dashboard/follow-up "today" now uses El Paso local date (`dispToday()`) instead of UTC — no more evening day-flips.

**Reliability**
- Service-call "Confirmation/Report sent ✓" and the Google-review request only claim success when the webhook actually returns OK.
- Chat send restores the typed text + tags if the insert fails (no lost messages).
- Popup-announcement read-receipt is now actually written (was a never-awaited query).

Still **[OPEN]** (need server-side changes or your decision, not done here): unauthenticated n8n webhooks, anon-executable SECURITY DEFINER functions + `cold_quotes` secret, RLS/Realtime authorization behind client-side gates, Google Maps key referrer restriction. See sections below.

---

## 0. What the owner asked for — readability ("small letters", "notes not bolded", "log space") — **[FIXED]**

All three complaints traced to a px-based type scale with a very low floor (8–11px on real content), note bodies rendered at regular weight, and activity/log rows capped short and tightly padded. Fixes applied (CSS + inline note templates), no redesign:

| Area | Before | After |
|------|--------|-------|
| Secondary text `.muted` (used in hundreds of places) | 12.5px | **13.5px** |
| Card section labels `.lbl` | 10px / 2px tracking | **11.5px / 1.5px** |
| Field labels `.kv .k` / values `.kv .v` | 9.5px / 13.5px | **11px / 14.5px** |
| Table headers `table.tbl th` | 9.5px | **11px** |
| Stat labels `.stat .l` | 9px | **10.5px** |
| Calendar events `.cw-evt` (desktop / mobile) | 10.5px / 8.5px | **11.5px / 10px** |
| Appointment times `.appt-when` | 11.5px | **12.5px** |
| **Personal note body `.pn-body`** | 13px, weight 400 | **15px, weight 600 (bold)** |
| **Deal-feed note text** (inline) | 13px, weight 400 | **14px, weight 600 for notes** |
| **Customer-timeline detail** (inline) | 12.5px, weight 400 | **13.5px, weight 600** |
| Dashboard activity summary `.act-sum` | 12.5px, dim, 2-line clamp | **13.5px, ink color, 3-line clamp** |
| Low-contrast timestamp color `--dim` | `#6B7280` (~4.8:1) | **`#575E6B` (>6:1)** |
| Activity feed height / row padding `.act-feed` / `.act-row` | 340px / 9px | **60vh / 13px** |
| Deal & timeline feed containers | 420px max | **60vh** |
| Deal note row `.ev` padding | 10px | **14px** |
| Intercom log `.ic-activity` / `.ic-arow` | 200px / 8px | **340px / 11px** |

> Note for the maintainer: the file has ~250 further inline `font-size` values ≤12px and a dark customer-facing "showroom" (`.sh-*`) that was intentionally left untouched. The changes above cover every surface named in the complaints.

---

## 1. Security — highest priority

### 1.1 Stored/attribute XSS via `esc()` in quoted contexts — **[OPEN]** (systemic)
`esc()` (defined ~L965) escapes `& < >` but **not quotes** — this is documented in the source itself, and a quote-safe `escAttr()` already exists. Yet `esc()` is used inside double-quoted HTML attributes and inside single-quoted inline JS handlers built from DB/external data. The Supabase key is public and the app itself performs cross-user inserts (e.g. `notifications`), so these are reachable.

Confirmed sinks (representative, not exhaustive):
- **Email inbox** `attachChip` L1982 `title="${esc(a.filename)}"` — attachment filename comes from *any* external sender → `x" onmouseover=...` runs JS when a rep opens the inbox. **Highest-risk instance.**
- `threadRow` `data-search="${srch}"` (L1756), `openAttachment` `download=/alt=` (L1995–1998), sidebar dealer `src="${esc(logo_url)}"` (L1508).
- Inline JS-string handlers: `openNotif('${esc(n.url)}')` (L9089), `refsChips` `href="${r.id}"` (L8452), chat attachment `href="${url}"` (L7531) / `data-url` (L7546), `hdmOpenCard('${esc(slug)}')` (L12816+), `dealerManageModal` `href="${agrUrl}"` (L14972). A name like `O'Brien` also breaks these handlers (dead button) even without an attacker.

**Fix:** use `escAttr()` for every attribute interpolation, and a JS-string-safe encoder (or `data-*` + `addEventListener`) for inline handlers. A global sweep of `esc(` usages by context is warranted.

### 1.2 Email body rendered same-origin — **[OPEN]**
L1883 renders raw `body_html` in `<iframe srcdoc sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox">`. No `allow-scripts` (so inline `<script>` is blocked), but `allow-same-origin` + the attribute-injection in §1.1 is one mistake away from full session compromise, and `allow-popups-to-escape-sandbox` lets mail links open unsandboxed. **Fix:** drop `allow-same-origin`; sanitize server-side.

### 1.3 Unauthenticated n8n webhooks shipped client-side — **[OPEN]**
Hardcoded, no-auth endpoints callable by anyone who views source: `crm2-notify`, `sc-notify` (L906–907), `crm-chat` (L7022/7744/8383), `pay` (L12582–583), `solar-contract`/`send-contract`/`send-quote` paths. An attacker can POST to send "Southwest Energy" emails/contracts, spam Slack/notify, or trigger deal automation. **Fix:** require a bearer/signature the server verifies; move send-side calls behind an authenticated edge function.

### 1.4 SECURITY DEFINER functions executable by `anon` with no auth guard — **[OPEN]** (from DB advisors)
79 `public` functions grant EXECUTE to `anon`. Most are triggers (harmless) or token-gated, **but** these non-trigger, no-`auth.uid()` ones are directly RPC-callable by anyone with the public key:
- Side-effect/cron: `appt_send_reminders`, `followups_tick`, `calendar_poll`, `claudio_morning_digest`, `email_renew_watches`, `pipeline_resolve_epe`, `followup_timeline_html` → attacker can trigger reminder/email/digest runs.
- Data-returning secret-gated: `cold_quotes(secret)` returns **every stale quote's client name, email, total, rep** and is gated only by the literal `81fc0f75f7ac84b693bf4567d62dc8b8` (weak 32-hex shared secret; not in the client bundle today, but fragile). Same pattern: `web_lead`, `fb_solar_load/save`, `news_digest_post`.

**Fix:** `REVOKE EXECUTE ... FROM anon` on the cron/data functions; call them from n8n with the service role instead. Rotate `cold_quotes` to a strong per-caller secret or an authenticated path. Also: 13 functions have a mutable `search_path` (advisor WARN) — pin `SET search_path` on all SECURITY DEFINER functions. Enable Auth "leaked password protection".

### 1.5 Client-side-only authorization — **[VERIFY]**
Role/money gates (`me.role`, `can_see_money`, `canApprovePay`, group-admin, "Admins only" toggles) are enforced in the browser throughout (dispatch, service calls, expenses, accounting, pay approvals, lender draws, `profiles.role`/`can_see_money` writes at L14844/14852, cross-user `notifications` inserts). These are only real if backed by RLS. **DB check:** all referenced tables have RLS enabled (no fully-open public tables; backup/config tables are deny-all). The remaining risk is *column-/row-level* policy correctness — verify write policies on `payout_requests`, `obligations`, `deal_expenses`, `profiles` (role/money columns), `service_calls`, `dispatch_assignments`, `deals.rep_id`, `notifications`, `app_settings`, `sequences`, `chat_groups`, and Realtime authorization on the intercom channel.

### 1.6 Billable API keys / info disclosure in client — **[OPEN]**
Hardcoded client-side: Google Maps/Places key `AIzaSy...` (L7027 + static-maps use) and `GMAPS_KEY` — **must be HTTP-referrer restricted** or the billing is abusable. `CP_PARSE_KEY = 'pk_swe_...'` (L5682) shared AI-parse secret can't be rotated without redeploy. Internal profile UUIDs and a personal email (`GUSTAVO_EMAIL`) are baked in (L910–915).

### 1.7 Office intercom identity is self-asserted — **[VERIFY/OPEN]**
Intercom (L15266+) broadcasts `from:{id,name}` chosen by the client over a fixed channel `intercom:swe-office`; the 5 allowed UUIDs are in source. Anyone with the public key can subscribe to **listen to raw office audio** and inject audio impersonating the owner, unless Supabase Realtime authorization is enforced server-side.

---

## 2. Correctness bugs

### Money / data-integrity (highest impact)
- **[OPEN] Previewing a contract mutates the deal's price.** `sendContract` solar path overwrites `deals.sale_price` with the quote total *before* preview and only rolls back on preview HTTP failure; closing the preview without sending leaves the new price committed → corrupts commissions/pipeline totals. (L10073–10101)
- **[OPEN] Saved presentations can be wiped.** `salesSaveToContact` (L11249) and `deleteContactPresentation` (L11328) do read-modify-write on `clients.presentations`; if the SELECT fails transiently, `arr=[]` and the UPDATE **overwrites all saved presentations** with one/none. Also a lost-update race across devices.
- **[OPEN] Presentation scratchpad leaks between customers.** `Object.assign(cfg, pres,...)` (L11297/11315/11347) merges a saved snapshot over the live config without clearing it — keys absent from an older snapshot (panels, bars, bill name…) carry over from the previously worked customer.
- **[OPEN] Payment ledger can advance with no payment row.** `oblMarkPaid` (L14007) / `oblPaySave` (L14072) ignore the `obligation_payments` insert result and advance/archive the obligation regardless → bill rolls forward with no recorded payment. Non-atomic.
- **[OPEN] Double-approve payouts (TOCTOU).** `payReqApprove`/`doApprove` (L14281) check `status==='pending'` then update; two admins can both pass, and `recordPayoutLedger`'s delete-then-insert double-inserts `deal_sub_payments`/`deal_expenses`. None of the three writes check errors (L14297–304).
- **[OPEN] Cold-quote alerts can never fire.** Dashboard fetches quotes with `{count:'exact', head:true}` (no rows returned) then reads `qq.data`/`x.sent_at` → `quotesOut`/`coldQuotes` always 0; reps never see the nudge. (L3661/3676)
- **[OPEN] Negative / $0 money accepted.** `saveSubPay` rejects a legit $0 but accepts negatives (L6113); quote lines accept negative qty/price and `Math.max(0, sub-disc)` silently zeroes the total instead of erroring (L9616/9909). Quote/contract totals are stored as **unrounded floats** (e.g. `1234.5600000000002`) — round to cents before storing/sending.
- **[OPEN] Milestone-index corruption.** `sendGustavoEmail` hardcodes `svIdx=5` when no stage matches `/site survey/i`, writing an out-of-range `milestone_index` that breaks progress math. (L6879)
- **[OPEN] Duplicate-address guard bypassable.** `createClient` (New Contact, L8869) skips the `crmAddrInUse` check that `createLead`/`msgSaveQuickContact` enforce.
- **[OPEN] Printed proposal money bugs.** `proposalDocHTML` prints "$-87 less than your current bill" (no sign check, L12109) and "NaNW" when a package has no fixed `panels` (L12097).
- **[OPEN] Wrong offset % by entry path.** `loadSalesCfg` uses hardcoded `0.14` rate while `salesAnnualKwh` uses the customer's real bill rate → different offset for the same customer (L10680). `HDM_MULT=0.8` is an admitted placeholder multiplier still live (L10461).

### Timezone
- **[OPEN] UTC "today" across the app.** Dashboard, To-Do buckets, quick-due, and `pageFollowups` compute today via `new Date().toISOString().slice(0,10)` (UTC) while the business is El Paso (`APP_TZ` exists and `dispToday` does it right). After ~5–6 PM MT, tasks/leads mis-bucket as overdue/today and "jobs this month" flips a day early. The Follow-ups **Board** and **Mine** tabs even disagree with each other. (L3651/3670/3971/4341/4454/4472, L9017 vs L9129)

### Crashes / dead handlers
- **[OPEN] `advanceDeal` (L6777) and `artemisDesign` (L6706)** dereference a deal found in `dealsCache` with no null check → TypeError / dead button when the deal isn't cached (stale page, archived by someone else).
- **[OPEN] Stale `dealsCache`.** `pipelineArchivedHTML` overwrites the global `dealsCache` with archived-only deals; `shGenQuote`/`salesCreateQuote` then mis-detect a valid linked job (L12403 vs L13280).
- **[OPEN] `saveExpense` (L13542)** sends `deal_id: ''` when no job is picked → raw Postgres uuid error to the user.
- **[OPEN] Duplicate element IDs — wrong-recipient email.** Inline reply and the compose modal share IDs (`#emTo/#emBody/...`); `emailSend` (L2118) grabs the inline reply's fields → clicking Compose→Send can email the wrong person. (L1931–2038)
- **[OPEN] Broken dispatch dropdowns.** Assign modal mounts in `#msgModalHost` but its CSS targets `#modalHost .disp-*` → unstyled inline dropdowns. (L3015 vs 3018)
- **[OPEN] Crew assignee wiped on edit.** `taskEditSave` always writes `assignee_name:null`; editing any field of a task assigned to a free-text roster name drops the assignee. (L4479)
- **[OPEN] Double-submit.** `fbConfirmSave`/`fbSend` (L2703/2628) don't disable the button before the async call → double appointments / double Messenger sends.
- **[OPEN] Never-awaited writes.** Popup announcement read-receipt `upsert` is never awaited (L15817) → re-fires on other devices. `shGenQuote` client select has no `.catch` (L12405) → modal silently never opens on network error.
- **[OPEN] `chatCtx` on `window`.** `saveSubPay`/`subPayDel` test `window.chatCtx` but it's module-scoped → always falsy; works only by accident. (L6122)
- **[OPEN] Deep-link race.** `#/fbleads/<id>` calls `fbOpen` after 60 ms without awaiting `fbLoadLeads` → blank thread on slow connections. (L2258)

---

## 3. Reliability — silent data loss / false success

Recurring anti-pattern: `const { data } = await sb...` destructures **only `data`**, ignoring `error`; failures render "empty" states indistinguishable from real emptiness, and side effects/toasts fire regardless. Highest-impact instances:

- Quote/contract **emailed or sent via SignWell, but the `quotes` row insert/update is unchecked** → the signed-contract webhook later has no row to flip; no CRM record. (`sendQuote` L9959, `sendContract` L10130, `solarSendNow` L6646)
- Service-call "Send report ✓" stamps `report_sent_at` even when the webhook throws (swallowed) → customer never emailed. (`scSendReport` L3475)
- Milestone / review-request customer emails are fire-and-forget `.catch(()=>{})` while the UI advances the stage / logs "auto-sent". (L6766, L13743 `sendReview` ignores `r.ok`)
- Deal-created **Drive folder** creation is silently try/caught → deal exists with no folder, no retry, nobody told. (`createDeal` L5285, `fbDealSave` L2799, `salesSendContract` L11399)
- Photo uploads: storage succeeds but `deal_photos` row insert unchecked → orphaned files, photo never appears, "uploaded" toast shown. (L6049)
- Chat composer cleared **before** the insert → typed message lost on error, user must retype. (`msgSend` L8345, `sendChat` L7711)
- Notification inserts to assignees/watchers try/caught empty → rep assigned work and never pinged, assigner told "Assigned ✓". (L4363/4483/3196/3422)
- Private deal-photo signed-URL failures fall back to stale public URLs (bucket is private) → broken image grid, no error. (L5362)
- HDM quiz "Certified!" celebrated even when the `hdm_certifications` upsert failed. (L12939)
- `pageFollowups` / most page selects: failed/RLS-blocked query → "Nothing here", user thinks data is gone. (`loadInboxList` L1799 etc.)

**Fix:** a small `must(res, msg)` helper that checks `res.error`, toasts, and (where optimistic) rolls back — applied to every write path and the money/ledger reads.

---

## 4. Storage / infra hygiene
- Public buckets `chat-files` and `logos` have broad SELECT policies allowing **listing all files** (advisor WARN) — scope policies to owner/path.
- `crmFileDel` deletes the DB row before storage `.remove()`; on failure the object is orphaned. (L5906)
- 25 backup/config tables (`_bak_*_2026...`, `*_dedupe_*`) sit in `public` with RLS-but-no-policy (deny-all, so not leaking) — drop the dated backups to declutter and shrink attack surface.

---

## 5. Dead / debug code (low priority)
`teamCard` (~40 lines, never rendered, duplicates invite IDs — L14522); local P&L computed then discarded in `pageAccounting` (L13852); retired HDM branches persist despite `cfg.hdm=false` (L11113/12254+); duplicate `sparkles` icon key (L1025/1047); `salesDefaultLenderIds()` always returns `[]` (L10672); vestigial `- 0` (L9535); `console.warn/error` noise (L5289/9978/11195/11941…); back-compat aliases `fbOnlyUnread`/`window.todoFilter`/`wakeClaudio(){}`. Pending-data markers to resolve with Chris: TGUC 730-759 tier (L932), `HDM_MULT`, production dealer code (L9573).

---

## Recommended order of work
1. **XSS sweep** (§1.1) + drop `allow-same-origin` on the email iframe (§1.2) — reachable session compromise.
2. **Lock down anon-executable functions & rotate `cold_quotes`** (§1.4); restrict the Maps keys (§1.6).
3. **Money integrity:** contract-preview price mutation, payout double-approve, ledger-advance-without-payment, saved-presentation wipe, float rounding (§2).
4. **UTC→El Paso "today"** everywhere (§2 Timezone) — quietly wrong every evening.
5. **`must()` error-check helper** across write paths (§3).
6. Verify RLS/Realtime authorization backs every client-side gate (§1.5, §1.7).
