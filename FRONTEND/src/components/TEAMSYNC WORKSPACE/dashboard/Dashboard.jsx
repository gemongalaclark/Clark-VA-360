import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OverviewPage from './owner/OverviewPage';
import ReviewPage from './owner/ReviewPage';
import MembersPage from './owner/MembersPage';
import EmpOverviewPage from './employee/EmpOverviewPage';
import TaskPage from './employee/TaskPage';
import styles from './Dashboard.module.css';

export default function Dashboard({ profile, room, role, session, onSignOut, onLeaveRoom }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);

  const renderContent = () => {
    if (role === 'owner') {
      if (currentTab === 'overview') return <OverviewPage room={room} profile={profile} />;
      if (currentTab === 'review')   return <ReviewPage room={room} profile={profile} />;
      if (currentTab === 'members')  return <MembersPage room={room} profile={profile} />;
    }
    if (role === 'employee') {
      if (currentTab === 'overview') return <EmpOverviewPage room={room} profile={profile} />;
      if (currentTab === 'tasks')    return <TaskPage room={room} profile={profile} />;
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
        />
        <div className={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
