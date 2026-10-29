import { useState } from 'react';
import { Plus, Pencil, Trash2, Landmark, CheckCircle2, HandCoins, CalendarDays, CalendarRange, Hourglass } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Money, Modal, ModalForm, Field, PesoInput, AmountModal, ConfirmModal, EmptyState, ArchiveTabs, PastCard, completedOn, peso, pct, num, fmtDate, timeLeft } from './ui';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const debtRemaining = (d) => Math.max(0, num(d.total_amount) - num(d.paid_amount));

const SUGGESTIONS = [
  { name: 'Credit card' },
  { name: 'Home Credit' },
  { name: 'SSS salary loan' },
  { name: 'Pag-IBIG loan' },
  { name: 'Family loan' },
];

function DebtForm({ debt, onSave, onClose }) {
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(debt?.start_date ?? '');
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    await onSave({ ...(debt?.id && { id: debt.id }), ...f, paid_amount: f.paid_amount || 0 });
    setBusy(false);
  };
  return (
    <Modal title={debt?.id ? 'Edit debt' : 'Add a debt'} eyebrow="Debt tracker" onClose={onClose}>
      <ModalForm
        onSubmit={submit}
        actions={<>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={busy}>{busy ? 'Saving…' : debt?.id ? 'Save changes' : 'Add debt'}</button>
        </>}
      >
        <Field label="What is this debt?">
          <input name="name" required maxLength={80} placeholder="e.g. Credit card, Home Credit, Pag-IBIG loan" defaultValue={debt?.name} />
        </Field>
        <Field label="Lender (optional)">
          <input name="lender" maxLength={80} placeholder="e.g. BPI, Tito Ramon" defaultValue={debt?.lender ?? ''} />
        </Field>
        <div className={styles.formRow}>
          <Field label="Total amount">
            <PesoInput name="total_amount" min="0.01" required placeholder="50000" defaultValue={debt?.total_amount} />
          </Field>
          <Field label="Already paid">
            <PesoInput name="paid_amount" min="0" defaultValue={debt?.paid_amount ?? 0} />
          </Field>
        </div>
        <div className={styles.formRow}>
          <Field label="Monthly payment (optional)">
            <PesoInput name="monthly_payment" min="0" placeholder="5000" defaultValue={debt?.monthly_payment ?? ''} />
          </Field>
          <Field label="Due day (optional)">
            <input name="due_day" type="number" min="1" max="31" step="1" placeholder="1–31" defaultValue={debt?.due_day ?? ''} />
          </Field>
        </div>
        <div className={styles.formRow}>
          <Field label="Started on (optional)">
            <input name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Paid off by (optional)">
            <input name="end_date" type="date" min={start || undefined} defaultValue={debt?.end_date ?? ''} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={debt?.notes ?? ''} />
        </Field>
      </ModalForm>
    </Modal>
  );
}

function DebtCard({ d, onPay, onEdit, onDelete }) {
  const left = debtRemaining(d);
  const done = left === 0;
  const paidPct = Math.floor(pct(num(d.paid_amount), num(d.total_amount)));
  const when = !done && timeLeft(d.end_date, { passed: 'Past end date', thisMonth: 'Ends this month' });
  const longDate = { month: 'short', day: 'numeric', year: 'numeric' };
  return (
    <article className={`${styles.ticket} ${done ? styles.ticketDone : ''}`}>
      <div className={styles.ticketTop}>
        <div className={styles.itemHead}>
          <div>
            <h3>{d.name}</h3>
            {d.lender && <span className={styles.muted}>{d.lender}</span>}
          </div>
          {done
            ? <span className={styles.donePill}><CheckCircle2 size={13} /> Paid off</span>
            : <span className={styles.pctBadge}>{paidPct}% paid</span>}
        </div>
        <div className={styles.ticketAmount}>
          <span className={styles.ticketCaption}>{done ? 'Fully paid' : 'Remaining'}</span>
          <Money value={done ? d.total_amount : left} className={styles.ticketValue} />
          <span className={styles.muted}>{done ? 'cleared' : `of ${peso(d.total_amount)}`}</span>
        </div>
        <Meter value={num(d.paid_amount)} max={num(d.total_amount)} tone="debt" done={done} label={`${d.name} paid`} />
      </div>

      <div className={styles.ticketBottom}>
        {(d.start_date || d.end_date) && (
          <div className={styles.ticketTerm}>
            <CalendarRange size={15} />
            <span>
              {d.start_date ? fmtDate(d.start_date, longDate) : 'Start not set'}
              <span className={styles.termArrow} aria-label="to">→</span>
              {d.end_date ? fmtDate(d.end_date, longDate) : 'No end date'}
            </span>
            {when && <span className={`${styles.factChip} ${when.late ? styles.factChipLate : ''}`}><Hourglass size={12} /> {when.text}</span>}
          </div>
        )}
        <dl className={styles.ticketFacts}>
          <div><dt>Monthly</dt><dd>{num(d.monthly_payment) > 0 ? peso(d.monthly_payment) : '—'}</dd></div>
          <div><dt>Due</dt><dd>{d.due_day ? <><CalendarDays size={12} /> {ordinal(d.due_day)}</> : '—'}</dd></div>
          <div><dt>Paid</dt><dd>{peso(d.paid_amount)}</dd></div>
        </dl>
        {d.notes && <p className={styles.itemNotes}>{d.notes}</p>}
        <div className={styles.itemActions}>
          {!done && <button className={styles.btnSoft} onClick={() => onPay(d)}><HandCoins size={15} /> Record payment</button>}
          <button className={styles.editBtn} onClick={() => onEdit(d)} aria-label={`Edit ${d.name}`}><Pencil size={14} /> Edit</button>
          <button className={styles.iconBtn} onClick={() => onDelete(d)} aria-label={`Delete ${d.name}`} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  );
}

