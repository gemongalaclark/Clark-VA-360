import { useState } from 'react';
import { Gift, Pencil, Trash2, Copy, Search, Ticket, Check } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { timeLeft } from '../i18n.js';
import { useNav, Link, Sheet, useToast, adminSaveError } from '../ui.jsx';
import { canManagePromos, carTitle } from '../showroomRules.js';
import { promoStatus, voucherStatus, voucherExpires } from '../promoRules.js';
import { fmtDateTime } from './EventsAdmin.jsx';

/* Prize-wheel promos and the vouchers buyers won. Both roles see them and redeem
   vouchers at the counter; only the superadmin creates, edits or deletes a promo. */

const ORDER = { live: 0, upcoming: 1, ended: 2 };
const STATUS = { live: 'Live', upcoming: 'Upcoming', ended: 'Ended' };
const VOUCHER = { unused: 'Unused', redeemed: 'Redeemed', expired: 'Expired' };
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const normVoucher = (v) => String(v || '').toUpperCase().replace(/\s+/g, '');

export default function Promos({ role }) {
  const { promos, claims, events, cars, deletePromo, redeemClaim } = useShowroom();
  const { now } = useNav();
  const toast = useToast();
  const manage = canManagePromos(role);
  const [confirm, setConfirm] = useState(null);
  const [redeem, setRedeem] = useState(null);
  const [stockNo, setStockNo] = useState('');
  const [lookup, setLookup] = useState('');
  const [looked, setLooked] = useState(null);

  const list = promos
    .map(p => ({ p, status: promoStatus(p, now) }))
    .sort((x, y) => ORDER[x.status] - ORDER[y.status] || Date.parse(x.p.startsAt) - Date.parse(y.p.startsAt));
  const winners = [...claims].sort((x, y) => Date.parse(y.claimedAt) - Date.parse(x.claimedAt));
  const promoName = (id) => promos.find(p => p.id === id)?.name || 'A deleted promo';

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast(`${code} copied.`); } catch { toast(`Promo code: ${code}`); }
  };
  const find = (e) => {
    e.preventDefault();
    const code = normVoucher(lookup);
    setLooked(code ? claims.find(c => normVoucher(c.voucher) === code) || 'none' : null);
  };
  const doRedeem = async () => {
    const c = redeem;
    setRedeem(null);
    try {
      await redeemClaim(c.id, stockNo);
      toast(`${c.voucher} redeemed · ${c.prizeLabel} · ${c.name}`);
      if (looked && looked !== 'none' && looked.id === c.id) setLooked(null);
    } catch (err) { toast(adminSaveError(err)); }
  };

  const claimCard = (c) => {
    const status = voucherStatus(c, now);
    return (
      <li key={c.id} className={a.winner}>
        <div className={a.eventTop}>
          <span className={`${a.statusChip} ${a[`voucher_${status}`]}`}>{VOUCHER[status]}</span>
          <span className={s.muted}>Won {shortDate(c.claimedAt)}</span>
        </div>
        <p className={a.voucherCode}><Ticket size={18} strokeWidth={1.75} aria-hidden="true" />{c.voucher}</p>
        <p className={a.winnerPrize}>{c.prizeLabel}</p>
        <p className={s.muted}>
          {c.name} · <a href={`mailto:${c.email}`} className={a.inlineLink}>{c.email}</a> · {promoName(c.promoId)}
        </p>
        <p className={s.muted}>
          {status === 'redeemed' && `Redeemed ${shortDate(c.redeemedAt)}${c.stockNo ? ` · ${c.stockNo}` : ''}`}
          {status === 'unused' && `Valid until ${shortDate(voucherExpires(c).toISOString())}`}
          {status === 'expired' && `Expired ${shortDate(voucherExpires(c).toISOString())}`}
        </p>
        {status === 'unused' && (
          <button type="button" className={`${s.btnGhost} ${a.winnerBtn}`} onClick={() => { setStockNo(''); setRedeem(c); }}>
            <Check size={18} aria-hidden="true" />Mark redeemed
          </button>
        )}
      </li>
    );
  };

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Promos</h1>
        {manage && (
          <div className={a.headActions}>
            <Link to="/showroom/admin/promos/new" className={s.btnPrimary}><Gift size={18} strokeWidth={1.75} aria-hidden="true" />New promo</Link>
          </div>
        )}
      </div>
      <p className={`${s.muted} ${a.intro}`}>
        A prize wheel buyers spin once. Put a promo on a live sale by typing its promo code on the event’s page{manage ? '' : ' (superadmin)'}.
        While both are live, a gift button on the home page opens the wheel.
      </p>

      <section className={a.block} aria-labelledby="pr-lookup">
        <div className={a.blockHead}><h2 id="pr-lookup" className={s.h3}>Redeem a voucher</h2></div>
        <form className={a.lookup} onSubmit={find}>
          <label htmlFor="pr-code" className={s.srOnly}>Voucher code</label>
          <input id="pr-code" className={s.input} placeholder="DM-4F7K-9QXH" autoCapitalize="characters" autoComplete="off"
            value={lookup} onChange={(e) => { setLookup(e.target.value); setLooked(null); }} />
          <button type="submit" className={s.btnGhost}><Search size={18} aria-hidden="true" />Find</button>
        </form>
        {looked === 'none' && <p className={s.error} role="alert">No voucher has that code. Check the letters with the buyer.</p>}
        {looked && looked !== 'none' && <ul className={a.winners}>{claimCard(looked)}</ul>}
      </section>

      <section className={a.block} aria-labelledby="pr-list">
        <div className={a.blockHead}><h2 id="pr-list" className={s.h3}>Promos</h2></div>
        {list.length === 0 ? (
          <p className={`${s.muted} ${a.emptyLine}`}>No promos yet.{manage && ' Make a prize wheel for your next sale.'}</p>
        ) : (
          <ul className={a.eventList}>
            {list.map(({ p, status }) => {
              const on = events.filter(e => e.promoId === p.id);
              const won = claims.filter(c => c.promoId === p.id).length;
              return (
                <li key={p.id} className={a.eventCard}>
                  <div className={a.eventTop}>
                    <span className={`${a.statusChip} ${a[`status_${status}`]}`}>{STATUS[status]}</span>
                    <span className={s.muted}>
                      {status === 'live' && `Ends in ${timeLeft('en', p.endsAt, now)}`}
                      {status === 'upcoming' && `Starts in ${timeLeft('en', p.startsAt, now)}`}
                    </span>
                  </div>
                  <h2 className={s.h3}><Gift size={16} aria-hidden="true" className={a.rowIconRed} /> {p.name}</h2>
                  <p className={s.muted}>{fmtDateTime(p.startsAt)} – {fmtDateTime(p.endsAt)} · {won} winner{won === 1 ? '' : 's'}</p>
                  <p className={s.muted}>
                    {on.length ? `On ${on.map(e => e.name).join(', ')}` : 'Not on an event yet.'}
                    {p.permit ? ` · DTI permit ${p.permit}` : ' · No DTI permit entered'}
                  </p>
                  <ul className={a.prizeChips}>
                    {p.prizes.map(x => <li key={x.id}>{x.label} <strong>{Number(x.chance)}%</strong></li>)}
                  </ul>
                  <div className={a.iconRow}>
                    <button type="button" className={`${s.btnGhost} ${a.promoCode}`} onClick={() => copy(p.code)} aria-label={`Copy promo code ${p.code}`}>
                      <Copy size={16} aria-hidden="true" />{p.code}
                    </button>
                    {manage && (
                      <>
                        <Link to={`/showroom/admin/promos/${p.id}`} className={s.btnGhost}><Pencil size={16} aria-hidden="true" />Edit</Link>
                        <button type="button" className={s.iconBtn} aria-label={`Delete ${p.name}`} onClick={() => setConfirm(p)}>
                          <Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={a.block} aria-labelledby="pr-winners">
        <div className={a.blockHead}>
          <h2 id="pr-winners" className={s.h3}>Winners</h2>
          <span className={s.muted}>{winners.length}</span>
        </div>
        {winners.length === 0
          ? <p className={`${s.muted} ${a.emptyLine}`}>No one has claimed a prize yet. Claims made on this browser show up here.</p>
          : <ul className={a.winners}>{winners.map(claimCard)}</ul>}
      </section>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Delete this promo?">
        {confirm && (
          <div className={s.formGrid}>
            <p><strong>{confirm.name}</strong></p>
            <p className={s.muted}>It comes off any event it is on, and buyers stop seeing the wheel. Vouchers already won stay on this page.</p>
            <div className={s.sheetActions}>
              <button type="button" className={s.btnGhost} onClick={() => setConfirm(null)}>Cancel</button>
              <button
                type="button"
                className={`${s.btnPrimary} ${a.danger}`}
                onClick={async () => { const p = confirm; setConfirm(null); await deletePromo(p.id); toast(`“${p.name}” deleted.`); }}
              >
                Delete promo
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!redeem} onClose={() => setRedeem(null)} title="Redeem voucher">
        {redeem && (
          <div className={s.formGrid}>
            <p className={a.voucherCode}><Ticket size={18} strokeWidth={1.75} aria-hidden="true" />{redeem.voucher}</p>
            <p><strong>{redeem.prizeLabel}</strong> for {redeem.name}</p>
            <div className={s.field}>
              <label htmlFor="pr-stock" className={s.fieldLabel}>Car bought (optional)</label>
              <select id="pr-stock" className={s.select} value={stockNo} onChange={(e) => setStockNo(e.target.value)}>
                <option value="">Not recorded</option>
                {cars.map(c => <option key={c.id} value={c.stockNo}>{c.stockNo} · {carTitle(c)}</option>)}
              </select>
            </div>
            <p className={s.muted}>A voucher can be used once. This can’t be undone.</p>
            <div className={s.sheetActions}>
              <button type="button" className={s.btnGhost} onClick={() => setRedeem(null)}>Cancel</button>
              <button type="button" className={s.btnPrimary} onClick={doRedeem}>Mark redeemed</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
