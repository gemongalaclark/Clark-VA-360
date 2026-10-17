import { LayoutDashboard, ClipboardCheck, Users, ListTodo, Hash, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function Sidebar({ role, currentTab, setTab, room, profile, onSignOut, onLeaveRoom, collapsed, setCollapsed }) {
  const nav = role === 'owner' ? ownerNav : employeeNav;
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : 'U';
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>TS</div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>TeamSync</span>
            <span className={styles.logoSub}>Workspace</span>
          </div>
        )}
        <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className={styles.roleBadge}>
          <span className={role === 'owner' ? styles.ownerBadge : styles.employeeBadge}>
            {role === 'owner' ? '⭐ Owner' : '👤 Employee'}
          </span>
        </div>
      )}

      {/* Nav */}
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
            {!collapsed && currentTab === item.id && <span className={styles.navActiveDot} />}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Room info card */}
      {!collapsed && room && (
        <div className={styles.roomCard}>
          <div className={styles.roomCardTop}>
            <Hash size={13} />
            <span className={styles.roomCardCode}>{room.room_code}</span>
          </div>
          <p className={styles.roomCardName}>{room.name}</p>
          {role === 'employee' && (
            <button className={styles.leaveBtn} onClick={onLeaveRoom}>Leave Room</button>
          )}
        </div>
      )}

      {/* User + sign out */}
      <div className={styles.userArea}>
        <div className={styles.avatar}>{initials}</div>
        {!collapsed && (
          <>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{fullName}</span>
              <span className={styles.userEmail}>{profile?.email ?? ''}</span>
            </div>
            <button className={styles.signOutBtn} onClick={onSignOut} title="Sign out">
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
