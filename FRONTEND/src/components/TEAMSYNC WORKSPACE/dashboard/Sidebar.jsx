import { LayoutDashboard, ClipboardCheck, Users, ListTodo, Hash, LogOut, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import styles from './Sidebar.module.css';

const ownerNav = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={18} /> },
  { id: 'review',    label: 'Review',    icon: <ClipboardCheck size={18} /> },
  { id: 'members',   label: 'Members',   icon: <Users size={18} /> },
];

const employeeNav = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={18} /> },
  { id: 'tasks',     label: 'My Tasks',  icon: <ListTodo size={18} /> },
];

export default function Sidebar({ role, currentTab, setTab, room, profile, onSignOut, onSwitchRoom, onLeaveRoom, collapsed, setCollapsed }) {
  const nav = role === 'owner' ? ownerNav : employeeNav;
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : 'U';
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

      {/* ── Header: logo + role tag ────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoMark}>TS</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>TeamSync</span>
              <span className={styles.logoSub}>Workspace</span>
            </div>
          )}
        </div>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Role tag strip */}
      {!collapsed && (
        <div className={styles.roleStrip}>
          <span className={role === 'owner' ? styles.ownerTag : styles.employeeTag}>
            {role === 'owner' ? '⭐ Owner' : '👤 Employee'}
          </span>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <div className={styles.navSection}>
        {!collapsed && <p className={styles.sectionLabel}>Navigation</p>}
        <nav className={styles.nav}>
          {nav.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${currentTab === item.id ? styles.navActive : ''}`}
              onClick={() => setTab(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.spacer} />

      {/* ── Collapsed: switch room ─────────────────────────── */}
      {collapsed && (
        <div className={styles.collapsedActions}>
          <button className={styles.collapsedActionBtn} onClick={onSwitchRoom} title="Switch Room">
            <ArrowLeft size={16} />
          </button>
          <button className={styles.collapsedActionBtn} onClick={onSignOut} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      )}

      {/* ── Room card (expanded) ───────────────────────────── */}
      {!collapsed && room && (
        <div className={styles.roomSection}>
          <p className={styles.sectionLabel}>Current Room</p>
          <div className={styles.roomCard}>
            <div className={styles.roomCardRow}>
              <div className={styles.roomCardAvatar}>
                {room.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.roomCardInfo}>
                <p className={styles.roomCardName}>{room.name}</p>
                <div className={styles.roomCardCodeRow}>
                  <Hash size={11} />
                  <span className={styles.roomCardCode}>{room.room_code}</span>
                </div>
              </div>
            </div>
            <button className={styles.switchRoomBtn} onClick={onSwitchRoom}>
              <ArrowLeft size={13} /> Switch Room
            </button>
          </div>
        </div>
      )}

      {/* ── User + sign out ────────────────────────────────── */}
      {!collapsed && (
        <div className={styles.userArea}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{fullName}</span>
            <span className={styles.userEmail}>{profile?.email ?? ''}</span>
          </div>
          <button className={styles.signOutBtn} onClick={onSignOut} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}
