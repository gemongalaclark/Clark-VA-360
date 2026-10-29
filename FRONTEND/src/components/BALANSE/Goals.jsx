import { useState } from 'react';
import { Plus, Pencil, Trash2, Target, Trophy, PiggyBank, CalendarClock } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Modal, Field, AmountModal, EmptyState, peso, pct, num } from './ui';

export const goalRemaining = (g) => Math.max(0, num(g.target_amount) - num(g.saved_amount));

/* Whole months from today to the target date (at least 1), or null when there's no date. */
function monthsLeft(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) - (d < now.getDate() ? 1 : 0);
  return Math.max(1, months);
}

/* Monthly saving needed to hit the goal on time; null if no date or already reached. */
export function monthlyNeeded(g) {
  const left = goalRemaining(g);
  const months = monthsLeft(g.target_date);
  return left > 0 && months ? left / months : null;
}

const fmtDate = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

function GoalForm({ goal, onSave, onClose }) {
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await onSave({ ...(goal?.id && { id: goal.id }), ...f, saved_amount: f.saved_amount || 0 });
  };
  return (
    <Modal title={goal ? 'Edit goal' : 'Add a goal'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <Field label="What are you saving for?">
          <input name="name" required maxLength={80} placeholder="e.g. Montero Sport" defaultValue={goal?.name} />
        </Field>
        <div className={styles.formRow}>
          <Field label="Target amount (₱)">
            <input name="target_amount" type="number" min="0.01" step="0.01" required inputMode="decimal" placeholder="600000" defaultValue={goal?.target_amount} />
          </Field>
          <Field label="Saved so far (₱)">
            <input name="saved_amount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={goal?.saved_amount ?? 0} />
          </Field>
        </div>
        <Field label="Target date (optional)" hint="We’ll work out how much to save each month.">
          <input name="target_date" type="date" defaultValue={goal?.target_date ?? ''} />
        </Field>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={goal?.notes ?? ''} />
        </Field>
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary}>{goal ? 'Save changes' : 'Add goal'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Goals({ goals, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);   // null | 'new' | goal
  const [adding, setAdding] = useState(null);

  const target = goals.reduce((s, g) => s + num(g.target_amount), 0);
  const saved = goals.reduce((s, g) => s + Math.min(num(g.saved_amount), num(g.target_amount)), 0);
  const reached = goals.filter(g => goalRemaining(g) === 0).length;

  const save = async (goal) => { if (await onSave(goal)) setEditing(null); };
  const addSavings = async (amount) => {
    if (await onSave({ ...adding, saved_amount: num(adding.saved_amount) + amount })) setAdding(null);
  };
  const remove = (g) => { if (window.confirm(`Delete “${g.name}”? This can’t be undone.`)) onDelete(g.id); };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1>Goals</h1>
          <p className={styles.muted}>The things you’re saving up for.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Add goal</button>
      </header>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          text="Dream car, house, emergency fund? Add a goal with its price and we’ll track your progress."
          action={<button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Add goal</button>}
        />
      ) : (
        <>
          <div className={styles.statRow}>
            <div className={styles.stat}><span>Saved</span><strong>{peso(saved)}</strong><small>{Math.round(pct(saved, target))}% of {peso(target)}</small></div>
            <div className={styles.stat}><span>Still to save</span><strong>{peso(target - saved)}</strong></div>
            <div className={styles.stat}><span>Goals reached</span><strong>{reached} / {goals.length}</strong></div>
          </div>

          <div className={styles.cardGrid}>
            {goals.map(g => {
              const left = goalRemaining(g);
              const done = left === 0;
              const perMonth = monthlyNeeded(g);
              return (
                <article key={g.id} className={styles.itemCard}>
                  <div className={styles.itemHead}>
                    <div>
                      <h3>{g.name}</h3>
                      {g.target_date && <span className={styles.muted}><CalendarClock size={12} /> by {fmtDate(g.target_date)}</span>}
                    </div>
                    {done && <span className={styles.donePill}><Trophy size={13} /> Reached</span>}
                  </div>
                  <div className={styles.itemAmount}>
                    <strong>{peso(g.saved_amount)}</strong>
                    <span className={styles.muted}> of {peso(g.target_amount)}</span>
                  </div>
                  <Meter value={num(g.saved_amount)} max={num(g.target_amount)} done={done} label={`${g.name} saved`} />
                  <div className={styles.itemMeta}>
                    <span>{Math.round(pct(num(g.saved_amount), num(g.target_amount)))}% saved</span>
                    {!done && <span>{peso(left)} to go</span>}
                    {perMonth && <span>Save {peso(Math.ceil(perMonth))}/mo</span>}
                  </div>
                  {g.notes && <p className={styles.itemNotes}>{g.notes}</p>}
                  <div className={styles.itemActions}>
                    {!done && <button className={styles.btnSoft} onClick={() => setAdding(g)}><PiggyBank size={15} /> Add savings</button>}
                    <button className={styles.iconBtn} onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`}><Pencil size={15} /></button>
                    <button className={styles.iconBtn} onClick={() => remove(g)} aria-label={`Delete ${g.name}`}><Trash2 size={15} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {editing && <GoalForm goal={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
      {adding && (
        <AmountModal
          title={`Add savings · ${adding.name}`}
          label="Amount to add (₱)"
          onSubmit={addSavings}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}
