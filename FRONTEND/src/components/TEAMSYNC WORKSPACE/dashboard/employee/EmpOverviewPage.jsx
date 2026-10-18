import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, Clock, TrendingUp, Hash, ArrowRight, MessageSquareWarning, Sparkles } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import ActivityChart from '../ActivityChart';
import StatusBadge, { greeting } from '../StatusBadge';
import styles from '../SharedPages.module.css';

const CHART_SERIES = [{ key: 'value', label: 'Submitted', color: '#cb2525' }];

export default function EmpOverviewPage({ room, profile, onNavigate }) {
  const [stats, setStats] = useState({ submitted: 0, approved: 0, rejected: 0, pending: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!room || !profile || !supabase) return;
    setLoading(true);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', room.id)
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });

    const t = tasks ?? [];
    setStats({
      submitted: t.length,
      approved: t.filter(x => x.status === 'approved').length,
      rejected: t.filter(x => x.status === 'rejected').length,
      pending:  t.filter(x => x.status === 'pending').length,
    });
    setRecentTasks(t.slice(0, 5));

    /* Chart — last 6 months submissions */
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const yr = d.getFullYear(), mo = d.getMonth();
      const value = t.filter(x => {
        const td = new Date(x.created_at);
        return td.getFullYear() === yr && td.getMonth() === mo;
      }).length;
      months.push({ label, value });
    }
    setChartData(months);
    setLoading(false);
  }, [room, profile]);

  useEffect(() => { load(); }, [load]);

  const approvalRate = stats.submitted > 0 ? Math.round((stats.approved / stats.submitted) * 100) : null;

  const statCards = [
    { label: 'Total Submitted', value: stats.submitted, icon: <ClipboardCheck size={20} />, tone: '#1a1a2e', hint: 'All time' },
    { label: 'Approved',        value: stats.approved,  icon: <CheckCircle size={20} />,    tone: '#059669',
      hint: approvalRate !== null ? `${approvalRate}% approval rate` : 'No reviews yet', trend: approvalRate !== null },
    { label: 'Rejected',        value: stats.rejected,  icon: <XCircle size={20} />,        tone: '#cb2525', hint: 'See owner feedback' },
    { label: 'Pending Review',  value: stats.pending,   icon: <Clock size={20} />,          tone: '#d97706', hint: 'Awaiting review' },
  ];

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>{greeting()}, {profile?.first_name}</p>
          <p className={styles.pageSubtitle}>
            Here's a summary of your work in <strong>{room?.name}</strong>.
          </p>
        </div>
        {approvalRate !== null && (
          <div className={styles.pageHeaderBadge}>
            <TrendingUp size={14} />
            {approvalRate}% approval rate
          </div>
        )}
      </div>

      {/* Next-step prompt */}
      {stats.rejected > 0 ? (
        <div className={`${styles.alertBanner} ${styles.alertDanger}`} role="status">
          <span className={styles.alertIcon}><MessageSquareWarning size={18} /></span>
          <div className={styles.alertText}>
            <strong>{stats.rejected} {stats.rejected === 1 ? 'task needs' : 'tasks need'} your attention</strong>
            <span>Read the owner's feedback and resubmit when you're ready.</span>
          </div>
          <button className={styles.alertBtn} onClick={() => onNavigate?.('tasks')}>
            View feedback <ArrowRight size={14} />
          </button>
        </div>
      ) : stats.submitted === 0 && (
        <div className={styles.alertBanner} role="status">
          <span className={styles.alertIcon}><Sparkles size={18} /></span>
          <div className={styles.alertText}>
            <strong>Submit your first task</strong>
            <span>Log completed work and the room owner will review it.</span>
          </div>
          <button className={styles.alertBtn} onClick={() => onNavigate?.('tasks')}>
            Get started <ArrowRight size={14} />
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
                <p className={styles.statValue}>{s.value}</p>
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
        {/* Activity chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>My Task Activity</h3>
            <span className={styles.legendMuted}>Last 6 months</span>
          </div>
          <ActivityChart data={chartData} series={CHART_SERIES} height={160} />
        </div>

        {/* Room panel */}
        <div className={`${styles.card} ${styles.roomStatsCard} ${styles.roomPanel}`}>
          <p className={styles.panelEyebrow}>Your Room</p>
          <div className={styles.panelRoom}>
            <div className={styles.panelRoomAvatar}>{room.name.slice(0, 2).toUpperCase()}</div>
            <div className={styles.panelRoomInfo}>
              <p className={styles.panelRoomName}>{room.name}</p>
              <span className={styles.panelRoomCode}><Hash size={11} />{room.room_code}</span>
            </div>
          </div>
          <div className={styles.progressBar} style={{ margin: '4px 0 20px' }}>
            <div className={styles.progressFill} style={{ width: `${approvalRate ?? 0}%` }} />
          </div>
          <div className={styles.roomStatRow}>
            <div className={styles.roomStat}><strong>{stats.approved}</strong><span>Approved</span></div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}><strong>{stats.pending}</strong><span>Pending</span></div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}><strong>{stats.submitted}</strong><span>Total</span></div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recent Tasks</h3>
          {recentTasks.length > 0 && (
            <button className={styles.linkBtn} onClick={() => onNavigate?.('tasks')}>
              View all <ArrowRight size={13} />
            </button>
          )}
        </div>
        {recentTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <span className={styles.emptyText}>No tasks yet</span>
            <span className={styles.emptySubtext}>Submit your first task to see it here</span>
            <button className={styles.emptyCta} onClick={() => onNavigate?.('tasks')}>Go to My Tasks</button>
          </div>
        ) : (
          <div className={styles.taskList}>
            {recentTasks.map(task => (
              <div key={task.id} className={styles.taskItem} data-status={task.status}>
                <div className={styles.taskRow}>
                  <div className={styles.taskInfo}>
                    <p className={styles.taskTitle}>{task.title}</p>
                    {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                  </div>
                  <span className={styles.taskDate}>{formatDate(task.created_at)}</span>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
