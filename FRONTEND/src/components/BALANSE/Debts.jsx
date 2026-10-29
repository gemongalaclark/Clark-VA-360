import { useState } from 'react';
import { Plus, Pencil, Trash2, Landmark, CheckCircle2, HandCoins } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Modal, Field, AmountModal, EmptyState, peso, pct, num } from './ui';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const debtRemaining = (d) => Math.max(0, num(d.total_amount) - num(d.paid_amount));

function DebtForm({ debt, onSave, onClose }) {
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await onSave({ ...(debt?.id && { id: debt.id }), ...f, paid_amount: f.paid_amount || 0 });
  };
  return (
    <Modal title={debt ? 'Edit debt' : 'Add a debt'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <Field label="What is this debt?">
          <input name="name" required maxLength={80} placeholder="e.g. Credit card, Home Credit, Pag-IBIG loan" defaultValue={debt?.name} />
        </Field>
        <Field label="Lender (optional)">
          <input name="lender" maxLength={80} placeholder="e.g. BPI, Tito Ramon" defaultValue={debt?.lender ?? ''} />
        </Field>
        <div className={styles.formRow}>
          <Field label="Total amount (₱)">
            <input name="total_amount" type="number" min="0.01" step="0.01" required inputMode="decimal" defaultValue={debt?.total_amount} />
          </Field>
          <Field label="Already paid (₱)">
            <input name="paid_amount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={debt?.paid_amount ?? 0} />
          </Field>
        </div>
        <div className={styles.formRow}>
          <Field label="Monthly payment (₱, optional)">
            <input name="monthly_payment" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={debt?.monthly_payment ?? ''} />
          </Field>
          <Field label="Due day of month (optional)">
            <input name="due_day" type="number" min="1" max="31" step="1" defaultValue={debt?.due_day ?? ''} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={debt?.notes ?? ''} />
        </Field>
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary}>{debt ? 'Save changes' : 'Add debt'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Debts({ debts, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);   // null | 'new' | debt
  const [paying, setPaying] = useState(null);

  const total = debts.reduce((s, d) => s + num(d.total_amount), 0);
  const remaining = debts.reduce((s, d) => s + debtRemaining(d), 0);
  const monthly = debts.filter(d => debtRemaining(d) > 0).reduce((s, d) => s + num(d.monthly_payment), 0);

  const save = async (debt) => { if (await onSave(debt)) setEditing(null); };
  const pay = async (amount) => {
    const paid = Math.min(num(paying.total_amount), num(paying.paid_amount) + amount);
    if (await onSave({ ...paying, paid_amount: paid })) setPaying(null);
  };
  const remove = (d) => { if (window.confirm(`Delete “${d.name}”? This can’t be undone.`)) onDelete(d.id); };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1>Debt tracker</h1>
          <p className={styles.muted}>Every loan, card and utang in one place.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Add debt</button>
      </header>

      {debts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No debts yet"
          text="Add your first debt to start tracking what you owe and how fast it’s going down."
          action={<button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Add debt</button>}
        />
      ) : (
        <>
          <div className={styles.statRow}>
            <div className={styles.stat}><span>Still owed</span><strong>{peso(remaining)}</strong></div>
            <div className={styles.stat}><span>Paid off</span><strong>{peso(total - remaining)}</strong><small>{Math.round(pct(total - remaining, total))}% of {peso(total)}</small></div>
            <div className={styles.stat}><span>Monthly payments</span><strong>{peso(monthly)}</strong></div>
          </div>

          <div className={styles.cardGrid}>
            {debts.map(d => {
              const left = debtRemaining(d);
              const done = left === 0;
              return (
                <article key={d.id} className={styles.itemCard}>
                  <div className={styles.itemHead}>
                    <div>
                      <h3>{d.name}</h3>
                      {d.lender && <span className={styles.muted}>{d.lender}</span>}
                    </div>
                    {done && <span className={styles.donePill}><CheckCircle2 size={13} /> Paid off</span>}
                  </div>
                  <div className={styles.itemAmount}>
                    <strong>{peso(left)}</strong>
                    <span className={styles.muted}> left of {peso(d.total_amount)}</span>
                  </div>
                  <Meter value={num(d.paid_amount)} max={num(d.total_amount)} done={done} label={`${d.name} paid`} />
                  <div className={styles.itemMeta}>
                    <span>{Math.round(pct(num(d.paid_amount), num(d.total_amount)))}% paid</span>
                    {num(d.monthly_payment) > 0 && <span>{peso(d.monthly_payment)}/mo</span>}
                    {d.due_day && <span>Due every {ordinal(d.due_day)}</span>}
                  </div>
                  {d.notes && <p className={styles.itemNotes}>{d.notes}</p>}
                  <div className={styles.itemActions}>
                    {!done && <button className={styles.btnSoft} onClick={() => setPaying(d)}><HandCoins size={15} /> Record payment</button>}
                    <button className={styles.iconBtn} onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`}><Pencil size={15} /></button>
                    <button className={styles.iconBtn} onClick={() => remove(d)} aria-label={`Delete ${d.name}`}><Trash2 size={15} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {editing && <DebtForm debt={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
      {paying && (
        <AmountModal
          title={`Record payment · ${paying.name}`}
          label="Amount paid (₱)"
          max={debtRemaining(paying)}
          onSubmit={pay}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}
