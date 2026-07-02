# Claudio Audit & Upgrade — Southwest Energy CRM AI Assistant

**Date:** 2026-07-02
**Scope:** Claudio's full footprint — the in-CRM chat brain, the automatic pipeline agent's tool server, the write/permission layer, and the morning digest. Audited against the live Supabase project `msrgkxzbjqthwagrlwur`.

Legend: **[FIXED]** applied & deployed this pass · **[OPEN]** needs your decision / server-side change.

---

## How Claudio actually works (the map)

Claudio is not one thing — he's several pieces, and two of the names are dead ends:

| Piece | What it is | State |
|-------|-----------|-------|
| **`claudio-dm`** (edge function) | His **only live brain** — replies to DMs in the CRM Messages screen. Calls the Anthropic API directly with his own tools. | **ACTIVE (now v20)** |
| **`crm-mcp`** (edge function) | An **MCP tool server** exposing the CRM (create/advance deal, site survey, emails, money watch, etc.). Used by the **Claude Console "Managed Agent"** — the autonomous pipeline Claudio that scans email and moves deals on its own. | **ACTIVE (now v12)** |
| **`claudio_action`** (Postgres RPC) | The **guarded write layer** — every action `claudio-dm` takes (move stage, set price, log expense, create job…) goes through here, which re-checks permissions and logs to `claudio_actions`. | **ACTIVE (patched)** |
| **`claudio_morning_digest`** (Postgres cron) | Posts the daily money/pipeline digest to your Claudio DM each morning (~7am MT). | **ACTIVE (patched)** |
| `claudio-chat`, `claudio-watch` | Old in-CRM chat + 10-min watcher. | **RETIRED stubs** (return HTTP 410) — dead endpoints, safe to delete. |

**Permission model (sound):** `claudio_action` allows *ops/admin* roles for most actions, gates expenses behind `can_see_money` or a per-user `claudio_capabilities` grant, and refuses anything else. The `claudio_write_allowlist` (currently you + Efrain) drives whether chat-Claudio even *offers* to act. Every action is written to a `claudio_actions` audit log. Identity is server-pinned (a rep can only act as themselves).

---

## Findings & what changed

### 1. He couldn't send email — now he can. **[FIXED]**
His prompt literally said *"you cannot send email yet"* and he'd refuse. Added a **`send_email`** tool to both the chat brain (`claudio-dm`) and the auto-agent's server (`crm-mcp`). It sends from `construction@southwestenergy.us` through your existing mailer and **logs every send to the job's timeline**. Chat-Claudio only offers it to allowlisted users; the prompt now teaches him to write the message, confirm the recipient, and report what he sent.

### 2. He couldn't move solar jobs to their real stages — now he can. **[FIXED]** (this was in **three** places)
Solar's real ladder is `Quote Sent → Contract Sent → Contract Signed → HDM / Financing Signed → Welcome Call Done → Site Survey & Plans → Interconnection → Install Scheduled → Installed → City Inspection → PTO → Funded`. But the code hardcoded a *landscape-style* list (`Permits / Scheduled / In Progress / Completed / Paid`) that doesn't exist for solar:
- The **tool schema** (`claudio-dm`) offered the wrong stages → fixed to the full real union.
- The **server guard** (`claudio_action`) *rejected* real solar stages as "invalid_stage" → now validates against the deal's actual per-type ladder from `app_settings`, so any valid stage for that job type goes through.
- Bonus: `move_job_stage` never updated `milestone_index` and `create_deal` hardcoded it to 0 → the pipeline **progress bar** was stale; now the index is computed from the ladder position.

### 3. Your morning digest was measuring the wrong thing. **[FIXED]**
The digest counted deals at `milestone = 'Paid'` and `'In Progress'` — stages that **only exist for landscape/construction**, not solar. So the "money" section largely ignored your core solar business. Rewritten to the real definition: **work done but cash not collected** = solar deals at Installed/City Inspection/PTO (not yet Funded) + landscape/construction Completed (not yet Paid), plus genuinely-stuck deals and committed deals still at $0. The same stale-stage bug in `crm-mcp`'s `money_watch` tool was fixed the same way.

### 4. Lower running cost. **[FIXED]**
- **Prompt caching:** his big static system prompt + the entire HDM knowledge base + all tool schemas were re-sent (and re-billed) on *every* message and *every* tool-loop round. Now cached — full input is billed roughly once per 5 minutes instead of every call. On a chatty day that's a large cut in input tokens (the HDM KB is the bulk of his prompt).
- **Swappable model:** the model id is now read from config (`email_config.claudio_model`). You can drop him to a cheaper/faster model (e.g. Haiku) for everyday ops with **no redeploy** — set the key, done. Left on the current model by default so nothing changes until you choose.

### 5. Verified live. 
Deployed `claudio-dm` v20, confirmed byte-for-byte and parsing clean, then triggered a real reply end-to-end (he answered correctly in ~4s) and cleaned up the test. `crm-mcp` v12 confirmed to contain the new money logic + email tool. Both kept their existing auth (`verify_jwt: false`, bearer/token-gated).

---

## Still open (your call — not changed, to avoid breaking live automation)

- **`money_watch` tool *description*** in `crm-mcp` still reads like the old behavior (the *code* is fixed). Cosmetic; update when convenient so the Console agent's hint matches.
- **Retired stubs** `claudio-chat` / `claudio-watch` can be deleted to reduce confusion.
- **The Console (auto-pipeline) agent's own prompt** lives in the Anthropic Console, not in this infra — to make the autonomous Claudio *use* the new `send_email` tool, add it to that agent's instructions there.
- **Security items from the DB audit** (shared with the CRM audit): unauthenticated n8n webhooks, several `anon`-callable DB functions + the weak `cold_quotes` secret, and RLS/Realtime checks behind client-side gates. These need coordinated server-side changes.

---

## Recommendations to make Claudio better / more automated

1. **Give the auto-pipeline agent the email tool in its Console prompt** — it can already move deals and send site surveys; letting it send customer milestone updates and vendor nudges closes the loop.
2. **Widen the allowlist deliberately.** Right now only you + Efrain can have chat-Claudio *do* things. Add office managers so reps' requests ("move my job to Installed", "email this customer") actually execute for the people who live in the CRM.
3. **A second, cheap "triage" bot.** A Haiku-class agent that just watches inbound email/leads and drafts the action (advance stage / send update) for one-tap approval — keeps a human in the loop while offloading the reading. Cheap because it's Haiku + short prompts.
4. **Consolidate tools.** `claudio-dm` and `crm-mcp` now duplicate create/advance/note/email logic. Long-term, point `claudio-dm` at the `crm-mcp` server so there's one tool surface to maintain instead of two.
5. **Weekly owner digest** (not just daily) — sales/funnel + cash-in over the week, using the corrected stage logic.
