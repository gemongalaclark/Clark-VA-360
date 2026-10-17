import { useEffect, useState, useMemo } from 'react';
import {
  Calendar, CheckCircle2, Clock, MapPin, Tag, Trash2, Plus,
  Download, ExternalLink, ArrowLeft, Sparkles, Edit3, Save,
  Bell, BellOff, LayoutList, CalendarDays, X
} from 'lucide-react';
import { downloadIcsFile } from './googleCalendarApi';
import styles from './GoogleCalendarAutoScheduler.module.css';

/* ── constants ─────────────────────────────────────── */
const HOUR_PX = 64;

const CAT = {
  work:     { bg: '#e8f0fe', border: '#1a73e8', text: '#174ea6' },
  meeting:  { bg: '#e6f4ea', border: '#34a853', text: '#137333' },
  study:    { bg: '#f3e8fd', border: '#a142f4', text: '#681da8' },
  personal: { bg: '#e4f7fb', border: '#00acc1', text: '#006064' },
  shift:    { bg: '#fce8e6', border: '#ea4335', text: '#c5221f' },
  reminder: { bg: '#fff8e1', border: '#fbbc04', text: '#b45309' },
};

function catColor(cat) {
  return CAT[(cat || 'work').toLowerCase()] || CAT.work;
}

function toMin(t) {
  const [h = 9, m = 0] = (t || '09:00').split(':').map(Number);
  return h * 60 + m;
}

function fmtHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function parseDayLabel(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      num: d.getDate(),
      monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  } catch {
    return { weekday: '?', num: '?', monthDay: dateStr };
  }
}

