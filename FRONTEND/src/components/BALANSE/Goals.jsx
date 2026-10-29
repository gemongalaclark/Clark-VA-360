import { useState } from 'react';
import { Plus, Pencil, Trash2, Target, Trophy, PiggyBank, CalendarClock, Hourglass } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Money, Modal, ModalForm, Field, PesoInput, AmountModal, ConfirmModal, EmptyState, peso, pct, num } from './ui';

export const goalRemaining = (g) => Math.max(0, num(g.target_amount) - num(g.saved_amount));

/* Whole months from today to the target date (can be ≤ 0 when it has passed), or null without a date. */
function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) - (d < now.getDate() ? 1 : 0);
}

/* Monthly saving needed to hit the goal on time; null if no date or already reached. */
export function monthlyNeeded(g) {
  const left = goalRemaining(g);
  const months = monthsUntil(g.target_date);
  return left > 0 && months != null ? left / Math.max(1, months) : null;
}

const fmtDate = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

function timeLeft(g) {
  const m = monthsUntil(g.target_date);
  if (m == null) return null;
  if (m < 0) return { text: 'Target date passed', late: true };
  if (m === 0) return { text: 'Due this month', late: false };
  if (m < 12) return { text: `${m} month${m > 1 ? 's' : ''} left`, late: false };
  const y = Math.floor(m / 12), r = m % 12;
  return { text: `${y} yr${y > 1 ? 's' : ''}${r ? ` ${r} mo` : ''} left`, late: false };
}

const SUGGESTIONS = [
  { name: 'Montero Sport', label: 'Montero Sport · ₱600k', target_amount: 600000 },
  { name: 'Emergency fund' },
  { name: 'House down payment' },
  { name: 'Travel to Japan' },
  { name: 'New laptop' },
];

function GoalForm({ goal, onSave, onClose }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    await onSave({ ...(goal?.id && { id: goal.id }), ...f, saved_amount: f.saved_amount || 0 });
    setBusy(false);
  };
  return (
    <Modal title={goal?.id ? 'Edit goal' : 'Add a goal'} eyebrow="Goals" onClose={onClose}>
      <ModalForm
        onSubmit={submit}
        actions={<>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={busy}>{busy ? 'Saving…' : goal?.id ? 'Save changes' : 'Add goal'}</button>
        </>}
      >
        <Field label="What are you saving for?">
          <input name="name" required maxLength={80} placeholder="e.g. Montero Sport" defaultValue={goal?.name} />
        </Field>
        <div className={styles.formRow}>
          <Field label="Target amount">
            <PesoInput name="target_amount" min="0.01" required placeholder="600000" defaultValue={goal?.target_amount} />
          </Field>
          <Field label="Saved so far">
            <PesoInput name="saved_amount" min="0" defaultValue={goal?.saved_amount ?? 0} />
          </Field>
        </div>
        <Field label="Target date (optional)" hint="Add one and BALANSE works out how much to save each month.">
          <input name="target_date" type="date" defaultValue={goal?.target_date ?? ''} />
        </Field>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={goal?.notes ?? ''} />
        </Field>
      </ModalForm>
    </Modal>
  );
}

