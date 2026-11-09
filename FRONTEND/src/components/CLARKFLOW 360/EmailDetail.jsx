import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Send, Save, CheckCheck, Archive, ArchiveRestore, Sparkles, MessagesSquare } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api } from './cfApi';
import { StatusChip, formatFull, formatWhen } from './ui';

/* Unsaved edits survive switching to another email and back (until sent or saved). */
const unsaved = new Map();

/* The original HTML is shown in a sandboxed frame: no scripts, no access to this page,
   links open in a new tab. Remote images still load (like any mail app). */
const CSP = "default-src 'none'; img-src https: http: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:";
const htmlDocument = (html) => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}"><base target="_blank">
<style>body{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.5;color:#1a1a2e;margin:16px;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>
</head><body>${html}</body></html>`;

/* Reading pane: the email, the rest of its thread, and the reply composer. */
export default function EmailDetail({ email, clientName, onBack, onChanged, onNotice, onDisconnected }) {
  const [full, setFull] = useState(null);         // row with bodies
  const [thread, setThread] = useState([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [draft, setDraft] = useState(() => unsaved.get(email.id) ?? email.ai_generated_draft ?? '');
  const [busy, setBusy] = useState(null);          // 'save' | 'send' | 'status' | 'priority'

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const row = await api.getEmail(email.id);
        if (!live) return;
        setFull(row);
        const t = await api.getThread(row.gmail_thread_id);
        if (live) setThread(t.filter((m) => m.id !== email.id));
      } catch (err) {
        if (live) onNotice({ kind: 'error', text: err.message });
      }
    })();
    return () => { live = false; };
  }, [email.id, onNotice]);

  /* A new AI draft arrives (triage finished while open): take it unless you've edited. */
  const lastAiDraft = useRef(email.ai_generated_draft ?? '');
  useEffect(() => {
    const incoming = email.ai_generated_draft ?? '';
    if (incoming !== lastAiDraft.current && !unsaved.has(email.id)) setDraft(incoming);
    lastAiDraft.current = incoming;
  }, [email.ai_generated_draft, email.id]);

  const saved = email.ai_generated_draft ?? '';
  const dirty = draft !== saved;
  const replied = email.triage_status === 'replied';
  const archived = email.triage_status === 'archived';

  const edit = (value) => {
    setDraft(value);
    if (value === saved) unsaved.delete(email.id); else unsaved.set(email.id, value);
  };

  /* fn may return a message (string) to show instead of okText. */
  const run = async (kind, fn, okText) => {
    setBusy(kind);
    try {
      const result = await fn();
      const text = typeof result === 'string' ? result : okText;
      if (text) onNotice({ kind: 'ok', text });
      await onChanged();
    } catch (err) {
      if (err.code === 'gmail_not_connected') { onDisconnected(err.message); return; }
      onNotice({ kind: 'error', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const save = () => run('save', async () => { await api.saveDraft(email, draft); unsaved.delete(email.id); }, 'Draft saved.');

  const send = () => {
    if (!draft.trim()) return;
    if (!window.confirm(`Send this reply to ${email.sender_name || email.sender_email}?`)) return;
    run('send', async () => {
      const res = await api.sendReply(email.id, draft);
      unsaved.delete(email.id);
      return `Reply sent to ${res.to}.`;
    });
  };

  const setStatus = (status, text) => run('status', () => api.setStatus(email.id, status), text);
  const setPriority = (p) => run('priority', () => api.setPriority(email.id, p));

  return (
    <article className={styles.reader}>
      <header className={styles.readerHead}>
        <button className={`${styles.iconBtn} ${styles.backBtn}`} onClick={onBack} aria-label="Back to the list"><ArrowLeft size={18} /></button>
        <div className={styles.readerTitle}>
          <h2>{email.subject || '(no subject)'}</h2>
          <p className={styles.readerMeta}>
            <strong>{email.sender_name || email.sender_email}</strong>
            {email.sender_name && <span> &lt;{email.sender_email}&gt;</span>}
            <span> · {formatFull(email.received_at)}</span>
          </p>
        </div>
      </header>

      <div className={styles.readerChips}>
        <StatusChip email={email} />
        <span className={email.client_id ? styles.clientTag : styles.clientTagNone}>{clientName ?? 'Unknown sender'}</span>
        <label className={styles.prioritySelect}>
          Priority
          <select className={styles.select} value={email.priority_level ?? ''} onChange={(e) => setPriority(e.target.value)} disabled={!!busy}>
            {!email.priority_level && <option value="">Not set</option>}
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      {email.ai_summary && (
        <p className={styles.summaryBox}><Sparkles size={16} aria-hidden="true" /> <span>{email.ai_summary}</span></p>
      )}

      <div className={styles.readerBody}>
        {!full ? (
          <Loader2 className={styles.spin} size={22} aria-label="Loading email" />
        ) : (
          <>
            {full.body_html && (
              <div className={styles.bodyToggle} role="group" aria-label="Show as">
                <button aria-pressed={!showOriginal} className={!showOriginal ? styles.filterOn : ''} onClick={() => setShowOriginal(false)}>Text</button>
                <button aria-pressed={showOriginal} className={showOriginal ? styles.filterOn : ''} onClick={() => setShowOriginal(true)}>Original</button>
              </div>
            )}
            {showOriginal && full.body_html
              ? <iframe className={styles.htmlFrame} title="Original email" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={htmlDocument(full.body_html)} />
              : <pre className={styles.bodyText}>{full.body_text || full.snippet || '(empty email)'}</pre>}
          </>
        )}
      </div>

      {thread.length > 0 && (
        <section className={styles.threadList}>
          <h3><MessagesSquare size={15} aria-hidden="true" /> Also in this thread</h3>
          <ul>
            {thread.map((m) => (
              <li key={m.id}>
                <span className={styles.queueTop}><strong>{m.sender_name || m.sender_email}</strong><time dateTime={m.received_at}>{formatWhen(m.received_at)}</time></span>
                <span className={styles.queueSummary}>{m.ai_summary || m.snippet}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.composer} aria-label="Reply">
        {replied ? (
          <>
            <h3>Your reply <small>sent {email.replied_at ? formatFull(email.replied_at) : ''}</small></h3>
            <pre className={styles.sentText}>{email.ai_generated_draft}</pre>
          </>
        ) : (
          <>
            <h3>
              Reply <small>to {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}</small>
              {dirty && <span className={styles.unsavedTag}>Unsaved changes</span>}
            </h3>
            {email.triage_status !== 'pending' && !saved && !draft && (
              <p className={styles.hint}>Gemini thinks no reply is needed. Write one below if you want to reply anyway.</p>
            )}
            {email.triage_status === 'pending' && !draft && (
              <p className={styles.hint}>Not triaged yet. Run Sync &amp; triage for an AI draft, or write your own.</p>
            )}
            <textarea
              className={styles.textarea} rows={10} value={draft} onChange={(e) => edit(e.target.value)}
              placeholder="Write your reply…" aria-label="Reply text" disabled={busy === 'send'}
            />
            <p className={styles.hint}>Review placeholders like [confirm date] before sending. The reply goes out from your Gmail, in the same thread.</p>
            <div className={styles.composerActions}>
              <button className={styles.btnPrimary} onClick={send} disabled={!!busy || !draft.trim()}>
                {busy === 'send' ? <Loader2 className={styles.spin} size={16} /> : <Send size={16} />} Send reply
              </button>
              <button className={styles.btnGhost} onClick={save} disabled={!!busy || !dirty}>
                {busy === 'save' ? <Loader2 className={styles.spin} size={16} /> : <Save size={16} />} Save draft
              </button>
              <span className={styles.composerSpacer} />
              {!archived && email.triage_status !== 'reviewed' && (
                <button className={styles.btnGhost} onClick={() => setStatus('reviewed', 'Marked as reviewed.')} disabled={!!busy}>
                  <CheckCheck size={16} /> Mark reviewed
                </button>
              )}
              {archived ? (
                <button className={styles.btnGhost} onClick={() => setStatus(email.priority_level ? 'triaged' : 'pending', 'Moved back to To do.')} disabled={!!busy}>
                  <ArchiveRestore size={16} /> Unarchive
                </button>
              ) : (
                <button className={styles.btnGhost} onClick={() => setStatus('archived', 'Archived.')} disabled={!!busy}>
                  <Archive size={16} /> Archive
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </article>
  );
}
