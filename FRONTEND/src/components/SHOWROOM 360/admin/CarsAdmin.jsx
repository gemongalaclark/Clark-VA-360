import { useState } from 'react';
import { Plus, Search, Star, Pencil, Trash2, Facebook, Clock } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Link, CarPhoto, PriceTag, Sheet, useToast } from '../ui.jsx';
import { carTitle, effectivePrice, daysInStock, AGING_DAYS, formatKm, reservedUntilFor, DEFAULT_RESERVATION } from '../showroomRules.js';
import { localISODate } from '../public/LeadForm.jsx';
import FbPost from './FbPost.jsx';

const STATUSES = [['', 'All'], ['available', 'Available'], ['reserved', 'Reserved'], ['sold', 'Sold']];

export default function CarsAdmin() {
  const { cars, events, settings, saveCar, deleteCar } = useShowroom();
  const { loc, navigate, now } = useNav();
  const toast = useToast();
  const status = new URLSearchParams(loc.search).get('status') || '';
  const [q, setQ] = useState('');
  const [fbCar, setFbCar] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = cars
    .filter(c => !status || c.status === status)
    .filter(c => words.every(w => `${carTitle(c)} ${c.stockNo}`.toLowerCase().includes(w)))
    .sort((x, y) => Date.parse(y.listedAt) - Date.parse(x.listedAt));

  /* Reserving here holds the car for the shop's usual days (Settings → Reservations) */
  const setStatus = (car, next) => {
    const soldAt = next === 'sold' ? (car.soldAt || new Date().toISOString()) : null;
    const reservedUntil = next === 'reserved'
      ? (car.reservedUntil || reservedUntilFor(localISODate(), (settings.reservation || DEFAULT_RESERVATION).days)) : null;
    saveCar({ ...car, status: next, soldAt, reservedUntil });
    toast(`${car.stockNo} marked ${next}.`);
  };

  const remove = async () => {
    const car = confirm;
    setConfirm(null);
    await deleteCar(car.id);
    toast(`${car.stockNo} deleted.`);
  };

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Cars <span className={a.count}>{cars.length}</span></h1>
        <div className={a.headActions}>
          <Link to="/showroom/admin/cars/new" className={s.btnPrimary}><Plus size={18} aria-hidden="true" />Add car</Link>
        </div>
      </div>

      <div className={a.toolbar}>
        <label className={s.searchBox}>
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className={s.srOnly}>Search cars</span>
          <input className={s.searchInput} type="search" placeholder="Search model, year, stock no." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className={a.tabs} role="group" aria-label="Filter by status">
          {STATUSES.map(([id, label]) => (
            <button
              key={id || 'all'}
              type="button"
              aria-pressed={status === id}
              onClick={() => navigate(`/showroom/admin/cars${id ? `?status=${id}` : ''}`, { replace: true, keepScroll: true })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className={`${s.muted} ${a.emptyLine}`}>No cars here. {!q && !status && <Link to="/showroom/admin/cars/new" className={a.inlineLink}>Add your first car.</Link>}</p>
      ) : (
        <ul className={a.carList}>
          {list.map(car => {
            const info = effectivePrice(car, events, now);
            const days = daysInStock(car, now);
            const title = carTitle(car);
            return (
              <li key={car.id} className={a.carRow}>
                <Link to={`/showroom/admin/cars/${car.id}`} className={a.carThumb} aria-label={`Edit ${title}`}>
                  <CarPhoto car={car} />
                </Link>
                <div className={a.carInfo}>
                  <Link to={`/showroom/admin/cars/${car.id}`} className={a.carTitleLink}>{title}</Link>
                  <p className={s.muted}>
                    {car.stockNo} · {formatKm(car.odometer)}
                    {car.status !== 'sold' && (
                      <span className={days >= AGING_DAYS ? a.agingChip : a.daysChip}>
                        <Clock size={12} aria-hidden="true" />{days}d{days >= AGING_DAYS ? ' · Aging' : ''}
                      </span>
                    )}
                    {info.event && <span className={a.eventMini}>{info.event.name}</span>}
                    {car.consign && <span className={a.daysChip}>Consigned</span>}
                  </p>
                  <PriceTag info={info} className={a.carPrice} />
                </div>
                <div className={a.carControls}>
                  <label className={a.statusSelect}>
                    <span className={s.srOnly}>Status of {car.stockNo}</span>
                    <select className={s.select} value={car.status} onChange={(e) => setStatus(car, e.target.value)} data-status={car.status}>
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  </label>
                  <div className={a.iconRow}>
                    <button
                      type="button"
                      className={`${s.iconBtn} ${car.featured ? a.starOn : ''}`}
                      aria-pressed={car.featured}
                      aria-label={`Featured on the home page: ${car.stockNo}`}
                      title="Featured on the home page"
                      onClick={() => saveCar({ ...car, featured: !car.featured })}
                    >
                      <Star size={20} strokeWidth={1.75} aria-hidden="true" fill={car.featured ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" className={s.iconBtn} aria-label={`Facebook post for ${car.stockNo}`} title="Copy Facebook post" onClick={() => setFbCar(car)}>
                      <Facebook size={20} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <Link to={`/showroom/admin/cars/${car.id}`} className={s.iconBtn} aria-label={`Edit ${car.stockNo}`} title="Edit">
                      <Pencil size={20} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <button type="button" className={s.iconBtn} aria-label={`Delete ${car.stockNo}`} title="Delete" onClick={() => setConfirm(car)}>
                      <Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FbPost car={fbCar} onClose={() => setFbCar(null)} />

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Delete this car?">
        {confirm && (
          <div className={s.formGrid}>
            <p><strong>{carTitle(confirm)}</strong> ({confirm.stockNo})</p>
            <p className={s.muted}>Its photos are deleted and it is taken out of any event. Leads about it are kept.</p>
            <div className={s.sheetActions}>
              <button type="button" className={s.btnGhost} onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className={`${s.btnPrimary} ${a.danger}`} onClick={remove}>Delete car</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
