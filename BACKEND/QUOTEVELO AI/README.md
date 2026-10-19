# QuoteVelo AI — backend setup

Smart inquiry triage and auto-proposal portal. The React app lives in
`FRONTEND/src/components/QUOTEVELO AI/`; this folder holds everything server-side.

```
BACKEND/QUOTEVELO AI/
├── schema.sql                        Tables, RLS, realtime, webhook trigger
├── functions/send-proposal/index.ts  Supabase Edge Function behind "Approve & Send"
├── activepieces/
│   ├── gemini-prompt.md              System prompt + JSON contract for Gemini
│   └── proposal-template.md          Google Doc template with {{placeholders}}
└── README.md                         (this file)
```

## How the pieces fit

```
Prospect ──► Public quote form ──► qv_leads (status: new)
                                      │  Supabase Database Webhook (INSERT)
                                      ▼
                    Activepieces Flow 1 — AI Qualifier & Proposal Maker
                    Catch Webhook → Gemini → Google Docs → HTTP PATCH → Slack/Telegram
                                      │
                                      ▼  qv_leads (status: scored) ── Realtime ──► Admin dashboard
                                                                                      │ owner reviews / edits
                                                                                      ▼ "Approve & Send"
                          Edge Function send-proposal (checks admin JWT, claims the send)
                                      ▼
                    Activepieces Flow 2 — 1-Click Send
                    Catch Webhook → Gmail → HTTP PATCH (status: sent)
```

The owner stays in control: nothing is emailed to a prospect until an admin clicks the button.

## 1. Supabase

1. SQL Editor → paste and run [schema.sql](schema.sql). It is safe to re-run.
2. Authentication → Users → **Add user** (email + password, tick *Auto Confirm*).
3. Make that user an admin:
   ```sql
   insert into public.qv_admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```
4. Deploy the edge function and set its secrets:
   ```bash
   supabase functions deploy send-proposal
   supabase secrets set ACTIVEPIECES_SEND_WEBHOOK_URL="https://cloud.activepieces.com/api/v1/webhooks/<FLOW_2_ID>"
   supabase secrets set QV_SHARED_SECRET="<long random string>"
   ```
5. Frontend env (`FRONTEND/.env`, and Vercel → Settings → Environment Variables):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. These are shared with the other apps.

## 2. Activepieces Flow 1 — AI Qualifier & Proposal Maker

Trigger the flow from Supabase: **Database → Webhooks → Create** on table `qv_leads`, event
**Insert**, method POST, URL = the flow's Catch Webhook URL. Add the HTTP header
`x-qv-secret: <same secret>`.

| # | Piece | Configuration |
|---|-------|---------------|
| 1 | **Catch Webhook** | Copy its URL into the Supabase webhook above. The lead is at `trigger.body.record`. |
| 2 | **Router / Code (optional)** | Reject the run unless `trigger.headers['x-qv-secret']` equals your secret. |
| 3 | **Google Gemini → Ask Gemini** | Model `gemini-2.5-flash` (or newer). System prompt: [activepieces/gemini-prompt.md](activepieces/gemini-prompt.md). User message: the lead fields below. Response format: JSON. |
| 4 | **Code** (parse) | Strip any code fences, `JSON.parse` the reply, and clamp `score` to 1-100. |
| 5 | **Google Docs → Create Document from Template** | Template: [activepieces/proposal-template.md](activepieces/proposal-template.md) pasted into a Google Doc. Map each `{{placeholder}}` to the parsed JSON. |
| 6 | **HTTP → Send HTTP Request** | `PATCH {SUPABASE_URL}/rest/v1/qv_leads?id=eq.{{record.id}}`, see body below. |
| 7 | **Slack or Telegram → Send Message** | "New lead: {{full_name}} · {{ai_tag}} · {{ai_score}}/100 — open the dashboard". |

**Step 3 user message**

```
Name: {{trigger.body.record.full_name}}
Company: {{trigger.body.record.company}}
Service wanted: {{trigger.body.record.service_type}}
Budget: {{trigger.body.record.budget_range}}
Timeline: {{trigger.body.record.timeline}}
Project scope: {{trigger.body.record.project_scope}}
Extra answers (JSON): {{trigger.body.record.extra}}
```

**Step 6 headers** (use the **service-role** key; store it as an Activepieces *Connection*, never in the frontend):

```
apikey: <SUPABASE_SERVICE_ROLE_KEY>
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
Prefer: return=minimal
```

**Step 6 body**

```json
{
  "status": "scored",
  "ai_score": {{parsed.score}},
  "ai_tag": "{{parsed.tag}}",
  "ai_summary": {{JSON of parsed.summary}},
  "ai_proposal": "{{parsed.proposal}}",
  "ai_email_subject": "{{parsed.email_subject}}",
  "ai_email_body": "{{parsed.email_body}}",
  "proposal_doc_url": "{{docs.documentUrl}}",
  "scored_at": "{{now}}"
}
```

> Tip: build the body in a **Code** step and pass the object, so quotes and line breaks inside
> Gemini's text are escaped correctly.

**Failure branch:** on error, PATCH `{ "ai_error": "<message>" }` so the dashboard can show a
"Draft failed, retry" state instead of a lead stuck on *New* forever.

## 3. Activepieces Flow 2 — 1-Click Send

| # | Piece | Configuration |
|---|-------|---------------|
| 1 | **Catch Webhook** | Its URL is `ACTIVEPIECES_SEND_WEBHOOK_URL` in step 1.4. Body: `lead_id, to_email, to_name, company, subject, body, proposal_doc_url`. Reject the run unless header `x-qv-secret` matches. |
| 2 | **Gmail → Send Email** | To `{{trigger.body.to_email}}` · Subject `{{trigger.body.subject}}` · Body `{{trigger.body.body}}` (append `{{trigger.body.proposal_doc_url}}` if the draft doesn't already link it). |
| 3 | **HTTP → Send HTTP Request** | `PATCH {SUPABASE_URL}/rest/v1/qv_leads?id=eq.{{trigger.body.lead_id}}` with the same service-role headers, body `{ "status": "sent", "sent_at": "{{now}}" }`. |

Because the dashboard subscribes to Supabase Realtime, the card moves to **Proposal Sent** on its own.

**Google Doc sharing:** set the generated Doc to "Anyone with the link can view" (Google Docs
piece → *Share* option), otherwise the prospect will hit an access wall.

## Security notes

- The anon key can only **insert** a clean `new` lead. It can't read or edit anything.
- The service-role key lives only in Activepieces and the edge function's injected env.
- The send button is authorised by a Supabase session **and** the `qv_admins` allow-list, and
  the function claims `send_requested_at` atomically so a double-click can't send two emails.
- Add a bot filter in production if the form gets spam (Cloudflare Turnstile / hCaptcha). The
  form already includes a hidden honeypot field that silently drops simple bots.
