import { useState, useEffect, useRef } from 'react';
import { Bell, Search, ChevronDown, LayoutDashboard, ClipboardCheck, Users, ListTodo, Check, Pencil, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './TopBar.module.css';

const PAGE_TITLES = {
  overview: 'Overview',
  create: 'Create Task',
  review: 'Task Review',
  members: 'Members',
  tasks: 'My Tasks',
};

const NOTIF_VISIBLE = 5;   // newest notifications shown in the dropdown; older ones are archived
const NOTIF_FETCH = 50;    // how many we load in total

export default function TopBar({ currentTab, profile, session, room }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const notifsRef = useRef(null);
  const profileRef = useRef(null);

  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : 'U';
  const unread = notifications.filter(n => !n.read).length;
  const recent = notifications.slice(0, NOTIF_VISIBLE);
  const archived = notifications.slice(NOTIF_VISIBLE);
  const visible = showArchive ? archived : recent;
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId || !supabase) return;
    loadNotifications();

    const channel = supabase
      .channel('ts-notifs-topbar')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(NOTIF_FETCH);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    if (!unread) return;
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handle = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const formatTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const notifIcon = (type) => {
    if (type === 'task_assigned') return <ListTodo size={14} />;
    if (type === 'task_submitted') return <ClipboardCheck size={14} />;
    if (type === 'task_approved') return <Check size={14} style={{ color: '#28a745' }} />;
    if (type === 'task_rejected') return <ClipboardCheck size={14} style={{ color: '#cb2525' }} />;
    if (type === 'task_deadline') return <Clock size={14} style={{ color: '#d97706' }} />;
    if (type === 'task_updated') return <Pencil size={14} />;
    if (type === 'member_request') return <Users size={14} />;
    if (type === 'member_accepted') return <Check size={14} style={{ color: '#28a745' }} />;
    return <Bell size={14} />;
  };

  return (
    <header className={styles.topbar}>
      <h1 className={styles.pageTitle}>{PAGE_TITLES[currentTab] ?? 'Dashboard'}</h1>

      <div className={styles.right}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input type="text" className={styles.searchInput} placeholder="Search…" />
        </div>

        {/* Notifications */}
        <div className={styles.bellWrap} ref={notifsRef}>
          <button className={styles.bellBtn} onClick={() => {
            const opening = !showNotifs;
            setShowNotifs(opening);
            if (opening) setShowArchive(false);
            if (opening && unread > 0) markAllRead();
          }}>
            <Bell size={18} />
            {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
          </button>

          {showNotifs && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span>{showArchive ? 'Archived' : 'Notifications'}</span>
                {showArchive && (
                  <button className={styles.markReadBtn} onClick={() => setShowArchive(false)}>Back</button>
                )}
              </div>
              <div className={styles.notifList}>
                {visible.length === 0 ? (
                  <div className={styles.emptyNotifs}>{showArchive ? 'No archived notifications' : 'No notifications yet'}</div>
                ) : visible.map(n => (
                  <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ''}`}>
                    <div className={styles.notifIcon}>{notifIcon(n.type)}</div>
                    <div className={styles.notifBody}>
                      <p className={styles.notifMsg}>{n.message}</p>
                      <span className={styles.notifTime}>{formatTime(n.created_at)}</span>
                    </div>
                    {!n.read && <div className={styles.unreadDot} />}
                  </div>
                ))}
              </div>
              {!showArchive && archived.length > 0 && (
                <button className={styles.archiveBtn} onClick={() => setShowArchive(true)}>
                  View archived ({archived.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={styles.profileBtn} onClick={() => setShowProfile(v => !v)}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.profileName}>{profile?.first_name ?? 'User'} {profile?.last_name ?? ''}</span>
            <ChevronDown size={14} />
          </button>

          {showProfile && (
            <div className={styles.profileDropdown}>
              <div className={styles.profileInfo}>
                <div className={styles.profileAvatar}>{initials}</div>
                <div>
                  <p className={styles.profileFullName}>{profile?.first_name} {profile?.last_name}</p>
                  <p className={styles.profileEmail}>{profile?.email}</p>
                </div>
              </div>
              {room && (
                <div className={styles.profileRoomRow}>
                  <span className={styles.profileRoomLabel}>Room</span>
                  <span className={styles.profileRoomCode}>{room.room_code}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
