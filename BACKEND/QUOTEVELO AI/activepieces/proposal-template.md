# Google Doc proposal template

Create a Google Doc with the content below, style it with your branding, and give its file ID
to the *Create Document from Template* step. Activepieces replaces each `{{placeholder}}`.

---

**PROJECT PROPOSAL**

Prepared for **{{full_name}}** · {{company}}
Date: {{date}}

{{proposal}}

---

Questions? Reply to the email this came with, or book a 15-minute call.

*Clark Gemongala · Clark VA 360*

---

| Placeholder | Source |
|-------------|--------|
| `{{full_name}}`, `{{company}}` | `trigger.body.record` |
| `{{date}}` | Activepieces `now` formatted `MMMM D, YYYY` |
| `{{proposal}}` | parsed Gemini JSON |

Keep internal data (score, tag) out of this document: the prospect receives it.
