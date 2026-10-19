import { useState, useEffect } from 'react';
import { Copy, Check, Loader, Share2, ShieldCheck, ImageIcon, Phone } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

export default function RoomSettingsPage({ room }) {
  const [reqs, setReqs] = useState({ avatar: !!room?.require_avatar, mobile: !!room?.require_mobile });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  /* Requirements may have been changed from another session, so read the fresh values */
  useEffect(() => {
    if (!room || !supabase) return;
    supabase.from('rooms').select('require_avatar, require_mobile').eq('id', room.id).single()
      .then(({ data }) => {
        if (data) setReqs({ avatar: !!data.require_avatar, mobile: !!data.require_mobile });
        setLoading(false);
      });
  }, [room]);

  const toggle = async (key) => {
    const prev = reqs;
    const next = { ...reqs, [key]: !reqs[key] };
    setReqs(next); setSaving(true); setError(''); setSaved(false);
    const { error: err } = await supabase.rpc('set_room_requirements', {
      p_room: room.id, p_avatar: next.avatar, p_mobile: next.mobile,
    });
    if (err) { setReqs(prev); setError(err.message); }
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>Room Settings</p>
          <p className={styles.pageSubtitle}>Manage how people can join <strong>{room.name}</strong>.</p>
        </div>
      </div>

      <div className={`${styles.card} ${styles.roomCodeCard}`}>
        <div className={styles.roomCodeInfo}>
          <h3 className={styles.roomCodeTitle}><Share2 size={15} /> Room ID</h3>
          <p className={styles.roomCodeDesc}>People enter this code to request access to {room.name}.</p>
        </div>
        <div className={styles.roomCodeRight}>
          <span className={styles.roomCodeText}>{room.room_code}</span>
          <button className={`${styles.copyCodeBtn} ${copied ? styles.copyDone : ''}`} onClick={copyCode}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}><ShieldCheck size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />Join requirements</h3>
          {saving && <Loader size={14} className={styles.spin} />}
          {saved && !saving && <span className={styles.memberCount}>Saved</span>}
        </div>
        <p className={styles.reqIntro}>
          Choose what new people need on their profile before they can request to join.
          Members already in the room are not affected. Changes save automatically.
        </p>
        <div className={styles.reqList}>
          <label className={`${styles.reqRow} ${reqs.avatar ? styles.reqRowOn : ''}`}>
            <input type="checkbox" checked={reqs.avatar} onChange={() => toggle('avatar')} disabled={saving} />
            <ImageIcon size={16} /> <span>Only accept users with a profile picture</span>
          </label>
          <label className={`${styles.reqRow} ${reqs.mobile ? styles.reqRowOn : ''}`}>
            <input type="checkbox" checked={reqs.mobile} onChange={() => toggle('mobile')} disabled={saving} />
            <Phone size={16} /> <span>Only accept users with a mobile number</span>
          </label>
        </div>
        {error && <p className={styles.formError} role="alert">{error}</p>}
      </div>
    </div>
  );
}
