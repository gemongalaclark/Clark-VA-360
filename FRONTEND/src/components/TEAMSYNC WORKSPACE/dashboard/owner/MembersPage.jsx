import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Shield, Copy, Check, Loader, Users, Clock, Share2, Phone, Facebook } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { getName } from '../StatusBadge';
import Avatar from '../../profile/Avatar';
import styles from '../SharedPages.module.css';

/* Mobile + Facebook, when the member shared them */
function ContactLine({ p }) {
  if (!p?.mobile_number && !p?.facebook_url) return null;  // p = profile_contacts row (owners only)
  return (
    <p className={styles.memberContact}>
      {p.mobile_number && <a href={`tel:${p.mobile_number.replace(/[^\d+]/g, '')}`}><Phone size={11} /> {p.mobile_number}</a>}
      {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noopener noreferrer"><Facebook size={11} /> Facebook</a>}
    </p>
  );
}

export default function MembersPage({ room, profile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!room || !supabase) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('room_members')
      .select('*, profiles(*)')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: false });
    const rows = data ?? [];
    /* Mobile/Facebook live in a table only owners (and the user) can read */
    const ids = rows.map(m => m.user_id);
    const { data: contacts } = ids.length
      ? await supabase.from('profile_contacts').select('user_id, mobile_number, facebook_url').in('user_id', ids)
      : { data: [] };
    const byUser = Object.fromEntries((contacts ?? []).map(c => [c.user_id, c]));
    setMembers(rows.map(m => ({ ...m, contact: byUser[m.user_id] ?? null })));
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

  /* .select() lets us detect an RLS-blocked change (0 rows, no error) */
  const runAction = async (memberId, query, onDone) => {
    setActionId(memberId);
    setActionError('');
    const { data, error } = await query.eq('id', memberId).select('id');
    if (error || !data?.length) setActionError(error?.message ?? 'You don’t have permission to do that.');
    else onDone();
    setActionId(null);
  };

  const handleAccept = (memberId) =>
    runAction(memberId, supabase.from('room_members').update({ role: 'employee' }),
      () => setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'employee' } : m)));

  const handleKick = (memberId) => {
    if (!window.confirm('Remove this member from the room?')) return;
    return runAction(memberId, supabase.from('room_members').delete(),
      () => setMembers(prev => prev.filter(m => m.id !== memberId)));
  };

  const handlePromote = (memberId) => {
    if (!window.confirm('Promote this member to Room Owner? They will have full owner permissions.')) return;
    return runAction(memberId, supabase.from('room_members').update({ role: 'owner' }),
      () => setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'owner' } : m)));
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

      {actionError && <p className={styles.formError} role="alert">{actionError}</p>}

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
                <Avatar profile={m.profiles} className={`${styles.miniAvatar} ${styles.avatarMuted}`} />
                <div className={styles.memberInfo}>
                  <p className={styles.memberName}>{getName(m.profiles)}</p>
                  <p className={styles.memberEmail}>{m.profiles?.email}</p>
                  <ContactLine p={m.contact} />
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
              <Avatar profile={m.profiles} className={styles.miniAvatar} />
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>
                  {getName(m.profiles)} {m.user_id === profile?.id && <span className={styles.youTag}>You</span>}
                </p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
                <ContactLine p={m.contact} />
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
              <Avatar profile={m.profiles} className={styles.miniAvatar} />
              <div className={styles.memberInfo}>
                <p className={styles.memberName}>{getName(m.profiles)}</p>
                <p className={styles.memberEmail}>{m.profiles?.email}</p>
                <ContactLine p={m.contact} />
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
