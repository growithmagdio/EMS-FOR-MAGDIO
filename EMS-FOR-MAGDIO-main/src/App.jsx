import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Chat from './components/Chat';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import PublicProjectStatus from './pages/PublicProjectStatus';
import PublicInvoiceView from './pages/PublicInvoiceView';

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyReports from './pages/employee/MyReports';
import Requests from './pages/employee/Requests';
import EmployeeProjects from './pages/employee/EmployeeProjects';
import EmployeeTasks from './pages/employee/EmployeeTasks';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import TodaysReports from './pages/admin/TodaysReports';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import LeaveManagement from './pages/admin/LeaveManagement';
import ProjectManagement from './pages/admin/ProjectManagement';
import TaskManagement from './pages/admin/TaskManagement';
import ClientManagement from './pages/admin/ClientManagement';
import InvoiceManagement from './pages/admin/InvoiceManagement';
import AccountsManagement from './pages/admin/AccountsManagement';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/status/:projectId" element={<PublicProjectStatus />} />
        <Route path="/invoice/:invoiceId" element={<PublicInvoiceView />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Protected Employee Routes */}
        <Route 
          path="/employee" 
          element={
            <ProtectedRoute allowedRoles={['Employee']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="requests" element={<Requests />} />
          <Route path="projects" element={<EmployeeProjects />} />
          <Route path="tasks" element={<EmployeeTasks />} />
          <Route path="chat" element={<Chat />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="invoices" element={<InvoiceManagement />} />
          <Route path="accounts" element={<AccountsManagement />} />
          <Route path="reports" element={<TodaysReports />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="clients" element={<ClientManagement />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="chat" element={<Chat />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;


