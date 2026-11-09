import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Building2, AtSign, Globe } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api } from './cfApi';

const EMPTY = { company_name: '', contact_email: '', domains: '', custom_context: '', is_active: true };
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const CONTEXT_MAX = 8000;   // matches cf_clients.custom_context

/* "https://www.Acme.com/about, @acme.co.uk" → ['acme.com', 'acme.co.uk']
   ("www." is a website prefix, never part of an email address, so it's dropped.) */
const parseDomains = (text) => [...new Set(
  text.split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^@/, '').replace(/\/.*$/, '').replace(/^www\./, ''))
    .filter(Boolean),
)];

function ClientForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const domains = parseDomains(form.domains);
    const bad = domains.filter((d) => !DOMAIN_RE.test(d));
    if (bad.length) { setError(`These don’t look like domains: ${bad.join(', ')}`); return; }
    if (!form.contact_email.trim() && domains.length === 0) {
      setError('Add a contact email or at least one domain, so ClarkFlow can recognise this client’s emails.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.saveClient({ ...form, domain_whitelist: domains });
      onSaved(form.id ? 'Client updated.' : 'Client added. Earlier emails from them are now linked.');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className={styles.clientForm} onSubmit={submit}>
      <h3>{form.id ? 'Edit client' : 'New client'}</h3>
      <label className={styles.label} htmlFor="cf-company">Company or client name</label>
      <input id="cf-company" className={styles.input} required maxLength={120} value={form.company_name} onChange={set('company_name')} autoFocus />

      <div className={styles.formRow}>
        <div>
          <label className={styles.label} htmlFor="cf-contact">Main contact email</label>
          <input id="cf-contact" className={styles.input} type="email" placeholder="jane@acme.com" value={form.contact_email} onChange={set('contact_email')} />
        </div>
        <div>
          <label className={styles.label} htmlFor="cf-domains">Email domains</label>
          <input id="cf-domains" className={styles.input} placeholder="acme.com, acme.co.uk" value={form.domains} onChange={set('domains')} />
        </div>
      </div>
      <p className={styles.hint}>Emails from the contact address, or from any address at these domains (subdomains too), are matched to this client.</p>

      <label className={styles.label} htmlFor="cf-context">How to reply: tone, SOPs, boundaries</label>
      <textarea
        id="cf-context" className={styles.textarea} rows={6} maxLength={CONTEXT_MAX} value={form.custom_context} onChange={set('custom_context')}
        placeholder={'Tone: friendly but brief, first names.\nSOP: meeting requests → offer two slots from my Calendly.\nBoundaries: never confirm prices or deadlines; say I’ll check with the team.'}
      />
      <p className={styles.hint}>{form.custom_context.length.toLocaleString()} / {CONTEXT_MAX.toLocaleString()}. Gemini follows this when drafting replies to this client.</p>

      <label className={styles.checkbox}>
        <input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active (match new emails to this client)
      </label>

      {error && <p className={styles.errorText} role="alert">{error}</p>}
      <div className={styles.formActions}>
        <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={styles.btnPrimary} disabled={busy}>{busy && <Loader2 className={styles.spin} size={16} />} Save client</button>
      </div>
    </form>
  );
}

/* Add / edit / delete clients. Matching emails are linked by a DB trigger on save. */
export default function ClientsManager({ clients, onChanged, onNotice }) {
  const [editing, setEditing] = useState(null);   // null | form values
  const [deleting, setDeleting] = useState(null);

  if (!clients) return <div className={styles.center}><Loader2 className={styles.spin} size={28} aria-label="Loading" /></div>;

  const edit = (c) => setEditing({
    id: c.id, company_name: c.company_name, contact_email: c.contact_email ?? '',
    domains: c.domain_whitelist.join(', '), custom_context: c.custom_context ?? '', is_active: c.is_active,
  });

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.company_name}? Their emails stay in ClarkFlow, just unlinked.`)) return;
    setDeleting(c.id);
    try {
      await api.deleteClient(c.id);
      onNotice({ kind: 'ok', text: `${c.company_name} deleted.` });
      await onChanged();
    } catch (err) {
      onNotice({ kind: 'error', text: err.message });
    } finally {
      setDeleting(null);
    }
  };

  if (editing) {
    return (
      <ClientForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={async (text) => { setEditing(null); onNotice({ kind: 'ok', text }); await onChanged(); }}
      />
    );
  }

  return (
    <div className={styles.clients}>
      <div className={styles.clientsHead}>
        <p className={styles.muted}>Each client’s emails are matched by contact email or domain, and Gemini drafts in their tone.</p>
        <button className={styles.btnPrimary} onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> Add client</button>
      </div>

      {clients.length === 0 ? (
        <div className={styles.empty}>
          <Building2 size={28} aria-hidden="true" />
          <h3>No clients yet</h3>
          <p className={styles.muted}>Add your first client to start matching their emails.</p>
        </div>
      ) : (
        <ul className={styles.clientList}>
          {clients.map((c) => (
            <li key={c.id} className={c.is_active ? '' : styles.inactive}>
              <div className={styles.clientTop}>
                <strong>{c.company_name}</strong>
                {!c.is_active && <span className={`${styles.priority} ${styles.pendingChip}`}>Inactive</span>}
                <span className={styles.clientActions}>
                  <button className={styles.iconBtn} onClick={() => edit(c)} aria-label={`Edit ${c.company_name}`}><Pencil size={15} /></button>
                  <button className={styles.iconBtn} onClick={() => remove(c)} disabled={deleting === c.id} aria-label={`Delete ${c.company_name}`}>
                    {deleting === c.id ? <Loader2 className={styles.spin} size={15} /> : <Trash2 size={15} />}
                  </button>
                </span>
              </div>
              <ul className={styles.chips}>
                {c.contact_email && <li><AtSign size={13} aria-hidden="true" /> {c.contact_email}</li>}
                {c.domain_whitelist.map((d) => <li key={d}><Globe size={13} aria-hidden="true" /> {d}</li>)}
              </ul>
              {c.custom_context && <p className={styles.clientContext}>{c.custom_context}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