function GoalCard({ g, onAdd, onEdit, onDelete }) {
  const left = goalRemaining(g);
  const done = left === 0;
  const p = Math.round(pct(num(g.saved_amount), num(g.target_amount)));
  const perMonth = monthlyNeeded(g);
  const when = !done && timeLeft(g);
  return (
    <article className={`${styles.goalCard} ${done ? styles.goalDone : ''}`}>
      <span className={styles.goalPct} aria-hidden="true">{p}<small>%</small></span>
      <div className={styles.goalHead}>
        <h3>{g.name}</h3>
        {g.target_date && <span className={styles.muted}><CalendarClock size={12} /> by {fmtDate(g.target_date)}</span>}
      </div>
      <div className={styles.goalAmount}>
        <Money value={g.saved_amount} className={styles.goalValue} />
        <span className={styles.muted}>saved of {peso(g.target_amount)}</span>
      </div>
      <Meter value={num(g.saved_amount)} max={num(g.target_amount)} tone="goal" done={done} label={`${g.name} saved`} />
      <div className={styles.chipRow}>
        {done && <span className={styles.donePill}><Trophy size={13} /> Goal reached</span>}
        {!done && <span className={styles.factChip}>{peso(left)} to go</span>}
        {perMonth && <span className={`${styles.factChip} ${styles.factChipRed}`}>Save {peso(Math.ceil(perMonth))}/mo</span>}
        {when && <span className={`${styles.factChip} ${when.late ? styles.factChipLate : ''}`}><Hourglass size={12} /> {when.text}</span>}
      </div>
      {g.notes && <p className={styles.itemNotes}>{g.notes}</p>}
      <div className={styles.itemActions}>
        {!done && <button className={styles.btnSoft} onClick={() => onAdd(g)}><PiggyBank size={15} /> Add savings</button>}
        <button className={styles.iconBtn} onClick={() => onEdit(g)} aria-label={`Edit ${g.name}`} title="Edit"><Pencil size={15} /></button>
        <button className={styles.iconBtn} onClick={() => onDelete(g)} aria-label={`Delete ${g.name}`} title="Delete"><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

export default function Goals({ goals, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);   // null | goal-like object (no id = new)
  const [adding, setAdding] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const target = goals.reduce((s, g) => s + num(g.target_amount), 0);
  const saved = goals.reduce((s, g) => s + Math.min(num(g.saved_amount), num(g.target_amount)), 0);
  const reached = goals.filter(g => goalRemaining(g) === 0).length;
  const monthly = goals.reduce((s, g) => s + (monthlyNeeded(g) ?? 0), 0);
  /* Closest to done first: momentum is motivating. Reached goals sink to the end. */
  const sorted = [...goals].sort((a, b) => {
    const da = goalRemaining(a) === 0, db = goalRemaining(b) === 0;
    if (da !== db) return da ? 1 : -1;
    return pct(num(b.saved_amount), num(b.target_amount)) - pct(num(a.saved_amount), num(a.target_amount));
  });

  const save = async (goal) => { if (await onSave(goal)) setEditing(null); };
  const addSavings = async (amount) => {
    if (await onSave({ ...adding, saved_amount: num(adding.saved_amount) + amount })) setAdding(null);
  };
  const remove = async () => { if (await onDelete(deleting.id)) setDeleting(null); };

  const addPresets = adding ? [
    ...(monthlyNeeded(adding) ? [{ label: `Monthly target · ${peso(Math.ceil(monthlyNeeded(adding)))}`, value: Math.ceil(monthlyNeeded(adding)) }] : []),
    ...[1000, 5000, 10000].filter(v => v < goalRemaining(adding)).map(v => ({ label: `+ ${peso(v)}`, value: v })),
    { label: `Finish it · ${peso(goalRemaining(adding))}`, value: goalRemaining(adding) },
  ] : [];

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Goals</span>
          <h1>What you’re <em>saving for</em></h1>
        </div>
        {goals.length > 0 && <button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add goal</button>}
      </header>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Your dreams go on this side of the scale"
          text="Dream car, a house, an emergency fund? Give it a price and a date, and BALANSE tells you what to save each month."
          suggestions={SUGGESTIONS}
          onPick={(s) => setEditing({ name: s.name, target_amount: s.target_amount })}
          action={<button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add your first goal</button>}
        />
      ) : (
        <>
          <section className={`${styles.band} ${styles.bandRed}`}>
            <div className={styles.bandMain}>
              <span className={styles.bandLabel}>Saved so far</span>
              <Money value={saved} className={styles.bandValue} />
              <Meter value={saved} max={target} tone="onDark" size="lg" label="All goals funded" />
              <span className={styles.bandSub}>{Math.round(pct(saved, target))}% funded · {peso(target - saved)} still to save</span>
            </div>
            <div className={styles.bandFacts}>
              <div><span>Save each month</span><Money value={Math.ceil(monthly)} /></div>
              <div><span>Goals</span><strong>{goals.length}</strong></div>
              <div><span>Reached</span><strong>{reached}</strong></div>
            </div>
          </section>

          <div className={styles.cardGrid}>
            {sorted.map(g => <GoalCard key={g.id} g={g} onAdd={setAdding} onEdit={setEditing} onDelete={setDeleting} />)}
          </div>
        </>
      )}

      {editing && <GoalForm goal={editing} onSave={save} onClose={() => setEditing(null)} />}
      {adding && (
        <AmountModal
          eyebrow={adding.name}
          title="Add to your savings"
          label="Amount to add"
          presets={addPresets}
          onSubmit={addSavings}
          onClose={() => setAdding(null)}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Delete “${deleting.name}”?`}
          text="This permanently removes the goal and its saved total from BALANSE. This can’t be undone."
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
