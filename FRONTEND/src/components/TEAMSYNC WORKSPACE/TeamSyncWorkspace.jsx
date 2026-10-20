import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import RoomSelectionPage from './pages/RoomSelectionPage';
import WaitingPage from './pages/WaitingPage';
import Dashboard from './dashboard/Dashboard';
import styles from './TeamSyncWorkspace.module.css';

export default function TeamSyncWorkspace({ onBackToPortfolio }) {
  const [page, setPage] = useState('loading');
  const [authMode, setAuthMode] = useState('login');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const pageRef = useRef('loading');
  const userIdRef = useRef(null);

  /* Keep ref in sync so auth listener always sees current page */
  useEffect(() => { pageRef.current = page; }, [page]);

  /* TeamSync branding in the browser tab; restore the portfolio's on exit */
  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"]');
    const prevIcon = icon?.getAttribute('href');
    const prevTitle = document.title;
    icon?.setAttribute('href', '/images/teamsync/teamsync-icon.png');
    document.title = 'TeamSync Workspace';
    return () => {
      if (icon && prevIcon) icon.setAttribute('href', prevIcon);
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (!supabase) { setPage('landing'); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        loadUserData(session.user);
      } else {
        setPage('landing');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      /* Never interrupt an in-progress OTP auth flow */
      if (pageRef.current === 'auth') return;
      /* Token refresh, or a repeat SIGNED_IN for the same user (supabase re-emits it on tab focus),
         must not reload data or swap object identities — that restarts every page's effects */
      const sameUser = !!session && userIdRef.current === session.user.id;
      if (event === 'TOKEN_REFRESHED' || (event === 'SIGNED_IN' && sameUser)) {
        setSession(prev => (prev?.access_token === session?.access_token ? prev : session));
        return;
      }
      setSession(session);
      if (session) {
        loadUserData(session.user);
      } else {
        userIdRef.current = null;
        setPage('landing');
        setProfile(null);
        setCurrentRoom(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (user) => {
    userIdRef.current = user.id;
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();

    /* Keep the same object when nothing changed so dependants don't re-run */
    if (prof) setProfile(prev => (prev && JSON.stringify(prev) === JSON.stringify(prof) ? prev : prof));

    const { data: memberships } = await supabase
      .from('room_members')
      .select('*, rooms(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (memberships?.length) {
      const active = memberships.find(m => m.role === 'owner' || m.role === 'employee');
      const pending = memberships.find(m => m.role === 'pending');

      if (active) {
        /* Stable references — only update state when the value actually changed */
        setCurrentRoom(prev => prev?.id === active.rooms?.id ? prev : active.rooms);
        setUserRole(prev => prev === active.role ? prev : active.role);
        /* Don't redirect if user intentionally navigated to room-select or is already on dashboard */
        if (!['dashboard', 'room-select'].includes(pageRef.current)) setPage('dashboard');
      } else if (pending) {
        setCurrentRoom(prev => prev?.id === pending.rooms?.id ? prev : pending.rooms);
        if (pageRef.current !== 'waiting') setPage('waiting');
      } else {
        setPage(prof ? 'room-select' : 'landing');
      }
    } else {
      setPage(prof ? 'room-select' : 'landing');
    }
  };

  /* Listen for acceptance while on waiting page */
  useEffect(() => {
    if (page !== 'waiting' || !session) return;

    const channel = supabase
      .channel('ts-member-acceptance')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_members',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        if (payload.new.role === 'employee') {
          setUserRole('employee');
          setPage('dashboard');
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [page, session]);

  const handleSignOut = async () => {
    userIdRef.current = null;
    await supabase?.auth.signOut();
    setPage('landing');
    setProfile(null);
    setCurrentRoom(null);
    setUserRole(null);
  };

  const handleProfileCreated = async (prof) => {
    setProfile(prof);
    /* Re-check memberships after profile creation */
    const { data: memberships } = await supabase
      .from('room_members').select('*, rooms(*)').eq('user_id', prof.id);
    if (memberships?.length) {
      const active = memberships.find(m => m.role === 'owner' || m.role === 'employee');
      if (active) { setCurrentRoom(active.rooms); setUserRole(active.role); setPage('dashboard'); return; }
    }
    setPage('room-select');
  };

  const handleRoomJoined = (room, role) => {
    setCurrentRoom(room);
    setUserRole(role);
    setPage(role === 'pending' ? 'waiting' : 'dashboard');
  };

  /* Navigate to room-select without deleting membership (user can re-enter from their rooms list) */
  const handleSwitchRoom = () => {
    setPage('room-select');
  };

  /* Truly leave a room — deletes the membership row */
  const handleLeaveRoom = async (roomId) => {
    const targetRoom = roomId ?? currentRoom?.id;
    if (!session || !targetRoom) return;
    await supabase.from('room_members')
      .delete()
      .eq('user_id', session.user.id)
      .eq('room_id', targetRoom);
    if (!roomId || roomId === currentRoom?.id) {
      setCurrentRoom(null);
      setUserRole(null);
    }
    setPage('room-select');
  };

  if (page === 'loading') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>TeamSync Workspace</span>
      </div>
    );
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onSignIn={() => { setAuthMode('login'); setPage('auth'); }}
        onSignUp={() => { setAuthMode('signup'); setPage('auth'); }}
        onBackToPortfolio={onBackToPortfolio}
      />
    );
  }

  if (page === 'auth') {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onSuccess={handleProfileCreated}
        onBack={() => setPage('landing')}
      />
    );
  }

  if (page === 'room-select') {
    return (
      <RoomSelectionPage
        profile={profile}
        session={session}
        onRoomJoined={handleRoomJoined}
        onLeaveRoom={handleLeaveRoom}
        onSignOut={handleSignOut}
        onProfileUpdated={setProfile}
      />
    );
  }

  if (page === 'waiting') {
    return <WaitingPage profile={profile} room={currentRoom} onSignOut={handleSignOut} />;
  }

  if (page === 'dashboard') {
    return (
      <Dashboard
        profile={profile}
        room={currentRoom}
        role={userRole}
        session={session}
        onSignOut={handleSignOut}
        onSwitchRoom={handleSwitchRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return null;
}
