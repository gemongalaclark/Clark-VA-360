import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OverviewPage from './owner/OverviewPage';
import CreateTaskPage from './owner/CreateTaskPage';
import ReviewPage from './owner/ReviewPage';
import MembersPage from './owner/MembersPage';
import RoomSettingsPage from './owner/RoomSettingsPage';
import EmpOverviewPage from './employee/EmpOverviewPage';
import TaskPage from './employee/TaskPage';
import styles from './Dashboard.module.css';

export default function Dashboard({ profile, room, role, session, onSignOut, onSwitchRoom, onLeaveRoom }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  /* Task picked in the top-bar search; `n` makes picking the same task again re-open it */
  const [focusTask, setFocusTask] = useState(null);

  const openTask = (id) => {
    setFocusTask(prev => ({ id, n: (prev?.n ?? 0) + 1 }));
    setCurrentTab(role === 'owner' ? 'review' : 'tasks');
  };

  const renderContent = () => {
    if (role === 'owner') {
      if (currentTab === 'overview') return <OverviewPage room={room} profile={profile} onNavigate={setCurrentTab} />;
      if (currentTab === 'create')   return <CreateTaskPage room={room} profile={profile} onNavigate={setCurrentTab} />;
      if (currentTab === 'review')   return <ReviewPage room={room} profile={profile} focusTask={focusTask} />;
      if (currentTab === 'members')  return <MembersPage room={room} profile={profile} />;
      if (currentTab === 'settings') return <RoomSettingsPage room={room} />;
    }
    if (role === 'employee') {
      if (currentTab === 'overview') return <EmpOverviewPage room={room} profile={profile} onNavigate={setCurrentTab} />;
      if (currentTab === 'tasks')    return <TaskPage room={room} profile={profile} focusTask={focusTask} />;
    }
    return null;
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        role={role}
        currentTab={currentTab}
        setTab={setCurrentTab}
        room={room}
        profile={profile}
        onSignOut={onSignOut}
        onSwitchRoom={onSwitchRoom}
        onLeaveRoom={onLeaveRoom}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <div className={`${styles.main} ${collapsed ? styles.mainExpanded : ''}`}>
        <TopBar
          currentTab={currentTab}
          profile={profile}
          session={session}
          room={room}
          role={role}
          onOpenTask={openTask}
        />
        <div className={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
