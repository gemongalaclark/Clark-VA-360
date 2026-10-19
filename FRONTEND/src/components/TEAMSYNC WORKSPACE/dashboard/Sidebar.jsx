import { useState } from 'react';
import { LayoutDashboard, ClipboardCheck, ClipboardPlus, Users, Settings, ListTodo, Hash, LogOut, ChevronLeft, ChevronRight, ArrowLeftRight, Crown, User, Copy, Check } from 'lucide-react';
import styles from './Sidebar.module.css';
import Avatar from '../profile/Avatar';

const ownerNav = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={18} /> },
  { id: 'create',    label: 'Create Task', icon: <ClipboardPlus size={18} /> },
  { id: 'review',    label: 'Review',    icon: <ClipboardCheck size={18} /> },
  { id: 'members',   label: 'Members',   icon: <Users size={18} /> },
  { id: 'settings',  label: 'Room Settings', icon: <Settings size={18} /> },
];

const employeeNav = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={18} /> },
  { id: 'tasks',     label: 'My Tasks',  icon: <ListTodo size={18} /> },
];

export default function Sidebar({ role, currentTab, setTab, room, profile, onSignOut, onSwitchRoom, collapsed, setCollapsed }) {
  const [copied, setCopied] = useState(false);
  const isOwner = role === 'owner';
  const nav = isOwner ? ownerNav : employeeNav;
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';
  const roleLabel = isOwner ? 'Owner' : 'Employee';
  const RoleIcon = isOwner ? Crown : User;
  const roomInitials = room ? room.name.slice(0, 2).toUpperCase() : '';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${isOwner ? styles.owner : styles.employee}`}
      aria-label="Workspace navigation"
    >

      {/* ── Header: logo + collapse toggle ─────────────────── */}
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          data-tip={collapsed ? 'Expand' : undefined}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Role badge ─────────────────────────────────────── */}
      <div className={styles.roleStrip}>
        <span
          className={`${styles.roleTag} ${isOwner ? styles.ownerTag : styles.employeeTag}`}
          data-tip={collapsed ? roleLabel : undefined}
        >
          <RoleIcon size={12} strokeWidth={2.4} />
          {!collapsed && roleLabel}
        </span>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <div className={styles.navSection}>
        {!collapsed && <p className={styles.sectionLabel}>Navigation</p>}
        <nav className={styles.nav}>
          {nav.map(item => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                onClick={() => setTab(item.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                data-tip={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={styles.spacer} />

      {/* ── Room card (expanded) ───────────────────────────── */}
      {!collapsed && room && (
        <div className={styles.roomSection}>
          <p className={styles.sectionLabel}>Current Room</p>
          <div className={styles.roomCard}>
            <div className={styles.roomCardRow}>
              <div className={styles.roomCardAvatar}>{roomInitials}</div>
              <div className={styles.roomCardInfo}>
                <p className={styles.roomCardName} title={room.name}>{room.name}</p>
                <button className={styles.codeChip} onClick={copyCode} title="Copy room code">
                  <Hash size={10} />
                  <span className={styles.roomCardCode}>{room.room_code}</span>
                  {copied ? <Check size={11} className={styles.copiedIcon} /> : <Copy size={11} />}
                </button>
              </div>
            </div>
            <button className={styles.switchRoomBtn} onClick={onSwitchRoom}>
              <ArrowLeftRight size={13} /> Switch Room
            </button>
          </div>
        </div>
      )}

      {/* ── Collapsed: room + actions ──────────────────────── */}
      {collapsed && (
        <div className={styles.collapsedActions}>
          {room && (
            <div className={styles.collapsedRoom} data-tip={`${room.name} · #${room.room_code}`}>
              {roomInitials}
            </div>
          )}
          <button className={styles.collapsedActionBtn} onClick={onSwitchRoom} aria-label="Switch room" data-tip="Switch Room">
            <ArrowLeftRight size={16} />
          </button>
        </div>
      )}

      {/* ── User + sign out ────────────────────────────────── */}
      <div className={styles.userArea}>
        <Avatar profile={profile} className={styles.avatar} data-tip={collapsed ? `${fullName} · ${roleLabel}` : undefined} />
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{fullName}</span>
            <span className={styles.userEmail}>{profile?.email ?? ''}</span>
          </div>
        )}
        <button
          className={styles.signOutBtn}
          onClick={onSignOut}
          aria-label="Sign out"
          data-tip={collapsed ? 'Sign out' : undefined}
          title={collapsed ? undefined : 'Sign out'}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
