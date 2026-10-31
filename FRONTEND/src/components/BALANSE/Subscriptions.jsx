import { useState } from 'react';
import { Plus, Pencil, Trash2, Repeat, BellRing } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Money, Modal, ModalForm, Field, PesoInput, ConfirmModal, EmptyState, peso, num } from './ui';
import { ordinal } from './Debts';
import { billingCycle, subscriptionTotals, NEARING_DAYS } from './blCycle';

const SUGGESTIONS = [
  { title: 'Netflix' },
  { title: 'Spotify' },
  { title: 'YouTube Premium' },
  { title: 'iCloud+' },
  { title: 'Canva Pro' },
];

const PAID_VIA = ['GCash', 'Maya', 'PayPal', 'Credit card', 'Debit card'];

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString('en-PH', { month: 'long' }));

export const renewText = (daysLeft) => {
  if (daysLeft === 0) return 'Renews today';
  if (daysLeft === 1) return 'Renews tomorrow';
  return `Renews in ${daysLeft} days`;
};

const schedule = (s) => (s.billing === 'yearly'
  ? `Every ${MONTHS[s.renew_month - 1]} ${s.renew_day}`
  : `Every ${ordinal(s.renew_day)} of the month`);

function SubscriptionForm({ sub, onSave, onClose }) {
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState(sub?.billing ?? 'monthly');
  const [month, setMonth] = useState(String(sub?.renew_month ?? new Date().getMonth() + 1));
  const yearly = billing === 'yearly';
  /* 2024 is a leap year, so February allows the 29th. */
  const maxDay = yearly ? new Date(2024, Number(month), 0).getDate() : 31;

  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    await onSave({ ...(sub?.id && { id: sub.id }), ...f, billing });
    setBusy(false);
  };

  return (
    <Modal title={sub?.id ? 'Edit subscription' : 'Add a subscription'} eyebrow="Subscriptions" onClose={onClose}>
      <ModalForm
        onSubmit={submit}
        actions={<>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={busy}>{busy ? 'Saving…' : sub?.id ? 'Save changes' : 'Add subscription'}</button>
        </>}
      >
        <Field label="Subscription title">
          <input name="title" required maxLength={80} placeholder="e.g. Netflix, Spotify, Canva Pro" defaultValue={sub?.title} />
        </Field>
        <Field label="Paid via">
          <input name="paid_via" list="bl-paid-via" required maxLength={40} placeholder="e.g. GCash, Maya, PayPal" defaultValue={sub?.paid_via} />
          <datalist id="bl-paid-via">{PAID_VIA.map(p => <option key={p} value={p} />)}</datalist>
        </Field>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Billing</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Billing">
            {['monthly', 'yearly'].map(b => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={billing === b}
                className={billing === b ? styles.segOn : ''}
                onClick={() => setBilling(b)}
              >
                {b === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>

        {yearly ? (
          <div className={styles.formRow}>
            <Field label="Month of the year">
              <select name="renew_month" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Day">
              <input name="renew_day" type="number" min="1" max={maxDay} step="1" required placeholder={`1–${maxDay}`} defaultValue={sub?.renew_day} />
            </Field>
          </div>
        ) : (
          <Field label="Day of the month" hint="In shorter months it renews on the last day.">
            <input name="renew_day" type="number" min="1" max="31" step="1" required placeholder="1–31" defaultValue={sub?.renew_day} />
          </Field>
        )}

        <Field label={yearly ? 'Amount per year' : 'Amount per month'}>
          <PesoInput name="amount" min="0.01" required placeholder="549" defaultValue={sub?.amount} />
        </Field>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={sub?.notes ?? ''} />
        </Field>
      </ModalForm>
    </Modal>
  );
}

function SubscriptionCard({ s, onEdit, onDelete }) {
  const c = billingCycle(s);
  const yearly = s.billing === 'yearly';
  return (
    <article className={`${styles.subCard} ${c.nearing ? styles.subSoon : ''}`}>
      <div className={styles.subHead}>
        <span className={styles.subDate}>
          <b>{c.next.toLocaleDateString('en-PH', { month: 'short' })}</b>
          <span>{c.next.getDate()}</span>
        </span>
        <div className={styles.subTitle}>
          <h3>{s.title}</h3>
          <span className={styles.muted}>via {s.paid_via}</span>
        </div>
        <span className={styles.factChip}>{yearly ? 'Yearly' : 'Monthly'}</span>
      </div>

      <div className={styles.subAmount}>
        <Money value={s.amount} className={styles.subValue} />
        <span className={styles.muted}>/{yearly ? 'yr' : 'mo'}</span>
      </div>

      <div className={styles.subCycle}>
        <div className={styles.subCycleRow}>
          {c.nearing
            ? <strong className={styles.subStatus}><BellRing size={13} /> {renewText(c.daysLeft)}</strong>
            : <span>{renewText(c.daysLeft)}</span>}
          <span className={styles.muted}>{c.daysUsed} of {c.totalDays} days</span>
        </div>
        <Meter value={c.daysUsed} max={c.totalDays} tone={c.nearing ? 'subSoon' : 'sub'} label={`${s.title} billing cycle used`} />
        <span className={styles.subSchedule}>{schedule(s)}</span>
      </div>

      {s.notes && <p className={styles.itemNotes}>{s.notes}</p>}
      <div className={styles.itemActions}>
        <button className={styles.editBtn} onClick={() => onEdit(s)} aria-label={`Edit ${s.title}`}><Pencil size={14} /> Edit</button>
        <button className={styles.iconBtn} onClick={() => onDelete(s)} aria-label={`Delete ${s.title}`} title="Delete"><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

export default function Subscriptions({ subscriptions, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);   // null | subscription-like object (no id = new)
  const [deleting, setDeleting] = useState(null);

  const sorted = [...subscriptions].sort((a, b) => billingCycle(a).daysLeft - billingCycle(b).daysLeft);
  const { perMonth, perYear } = subscriptionTotals(subscriptions);
  const monthlyCount = subscriptions.filter(s => s.billing === 'monthly').length;
  const nearingCount = subscriptions.filter(s => billingCycle(s).nearing).length;

  const save = async (sub) => { if (await onSave(sub)) setEditing(null); };
  const remove = async () => { if (await onDelete(deleting.id)) setDeleting(null); };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Subscriptions</span>
          <h1>What keeps <em>renewing</em></h1>
        </div>
        {subscriptions.length > 0 && <button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add subscription</button>}
      </header>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No subscriptions yet"
          text="Add what you pay for monthly or yearly, and BALANSE shows how close each one is to renewing."
          suggestions={SUGGESTIONS.map(s => ({ ...s, name: s.title }))}
          onPick={(s) => setEditing({ title: s.title })}
          action={<button className={styles.btnPrimary} onClick={() => setEditing({})}><Plus size={16} /> Add your first subscription</button>}
        />
      ) : (
        <>
          <section className={`${styles.band} ${styles.bandInk}`}>
            <div className={styles.bandMain}>
              <span className={styles.bandLabel}>Costs you each month</span>
              <Money value={perMonth} className={styles.bandValue} />
              <span className={styles.bandSub}>{peso(perYear)} a year, with yearly plans spread over 12 months</span>
            </div>
            <div className={styles.bandFacts}>
              <div><span>Monthly plans</span><strong>{monthlyCount}</strong></div>
              <div><span>Yearly plans</span><strong>{subscriptions.length - monthlyCount}</strong></div>
              <div><span>Renewing soon</span><strong>{nearingCount}</strong></div>
            </div>
          </section>

          <div className={styles.toolbar}>
            <span className={styles.muted}>Soonest renewal first</span>
            <span className={styles.muted}>Red = monthly within {NEARING_DAYS.monthly} days, yearly within {NEARING_DAYS.yearly} days</span>
          </div>

          <div className={styles.cardGrid}>
            {sorted.map(s => <SubscriptionCard key={s.id} s={s} onEdit={setEditing} onDelete={setDeleting} />)}
          </div>
        </>
      )}

      {editing && <SubscriptionForm sub={editing} onSave={save} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          title={`Delete “${deleting.title}”?`}
          text="This permanently removes the subscription from BALANSE. It doesn’t cancel it with the provider."
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
