# Security Hardening Plan — ready to execute

**Status:** planned, **not yet applied.** These need the Supabase and/or n8n connectors (both were flapping/disconnected when this was written) and, for a few, a quick check of how n8n authenticates before touching production. Nothing here has been run. Grouped by risk so the safe ones can go first.

---

## A. Safe & non-breaking — do first (Supabase only)

1. **Pin `search_path` on all SECURITY DEFINER functions** (advisor: `function_search_path_mutable`, ~13 functions). Prevents search-path injection. Pure hardening, no behavior change:
   `ALTER FUNCTION public.<fn>(<args>) SET search_path = public, pg_temp;` for each flagged function.
2. **Enable leaked-password protection** in Auth (advisor: `auth_leaked_password_protection`). Dashboard → Authentication → Password protection (or Auth config). No app impact.
3. **Scope the public-bucket read policies** so clients can't *list* every file in `chat-files` and `logos` (advisor: `public_bucket_allows_listing`). Keep object reads working; drop broad `SELECT` listing. Verify the CRM still loads chat attachments + logos after (it fetches by known path / public URL, so it should be unaffected).

## B. Medium — needs a look before applying (verify caller, then Supabase)

4. **Lock down anon-executable functions.** ~79 functions grant `EXECUTE` to `anon`. Triggers are harmless; the concern is the non-trigger, no-auth ones callable with the public key. **Before revoking, confirm how each is called:**
   - Cron/side-effect fns (`appt_send_reminders`, `followups_tick`, `calendar_poll`, `claudio_morning_digest`, `email_renew_watches`, `pipeline_resolve_epe`, `followup_timeline_html`): if invoked by **pg_cron / server-side**, `REVOKE EXECUTE ... FROM anon;` is safe. If any is hit by an n8n HTTP call using the anon key, it needs a token instead first.
   - Secret-gated data fns (`web_lead`, `fb_book_lead`, `fb_solar_load/save`, `news_digest_post`, `cold_quotes`): these are *designed* to be called by n8n with a shared secret. Don't revoke; instead **rotate their secrets** (see #5).
5. **Rotate the weak `cold_quotes` secret** (`81fc0f75...`, a 32-hex literal that dumps every stale quote's client name/email/total/rep). Replace with a strong secret **and** update the caller in n8n in the same change, or the report breaks. Same treatment for the other `p_secret` fns if their secrets are weak.
6. **Verify RLS actually backs the client-side gates.** The app enforces role/money/permission in the browser; that's only real if RLS matches. Audit write policies on: `payout_requests`, `obligations`, `deal_expenses`, `profiles` (esp. the `role` / `can_see_money` columns — a tampered client must not self-escalate), `service_calls`, `dispatch_assignments`, `deals.rep_id`, `notifications` (cross-user inserts), `app_settings`, `sequences`, `chat_groups`. And confirm **Realtime authorization** on the intercom channel `intercom:swe-office` so office audio can't be listened to / injected with just the public key.

## C. Needs n8n + external consoles (not Supabase)

7. **Authenticate the n8n webhooks** shipped in the client (`crm2-notify`, `sc-notify`, `crm-chat`, `pay`, and the send-side `send-quote`/`send-contract` paths). Add a shared secret/signature header the workflow verifies, so a stranger reading page source can't POST "Southwest Energy" emails, spam Slack/notify, or fire payment-request automation.
8. **Referrer-restrict the Google Maps / Places key** (`AIzaSy...`) in Google Cloud Console → Credentials → HTTP referrer restriction (limit to your CRM domain). It's billable and currently open.
9. **`CP_PARSE_KEY`** (`pk_swe_...`) shared AI-parse secret is baked in the client and can't be rotated without a redeploy — move it server-side behind an authenticated endpoint.

## D. Claudio follow-ups (policy / external)

10. Add the new `send_email` tool to the **Console (auto-pipeline) agent's** instructions so the autonomous Claudio uses it.
11. **Widen `claudio_write_allowlist`** beyond Chris + Efrain to the office managers who should be able to have Claudio act.
12. Delete retired stubs `claudio-chat` / `claudio-watch`; freshen the `crm-mcp` `money_watch` tool *description* (its code is already fixed).

---

### Suggested order
A (all, safe) → B#6 (verify RLS — highest real risk if a gate is only client-side) → B#4/#5 (lock/rotate, with n8n coordination) → C#7 (webhook auth) → C#8/#9 → D.

I'll execute A immediately once Supabase is back, then walk B with you since a wrong revoke/rotate can break a live automation.
