
import ChildWindow from './ChildWindow';
import Sidebar from './Layout/Sidebar';
import Dashboard from './Board/Dashboard';
import { Layout } from '../App';



function DashboardWindow({ isOpen, onClose }: DashboardWindowProps) {
  if (!isOpen) return null;

  return (
    <ChildWindow title="Dashboard" width={1800} height={800} onClose={onClose}>
      <Layout>
        <Dashboard></Dashboard>
      </Layout>
    </ChildWindow>
  );
}

export default DashboardWindow;