export default function Debts({ debts, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);   // null | debt-like object (no id = new)
  const [paying, setPaying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('active');   // active | past

  const total = debts.reduce((s, d) => s + num(d.total_amount), 0);
  const remaining = debts.reduce((s, d) => s + debtRemaining(d), 0);
  const monthly = debts.filter(d => debtRemaining(d) > 0).reduce((s, d) => s + num(d.monthly_payment), 0);
  /* Fully paid debts are archived under "Past debts", newest first. */
  const active = debts.filter(d => debtRemaining(d) > 0).sort((a, b) => debtRemaining(b) - debtRemaining(a));
  const past = debts.filter(d => debtRemaining(d) === 0)
    .sort((a, b) => String(completedOn(b)).localeCompare(String(completedOn(a))));
  const longDate = { month: 'short', day: 'numeric', year: 'numeric' };

  const save = async (debt) => { if (await onSave(debt)) setEditing(null); };
  const pay = async (amount) => {
    const paid = Math.min(num(paying.total_amount), num(paying.paid_amount) + amount);
    if (await onSave({ ...paying, paid_amount: paid })) setPaying(null);
  };
  const remove = async () => { if (await onDelete(deleting.id)) setDeleting(null); };

  const payPresets = paying ? [
    ...(num(paying.monthly_payment) > 0 && num(paying.monthly_payment) < debtRemaining(paying)
      ? [{ label: `Monthly · ${peso(paying.monthly_payment)}`, value: num(paying.monthly_payment) }] : []),
    { label: `Pay in full · ${peso(debtRemaining(paying))}`, value: debtRemaining(paying) },
  ] : [];

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Debt tracker</span>
          <h1>What you <em>owe</em></h1>
        </div>
        {debts.length > 0 && <button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add debt</button>}
      </header>

      {debts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nothing on this side of the scale yet"
          text="Add each loan, card or utang with what you’ve already paid. BALANSE tracks it down to zero."
          suggestions={SUGGESTIONS}
          onPick={(s) => setEditing({ name: s.name })}
          action={<button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add your first debt</button>}
        />
      ) : (
        <>
          <section className={`${styles.band} ${styles.bandInk}`}>
            <div className={styles.bandMain}>
              <span className={styles.bandLabel}>Still owed</span>
              <Money value={remaining} className={styles.bandValue} />
              <Meter value={total - remaining} max={total} tone="onDark" size="lg" label="Overall debt paid off" />
              <span className={styles.bandSub}>{Math.floor(pct(total - remaining, total))}% debt-free · {peso(total - remaining)} of {peso(total)} paid</span>
            </div>
            <div className={styles.bandFacts}>
              <div><span>Monthly payments</span><Money value={monthly} /></div>
              <div><span>Active debts</span><strong>{active.length}</strong></div>
              <div><span>Past debts</span><strong>{past.length}</strong></div>
            </div>
          </section>

          <div className={styles.toolbar}>
            <ArchiveTabs value={view} onChange={setView} activeCount={active.length} pastCount={past.length} pastLabel="Past debts" label="Debts" />
            <span className={styles.muted}>{view === 'active' ? 'Sorted by amount left' : 'Most recently paid off first'}</span>
          </div>

          {view === 'active' && (active.length === 0 ? (
            <p className={styles.panelEmpty}>No active debts. You’re debt-free! 🎉 Paid-off debts are in Past debts.</p>
          ) : (
            <div className={styles.cardGrid}>
              {active.map(d => <DebtCard key={d.id} d={d} onPay={setPaying} onEdit={setEditing} onDelete={setDeleting} />)}
            </div>
          ))}

          {view === 'past' && (past.length === 0 ? (
            <p className={styles.panelEmpty}>Debts you fully pay off are archived here. Your first one is coming.</p>
          ) : (
            <div className={styles.cardGrid}>
              {past.map(d => (
                <PastCard
                  key={d.id}
                  title={d.name}
                  subtitle={d.lender}
                  stamp="Paid off"
                  date={completedOn(d)}
                  amountLabel="Total paid"
                  amount={d.total_amount}
                  facts={[
                    d.start_date && `Started ${fmtDate(d.start_date, longDate)}`,
                    d.end_date && `Due by ${fmtDate(d.end_date, longDate)}`,
                  ].filter(Boolean)}
                  notes={d.notes}
                  onEdit={() => setEditing(d)}
                  onDelete={() => setDeleting(d)}
                />
              ))}
            </div>
          ))}
        </>
      )}

      {editing && <DebtForm debt={editing} onSave={save} onClose={() => setEditing(null)} />}
      {paying && (
        <AmountModal
          eyebrow={paying.name}
          title="Record a payment"
          label="Amount paid"
          max={debtRemaining(paying)}
          presets={payPresets}
          onSubmit={pay}
          onClose={() => setPaying(null)}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`Delete “${deleting.name}”?`}
          text="This permanently removes the debt from BALANSE. This can’t be undone."
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
