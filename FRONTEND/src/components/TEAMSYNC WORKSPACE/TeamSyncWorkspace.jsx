import { useState, useEffect } from 'react';
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
      setSession(session);
      if (session) {
        loadUserData(session.user);
      } else {
        setPage('landing');
        setProfile(null);
        setCurrentRoom(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (user) => {
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();

    if (prof) setProfile(prof);

    const { data: memberships } = await supabase
      .from('room_members')
      .select('*, rooms(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (memberships?.length) {
      const active = memberships.find(m => m.role === 'owner' || m.role === 'employee');
      const pending = memberships.find(m => m.role === 'pending');

      if (active) {
        setCurrentRoom(active.rooms);
        setUserRole(active.role);
        setPage('dashboard');
      } else if (pending) {
        setCurrentRoom(pending.rooms);
        setPage('waiting');
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

  const handleLeaveRoom = async () => {
    if (!session || !currentRoom) return;
    await supabase.from('room_members')
      .delete()
      .eq('user_id', session.user.id)
      .eq('room_id', currentRoom.id);
    setCurrentRoom(null);
    setUserRole(null);
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
        onRoomJoined={handleRoomJoined}
        onSignOut={handleSignOut}
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
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return null;
}
