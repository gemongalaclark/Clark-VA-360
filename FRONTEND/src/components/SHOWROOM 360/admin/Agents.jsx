/* Agents ("ahente"): people who bring buyers for a commission. Each gets a link;
   buyers who open it are tagged for 30 days and their requests say "via" the agent.
   Selling a car through an agent puts the commission on the to-do list until it's
   paid. Superadmin only, since it's about money. */
import { useState } from 'react';
import { Plus, Phone, Copy, Pencil, Trash2 } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom, newId } from '../store.js';
import { Sheet, useToast, copyText, adminSaveError } from '../ui.jsx';
import { telHref } from '../public/Home.jsx';
import { agentCodeFor, agentStats, formatPeso, isPhMobile } from '../showroomRules.js';

const agentLink = (ag) => `${window.location.origin}/showroom?ref=${ag.code}`;

export default function Agents() {
  const { agents, leads, cars, deleteAgent } = useShowroom();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const copy = async (ag) => toast(await copyText(agentLink(ag)) ? `${ag.name}’s link copied.` : 'Could not copy. Select the link and copy it.');
  const remove = async () => {
    const ag = confirm;
    setConfirm(null);
    try { await deleteAgent(ag.id); toast(`${ag.name} removed.`); } catch (err) { toast(adminSaveError(err)); }
  };

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Agents <span className={a.count}>{agents.length}</span></h1>
        <div className={a.headActions}>
          <button type="button" className={s.btnPrimary} onClick={() => setEditing({})}><Plus size={18} aria-hidden="true" />Add agent</button>
        </div>
      </div>
      <p className={`${s.muted} ${a.intro}`}>
        Give each agent their own link to share. Buyers who open it are tagged for 30 days, and their requests show “via” the agent on the Leads page.
        Mark a car sold through an agent and their commission waits on the to-do list until you pay it.
      </p>

      {agents.length === 0 ? (
        <p className={`${s.muted} ${a.emptyLine}`}>No agents yet.</p>
      ) : (
        <ul className={a.leadList}>
          {agents.map(ag => {
            const st = agentStats(ag, leads, cars);
            return (
              <li key={ag.id} className={a.leadCard}>
                <div className={a.leadTop}>
                  <p className={a.leadName}>{ag.name}</p>
                  <span className={`${s.muted} ${a.leadAgo}`}>{formatPeso(ag.rate)} per sale</span>
                </div>
                {ag.mobile && <a href={telHref(ag.mobile)} className={a.leadPhone}><Phone size={16} strokeWidth={1.75} aria-hidden="true" />{ag.mobile}</a>}
                <p className={a.agentLink}>{agentLink(ag)}</p>
                <dl className={a.agentStats}>
                  <div><dt>Buyers</dt><dd>{st.leads}</dd></div>
                  <div><dt>Cars sold</dt><dd>{st.sold}</dd></div>
                  <div><dt>Owed</dt><dd className={st.owed ? a.agentOwed : undefined}>{formatPeso(st.owed)}</dd></div>
                  <div><dt>Paid</dt><dd>{formatPeso(st.paid)}</dd></div>
                </dl>
                <div className={a.leadActions}>
                  <button type="button" className={s.btnGhost} onClick={() => copy(ag)}><Copy size={16} aria-hidden="true" />Copy link</button>
                  <button type="button" className={s.btnGhost} onClick={() => setEditing(ag)}><Pencil size={16} aria-hidden="true" />Edit</button>
                  <button type="button" className={s.iconBtn} aria-label={`Remove ${ag.name}`} onClick={() => setConfirm(ag)}><Trash2 size={18} aria-hidden="true" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <AgentForm agent={editing} onClose={() => setEditing(null)} />}

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={`Remove ${confirm?.name || 'agent'}?`}>
        <div className={s.formGrid}>
          <p className={s.muted}>Their link stops tagging new buyers. Cars already sold through them keep the commission on record.</p>
          <div className={s.sheetActions}>
            <button type="button" className={s.btnGhost} onClick={() => setConfirm(null)}>Cancel</button>
            <button type="button" className={`${s.btnPrimary} ${a.danger}`} onClick={remove}>Remove</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/* Add or edit one agent. The link code comes from the first name and never changes,
   so links already shared keep working. */
function AgentForm({ agent, onClose }) {
  const { agents, saveAgent } = useShowroom();
  const toast = useToast();
  const isNew = !agent.id;
  const [form, setForm] = useState({ name: agent.name || '', mobile: agent.mobile || '', rate: agent.rate ? String(agent.rate) : '5000' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: k === 'rate' ? e.target.value.replace(/\D/g, '') : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter the agent’s name.';
    if (form.mobile.trim() && !isPhMobile(form.mobile)) errs.mobile = 'Enter a PH mobile number, e.g. 0917 123 4567.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const next = {
      ...agent,
      id: agent.id || newId('agent'),
      code: agent.code || agentCodeFor(form.name, agents),
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      rate: Number(form.rate) || 0,
    };
    try {
      await saveAgent(next);
      toast(isNew ? `${next.name} added. Copy their link from the list.` : `${next.name} saved.`);
      onClose();
    } catch (err) { toast(adminSaveError(err)); }
  };

  const field = (name, label, input, hint) => (
    <div className={s.field}>
      <label htmlFor={`ag-${name}`} className={s.fieldLabel}>{label}</label>
      {input}
      {hint && <p className={s.hint}>{hint}</p>}
      {errors[name] && <p className={s.error} id={`ag-${name}-err`}>{errors[name]}</p>}
    </div>
  );
  const aria = (name) => ({ id: `ag-${name}`, 'aria-invalid': errors[name] ? 'true' : undefined, 'aria-describedby': errors[name] ? `ag-${name}-err` : undefined });

  return (
    <Sheet open onClose={onClose} title={isNew ? 'Add agent' : `Edit ${agent.name}`}>
      <form className={s.formGrid} onSubmit={submit} noValidate>
        {field('name', 'Name', <input className={s.input} autoComplete="off" value={form.name} onChange={set('name')} {...aria('name')} />,
          isNew ? undefined : `Link code: ${agent.code} (stays the same).`)}
        {field('mobile', 'Mobile', <input className={s.input} type="tel" inputMode="tel" placeholder="0917 123 4567" value={form.mobile} onChange={set('mobile')} {...aria('mobile')} />)}
        {field('rate', 'Commission per sale (₱)', <input className={s.input} inputMode="numeric" value={form.rate} onChange={set('rate')} {...aria('rate')} />,
          form.rate ? `${formatPeso(form.rate)}. You can change it on each sale.` : undefined)}
        <div className={s.sheetActions}>
          <button type="button" className={s.btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={s.btnPrimary}>{isNew ? 'Add agent' : 'Save'}</button>
        </div>
      </form>
    </Sheet>
  );
}
