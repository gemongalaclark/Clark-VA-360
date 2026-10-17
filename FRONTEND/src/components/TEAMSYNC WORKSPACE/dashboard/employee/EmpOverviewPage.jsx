import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, Clock, TrendingUp, Hash } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

function MiniChart({ data, color }) {
  if (!data || data.length < 2) return <div className={styles.chartEmpty}>No data yet</div>;
  const W = 500, H = 140, PL = 32, PR = 12, PT = 10, PB = 24;
  const cw = W - PL - PR, ch = H - PT - PB;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const px = (i) => PL + (i / (data.length - 1)) * cw;
  const py = (v) => PT + (1 - v / maxVal) * ch;

  const smooth = () => {
    const pts = data.map((d, i) => ({ x: px(i), y: py(d.value) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx1 = (pts[i-1].x + pts[i].x) / 2;
      d += ` C ${cx1} ${pts[i-1].y} ${cx1} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  const areaPath = () => {
    const pts = data.map((d, i) => ({ x: px(i), y: py(d.value) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx1 = (pts[i-1].x + pts[i].x) / 2;
      d += ` C ${cx1} ${pts[i-1].y} ${cx1} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
    }
    d += ` L ${px(data.length - 1)} ${PT + ch} L ${px(0)} ${PT + ch} Z`;
    return d;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {data.map((d, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#adb5bd">{d.label}</text>
      ))}
      <path d={areaPath()} fill={color + '18'} />
      <path d={smooth()} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)} r="4" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

export default function EmpOverviewPage({ room, profile }) {
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

  const statCards = [
    { label: 'Total Submitted',  value: stats.submitted, icon: <ClipboardCheck size={20} />, color: '#8b5cf6' },
    { label: 'Approved',         value: stats.approved,  icon: <CheckCircle size={20} />,    color: '#10b981' },
    { label: 'Rejected',         value: stats.rejected,  icon: <XCircle size={20} />,        color: '#ef4444' },
    { label: 'Pending Review',   value: stats.pending,   icon: <Clock size={20} />,          color: '#f59e0b' },
  ];

  const STATUS_COLORS = {
    pending:  { bg: '#fff3cd', color: '#856404' },
    approved: { bg: '#d4edda', color: '#155724' },
    rejected: { bg: '#f8d7da', color: '#721c24' },
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const approvalRate = stats.submitted > 0 ? Math.round((stats.approved / stats.submitted) * 100) : null;

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>Welcome back, {profile?.first_name} 👋</p>
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

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {statCards.map((s, i) => (
          <div key={i} className={styles.statCard} style={{ borderTop: `3px solid ${s.color}` }}>
            <div className={styles.statCardTop}>
              <div>
                <p className={styles.statLabel}>{s.label}</p>
                <p className={styles.statValue}>{s.value}</p>
              </div>
              <div className={styles.statIcon} style={{ background: s.color + '18', color: s.color }}>
                {s.icon}
              </div>
            </div>
            {s.label === 'Approved' && stats.submitted > 0 && (
              <div className={styles.statChange}>
                <TrendingUp size={12} />
                <span className={styles.positive}>{approvalRate}% approval rate</span>
              </div>
            )}
            {s.label !== 'Approved' && (
              <div className={styles.statBottom}>
                <span style={{ fontSize: '0.72rem', color: '#ced4da' }}>
                  {s.label === 'Total Submitted' ? 'All time' : s.label === 'Pending Review' ? 'Awaiting review' : 'Reviewed'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Activity chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>My Task Activity (Last 6 Months)</h3>
          </div>
          <MiniChart data={chartData} color="#cb2525" />
        </div>

        {/* Room info panel */}
        <div className={`${styles.card} ${styles.roomStatsCard}`}>
          <p className={styles.cardTitle} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Room</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'rgba(203,37,37,0.25)', border: '1px solid rgba(203,37,37,0.3)',
              color: '#f08080', fontFamily: 'Poppins', fontSize: '0.8rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {room.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontFamily: 'Poppins', fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: 2 }}>{room.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)' }}>
                <Hash size={11} />
                <span style={{ fontFamily: 'Poppins', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em' }}>{room.room_code}</span>
              </div>
            </div>
          </div>
          <div className={styles.progressBar} style={{ margin: '16px 0' }}>
            <div
              className={styles.progressFill}
              style={{ width: `${stats.submitted > 0 ? (stats.approved / stats.submitted) * 100 : 0}%` }}
            />
          </div>
          <div className={styles.roomStatRow}>
            <div className={styles.roomStat}>
              <strong>{stats.approved}</strong>
              <span>Approved</span>
            </div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}>
              <strong>{stats.pending}</strong>
              <span>Pending</span>
            </div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}>
              <strong>{stats.submitted}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recent Tasks</h3>
        </div>
        {recentTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <span className={styles.emptyText}>No tasks yet</span>
            <span className={styles.emptySubtext}>Go to "My Tasks" to submit your first task</span>
          </div>
        ) : (
          <div className={styles.taskList}>
            {recentTasks.map(task => {
              const sc = STATUS_COLORS[task.status];
              return (
                <div key={task.id} className={styles.taskItem}>
                  <div className={styles.taskRow}>
                    <div className={styles.taskInfo}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                    </div>
                    <span className={styles.taskDate}>{formatDate(task.created_at)}</span>
                    <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                      {task.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