function computeLanes(events) {
  const sorted = [...events].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const lanes = [];
  sorted.forEach(evt => {
    const s = toMin(evt.startTime);
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (toMin(lanes[i][lanes[i].length - 1].endTime) <= s) {
        lanes[i].push(evt);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([evt]);
  });
  const map = {};
  lanes.forEach((lane, li) =>
    lane.forEach(e => { map[e.id] = { lane: li, total: lanes.length }; })
  );
  return map;
}

/* ── inline edit form (used in both views) ─────────── */
function EventEditForm({ evt, onSave, onCancel }) {
  const [form, setForm] = useState({ ...evt });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className={styles.inlineEditForm}>
      <div className={styles.editFormRow}>
        <input
          className={styles.editTitleInput}
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Event title"
        />
        <select
          className={styles.editCatSelect}
          value={form.category || 'Work'}
          onChange={e => set('category', e.target.value)}
        >
          {['Work','Meeting','Study','Personal','Shift','Reminder'].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className={styles.editFormRow}>
        <input type="date" className={styles.editDateInput} value={form.date}
          onChange={e => set('date', e.target.value)} />
        <input type="time" className={styles.editTimeInput} value={form.startTime}
          onChange={e => set('startTime', e.target.value)} />
        <span className={styles.editTimeSep}>→</span>
        <input type="time" className={styles.editTimeInput} value={form.endTime}
          onChange={e => set('endTime', e.target.value)} />
      </div>
      <input
        className={styles.editLocInput}
        value={form.location || ''}
        onChange={e => set('location', e.target.value)}
        placeholder="Location (optional)"
      />
      <textarea
        className={styles.editDescInput}
        value={form.description || ''}
        onChange={e => set('description', e.target.value)}
        placeholder="Description (optional)"
        rows={2}
      />
      <div className={styles.editFormActions}>
        <button className={styles.editSaveBtn} onClick={() => onSave(form)}>
          <Save size={14} /> Save
        </button>
        <button className={styles.editCancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────── */
export default function SchedulePreviewModal({
  isOpen,
  onClose,
  events = [],
  sourceName = 'Uploaded Schedule',
  modelUsed = 'Gemini AI',
  reminderMinutes = null,
  onSendToGoogleCalendar,
  isSyncing,
  syncProgress,
  syncResult,
  onReset,
}) {
  const [editableEvents, setEditableEvents] = useState(events);
  const [editingId, setEditingId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [viewMode, setViewMode] = useState('calendar');
  const [activeDayFilter, setActiveDayFilter] = useState('ALL');

  useEffect(() => {
    setEditableEvents(events);
    setConfirmed(false);
    setEditingId(null);
    setActiveDayFilter('ALL');
    setViewMode('calendar');
  }, [events]);

  if (!isOpen) return null;

  /* handlers */
  const updateEvent = (id, updated) => {
    setEditableEvents(p => p.map(e => e.id === id ? { ...e, ...updated } : e));
    setEditingId(null);
  };
  const deleteEvent = id => setEditableEvents(p => p.filter(e => e.id !== id));
  const addEvent = () => {
    const newEvt = {
      id: `evt-custom-${Date.now()}`,
      title: 'New Event',
      dayOfWeek: 'Monday',
      date: editableEvents[0]?.date || new Date().toISOString().split('T')[0],
      startTime: '09:00', endTime: '10:00',
      description: '', location: '', category: 'Work',
    };
    setEditableEvents(p => [...p, newEvt]);
    setEditingId(newEvt.id);
  };

  /* calendar computations */
  const sortedDates = useMemo(() =>
    [...new Set(editableEvents.map(e => e.date))].sort(),
    [editableEvents]
  );

  const eventsByDate = useMemo(() => {
    const m = {};
    editableEvents.forEach(e => { (m[e.date] ||= []).push(e); });
    return m;
  }, [editableEvents]);

  const { minHour, maxHour } = useMemo(() => {
    let mn = 8, mx = 17;
    editableEvents.forEach(e => {
      const sh = Math.floor(toMin(e.startTime) / 60);
      const eh = Math.ceil(toMin(e.endTime) / 60);
      if (sh < mn) mn = sh;
      if (eh > mx) mx = eh;
    });
    return { minHour: Math.max(0, mn - 1), maxHour: Math.min(24, mx + 1) };
  }, [editableEvents]);

  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const gridHeight = hours.length * HOUR_PX;

  const today = new Date().toISOString().split('T')[0];

  /* list-view filter */
  const DAYS = ['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const listEvents = activeDayFilter === 'ALL'
    ? editableEvents
    : editableEvents.filter(e => e.dayOfWeek?.toLowerCase() === activeDayFilter.toLowerCase());

  const handleGo = () => confirmed && onSendToGoogleCalendar(editableEvents, reminderMinutes);

  /* ── success screen ─── */
  if (syncResult) {
    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modalCard} ${styles.previewModalCard}`}>
          <div className={styles.syncSuccessCard}>
            <div className={styles.successCheckWrap}>
              <CheckCircle2 size={56} color="#34a853" />
            </div>
            <h3 className={styles.successTitle}>Added to Google Calendar!</h3>
            <p className={styles.successDesc}>
              {syncResult.syncedCount} events have been added to your primary Google Calendar.
            </p>
            <div className={styles.successActionButtons}>
              <a
                href="https://calendar.google.com/calendar/u/0/r"
                target="_blank" rel="noopener noreferrer"
                className={styles.openGoogleCalBtn}
              >
                <ExternalLink size={17} /> Open Google Calendar
              </a>
              <button className={styles.downloadIcsBtn}
                onClick={() => downloadIcsFile(editableEvents)}>
                <Download size={17} /> Download .ICS
              </button>
            </div>
            <button className={styles.doneBtn} onClick={onReset}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── main preview ─── */
  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalCard} ${styles.previewModalCard}`}>

        {/* ── Header ── */}
        <div className={styles.calPreviewHeader}>
          <div className={styles.calPreviewHeaderTop}>
            <div className={styles.previewBadgeRow}>
              <span className={styles.previewBadge}>
                <Sparkles size={12} /> {modelUsed}
              </span>
              <span className={styles.eventCountBadge}>
                {editableEvents.length} Events
              </span>
              <span className={styles.reminderBadge}>
                {reminderMinutes != null
                  ? <><Bell size={12} /> {reminderMinutes >= 1440 ? '1 day' : reminderMinutes >= 60 ? `${reminderMinutes / 60}h` : `${reminderMinutes}m`} before</>
                  : <><BellOff size={12} /> No reminders</>}
              </span>
            </div>

            <div className={styles.calPreviewHeaderActions}>
              <div className={styles.viewToggleGroup}>
                <button
                  className={`${styles.viewToggleBtn} ${viewMode === 'calendar' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setViewMode('calendar')}
                  title="Calendar view"
                >
                  <CalendarDays size={15} /> Week
                </button>
                <button
                  className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <LayoutList size={15} /> List
                </button>
              </div>
              <button className={styles.addEventBtn} onClick={addEvent} disabled={isSyncing}>
                <Plus size={15} /> Add Event
              </button>
            </div>
          </div>

          <div>
            <h2 className={styles.previewTitle}>
              Verify Schedule <span>Preview</span>
            </h2>
            <p className={styles.previewSubtitle}>
              {sourceName} — review the extracted events, then confirm and press Go.
            </p>
          </div>
        </div>

        {/* ── Calendar View ── */}
        {viewMode === 'calendar' && (
          <div className={styles.calViewWrapper}>
            {/* Day header row */}
            <div className={styles.calDayHeadersRow}>
              <div className={styles.calTimeCorner} />
              {sortedDates.map(date => {
                const { weekday, num } = parseDayLabel(date);
                const isToday = date === today;
                return (
                  <div key={date} className={styles.calDayHeaderCell}>
                    <span className={styles.calDayWeekday}>{weekday}</span>
                    <span className={`${styles.calDayNum} ${isToday ? styles.calDayNumToday : ''}`}>
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid */}
            <div className={styles.calGridScroll}>
              <div className={styles.calGridInner} style={{ height: gridHeight }}>
                {/* Time gutter */}
                <div className={styles.calTimeGutter}>
                  {hours.map(h => (
                    <div key={h} className={styles.calHourRow} style={{ height: HOUR_PX }}>
                      <span className={styles.calHourLabel}>{fmtHour(h)}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div className={styles.calDayColumnsArea}>
                  {sortedDates.map(date => {
                    const dayEvts = eventsByDate[date] || [];
                    const lanes = computeLanes(dayEvts);
                    return (
                      <div key={date} className={styles.calDayCol} style={{ height: gridHeight }}>
                        {/* Hour grid lines */}
                        {hours.map(h => (
                          <div
                            key={h}
                            className={styles.calHourLine}
                            style={{ top: (h - minHour) * HOUR_PX }}
                          />
                        ))}
                        {/* Half-hour lines */}
                        {hours.map(h => (
                          <div
                            key={`h${h}`}
                            className={styles.calHalfHourLine}
                            style={{ top: (h - minHour) * HOUR_PX + HOUR_PX / 2 }}
                          />
                        ))}

                        {/* Events */}
                        {dayEvts.map(evt => {
                          const startMin = toMin(evt.startTime);
                          const endMin = Math.max(toMin(evt.endTime), startMin + 15);
                          const top = (startMin - minHour * 60) / 60 * HOUR_PX;
                          const height = Math.max(22, (endMin - startMin) / 60 * HOUR_PX);
                          const { lane, total } = lanes[evt.id] || { lane: 0, total: 1 };
                          const pct = 94 / total;
                          const left = `${3 + lane * pct}%`;
                          const width = `${pct - 2}%`;
                          const c = catColor(evt.category);
                          const isEditing = editingId === evt.id;

                          return (
                            <div
                              key={evt.id}
                              className={styles.calEventBlock}
                              style={{ top, height, left, width, background: c.bg, borderLeftColor: c.border, color: c.text }}
                            >
                              <div className={styles.calEventTitle}>{evt.title}</div>
                              {height > 32 && (
                                <div className={styles.calEventTime}>
                                  {evt.startTime} – {evt.endTime}
                                </div>
                              )}
                              {height > 48 && evt.location && (
                                <div className={styles.calEventLoc}>
                                  <MapPin size={10} /> {evt.location}
                                </div>
                              )}
                              <div className={styles.calEventHoverActions}>
                                <button
                                  className={styles.calEvtActionBtn}
                                  onClick={e => { e.stopPropagation(); setEditingId(isEditing ? null : evt.id); }}
                                  title="Edit"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  className={styles.calEvtActionBtn}
                                  onClick={e => { e.stopPropagation(); deleteEvent(evt.id); }}
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Edit form panel (shown below grid when editing) */}
            {editingId && (() => {
              const evt = editableEvents.find(e => e.id === editingId);
              if (!evt) return null;
              return (
                <div className={styles.calEditPanel}>
                  <div className={styles.calEditPanelHeader}>
                    <span>Edit: <strong>{evt.title}</strong></span>
                    <button onClick={() => setEditingId(null)}><X size={16} /></button>
                  </div>
                  <EventEditForm
                    evt={evt}
                    onSave={updated => updateEvent(evt.id, updated)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* ── List View ── */}
        {viewMode === 'list' && (
          <div className={styles.listViewWrapper}>
            {/* Day filter tabs */}
            <div className={styles.dayFilterScroll}>
              {DAYS.map(day => {
                const count = day === 'ALL'
                  ? editableEvents.length
                  : editableEvents.filter(e => e.dayOfWeek?.toLowerCase() === day.toLowerCase()).length;
                return (
                  <button
                    key={day}
                    className={`${styles.dayTab} ${activeDayFilter === day ? styles.dayTabActive : ''}`}
                    onClick={() => setActiveDayFilter(day)}
                  >
                    {day} <span className={styles.dayTabBadge}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.eventsScrollList}>
              {listEvents.length === 0 ? (
                <div className={styles.noEventsNotice}>
                  <Calendar size={36} color="#da7979" />
                  <p>No events for {activeDayFilter}.</p>
                  <button className={styles.smallAddBtn} onClick={addEvent}>+ Add event</button>
                </div>
              ) : (
                listEvents.map(evt => {
                  const isEditing = editingId === evt.id;
                  const c = catColor(evt.category);
                  return (
                    <div key={evt.id} className={styles.listEventCard}
                      style={{ borderLeftColor: c.border }}>
                      {isEditing ? (
                        <EventEditForm
                          evt={evt}
                          onSave={updated => updateEvent(evt.id, updated)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div className={styles.listEventInner}>
                          <div className={styles.listEventTimeCol}>
                            <div className={styles.listEventDay}
                              style={{ color: c.border }}>{evt.dayOfWeek}</div>
                            <div className={styles.listEventTime}>
                              <Clock size={12} />
                              {evt.startTime} – {evt.endTime}
                            </div>
                            <div className={styles.listEventDate}>{evt.date}</div>
                          </div>
                          <div className={styles.listEventMainCol}>
                            <h4 className={styles.listEventTitle}>{evt.title}</h4>
                            {evt.description && (
                              <p className={styles.listEventDesc}>{evt.description}</p>
                            )}
                            <div className={styles.listEventPills}>
                              <span className={styles.listCatPill}
                                style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                                <Tag size={11} /> {evt.category || 'Work'}
                              </span>
                              {evt.location && (
                                <span className={styles.listLocPill}>
                                  <MapPin size={11} /> {evt.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={styles.listEventActions}>
                            <button className={styles.editBtn}
                              onClick={() => setEditingId(evt.id)} title="Edit">
                              <Edit3 size={15} />
                            </button>
                            <button className={styles.deleteBtn}
                              onClick={() => deleteEvent(evt.id)} title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Syncing banner ── */}
        {isSyncing && (
          <div className={styles.syncingBanner}>
            <div className={styles.syncingSpinner} />
            <div className={styles.syncingText}>
              <strong>Uploading to Google Calendar...</strong>
              <p>{syncProgress || 'Creating events via Google Calendar API...'}</p>
            </div>
          </div>
        )}

        {/* ── Confirm row ── */}
        <label className={styles.confirmScheduleRow}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            disabled={isSyncing || editableEvents.length === 0}
          />
          <span>This schedule looks right. Upload these events to my Google Calendar.</span>
        </label>

        {/* ── Footer ── */}
        <div className={styles.previewFooter}>
          <div className={styles.previewFooterLeft}>
            <button className={styles.footerCancelBtn} onClick={onClose} disabled={isSyncing}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className={styles.icsExportBtn}
              onClick={() => downloadIcsFile(editableEvents)} disabled={isSyncing}>
              <Download size={15} /> .ICS
            </button>
          </div>
          <button
            className={styles.sendToCalendarBtn}
            onClick={handleGo}
            disabled={isSyncing || editableEvents.length === 0 || !confirmed}
          >
            <Calendar size={17} />
            {isSyncing ? 'Uploading...' : `Go — Upload ${editableEvents.length} Events`}
          </button>
        </div>

      </div>
    </div>
  );
}
