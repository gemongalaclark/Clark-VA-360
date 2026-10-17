import { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardCheck, CheckCircle, Clock, TrendingUp, MoreVertical } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

/* ── Simple SVG Line Chart ────────────────────────────────── */
function LineChart({ data }) {
  if (!data || data.length < 2) return <div className={styles.chartEmpty}>No data yet</div>;
  const W = 500, H = 160, PL = 36, PR = 16, PT = 12, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;
  const maxVal = Math.max(...data.map(d => Math.max(d.submitted, d.approved)), 1);

  const px = (i) => PL + (i / (data.length - 1)) * cw;
  const py = (v) => PT + (1 - v / maxVal) * ch;

  const smooth = (key) => {
    const pts = data.map((d, i) => ({ x: px(i), y: py(d[key]) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx1 = (pts[i - 1].x + pts[i].x) / 2, cy1 = pts[i - 1].y;
      const cx2 = cx1, cy2 = pts[i].y;
      d += ` C ${cx1} ${cy1} ${cx2} ${cy2} ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  const yLabels = [0, Math.round(maxVal / 2), maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {yLabels.map(v => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} stroke="#e9ecef" strokeWidth="1" />
          <text x={PL - 6} y={py(v) + 4} textAnchor="end" fontSize="9" fill="#adb5bd">{v}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#adb5bd">{d.label}</text>
      ))}
      <path d={smooth('submitted')} fill="none" stroke="#da7979" strokeWidth="2.5" strokeLinecap="round" />
      <path d={smooth('approved')} fill="none" stroke="#cb2525" strokeWidth="2.5" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.submitted)} r="4" fill="#fff" stroke="#da7979" strokeWidth="2" />
          <circle cx={px(i)} cy={py(d.approved)} r="4" fill="#fff" stroke="#cb2525" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}

export default function OverviewPage({ room, profile }) {
  const [stats, setStats] = useState({ employees: 0, submitted: 0, approved: 0, pending: 0 });
  const [employees, setEmployees] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!room || !supabase) return;
    setLoading(true);

    /* Members */
    const { data: members } = await supabase
      .from('room_members')
      .select('*, profiles(*)')
      .eq('room_id', room.id)
      .eq('role', 'employee');

    /* Tasks */
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, profiles(*)')
      .eq('room_id', room.id);

    const approved = tasks?.filter(t => t.status === 'approved').length ?? 0;
    const pending  = tasks?.filter(t => t.status === 'pending').length ?? 0;

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

    const ranked = Object.values(rankMap)
      .sort((a, b) => b.approved - a.approved)
      .slice(0, 5);
    setEmployees(ranked);

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

  const statCards = [
    { label: 'Employees', value: stats.employees, icon: <Users size={20} />, change: null, color: '#3b82f6' },
    { label: 'Tasks Submitted', value: stats.submitted, icon: <ClipboardCheck size={20} />, change: null, color: '#8b5cf6' },
    { label: 'Approved', value: stats.approved, icon: <CheckCircle size={20} />, change: stats.submitted ? `${Math.round((stats.approved/stats.submitted)*100)}%` : '—', positive: true, color: '#10b981' },
    { label: 'Pending Review', value: stats.pending, icon: <Clock size={20} />, change: null, color: '#f59e0b' },
  ];

  const getInitials = (p) => p ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : '?';
  const getName = (p) => p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  const rate = (emp) => emp.submitted > 0 ? Math.round((emp.approved / emp.submitted) * 100) : 0;

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Stat Cards */}
      <div className={styles.statGrid}>
        {statCards.map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statCardTop}>
              <div>
                <p className={styles.statLabel}>{s.label}</p>
                <p className={styles.statValue}>{s.value.toLocaleString()}</p>
              </div>
              <div className={styles.statIcon} style={{ background: s.color + '18', color: s.color }}>
                {s.icon}
              </div>
            </div>
            {s.change && (
              <div className={`${styles.statChange} ${s.positive ? styles.positive : styles.negative}`}>
                <TrendingUp size={12} /> {s.change} approval rate
              </div>
            )}
            {!s.change && <div className={styles.statBottom}><span className={styles.viewLink}>View More</span></div>}
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Top Employees */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Top Employees</h3>
          </div>
          {employees.length === 0 ? (
            <div className={styles.emptyState}>No employee data yet</div>
          ) : (
            <div className={styles.employeeTable}>
              {employees.map((emp, i) => (
                <div key={i} className={styles.empRow}>
                  <div className={styles.empRank}>{i + 1}</div>
                  <div className={styles.empAvatar}>{getInitials(emp.profile)}</div>
                  <div className={styles.empInfo}>
                    <span className={styles.empName}>{getName(emp.profile)}</span>
                  </div>
                  <div className={styles.empStat}>
                    <span className={styles.empStatVal}>{emp.submitted}</span>
                    <span className={styles.empStatLbl}>Submitted</span>
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

        {/* Room Stats Card */}
        <div className={`${styles.card} ${styles.roomStatsCard}`}>
          <h3 className={styles.cardTitle} style={{ color: '#fff' }}>Room Progress</h3>
          <div className={styles.bigPercent}>
            {stats.submitted > 0 ? Math.round((stats.approved / stats.submitted) * 100) : 0}%
          </div>
          <p className={styles.bigPercentLabel}>Tasks Approved</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${stats.submitted > 0 ? (stats.approved / stats.submitted) * 100 : 0}%` }}
            />
          </div>
          <div className={styles.roomStatRow}>
            <div className={styles.roomStat}>
              <strong>{stats.pending}</strong>
              <span>Pending</span>
            </div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}>
              <strong>{stats.employees}</strong>
              <span>Members</span>
            </div>
            <div className={styles.roomStatDivider} />
            <div className={styles.roomStat}>
              <strong>{stats.approved}</strong>
              <span>Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.card} style={{ marginTop: 0 }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Task Activity (Last 6 Months)</h3>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#da7979' }} /> Submitted
            <span className={styles.legendDot} style={{ background: '#cb2525', marginLeft: 12 }} /> Approved
          </div>
        </div>
        <LineChart data={chartData} />
      </div>
    </div>
  );
}
