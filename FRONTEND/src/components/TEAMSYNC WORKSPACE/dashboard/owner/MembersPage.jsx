import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Shield, Copy, Check, Loader, Users, Clock, Share2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { getInitials, getName } from '../StatusBadge';
import styles from '../SharedPages.module.css';

export default function MembersPage({ room, profile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!room || !supabase) return;
    if (!silent) setLoading(true);
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
        () => load(true))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, load]);

  const handleAccept = async (memberId) => {
    setActionId(memberId);
    await supabase.from('room_members').update({ role: 'employee' }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'employee' } : m));
    setActionId(null);
  };

  const handleKick = async (memberId) => {
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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const pending = members.filter(m => m.role === 'pending');
  const active  = members.filter(m => m.role === 'employee');
  const owners  = members.filter(m => m.role === 'owner');

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>Members</p>
          <p className={styles.pageSubtitle}>Invite people, approve join requests and manage roles in <strong>{room.name}</strong>.</p>
        </div>
        <div className={styles.summaryChips}>
          <span className={styles.summaryChip}><Users size={14} /> {active.length + owners.length} members</span>
          <span className={`${styles.summaryChip} ${pending.length ? styles.summaryChipWarn : ''}`}>
            <Clock size={14} /> {pending.length} pending
          </span>
        </div>
      </div>

      {/* Invite card */}
      <div className={`${styles.card} ${styles.roomCodeCard}`}>
        <div className={styles.roomCodeInfo}>
          <h3 className={styles.roomCodeTitle}><Share2 size={15} /> Invite with Room ID</h3>
          <p className={styles.roomCodeDesc}>Share this code. New members request access, and you approve them below.</p>
        </div>
        <div className={styles.roomCodeRight}>
          <span className={styles.roomCodeText}>{room.room_code}</span>
          <button className={`${styles.copyCodeBtn} ${copied ? styles.copyDone : ''}`} onClick={copyCode}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className={`${styles.card} ${styles.attentionCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              Join Requests
              <span className={styles.pendingBadge}>{pending.length}</span>
            </h3>
            <span className={styles.memberCount}>Needs your decision</span>
          </div>
          <div className={styles.memberList}>
            {pending.map(m => (
              <div key={m.id} className={styles.memberRow}>
                <div className={`${styles.miniAvatar} ${styles.avatarMuted}`}>{getInitials(m.profiles)}</div>
                <div className={styles.memberInfo}>
                  <p className={styles.memberName}>{getName(m.profiles)}</p>
                  <p className={styles.memberEmail}>{m.profiles?.email}</p>
                </div>
                <span className={styles.memberDate}>Requested {formatDate(m.joined_at)}</span>
                <div className={styles.memberActions}>
                  <button className={styles.acceptMemberBtn} onClick={() => handleAccept(m.id)} disabled={actionId === m.id}>
                    {actionId === m.id ? <Loader size={14} className={styles.spin} /> : <UserCheck size={14} />} Accept
                  </button>
                  <button className={styles.kickMemberBtn} onClick={() => handleKick(m.id)} disabled={actionId === m.id}>
                    <UserX size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Active Members</h3>
          <span className={styles.memberCount}>{active.length + owners.length} total</span>
        </div>
        <div className={styles.memberList}>
          {owners.map(m => (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.miniAvatar}>{getInitials(m.profiles)}</div>
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>
                  {getName(m.profiles)} {m.user_id === profile?.id && <span className={styles.youTag}>You</span>}
                </p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
              </div>
              <span className={styles.memberDate}>Since {formatDate(m.joined_at)}</span>
              <span className={styles.ownerBadgeTag}><Shield size={11} /> Owner</span>
            </div>
          ))}

          {active.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🤝</span>
              <span className={styles.emptyText}>No employees yet</span>
              <span className={styles.emptySubtext}>Share the Room ID above to invite your team</span>
            </div>
          )}

          {active.map(m => (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.miniAvatar}>{getInitials(m.profiles)}</div>
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>{getName(m.profiles)}</p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
              </div>
              <span className={styles.memberDate}>Joined {formatDate(m.joined_at)}</span>
              <span className={styles.employeeBadgeTag}>Employee</span>
              <div className={styles.memberActions}>
                <button className={styles.promoteBtn} onClick={() => handlePromote(m.id)} disabled={actionId === m.id} title="Promote to Owner">
                  {actionId === m.id ? <Loader size={13} className={styles.spin} /> : <Shield size={13} />} Promote
                </button>
                <button className={styles.kickMemberBtn} onClick={() => handleKick(m.id)} disabled={actionId === m.id}>
                  <UserX size={13} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
