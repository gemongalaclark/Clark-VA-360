import { ExternalLink } from 'lucide-react';
import styles from './SharedPages.module.css';

const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const POST_CLS = {
  'Planned': 'postPlanned', 'In progress': 'postProgress', 'Scheduled': 'postScheduled', 'Published': 'postPublished',
};

/* Read-only view of an employee's submission */
export default function SubmissionTable({ rows }) {
  if (!rows?.length) return <p className={styles.subEmpty}>No submission details.</p>;
  return (
    <div className={styles.subWrap}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>Channel</th><th>Day</th><th>Status</th><th>Date</th><th>Time</th><th>Post topic</th><th>Visual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td data-label="Channel">{r.channel}</td>
              <td data-label="Day">{r.day || '—'}</td>
              <td data-label="Status"><span className={`${styles.postStatus} ${styles[POST_CLS[r.status]] ?? ''}`}>{r.status}</span></td>
              <td data-label="Date">{fmtDate(r.date)}</td>
              <td data-label="Time">{fmtTime(r.time)}</td>
              <td data-label="Post topic" className={styles.subTopic}>{r.topic}</td>
              <td data-label="Visual">
                {r.visual ? (
                  <a href={r.visual} target="_blank" rel="noopener noreferrer" className={styles.visualLink}>
                    Open files <ExternalLink size={12} />
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
