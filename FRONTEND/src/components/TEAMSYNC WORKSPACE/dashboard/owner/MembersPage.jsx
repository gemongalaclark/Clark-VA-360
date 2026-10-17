import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Shield, Copy, Check, Loader } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

export default function MembersPage({ room, profile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!room || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('room_members')
      .select('*, profiles(*)')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: false });
    setMembers(data ?? []);
    setLoading(false);
  }, [room]);

  useEffect(() => { load(); }, [load]);

  /* Realtime */
  useEffect(() => {
    if (!room || !supabase) return;
    const channel = supabase
      .channel('ts-members-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${room.id}` },
        () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, load]);

  const handleAccept = async (memberId) => {
    setActionId(memberId);
    await supabase.from('room_members').update({ role: 'employee' }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'employee' } : m));
    setActionId(null);
  };

  const handleKick = async (memberId, userId) => {
    if (!window.confirm('Remove this member from the room?')) return;
    setActionId(memberId);
    await supabase.from('room_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setActionId(null);
  };

  const handlePromote = async (memberId) => {
    if (!window.confirm('Promote this member to Room Owner? They will have full owner permissions.')) return;
    setActionId(memberId);
    await supabase.from('room_members').update({ role: 'owner' }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'owner' } : m));
    setActionId(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (p) => p ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : '?';
  const getName = (p) => p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const pending  = members.filter(m => m.role === 'pending');
  const active   = members.filter(m => m.role === 'employee');
  const owners   = members.filter(m => m.role === 'owner');

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Room code share card */}
      <div className={`${styles.card} ${styles.roomCodeCard}`}>
        <div className={styles.roomCodeInfo}>
          <h3 className={styles.roomCodeTitle}>Room ID</h3>
          <p className={styles.roomCodeDesc}>Share this code with your employees so they can join the room.</p>
        </div>
        <div className={styles.roomCodeRight}>
          <span className={styles.roomCodeText}>{room.room_code}</span>
          <button className={styles.copyCodeBtn} onClick={copyCode}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              Pending Requests
              <span className={styles.pendingBadge}>{pending.length}</span>
            </h3>
          </div>
          <div className={styles.memberList}>
            {pending.map(m => (
              <div key={m.id} className={styles.memberRow}>
                <div className={styles.miniAvatar} style={{ background: '#6c757d' }}>{getInitials(m.profiles)}</div>
                <div className={styles.memberInfo}>
                  <p className={styles.memberName}>{getName(m.profiles)}</p>
                  <p className={styles.memberEmail}>{m.profiles?.email}</p>
                </div>
                <span className={styles.memberDate}>Requested {formatDate(m.joined_at)}</span>
                <span className={styles.pendingBadgeTag}>Pending</span>
                <div className={styles.memberActions}>
                  <button
                    className={styles.acceptMemberBtn}
                    onClick={() => handleAccept(m.id)}
                    disabled={actionId === m.id}
                  >
                    {actionId === m.id ? <Loader size={14} className={styles.spin} /> : <UserCheck size={14} />}
                    Accept
                  </button>
                  <button
                    className={styles.kickMemberBtn}
                    onClick={() => handleKick(m.id, m.user_id)}
                    disabled={actionId === m.id}
                  >
                    <UserX size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active employees */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Active Members</h3>
          <span className={styles.memberCount}>{active.length + owners.length} members</span>
        </div>
        <div className={styles.memberList}>
          {owners.map(m => (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.miniAvatar}>{getInitials(m.profiles)}</div>
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>{getName(m.profiles)} {m.user_id === profile?.id && '(You)'}</p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
              </div>
              <span className={styles.memberDate}>Since {formatDate(m.joined_at)}</span>
              <span className={styles.ownerBadgeTag}><Shield size={11} /> Owner</span>
            </div>
          ))}

          {active.length === 0 && owners.length === 0 ? (
            <div className={styles.emptyState}>No active members yet. Accept pending requests above.</div>
          ) : active.map(m => (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.miniAvatar}>{getInitials(m.profiles)}</div>
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>{getName(m.profiles)}</p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
              </div>
              <span className={styles.memberDate}>Joined {formatDate(m.joined_at)}</span>
              <span className={styles.employeeBadgeTag}>Employee</span>
              <div className={styles.memberActions}>
                <button
                  className={styles.promoteBtn}
                  onClick={() => handlePromote(m.id)}
                  disabled={actionId === m.id}
                  title="Promote to Owner"
                >
                  {actionId === m.id ? <Loader size={13} className={styles.spin} /> : <Shield size={13} />}
                  Promote
                </button>
                <button
                  className={styles.kickMemberBtn}
                  onClick={() => handleKick(m.id, m.user_id)}
                  disabled={actionId === m.id}
                >
                  <UserX size={13} /> Kick
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
