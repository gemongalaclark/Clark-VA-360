import { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardCheck, CheckCircle, Clock, TrendingUp, Activity, ArrowRight, BellRing } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import ActivityChart from '../ActivityChart';
import { fetchRoomTasks } from '../taskApi';
import { getInitials, getName, greeting } from '../StatusBadge';
import styles from '../SharedPages.module.css';

const CHART_SERIES = [
  { key: 'submitted', label: 'Assigned', color: '#e59a9a' },
  { key: 'approved',  label: 'Approved',  color: '#cb2525' },
];

export default function OverviewPage({ room, profile, onNavigate }) {
  const [stats, setStats] = useState({ employees: 0, submitted: 0, approved: 0, pending: 0 });
  const [employees, setEmployees] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!room || !supabase) return;
    setLoading(true);

    const { data: members } = await supabase
      .from('room_members')
      .select('*, profiles(*)')
      .eq('room_id', room.id)
      .eq('role', 'employee');

    const { data: tasks, error: tasksErr } = await fetchRoomTasks(room.id);
    if (tasksErr) console.error('Could not load tasks:', tasksErr.message);

    const approved = tasks?.filter(t => t.status === 'approved').length ?? 0;
    const pending  = tasks?.filter(t => t.status === 'submitted').length ?? 0;

    setStats({
      employees: members?.length ?? 0,
      submitted: tasks?.length ?? 0,
      approved,
      pending,
    });

    /* Employee rankings */
    const rankMap = {};
    (tasks ?? []).forEach(t => {
      if (!rankMap[t.employee_id]) {
        rankMap[t.employee_id] = { profile: t.profiles, submitted: 0, approved: 0 };
      }
      rankMap[t.employee_id].submitted++;
      if (t.status === 'approved') rankMap[t.employee_id].approved++;
    });
    setEmployees(Object.values(rankMap).sort((a, b) => b.approved - a.approved).slice(0, 5));

    /* Chart data — last 6 months */
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const yr = d.getFullYear(), mo = d.getMonth();
      const monthTasks = (tasks ?? []).filter(t => {
        const td = new Date(t.created_at);
        return td.getFullYear() === yr && td.getMonth() === mo;
      });
      months.push({
        label,
        submitted: monthTasks.length,
        approved: monthTasks.filter(t => t.status === 'approved').length,
      });
    }
    setChartData(months);
    setLoading(false);
  }, [room]);

  useEffect(() => { load(); }, [load]);

  const rate = (emp) => emp.submitted > 0 ? Math.round((emp.approved / emp.submitted) * 100) : 0;
  const approvalRate = stats.submitted > 0 ? Math.round((stats.approved / stats.submitted) * 100) : null;

  const statCards = [
    { label: 'Employees',       value: stats.employees, icon: <Users size={20} />,          tone: '#1a1a2e', hint: 'Active members' },
    { label: 'Tasks Assigned', value: stats.submitted, icon: <ClipboardCheck size={20} />, tone: '#cb2525', hint: 'All time' },
    { label: 'Approved',        value: stats.approved,  icon: <CheckCircle size={20} />,    tone: '#059669',
      hint: approvalRate !== null ? `${approvalRate}% completion rate` : 'No reviews yet', trend: approvalRate !== null },
    { label: 'Awaiting Review',  value: stats.pending,   icon: <Clock size={20} />,          tone: '#d97706', hint: 'Awaiting review' },
  ];

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className={styles.pageTitle}>{greeting()}, {profile?.first_name}</p>
          <p className={styles.pageSubtitle}>
            Here's what's happening in <strong>{room?.name}</strong> today.
          </p>
        </div>
        {approvalRate !== null && (
          <div className={styles.pageHeaderBadge}>
            <Activity size={14} />
            {approvalRate}% completion rate
          </div>
        )}
      </div>

      {/* Action prompt: the one thing an owner needs to do */}
      {stats.pending > 0 && (
        <div className={styles.alertBanner} role="status">
          <span className={styles.alertIcon}><BellRing size={18} /></span>
          <div className={styles.alertText}>
            <strong>{stats.pending} completed {stats.pending === 1 ? 'task is' : 'tasks are'} waiting for your review</strong>
            <span>Employees are notified as soon as you approve or request a revision.</span>
          </div>
          <button className={styles.alertBtn} onClick={() => onNavigate?.('review')}>
            Review now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {statCards.map(s => (
          <div key={s.label} className={styles.statCard} style={{ '--tone': s.tone }}>
            <div className={styles.statCardTop}>
              <div>
                <p className={styles.statLabel}>{s.label}</p>
                <p className={styles.statValue}>{s.value.toLocaleString()}</p>
              </div>
              <div className={styles.statIcon} style={{ background: s.tone + '14', color: s.tone }}>
                {s.icon}
              </div>
            </div>
            <p className={`${styles.statHint} ${s.trend ? styles.positive : ''}`}>
              {s.trend && <TrendingUp size={12} />} {s.hint}
            </p>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Top employees */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Top Employees</h3>
            <span className={styles.memberCount}>By approved tasks</span>
          </div>
          {employees.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <span className={styles.emptyText}>No employee activity yet</span>
              <span className={styles.emptySubtext}>Employees appear here once you assign them tasks</span>
            </div>
          ) : (
            <div className={styles.employeeTable}>
              {employees.map((emp, i) => (
                <div key={i} className={styles.empRow}>
                  <div className={`${styles.empRank} ${i < 3 ? styles[`rank${i + 1}`] : ''}`}>{i + 1}</div>
                  <div className={styles.miniAvatar}>{getInitials(emp.profile)}</div>
                  <div className={styles.empInfo}>
                    <span className={styles.empName}>{getName(emp.profile)}</span>
                    <div className={styles.rateTrack} aria-hidden="true">
                      <div className={styles.rateFill} style={{ width: `${rate(emp)}%` }} />
                    </div>
                  </div>
                  <div className={styles.empStat}>
                    <span className={styles.empStatVal}>{emp.submitted}</span>
                    <span className={styles.empStatLbl}>Assigned</span>
                  </div>
                  <div className={styles.empStat}>
                    <span className={styles.empStatVal}>{emp.approved}</span>
                    <span className={styles.empStatLbl}>Approved</span>
                  </div>
                  <span className={`${styles.rateBadge} ${rate(emp) >= 70 ? styles.rateGold : styles.rateSilver}`}>
                    {rate(emp)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room progress */}
        <div className={`${styles.card} ${styles.roomStatsCard}`}>
          <h3 className={styles.cardTitle} style={{ color: 'rgba(255,255,255,0.7)' }}>Room Progress</h3>
          <div className={styles.bigPercent}>{approvalRate ?? 0}%</div>
          <p className={styles.bigPercentLabel}>Tasks Completed</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${approvalRate ?? 0}%` }} />
          </div>
          <div className={styles.roomStatRow}>
            <div className={styles.roomStat}><strong>{stats.pending}</strong><span>Pending</span></div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}><strong>{stats.employees}</strong><span>Members</span></div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}><strong>{stats.approved}</strong><span>Done</span></div>
          </div>
        </div>
      </div>

      {/* Activity chart */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Task Activity</h3>
          <div className={styles.chartLegend}>
            {CHART_SERIES.map(s => (
              <span key={s.key} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: s.color }} /> {s.label}
              </span>
            ))}
            <span className={styles.legendMuted}>Last 6 months</span>
          </div>
        </div>
        <ActivityChart data={chartData} series={CHART_SERIES} />
      </div>
    </div>
  );
}
