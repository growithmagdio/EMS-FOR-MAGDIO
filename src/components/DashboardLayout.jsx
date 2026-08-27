import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  LogOut, 
  Users, 
  CalendarDays,
  Folder,
  CheckSquare,
  Building2,
  Receipt,
  Wallet,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const employeeLinks = [
    { to: "/employee/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employee/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/employee/projects", icon: Folder, label: "Projects" },
    { to: "/employee/reports", icon: FileText, label: "My Reports" },
    { to: "/employee/requests", icon: Send, label: "Requests (Leave/WFH)" },
    { to: "/employee/chat", icon: MessageSquare, label: "Team Chat" }
  ];

  const adminLinks = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/projects", icon: Folder, label: "Projects" },
    { to: "/admin/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/admin/invoices", icon: Receipt, label: "Invoices" },
    { to: "/admin/accounts", icon: Wallet, label: "Accounts Management" },
    { to: "/admin/reports", icon: FileText, label: "Today's Reports" },
    { to: "/admin/employees", icon: Users, label: "Employees" },
    { to: "/admin/clients", icon: Building2, label: "Clients" },
    { to: "/admin/leaves", icon: CalendarDays, label: "Leave & WFH" },
    { to: "/admin/chat", icon: MessageSquare, label: "Team Chat" }
  ];



  const links = userData?.role === 'Admin' ? adminLinks : employeeLinks;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 shrink-0 bg-[#0b0e1b]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MAGDIO" className="h-9 object-contain" />
          </div>
          <button 
            onClick={closeMobileMenu}
            className="lg:hidden p-2 text-gray-400 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full relative">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {userData?.role === 'Admin' ? 'Admin Portal' : 'Employee Portal'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
              <p className="text-xs text-gray-500">{userData?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
