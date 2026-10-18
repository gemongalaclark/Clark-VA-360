import { useState, useEffect } from 'react';
import { Plus, Hash, ArrowRight, Copy, Check, Loader, X, LogOut, LogIn, Crown, User, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './RoomSelectionPage.module.css';

export default function RoomSelectionPage({ profile, session, onRoomJoined, onLeaveRoom, onSignOut }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [myRooms, setMyRooms] = useState([]);
  const [leavingId, setLeavingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  useEffect(() => {
    if (!profile || !supabase) return;
    supabase
      .from('room_members')
      .select('role, joined_at, rooms(id, name, room_code)')
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false })
      .then(({ data }) => setMyRooms(data ?? []));
  }, [profile]);

  const handleLeaveThisRoom = async (roomId) => {
    setLeavingId(roomId);
    await onLeaveRoom(roomId);
    setMyRooms(prev => prev.filter(m => m.rooms?.id !== roomId));
    setLeavingId(null);
    setConfirmId(null);
  };

  const copyRoomCode = async (room) => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopiedRoomId(room.id);
      setTimeout(() => setCopiedRoomId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

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
    <div className={styles.shell}>
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

            {/* Your Rooms */}
            {myRooms.length > 0 && (
              <section className={styles.yourRooms} aria-labelledby="your-rooms-title">
                <div className={styles.yourRoomsHead}>
                  <h3 className={styles.yourRoomsTitle} id="your-rooms-title">Your Rooms</h3>
                  <span className={styles.yourRoomsCount}>{myRooms.length}</span>
                </div>
                <ul className={styles.roomList}>
                  {myRooms.map((m) => {
                    const room = m.rooms;
                    if (!room) return null;
                    const isPending = m.role === 'pending';
                    const isOwner = m.role === 'owner';
                    const confirming = confirmId === room.id;
                    const leaving = leavingId === room.id;
                    const RoleIcon = isOwner ? Crown : isPending ? Clock : User;
                    const roleLabel = isOwner ? 'Owner' : isPending ? 'Pending' : 'Employee';
                    const roleCls = isOwner ? styles.roleOwner : isPending ? styles.rolePending : styles.roleEmployee;
                    return (
                      <li
                        key={room.id}
                        className={`${styles.roomListItem} ${isPending ? styles.roomPending : ''} ${confirming ? styles.roomConfirming : ''}`}
                      >
                        <div className={`${styles.roomListAvatar} ${isOwner ? styles.avatarOwner : isPending ? styles.avatarPending : ''}`}>
                          {room.name.slice(0, 2).toUpperCase()}
                        </div>

                        {confirming ? (
                          <>
                            <div className={styles.confirmText}>
                              <strong>Leave {room.name}?</strong>
                              <span>{isOwner ? 'You are the owner — members may lose access.' : 'You will need the Room ID to rejoin.'}</span>
                            </div>
                            <div className={styles.roomListRight}>
                              <button className={styles.confirmCancel} onClick={() => setConfirmId(null)} disabled={leaving}>Cancel</button>
                              <button className={styles.confirmLeave} onClick={() => handleLeaveThisRoom(room.id)} disabled={leaving}>
                                {leaving && <Loader size={13} className={styles.spin} />} Leave
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.roomListInfo}>
                              <span className={styles.roomListName}>{room.name}</span>
                              <div className={styles.roomMeta}>
                                <button
                                  className={styles.codeChip}
                                  onClick={() => copyRoomCode(room)}
                                  title="Copy Room ID"
                                  aria-label={`Copy Room ID ${room.room_code}`}
                                >
                                  <Hash size={11} />{room.room_code}
                                  {copiedRoomId === room.id ? <Check size={12} className={styles.copiedIcon} /> : <Copy size={12} />}
                                </button>
                                {isPending && <span className={styles.pendingNote}>Awaiting owner approval</span>}
                              </div>
                            </div>
                            <div className={styles.roomListRight}>
                              <span className={`${styles.roleBadge} ${roleCls}`}>
                                <RoleIcon size={12} strokeWidth={2.4} /> {roleLabel}
                              </span>
                              <button
                                className={`${styles.enterBtn} ${isPending ? styles.enterGhost : ''}`}
                                onClick={() => onRoomJoined(room, m.role)}
                              >
                                {isPending ? <Clock size={14} /> : <LogIn size={14} />}
                                {isPending ? 'Check status' : 'Enter'}
                              </button>
                              <button
                                className={styles.roomLeaveBtn}
                                onClick={() => setConfirmId(room.id)}
                                title="Leave room"
                                aria-label={`Leave ${room.name}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
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
    </div>
  );
}
