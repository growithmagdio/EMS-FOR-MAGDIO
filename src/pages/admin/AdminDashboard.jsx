import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Users, FileText, CalendarDays, Home, CheckCircle, Clock, AlertCircle, Folder, CheckSquare, Receipt, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    reportsToday: 0,
    pendingReports: 0,
    leaveRequests: 0,
    wfhRequests: 0,
    avgCompletion: 0,
    totalHours: 0,
    activeProjects: 0,
    pendingTasks: 0,
    totalInvoiced: 0,
    totalRevenue: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      let totalEmployees = 0;
      let reportsToday = 0;
      let pendingReports = 0;
      let leaveRequests = 0;
      let wfhRequests = 0;
      let avgCompletion = 0;
      let totalHours = 0;
      let activeProjects = 0;
      let pendingTasks = 0;
      let totalInvoiced = 0;
      let totalRevenue = 0;
      let pendingInvoices = 0;

      // 1. Total Employees
      try {
        const empSnap = await getDocs(collection(db, 'users'));
        totalEmployees = empSnap.docs.filter(d => {
          const data = d.data();
          return !data.isDeleted && 
                 data.email?.toLowerCase() !== 'growithmagdio@gmail.com' && 
                 data.role?.toLowerCase() !== 'admin';
        }).length;
      } catch (err) {
        console.error("Error fetching total employees for dashboard:", err);
      }

      // 2. Reports Today
      try {
        const today = new Date().toISOString().split('T')[0];
        const repQ = query(collection(db, 'dailyReports'), where('reportDate', '==', today));
        const repSnap = await getDocs(repQ);
        reportsToday = repSnap.size;

        let totalCompletion = 0;
        repSnap.forEach(doc => {
          const data = doc.data();
          totalCompletion += (data.completionPercentage || 0);
          totalHours += (data.timeTaken || 0);
        });

        avgCompletion = reportsToday > 0 ? Math.round(totalCompletion / reportsToday) : 0;
        pendingReports = Math.max(0, totalEmployees - reportsToday);
      } catch (err) {
        console.error("Error fetching daily reports for dashboard:", err);
      }

      // 3. Pending Leaves
      try {
        const leaveQ = query(collection(db, 'leaveRequests'), where('status', '==', 'Pending'));
        const leaveSnap = await getDocs(leaveQ);
        leaveRequests = leaveSnap.size;
      } catch (err) {
        console.error("Error fetching leave requests for dashboard:", err);
      }

      // 4. Pending WFH
      try {
        const wfhQ = query(collection(db, 'wfhRequests'), where('status', '==', 'Pending'));
        const wfhSnap = await getDocs(wfhQ);
        wfhRequests = wfhSnap.size;
      } catch (err) {
        console.error("Error fetching wfh requests for dashboard:", err);
      }

      // 5. Active Projects (count any project not Completed or Cancelled)
      try {
        const projSnap = await getDocs(collection(db, 'projects'));
        activeProjects = projSnap.docs.filter(d => {
          const data = d.data();
          return !data.isDeleted && data.status !== 'Completed' && data.status !== 'Cancelled';
        }).length;
      } catch (err) {
        console.error("Error fetching projects for dashboard:", err);
      }

      // 6. Pending Tasks (count tasks not Done)
      try {
        const taskSnap = await getDocs(collection(db, 'tasks'));
        pendingTasks = taskSnap.docs.filter(d => {
          const data = d.data();
          return !data.isDeleted && data.status !== 'Done' && data.status !== 'Completed';
        }).length;
      } catch (err) {
        console.error("Error fetching tasks for dashboard:", err);
      }

      // 7. Invoices Stats
      try {
        const invSnap = await getDocs(collection(db, 'invoices'));
        invSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!data.isDeleted && data.status !== 'Cancelled') {
            const total = Number(data.totalAmount || 0);
            const paid = Number(data.amountPaid || 0);
            const balance = Number(data.balanceDue ?? (total - paid));
            totalInvoiced += total;
            totalRevenue += paid;
            if (balance > 0) {
              pendingInvoices += 1;
            }
          }
        });
      } catch (invErr) {
        console.error("Error fetching invoice stats for dashboard:", invErr);
      }

      setStats({ 
        totalEmployees, 
        reportsToday, 
        pendingReports,
        leaveRequests, 
        wfhRequests, 
        avgCompletion,
        totalHours,
        activeProjects,
        pendingTasks,
        totalInvoiced,
        totalRevenue,
        pendingInvoices
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'Reports Today', value: stats.reportsToday, icon: FileText, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertCircle, color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { label: 'Avg Completion', value: `${stats.avgCompletion}%`, icon: CheckCircle, color: 'bg-green-50 text-green-600 border-green-200' },
    { label: 'Hours Logged', value: stats.totalHours, icon: Clock, color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { label: 'Active Projects', value: stats.activeProjects, icon: Folder, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    { label: 'Pending Leaves', value: stats.leaveRequests, icon: CalendarDays, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { label: 'Pending WFH', value: stats.wfhRequests, icon: Home, color: 'bg-teal-50 text-teal-600 border-teal-200' },
    { label: 'Total Invoiced', value: `$${stats.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: Receipt, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Revenue Collected', value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-violet-50 text-violet-600 border-violet-200' },
    { label: 'Pending Invoices', value: stats.pendingInvoices, icon: Receipt, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${stat.color} hover:shadow-md transition-shadow`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/50 backdrop-blur-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

