import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Tag, Trash2, Plus, Download, ExternalLink, ArrowLeft, Sparkles, Edit3, Save } from 'lucide-react';
import { downloadIcsFile } from './googleCalendarApi';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function SchedulePreviewModal({
  isOpen,
  onClose,
  events = [],
  sourceName = 'Uploaded Schedule',
  modelUsed = 'Gemini AI',
  onSendToGoogleCalendar,
  isSyncing,
  syncProgress,
  syncResult,
  onReset
}) {
  const [editableEvents, setEditableEvents] = useState(events);
  const [activeDayFilter, setActiveDayFilter] = useState('ALL');
  const [editingId, setEditingId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setEditableEvents(events);
    setConfirmed(false);
    setEditingId(null);
    setActiveDayFilter('ALL');
  }, [events]);

  if (!isOpen) return null;

  const DAYS = ['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filteredEvents = activeDayFilter === 'ALL'
    ? editableEvents
    : editableEvents.filter(e => e.dayOfWeek?.toLowerCase() === activeDayFilter.toLowerCase());

  const handleUpdateField = (id, field, value) => {
    setEditableEvents(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const handleDelete = (id) => {
    setEditableEvents(prev => prev.filter(item => item.id !== id));
  };

  const handleAddEvent = () => {
    const newEvt = {
      id: `evt-custom-${Date.now()}`,
      title: 'New Shift / Task',
      dayOfWeek: activeDayFilter === 'ALL' ? 'Monday' : activeDayFilter,
      date: editableEvents[0]?.date || new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      description: 'Manually added schedule item',
      location: '',
      category: 'Work'
    };
    setEditableEvents(prev => [...prev, newEvt]);
    setEditingId(newEvt.id);
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(editableEvents, `clark_va_schedule_${Date.now()}.ics`);
  };

  const handleGo = () => {
    if (!confirmed) return;
    onSendToGoogleCalendar(editableEvents);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalCard} ${styles.previewModalCard}`}>
        <div className={styles.previewHeader}>
          <div>
            <div className={styles.previewBadgeRow}>
              <span className={styles.previewBadge}>
                <Sparkles size={13} /> Scanned by {modelUsed}
              </span>
              <span className={styles.eventCountBadge}>
                {editableEvents.length} Events Detected
              </span>
            </div>
            <h2 className={styles.previewTitle}>
              Verify Schedule <span>Preview</span>
            </h2>
            <p className={styles.previewSubtitle}>
              Review {sourceName}. If the schedule is right, confirm below and press Go to upload it to Google Calendar.
            </p>
          </div>

          {!syncResult && (
            <div className={styles.previewHeaderActions}>
              <button
                type="button"
                className={styles.addEventBtn}
                onClick={handleAddEvent}
                disabled={isSyncing}
              >
                <Plus size={16} /> Add Event
              </button>
            </div>
          )}
        </div>

        {syncResult ? (
          <div className={styles.syncSuccessCard}>
            <div className={styles.successCheckWrap}>
              <CheckCircle2 size={54} color="#cb2525" />
            </div>
            <h3 className={styles.successTitle}>
              Successfully Added to Google Calendar!
            </h3>
            <p className={styles.successDesc}>
              {syncResult.syncedCount} schedule events have been synchronized to your primary Google Calendar account.
            </p>

            <div className={styles.successActionButtons}>
              <a
                href="https://calendar.google.com/calendar/u/0/r"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openGoogleCalBtn}
              >
                <ExternalLink size={18} />
                <span>Open in Google Calendar</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className={styles.downloadIcsBtn}
              >
                <Download size={18} />
                <span>Download .ICS File</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onReset}
              className={styles.doneBtn}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className={styles.dayFilterScroll}>
              {DAYS.map(day => {
                const count = day === 'ALL'
                  ? editableEvents.length
                  : editableEvents.filter(e => e.dayOfWeek?.toLowerCase() === day.toLowerCase()).length;
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.dayTab} ${activeDayFilter === day ? styles.dayTabActive : ''}`}
                    onClick={() => setActiveDayFilter(day)}
                  >
                    <span>{day}</span>
                    <span className={styles.dayTabBadge}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.eventsScrollList}>
              {filteredEvents.length === 0 ? (
                <div className={styles.noEventsNotice}>
                  <Calendar size={36} color="#da7979" />
                  <p>No events found for {activeDayFilter}.</p>
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    className={styles.smallAddBtn}
                  >
                    + Add an event for {activeDayFilter}
                  </button>
                </div>
              ) : (
                filteredEvents.map(evt => {
                  const isEditing = editingId === evt.id;

                  return (
                    <div key={evt.id} className={styles.eventRowCard}>
                      <div className={styles.eventRowTimeCol}>
                        <div className={styles.eventRowDay}>{evt.dayOfWeek}</div>
                        <div className={styles.eventRowTime}>
                          <Clock size={13} />
                          {isEditing ? (
                            <div className={styles.timeInputsRow}>
                              <input
                                type="time"
                                value={evt.startTime}
                                onChange={(e) => handleUpdateField(evt.id, 'startTime', e.target.value)}
                                className={styles.timeInput}
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={evt.endTime}
                                onChange={(e) => handleUpdateField(evt.id, 'endTime', e.target.value)}
                                className={styles.timeInput}
                              />
                            </div>
                          ) : (
                            <span>{evt.startTime} – {evt.endTime}</span>
                          )}
                        </div>
                        <div className={styles.eventRowDate}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={evt.date}
                              onChange={(e) => handleUpdateField(evt.id, 'date', e.target.value)}
                              className={styles.dateInputInline}
                            />
                          ) : (
                            <span>{evt.date}</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.eventRowMainCol}>
                        {isEditing ? (
                          <div className={styles.inlineEditInputs}>
                            <input
                              type="text"
                              value={evt.title}
                              onChange={(e) => handleUpdateField(evt.id, 'title', e.target.value)}
                              placeholder="Event title"
                              className={styles.editTitleInput}
                            />
                            <textarea
                              value={evt.description}
                              onChange={(e) => handleUpdateField(evt.id, 'description', e.target.value)}
                              placeholder="Description / notes"
                              rows={2}
                              className={styles.editDescInput}
                            />
                          </div>
                        ) : (
                          <>
                            <h4 className={styles.eventTitle}>{evt.title}</h4>
                            {evt.description && (
                              <p className={styles.eventDesc}>{evt.description}</p>
                            )}
                            <div className={styles.eventPillsRow}>
                              <span className={styles.categoryPill}>
                                <Tag size={12} /> {evt.category || 'Work'}
                              </span>
                              {evt.location && (
                                <span className={styles.locationPill}>
                                  <MapPin size={12} /> {evt.location}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className={styles.eventRowActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => setEditingId(isEditing ? null : evt.id)}
                          title={isEditing ? 'Save changes' : 'Edit event'}
                        >
                          {isEditing ? <Save size={16} color="#cb2525" /> : <Edit3 size={16} />}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(evt.id)}
                          title="Delete event"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isSyncing && (
              <div className={styles.syncingBanner}>
                <div className={styles.syncingSpinner} />
                <div className={styles.syncingText}>
                  <strong>Sending to Google Calendar...</strong>
                  <p>{syncProgress || 'Creating events via Google Calendar API...'}</p>
                </div>
              </div>
            )}

            <label className={styles.confirmScheduleRow}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={isSyncing || editableEvents.length === 0}
              />
              <span>This schedule looks right. Upload these events to my Google Calendar.</span>
            </label>

            <div className={styles.previewFooter}>
              <div className={styles.previewFooterLeft}>
                <button
                  type="button"
                  className={styles.footerCancelBtn}
                  onClick={onClose}
                  disabled={isSyncing}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className={styles.icsExportBtn}
                  onClick={handleDownloadIcs}
                  disabled={isSyncing}
                  title="Download standard .ics format"
                >
                  <Download size={16} /> Download .ICS
                </button>
              </div>

              <button
                type="button"
                className={styles.sendToCalendarBtn}
                onClick={handleGo}
                disabled={isSyncing || editableEvents.length === 0 || !confirmed}
                id="send-to-google-calendar-btn"
              >
                <Calendar size={18} />
                <span>
                  {isSyncing ? 'Uploading...' : `Go — Upload ${editableEvents.length} Events`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
