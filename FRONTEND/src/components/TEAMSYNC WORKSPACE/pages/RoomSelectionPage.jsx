import { useState } from 'react';
import { Plus, Hash, ArrowRight, Copy, Check, Loader, X, LogOut } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './RoomSelectionPage.module.css';

export default function RoomSelectionPage({ profile, onRoomJoined, onSignOut }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'there';
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : 'U';

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    if (!roomName.trim()) { setError('Please enter a room name.'); return; }
    setLoading(true);

    /* Generate room code */
    const { data: code, error: codeErr } = await supabase.rpc('generate_room_code');
    if (codeErr) { setError('Could not generate room code.'); setLoading(false); return; }

    /* Create room */
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({ name: roomName.trim(), room_code: code, owner_id: profile.id })
      .select()
      .single();

    if (roomErr) { setError(roomErr.message); setLoading(false); return; }

    /* Add owner as member */
    await supabase.from('room_members').insert({ room_id: room.id, user_id: profile.id, role: 'owner' });

    setCreatedRoom(room);
    setLoading(false);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setError('');
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 8) { setError('Room ID must be 8 characters.'); return; }
    setLoading(true);

    const { data: room, error: findErr } = await supabase
      .from('rooms').select('*').eq('room_code', code).single();

    if (findErr || !room) { setError('Room not found. Double-check the Room ID.'); setLoading(false); return; }

    /* Check if already a member */
    const { data: existing } = await supabase
      .from('room_members').select('role').eq('room_id', room.id).eq('user_id', profile.id).single();

    if (existing) {
      onRoomJoined(room, existing.role);
      return;
    }

    const { error: joinErr } = await supabase
      .from('room_members').insert({ room_id: room.id, user_id: profile.id, role: 'pending' });

    if (joinErr) { setError(joinErr.message); setLoading(false); return; }

    setLoading(false);
    onRoomJoined(room, 'pending');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdRoom.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>TS</span>
          <span className={styles.logoName}>TeamSync <span>Workspace</span></span>
        </div>
        <div className={styles.userRow}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.userName}>{fullName}</span>
          <button className={styles.signOutBtn} onClick={onSignOut} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Room created success */}
        {createdRoom ? (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2>Room Created!</h2>
            <p>Share this Room ID with your employees so they can join.</p>
            <div className={styles.roomCodeDisplay}>
              <span className={styles.roomCode}>{createdRoom.room_code}</span>
              <button className={styles.copyBtn} onClick={copyCode}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className={styles.roomNameLabel}><strong>{createdRoom.name}</strong></p>
            <button className={styles.btnPrimary} onClick={() => onRoomJoined(createdRoom, 'owner')}>
              Enter Dashboard <ArrowRight size={16} />
            </button>
          </div>
        ) : mode === null ? (
          /* Selection screen */
          <div className={styles.selectionWrap}>
            <h1 className={styles.headline}>Welcome, {profile?.first_name}! 👋</h1>
            <p className={styles.desc}>Are you creating a new workspace or joining an existing one?</p>
            <div className={styles.optionCards}>
              <button className={styles.optionCard} onClick={() => setMode('create')}>
                <div className={styles.optionIcon}><Plus size={28} /></div>
                <h3>Create a Room</h3>
                <p>Set up a new workspace. You'll be the owner and can manage your team.</p>
                <span className={styles.optionTag}>Owner</span>
              </button>
              <button className={styles.optionCard} onClick={() => setMode('join')}>
                <div className={`${styles.optionIcon} ${styles.optionIconSecondary}`}><Hash size={28} /></div>
                <h3>Join a Room</h3>
                <p>Enter a Room ID provided by your team owner to join their workspace.</p>
                <span className={styles.optionTagSecondary}>Employee</span>
              </button>
            </div>
          </div>
        ) : (
          /* Create / Join form */
          <div className={styles.formCard}>
            <button className={styles.backBtn} onClick={() => { setMode(null); setError(''); }}>
              <X size={16} />
            </button>
            <h2 className={styles.formTitle}>{mode === 'create' ? 'Create a Room' : 'Join a Room'}</h2>
            <p className={styles.formDesc}>
              {mode === 'create'
                ? 'Give your workspace a name and we\'ll generate a unique Room ID.'
                : 'Enter the 8-character Room ID shared by your team owner.'}
            </p>

            <form className={styles.form} onSubmit={mode === 'create' ? handleCreateRoom : handleJoinRoom}>
              {mode === 'create' ? (
                <div className={styles.formGroup}>
                  <label>Room Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Marketing Team, Project Alpha…"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    maxLength={60}
                    required
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label>Room ID</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.codeInput}`}
                    placeholder="XXXXXXXX"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    maxLength={8}
                    required
                  />
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading && <Loader size={16} className={styles.spin} />}
                {loading ? (mode === 'create' ? 'Creating…' : 'Joining…')
                         : (mode === 'create' ? 'Create Room' : 'Join Room')}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
