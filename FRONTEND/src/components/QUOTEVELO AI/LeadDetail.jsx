import { useState, useEffect, useRef } from 'react';
import { X, Send, Save, Loader2, ExternalLink, Trophy, XCircle, RotateCcw, Trash2, Sparkles, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import styles from './QuoteVelo.module.css';
import { fmtDateTime, isStuck, STAGES } from './qvData';
import { ScoreDial, TagPill } from './ui';

/* Lead drawer: AI brief on top, the inquiry, then the editable proposal + email draft and the
   human-in-the-loop "Approve & Send" action. Drafts are only editable while the lead is "scored". */

const fromLead = (l) => ({
  ai_proposal: l.ai_proposal || '',
  ai_email_subject: l.ai_email_subject || '',
  ai_email_body: l.ai_email_body || '',
});

export default function LeadDetail({ api, lead, onClose, onChanged, notify }) {
  const [draft, setDraft] = useState(() => fromLead(lead));
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [busy, setBusy] = useState('');            // '' | save | send | status | delete
  const [confirm, setConfirm] = useState('');      // '' | send | delete

  const editable = lead.status === 'scored' && !lead.send_requested_at;
  const sending = lead.status === 'scored' && !!lead.send_requested_at;
  const stage = STAGES.find(s => s.key === lead.status);

  /* Pull in AI output that lands while the drawer is open, but never clobber the owner's unsaved edits. */
  useEffect(() => {
    if (!dirtyRef.current) setDraft(fromLead(lead));
  }, [lead.ai_proposal, lead.ai_email_subject, lead.ai_email_body]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const edit = (key) => (e) => {
    dirtyRef.current = true;
    setDirty(true);
    setDraft(d => ({ ...d, [key]: e.target.value }));
  };

  const run = async (kind, fn, okMsg) => {
    setBusy(kind);
    try {
      await fn();
      if (okMsg) notify(okMsg);
      await onChanged();
      return true;
    } catch (e) {
      notify(e.message || 'Something went wrong', 'error');
      return false;
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    const ok = await run('save', () => api.updateLead(lead.id, draft), 'Draft saved');
    if (ok) { dirtyRef.current = false; setDirty(false); }
    return ok;
  };

  const approve = async () => {
    setConfirm('');
    if (dirty && !(await save())) return;
    await run('send', () => api.sendProposal(lead), 'Approved. Sending the email now…');
  };

  const setStatus = (status, msg) => run('status', () => api.updateLead(lead.id, { status }), msg);

  const reopen = () => setStatus(lead.sent_at ? 'sent' : lead.ai_score != null ? 'scored' : 'new', 'Lead reopened');

  const remove = async () => {
    setConfirm('');
    const ok = await run('delete', () => api.deleteLead(lead.id), 'Lead deleted');
    if (ok) onClose();
  };

  const canSend = editable && draft.ai_email_subject.trim() && draft.ai_email_body.trim() && !busy;
  const stalledSend = sending && Date.now() - new Date(lead.send_requested_at).getTime() > 3 * 60_000;

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="qv-lead-title">
        <header className={styles.drawerHead}>
          <div className={styles.drawerTitle}>
            {lead.ai_score != null && <ScoreDial score={lead.ai_score} size="lg" />}
            <div>
              <h2 id="qv-lead-title">{lead.company || lead.full_name}</h2>
              <p className={styles.muted}>
                {lead.company && `${lead.full_name} · `}
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </p>
              <div className={styles.drawerPills}>
                <TagPill tag={lead.ai_tag} />
                <span className={styles.statusPill}>{lead.status === 'lost' ? 'Lost' : stage?.title}</span>
              </div>
            </div>
          </div>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close lead"><X size={18} /></button>
        </header>

        {/* AI brief */}
        <section className={styles.drawerSection}>
          <h3><Sparkles size={15} /> AI brief</h3>
          {lead.ai_summary?.length ? (
            <ul className={styles.brief}>{lead.ai_summary.map((b, i) => <li key={i}>{b}</li>)}</ul>
          ) : lead.ai_error ? (
            <p className={styles.callout}><AlertTriangle size={16} /> The automation reported an error: {lead.ai_error}. Check the Activepieces run history.</p>
          ) : isStuck(lead) ? (
            <p className={styles.callout}><AlertTriangle size={16} /> No AI result after 10 minutes. Check that Flow 1 is published and the Supabase webhook points at it.</p>
          ) : (
            <p className={styles.drafting}><Loader2 className={styles.spin} size={14} /> The AI is reading this inquiry and drafting a proposal. This card updates by itself.</p>
          )}
        </section>

        {/* Inquiry */}
        <section className={styles.drawerSection}>
          <h3>Inquiry</h3>
          <dl className={styles.facts}>
            <div><dt>Service</dt><dd>{lead.service_type}</dd></div>
            <div><dt>Budget</dt><dd>{lead.budget_range}</dd></div>
            <div><dt>Timeline</dt><dd>{lead.timeline}</dd></div>
            {lead.extra?.decision_maker && <div><dt>Decision maker</dt><dd>{lead.extra.decision_maker}</dd></div>}
            <div><dt>Received</dt><dd>{fmtDateTime(lead.created_at)}</dd></div>
          </dl>
          <p className={styles.scope}>{lead.project_scope}</p>
        </section>

        {/* Drafts */}
        {lead.ai_proposal && (
          <>
            <section className={styles.drawerSection}>
              <div className={styles.sectionRow}>
                <h3>Proposal</h3>
                {lead.proposal_doc_url
                  ? <a className={styles.docLink} href={lead.proposal_doc_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open Google Doc</a>
                  : <span className={styles.muted}>Google Doc link appears once Activepieces creates it (live mode).</span>}
              </div>
              <label htmlFor="qv-proposal" className={styles.srOnly}>Proposal text</label>
              <textarea
                id="qv-proposal" className={styles.draftArea} rows={12} value={draft.ai_proposal}
                onChange={edit('ai_proposal')} readOnly={!editable}
              />
            </section>

            <section className={styles.drawerSection}>
              <h3><Mail size={15} /> Email draft</h3>
              <div className={styles.field}>
                <label htmlFor="qv-subject">Subject</label>
                <input id="qv-subject" type="text" value={draft.ai_email_subject} onChange={edit('ai_email_subject')} readOnly={!editable} />
              </div>
              <div className={styles.field}>
                <label htmlFor="qv-body">Message to {lead.email}</label>
                <textarea id="qv-body" className={styles.draftArea} rows={9} value={draft.ai_email_body} onChange={edit('ai_email_body')} readOnly={!editable} />
              </div>
            </section>
          </>
        )}

        {/* Actions */}
        <section className={styles.actions}>
          {editable && (
            <>
              {confirm === 'send' ? (
                <div className={styles.confirmBox} role="alertdialog" aria-label="Confirm send">
                  <p><strong>Send this email to {lead.email}?</strong> It goes out through your Gmail and can't be unsent.</p>
                  <div className={styles.confirmBtns}>
                    <button className={styles.btnGhost} onClick={() => setConfirm('')}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={approve}><Send size={16} /> Yes, send it</button>
                  </div>
                </div>
              ) : (
                <div className={styles.actionRow}>
                  <button className={styles.btnPrimary} onClick={() => setConfirm('send')} disabled={!canSend}>
                    {busy === 'send' ? <Loader2 className={styles.spin} size={16} /> : <Send size={16} />} Approve &amp; Send Proposal
                  </button>
                  <button className={styles.btnGhost} onClick={save} disabled={!dirty || !!busy}>
                    {busy === 'save' ? <Loader2 className={styles.spin} size={16} /> : <Save size={16} />} Save draft
                  </button>
                </div>
              )}
              {dirty && <p className={styles.muted}>You have unsaved edits. Approving saves them first.</p>}
            </>
          )}

          {sending && (
            <p className={styles.drafting}>
              <Loader2 className={styles.spin} size={14} /> Sending through Gmail… this card moves to “Proposal Sent” when it's confirmed.
              {stalledSend && <> Taking longer than expected? Check Flow 2 in Activepieces.</>}
            </p>
          )}

          {lead.status === 'sent' && (
            <>
              <p className={styles.sentNote}><CheckCircle2 size={16} /> Proposal sent {fmtDateTime(lead.sent_at)}</p>
              <div className={styles.actionRow}>
                <button className={styles.btnPrimary} onClick={() => setStatus('won', 'Marked as won 🎉')} disabled={!!busy}><Trophy size={16} /> Mark as won</button>
                <button className={styles.btnGhost} onClick={() => setStatus('lost', 'Marked as lost')} disabled={!!busy}><XCircle size={16} /> Mark as lost</button>
              </div>
            </>
          )}

          {lead.status === 'scored' && editable && (
            <button className={styles.btnText} onClick={() => setStatus('lost', 'Marked as lost')} disabled={!!busy}><XCircle size={14} /> Not a fit: mark as lost</button>
          )}

          {(lead.status === 'lost' || lead.status === 'won') && (
            <button className={styles.btnGhost} onClick={reopen} disabled={!!busy}><RotateCcw size={16} /> Reopen lead</button>
          )}

          <div className={styles.dangerZone}>
            {confirm === 'delete' ? (
              <div className={styles.confirmBtns}>
                <span className={styles.muted}>Delete this lead permanently?</span>
                <button className={styles.btnGhost} onClick={() => setConfirm('')}>Cancel</button>
                <button className={styles.btnDanger} onClick={remove}><Trash2 size={14} /> Delete</button>
              </div>
            ) : (
              <button className={styles.btnText} onClick={() => setConfirm('delete')} disabled={!!busy}><Trash2 size={14} /> Delete lead</button>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
