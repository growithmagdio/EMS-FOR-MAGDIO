import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { softDeleteDocument } from '../../utils/dbUtils';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { Trash2, Search, Filter, Eye, X, Folder, CheckSquare, FileText, CalendarDays, User, Mail, Phone, Briefcase, Calendar, ShieldCheck } from 'lucide-react';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  
  // Modals & Detail state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailTab, setDetailTab] = useState('profile'); // 'profile', 'projects', 'tasks', 'reports', 'requests'
  const [employeeProjects, setEmployeeProjects] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [employeeReports, setEmployeeReports] = useState([]);
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('role', '==', 'Employee'));
      const snapshot = await getDocs(q);
      const emps = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(emp => !emp.isDeleted);
      setEmployees(emps);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openEmployeeDetail = async (emp) => {
    setSelectedEmployee(emp);
    setDetailTab('profile');
    setLoadingDetails(true);

    try {
      // 1. Projects assigned to employee
      const projQ = query(collection(db, 'projects'), where('assignedEmployees', 'array-contains', emp.id));
      const projSnap = await getDocs(projQ);
      setEmployeeProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.isDeleted));

      // 2. Tasks assigned to employee
      const taskQ = query(collection(db, 'tasks'), where('assignedEmployeeId', '==', emp.id));
      const taskSnap = await getDocs(taskQ);
      setEmployeeTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.isDeleted));

      // 3. Daily reports
      const repQ = query(collection(db, 'dailyReports'), where('employeeId', '==', emp.id));
      const repSnap = await getDocs(repQ);
      const reps = repSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.isDeleted);
      reps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEmployeeReports(reps);

      // 4. Leave & WFH Requests
      const leaveQ = query(collection(db, 'leaveRequests'), where('employeeId', '==', emp.id));
      const leaveSnap = await getDocs(leaveQ);
      const leaves = leaveSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'Leave' }));

      const wfhQ = query(collection(db, 'wfhRequests'), where('employeeId', '==', emp.id));
      const wfhSnap = await getDocs(wfhQ);
      const wfhs = wfhSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'WFH' }));

      const allReqs = [...leaves, ...wfhs].filter(r => !r.isDeleted);
      allReqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEmployeeRequests(allReqs);

    } catch (err) {
      console.error("Error loading employee details:", err);
      toast.error("Failed to load employee details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'users', id), { isActive: newStatus });
      toast.success(`Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, isActive: newStatus } : emp));
      if (selectedEmployee && selectedEmployee.id === id) {
        setSelectedEmployee(prev => ({ ...prev, isActive: newStatus }));
      }
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDeleteClick = (id) => {
    setEmployeeToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await softDeleteDocument('users', employeeToDelete);
      
      // Cascade delete: Remove employee from all projects they were assigned to
      const projectsRef = collection(db, 'projects');
      const qProj = query(projectsRef, where('assignedEmployees', 'array-contains', employeeToDelete));
      const projSnap = await getDocs(qProj);
      
      const updatePromises = projSnap.docs.map(docSnap => {
        const projData = docSnap.data();
        const updatedEmployees = (projData.assignedEmployees || []).filter(id => id !== employeeToDelete);
        return updateDoc(doc(db, 'projects', docSnap.id), { assignedEmployees: updatedEmployees });
      });

      // Cascade delete: Unassign employee from all their tasks
      const tasksRef = collection(db, 'tasks');
      const qTasks = query(tasksRef, where('assignedEmployeeId', '==', employeeToDelete));
      const tasksSnap = await getDocs(qTasks);
      
      tasksSnap.docs.forEach(docSnap => {
        updatePromises.push(updateDoc(doc(db, 'tasks', docSnap.id), { 
          assignedEmployeeId: '',
          assignedEmployeeName: 'Unassigned'
        }));
      });

      await Promise.all(updatePromises);

      toast.success("Employee removed completely");
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
      if (selectedEmployee?.id === employeeToDelete) {
        setSelectedEmployee(null);
      }
    } catch (error) {
      toast.error("Failed to delete employee");
      console.error(error);
    } finally {
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  // Unique departments for filter dropdown
  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'All' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-500 text-sm mt-1">View, manage profiles, tasks, and activity of all employees</p>
        </div>
        <button
          onClick={() => {
            const registerLink = `${window.location.origin}/register`;
            navigator.clipboard.writeText(registerLink);
            toast.success('Registration link copied to clipboard!');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          Invite Employee
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full md:w-48 py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No employees match your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Employee Details</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Designation</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Joined Date</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {emp.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <button 
                          onClick={() => openEmployeeDetail(emp)}
                          className="font-semibold text-gray-900 hover:text-blue-600 text-left transition-colors"
                        >
                          {emp.name}
                        </button>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {emp.department || 'General'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.designation || `${emp.department || 'Team'} Specialist`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        emp.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => openEmployeeDetail(emp)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </button>
                        <button
                          onClick={() => toggleStatus(emp.id, emp.isActive !== false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            emp.isActive !== false 
                              ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {emp.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(emp.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Employee Detail Modal (Requirement #20) */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0b0e1b] text-white p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center border-2 border-white/20">
                  {selectedEmployee.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-blue-300 text-sm">{selectedEmployee.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-900/60 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium border border-blue-700/50">
                      {selectedEmployee.role || 'Employee'}
                    </span>
                    <span className="bg-white/10 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                      {selectedEmployee.department || 'General'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-gray-50 border-b border-gray-200 flex overflow-x-auto shrink-0 px-6">
              <button
                onClick={() => setDetailTab('profile')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  detailTab === 'profile' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" /> Profile Info
              </button>
              <button
                onClick={() => setDetailTab('projects')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  detailTab === 'projects' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Folder className="w-4 h-4" /> Projects ({employeeProjects.length})
              </button>
              <button
                onClick={() => setDetailTab('tasks')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  detailTab === 'tasks' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckSquare className="w-4 h-4" /> Tasks ({employeeTasks.length})
              </button>
              <button
                onClick={() => setDetailTab('reports')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  detailTab === 'reports' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" /> Reports ({employeeReports.length})
              </button>
              <button
                onClick={() => setDetailTab('requests')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  detailTab === 'requests' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" /> Requests ({employeeRequests.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* TAB 1: PROFILE */}
                  {detailTab === 'profile' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <User className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Full Name</p>
                            <p className="font-semibold text-gray-900">{selectedEmployee.name}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Email Address</p>
                            <p className="font-semibold text-gray-900">{selectedEmployee.email}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Department</p>
                            <p className="font-semibold text-gray-900">{selectedEmployee.department || 'General'}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <Phone className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                            <p className="font-semibold text-gray-900">{selectedEmployee.phone || 'Not Provided'}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Joined Date</p>
                            <p className="font-semibold text-gray-900">
                              {selectedEmployee.joiningDate || (selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString() : 'N/A')}
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Account Status</p>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedEmployee.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {selectedEmployee.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-blue-900">Leave Balance</h4>
                          <p className="text-sm text-blue-700 mt-0.5">Remaining paid annual leave days</p>
                        </div>
                        <div className="text-3xl font-extrabold text-blue-600 bg-white px-5 py-2 rounded-xl shadow-sm border border-blue-100">
                          {selectedEmployee.leaveBalance !== undefined ? selectedEmployee.leaveBalance : 20} Days
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PROJECTS */}
                  {detailTab === 'projects' && (
                    <div className="space-y-4">
                      {employeeProjects.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No projects currently assigned to this employee.</p>
                      ) : (
                        employeeProjects.map(proj => (
                          <div key={proj.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow bg-gray-50/50 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-gray-900">{proj.name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Client: {proj.client || 'Internal'}</p>
                              <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${proj.completionPercentage || 0}%` }}></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                proj.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {proj.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-2">{proj.completionPercentage || 0}% Done</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: TASKS */}
                  {detailTab === 'tasks' && (
                    <div className="space-y-4">
                      {employeeTasks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No tasks assigned to this employee.</p>
                      ) : (
                        employeeTasks.map(task => (
                          <div key={task.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow bg-gray-50/50 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-gray-900">{task.title}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{task.projectName || 'General Task'}</p>
                              {task.dueDate && <p className="text-xs text-gray-400 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                            </div>
                            <div className="text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {task.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">Priority: {task.priority}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: REPORTS */}
                  {detailTab === 'reports' && (
                    <div className="space-y-4">
                      {employeeReports.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No work reports submitted yet.</p>
                      ) : (
                        employeeReports.map(rep => (
                          <div key={rep.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md">
                                {rep.reportDate}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">{rep.timeTaken || rep.hoursWorked || 0} Hours Logged</span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">{rep.taskName || 'Daily Update'}</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{rep.taskDescription || rep.description || rep.workDone}</p>
                            {rep.blockers && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">Blockers: {rep.blockers}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 5: REQUESTS */}
                  {detailTab === 'requests' && (
                    <div className="space-y-4">
                      {employeeRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No leave or WFH requests submitted.</p>
                      ) : (
                        employeeRequests.map(req => (
                          <div key={req.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${req.type === 'Leave' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                                  {req.type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {req.type === 'Leave' ? `${req.fromDate} to ${req.toDate}` : req.date}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800">{req.reason}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
              <div className="text-xs text-gray-500">
                User ID: <code className="bg-gray-200 px-1.5 py-0.5 rounded">{selectedEmployee.id}</code>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName="this employee"
      />
    </div>
  );
}
